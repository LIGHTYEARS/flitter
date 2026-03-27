// ACP Client implementation — handles requests FROM the agent
// The agent calls us for: session updates, permission requests, file ops, terminal ops

import * as fs from 'node:fs/promises';
import { spawn, type ChildProcess } from 'node:child_process';
import { log } from '../utils/logger';

/**
 * Callback interface for the TUI layer to handle agent events.
 * The ACP client delegates UI-related actions to the app via these callbacks.
 */
export interface ClientCallbacks {
  /** Called when the agent sends a session update (streaming text, tool calls, etc.) */
  onSessionUpdate(sessionId: string, update: SessionUpdate): void;
  /** Called when the agent requests permission — returns the selected option ID or null */
  onPermissionRequest(request: PermissionRequest): Promise<string | null>;
  /** Called when a session completes a prompt (stop reason received) */
  onPromptComplete(sessionId: string, stopReason: string): void;
}

export interface SessionUpdate {
  sessionUpdate: string;
  [key: string]: unknown;
}

export interface PermissionRequest {
  sessionId: string;
  toolCall: {
    toolCallId: string;
    title: string;
    kind: string;
    status: string;
    locations?: Array<{ path: string }>;
    rawInput?: Record<string, unknown>;
  };
  prompt: string;
  options: Array<{
    kind: string;
    name: string;
    optionId: string;
  }>;
}

/**
 * FlitterClient — Implements the ACP Client interface.
 *
 * When the ACP agent needs something from us (read a file, write a file,
 * run a terminal command, ask for permission), it calls methods on this client
 * via JSON-RPC. We handle these requests and respond.
 *
 * Note: The actual acp.Client interface shape will be matched at runtime.
 * We implement the methods that AgentSideConnection expects to call on us.
 */
export class FlitterClient {
  private callbacks: ClientCallbacks;
  private terminals: Map<string, { proc: ChildProcess; output: string; outputByteLimit: number }> = new Map();

  constructor(callbacks: ClientCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * session/update — Agent sends real-time streaming updates.
   * This is the main event channel: text chunks, tool calls, plan updates, usage.
   */
  async sessionUpdate(params: { sessionId: string; update: SessionUpdate }): Promise<void> {
    this.callbacks.onSessionUpdate(params.sessionId, params.update);
  }

  /**
   * session/request_permission — Agent asks user to approve a tool call.
   * We show a dialog in the TUI and return the user's choice.
   */
  async requestPermission(params: PermissionRequest): Promise<{ outcome: { outcome: string; optionId?: string } }> {
    const selectedId = await this.callbacks.onPermissionRequest(params);
    if (selectedId === null) {
      return { outcome: { outcome: 'cancelled' } };
    }
    return { outcome: { outcome: 'selected', optionId: selectedId } };
  }

  /**
   * fs/read_text_file — Agent wants to read a file from our filesystem.
   */
  async readTextFile(params: { path: string; sessionId: string }): Promise<{ content: string }> {
    log.debug(`Agent reading file: ${params.path}`);
    const content = await fs.readFile(params.path, 'utf-8');
    return { content };
  }

  /**
   * fs/write_text_file — Agent wants to write a file to our filesystem.
   */
  async writeTextFile(params: { content: string; path: string; sessionId: string }): Promise<void> {
    log.debug(`Agent writing file: ${params.path}`);
    await fs.writeFile(params.path, params.content, 'utf-8');
  }

  /**
   * terminal/create — Agent wants to run a command.
   */
  async createTerminal(params: {
    command: string;
    args?: string[];
    cwd?: string | null;
    env?: Array<{ name: string; value: string }>;
    outputByteLimit?: number | null;
    sessionId: string;
  }): Promise<{ terminalId: string }> {
    const terminalId = crypto.randomUUID();
    log.debug(`Agent creating terminal ${terminalId}: ${params.command} ${(params.args || []).join(' ')}`);

    const env = { ...process.env };
    if (params.env) {
      for (const { name, value } of params.env) {
        env[name] = value;
      }
    }

    const proc = spawn(params.command, params.args || [], {
      cwd: params.cwd || undefined,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const outputByteLimit = params.outputByteLimit ?? Infinity;
    const terminal = { proc, output: '', outputByteLimit };

    proc.stdout?.on('data', (chunk: Buffer) => {
      if (terminal.output.length < terminal.outputByteLimit) {
        terminal.output += chunk.toString();
      }
    });
    proc.stderr?.on('data', (chunk: Buffer) => {
      if (terminal.output.length < terminal.outputByteLimit) {
        terminal.output += chunk.toString();
      }
    });

    this.terminals.set(terminalId, terminal);
    return { terminalId };
  }

  /**
   * terminal/output — Agent wants current output of a terminal.
   */
  async terminalOutput(params: { terminalId: string; sessionId: string }): Promise<{
    output: string;
    exitStatus?: { exitCode?: number | null; signal?: string | null } | null;
    truncated: boolean;
  }> {
    const terminal = this.terminals.get(params.terminalId);
    if (!terminal) {
      return { output: '', exitStatus: { exitCode: -1 }, truncated: false };
    }

    const truncated = terminal.output.length >= terminal.outputByteLimit;
    const exitStatus = terminal.proc.exitCode !== null
      ? { exitCode: terminal.proc.exitCode, signal: terminal.proc.signalCode ?? null }
      : null;

    return { output: terminal.output, exitStatus, truncated };
  }

  /**
   * terminal/wait_for_exit — Block until the terminal command finishes.
   */
  async waitForTerminalExit(params: { terminalId: string; sessionId: string }): Promise<{
    exitCode?: number | null;
    signal?: string | null;
  }> {
    const terminal = this.terminals.get(params.terminalId);
    if (!terminal) {
      return { exitCode: -1 };
    }

    if (terminal.proc.exitCode !== null) {
      return { exitCode: terminal.proc.exitCode, signal: terminal.proc.signalCode ?? null };
    }

    return new Promise(resolve => {
      terminal.proc.on('exit', (code, signal) => {
        resolve({ exitCode: code ?? null, signal: signal ?? null });
      });
    });
  }

  /**
   * terminal/kill — Kill a running terminal.
   */
  async killTerminal(params: { terminalId: string; sessionId: string }): Promise<void> {
    const terminal = this.terminals.get(params.terminalId);
    if (terminal && !terminal.proc.killed) {
      terminal.proc.kill('SIGTERM');
    }
  }

  /**
   * terminal/release — Release terminal resources.
   */
  async releaseTerminal(params: { terminalId: string; sessionId: string }): Promise<void> {
    const terminal = this.terminals.get(params.terminalId);
    if (terminal && !terminal.proc.killed) {
      terminal.proc.kill('SIGTERM');
    }
    this.terminals.delete(params.terminalId);
  }

  /** Cleanup all terminals on shutdown */
  cleanup(): void {
    for (const [_id, terminal] of this.terminals) {
      if (!terminal.proc.killed) terminal.proc.kill('SIGTERM');
    }
    this.terminals.clear();
  }
}
