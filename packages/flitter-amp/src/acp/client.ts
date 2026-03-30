// ACP Client implementation — handles requests FROM the agent
// The agent calls us for: session updates, permission requests, file ops, terminal ops

import * as fs from 'node:fs/promises';
import { spawn, type ChildProcess } from 'node:child_process';
import type * as acp from '@agentclientprotocol/sdk';
import { log } from '../utils/logger';
import { safeUtf8Slice } from '../utils/buffer';

/**
 * Callback interface for the TUI layer to handle agent events.
 * The ACP client delegates UI-related actions to the app via these callbacks.
 *
 * Uses SDK types directly so that downstream handlers benefit from
 * discriminated union narrowing (SessionUpdate) and literal types
 * (StopReason, PermissionOptionKind).
 */
export interface ClientCallbacks {
  /** Called when the agent sends a session update (streaming text, tool calls, etc.) */
  onSessionUpdate(sessionId: string, update: acp.SessionUpdate): void;
  /** Called when the agent requests permission — returns the selected option ID or null */
  onPermissionRequest(request: acp.RequestPermissionRequest): Promise<string | null>;
  /** Called when a session completes a prompt (stop reason received) */
  onPromptComplete(sessionId: string, stopReason: acp.StopReason): void;
  /** Called when the agent connection is closed unexpectedly */
  onConnectionClosed(reason: string): void;
}

interface TerminalBuffer {
  output: string;
  byteCount: number;
  limit: number | null;
}

/**
 * FlitterClient — Implements the ACP Client interface.
 *
 * When the ACP agent needs something from us (read a file, write a file,
 * run a terminal command, ask for permission), it calls methods on this client
 * via JSON-RPC. We handle these requests and respond.
 *
 * Implements acp.Client directly so that no `as unknown as acp.Client` cast
 * is needed when creating a ClientSideConnection.
 */
export class FlitterClient implements acp.Client {
  private callbacks: ClientCallbacks;
  private terminals: Map<string, ChildProcess> = new Map();
  private terminalBuffers: Map<string, TerminalBuffer> = new Map();

  constructor(callbacks: ClientCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * session/update — Agent sends real-time streaming updates.
   * This is the main event channel: text chunks, tool calls, plan updates, usage.
   */
  async sessionUpdate(params: acp.SessionNotification): Promise<void> {
    this.callbacks.onSessionUpdate(params.sessionId, params.update);
  }

  /**
   * session/request_permission — Agent asks user to approve a tool call.
   * We show a dialog in the TUI and return the user's choice.
   */
  async requestPermission(params: acp.RequestPermissionRequest): Promise<acp.RequestPermissionResponse> {
    const selectedId = await this.callbacks.onPermissionRequest(params);
    if (selectedId === null) {
      return { outcome: { outcome: 'cancelled' } };
    }
    return { outcome: { outcome: 'selected', optionId: selectedId } };
  }

  /**
   * fs/read_text_file — Agent wants to read a file from our filesystem.
   */
  async readTextFile(params: acp.ReadTextFileRequest): Promise<acp.ReadTextFileResponse> {
    log.debug(`Agent reading file: ${params.path}`);
    const content = await fs.readFile(params.path, 'utf-8');
    return { content };
  }

  /**
   * fs/write_text_file — Agent wants to write a file to our filesystem.
   * SDK expects WriteTextFileResponse (an object), not void.
   */
  async writeTextFile(params: acp.WriteTextFileRequest): Promise<acp.WriteTextFileResponse> {
    log.debug(`Agent writing file: ${params.path}`);
    await fs.writeFile(params.path, params.content, 'utf-8');
    return {};
  }

  /**
   * terminal/create — Agent wants to run a command.
   * Starts persistent output collection immediately.
   */
  async createTerminal(params: acp.CreateTerminalRequest): Promise<acp.CreateTerminalResponse> {
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

    this.terminals.set(terminalId, proc);

    // Start persistent output collection immediately
    const buffer: TerminalBuffer = {
      output: '',
      byteCount: 0,
      limit: params.outputByteLimit ?? null,
    };
    this.terminalBuffers.set(terminalId, buffer);

    const appendOutput = (chunk: Buffer) => {
      if (buffer.limit !== null && buffer.byteCount >= buffer.limit) return;

      const bytes = chunk.byteLength;

      if (buffer.limit !== null && buffer.byteCount + bytes > buffer.limit) {
        // Must truncate this chunk to stay within the byte budget.
        // Slice the raw buffer at a UTF-8-safe boundary, then decode.
        const remaining = buffer.limit - buffer.byteCount;
        const truncated = safeUtf8Slice(chunk, remaining);
        buffer.output += truncated.toString('utf-8');
        buffer.byteCount += truncated.byteLength;
      } else {
        buffer.output += chunk.toString('utf-8');
        buffer.byteCount += bytes;
      }
    };

    proc.stdout?.on('data', appendOutput);
    proc.stderr?.on('data', appendOutput);

    return { terminalId };
  }

  /**
   * terminal/output — Agent wants current output of a terminal.
   * Returns flat shape with `truncated` field as required by SDK TerminalOutputResponse.
   */
  async terminalOutput(params: acp.TerminalOutputRequest): Promise<acp.TerminalOutputResponse> {
    const proc = this.terminals.get(params.terminalId);
    const buffer = this.terminalBuffers.get(params.terminalId);

    if (!proc || !buffer) {
      return { output: '', truncated: false, exitStatus: { exitCode: -1 } };
    }

    const truncated = buffer.limit !== null && buffer.byteCount >= buffer.limit;
    return {
      output: buffer.output,
      truncated,
      exitStatus: proc.exitCode !== null ? { exitCode: proc.exitCode } : null,
    };
  }

  /**
   * terminal/wait_for_exit — Block until the terminal command finishes.
   * Returns flat {exitCode, signal} to match SDK WaitForTerminalExitResponse.
   */
  async waitForTerminalExit(params: acp.WaitForTerminalExitRequest): Promise<acp.WaitForTerminalExitResponse> {
    const proc = this.terminals.get(params.terminalId);
    if (!proc) {
      return { exitCode: -1, signal: null };
    }

    if (proc.exitCode !== null) {
      return { exitCode: proc.exitCode, signal: proc.signalCode ?? null };
    }

    return new Promise(resolve => {
      proc.on('exit', (code, signal) => {
        resolve({ exitCode: code ?? null, signal: signal ?? null });
      });
    });
  }

  /**
   * terminal/kill — Kill a running terminal.
   */
  async killTerminal(params: acp.KillTerminalRequest): Promise<acp.KillTerminalResponse | void> {
    const proc = this.terminals.get(params.terminalId);
    if (proc && !proc.killed) {
      proc.kill('SIGTERM');
    }
  }

  /**
   * terminal/release — Release terminal resources.
   */
  async releaseTerminal(params: acp.ReleaseTerminalRequest): Promise<acp.ReleaseTerminalResponse | void> {
    const proc = this.terminals.get(params.terminalId);
    if (proc && !proc.killed) {
      proc.kill('SIGTERM');
    }
    this.terminals.delete(params.terminalId);
    this.terminalBuffers.delete(params.terminalId);
  }

  /** Cleanup all terminals on shutdown */
  cleanup(): void {
    for (const [_id, proc] of this.terminals) {
      if (!proc.killed) proc.kill('SIGTERM');
    }
    this.terminals.clear();
    this.terminalBuffers.clear();
  }
}
