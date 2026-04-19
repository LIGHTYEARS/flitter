/**
 * @flitter/agent-core — Toolbox execute handler
 *
 * Spawns a toolbox script with TOOLBOX_ACTION=execute, passes args
 * as JSON on stdin, collects stdout output with truncation.
 *
 * 逆向: chunk-002.js:30548-30641 — L5R() execute handler
 *       chunk-002.js:30215-30224 — j5R() text-format args serializer
 */

import { type ChildProcess, spawn as cpSpawn } from "node:child_process";
import { createLogger } from "@flitter/util";
import type { ToolboxExecuteResult } from "./types";
import { DEFAULT_EXECUTE_TIMEOUT_MS, MAX_OUTPUT_LENGTH } from "./toolbox-utils";

const log = createLogger("toolbox:execute");

// ─── Spawn type (injectable for testing) ─────────────────

export type SpawnFn = (
  command: string,
  args: string[],
  options: { env: Record<string, string | undefined>; stdio: string[] },
) => ChildProcess;

// ─── Execute options ────────────────────────────────────

export interface ExecuteOptions {
  /** Thread ID for AGENT_THREAD_ID env var */
  threadId?: string;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
  /** Execute timeout in ms (default: 120s) */
  timeout?: number;
  /** Describe format — "text" uses key:value stdin, "json" uses JSON */
  format?: "json" | "text";
  /** Custom spawn function (for testing) */
  spawn?: SpawnFn;
}

// ─── Main execute function ──────────────────────────────

/**
 * Execute a toolbox script with TOOLBOX_ACTION=execute.
 *
 * 逆向: L5R(T, R, a) in chunk-002.js:30548-30641
 *   - Sets TOOLBOX_ACTION=execute, AGENT=amp, AGENT_THREAD_ID, AMP_CURRENT_THREAD_ID
 *   - Sends args as JSON on stdin (or text format if describe was text)
 *   - Collects stdout, emits in-progress and done events
 */
export async function executeToolboxScript(
  scriptPath: string,
  args: Record<string, unknown>,
  options: ExecuteOptions = {},
): Promise<ToolboxExecuteResult> {
  const {
    threadId = "",
    signal,
    timeout = DEFAULT_EXECUTE_TIMEOUT_MS,
    format = "json",
    spawn = defaultSpawn,
  } = options;

  // 逆向: L5R env setup (chunk-002.js:30551-30558)
  const env: Record<string, string | undefined> = {
    ...process.env,
    TOOLBOX_ACTION: "execute",
    AGENT: "flitter",
    AGENT_THREAD_ID: threadId,
    FLITTER_CURRENT_THREAD_ID: threadId,
  };

  log.debug("toolbox: spawning execute", { executablePath: scriptPath, format });

  const child = spawn(scriptPath, [], {
    env,
    stdio: ["pipe", "pipe", "pipe"],
  });

  // Write args to stdin
  // 逆向: L5R sends text-format args via j5R for text-described tools, JSON otherwise
  const inputData = format === "text" ? argsToTextFormat(args) : JSON.stringify(args);
  log.debug("toolbox: sending stdin data", {
    executablePath: scriptPath,
    format,
    inputData,
  });

  if (child.stdin) {
    child.stdin.write(inputData);
    child.stdin.end();
  }

  // Handle abort signal
  if (signal) {
    const onAbort = () => {
      if (!child.killed) child.kill("SIGTERM");
    };
    signal.addEventListener("abort", onAbort, { once: true });
    child.on("close", () => signal.removeEventListener("abort", onAbort));
  }

  return collectOutput(child, timeout, scriptPath);
}

// ─── Text format args ────────────────────────────────────

/**
 * Serialize tool args in the legacy text format (key: value lines).
 *
 * 逆向: chunk-002.js:30215-30224 — j5R(T)
 *   Recursively flattens objects/arrays into key: value lines.
 */
export function argsToTextFormat(args: Record<string, unknown>): string {
  const lines: string[] = [];

  function walk(prefix: string, value: unknown): void {
    if (value === null || value === undefined) {
      lines.push(`${prefix}: ${String(value)}`);
    } else if (typeof value === "boolean") {
      lines.push(`${prefix}: ${value ? "true" : "false"}`);
    } else if (typeof value === "number" || typeof value === "string") {
      lines.push(`${prefix}: ${String(value)}`);
    } else if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        walk(`${prefix}_${i}`, value[i]);
      }
    } else if (typeof value === "object") {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        walk(`${prefix}_${k}`, v);
      }
    } else {
      lines.push(`${prefix}: ${String(value)}`);
    }
  }

  for (const [key, val] of Object.entries(args)) {
    walk(key, val);
  }

  return lines.join("\n") + "\n";
}

// ─── Output collector ────────────────────────────────────

function collectOutput(
  child: ChildProcess,
  timeoutMs: number,
  scriptPath: string,
): Promise<ToolboxExecuteResult> {
  return new Promise((resolve, reject) => {
    let output = "";
    let truncated = false;
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        if (!child.killed) child.kill("SIGKILL");
        // 逆向: L5R emits error on timeout
        resolve({
          output: output + "\n[Execution timed out]",
          exitCode: -1,
          truncated: true,
        });
      }
    }, timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      if (truncated) return;
      output += chunk.toString();
      if (output.length > MAX_OUTPUT_LENGTH) {
        output = output.slice(0, MAX_OUTPUT_LENGTH) + "\n[Output truncated]";
        truncated = true;
      }
    });

    // Also capture stderr into output (tools may write to stderr)
    child.stderr?.on("data", (chunk: Buffer) => {
      // stderr is logged but not included in the tool result
      // 逆向: L5R only captures stdout for xterm processing
      log.debug("toolbox stderr", {
        executablePath: scriptPath,
        data: chunk.toString().substring(0, 500),
      });
    });

    child.on("error", (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        log.debug("Failed to execute toolbox", err);
        resolve({
          output: `Failed to execute toolbox: ${err.message}`,
          exitCode: -1,
          truncated: false,
        });
      }
    });

    child.on("close", (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        log.debug("toolbox: emitting done", {
          executablePath: scriptPath,
          exitCode: code,
          outputLength: output.length,
        });
        resolve({
          output,
          exitCode: code ?? -1,
          truncated,
        });
      }
    });
  });
}

// ─── Default spawn ──────────────────────────────────────

function defaultSpawn(
  command: string,
  args: string[],
  options: { env: Record<string, string | undefined>; stdio: string[] },
): ChildProcess {
  return cpSpawn(command, args, {
    env: options.env,
    stdio: options.stdio as ("pipe" | "inherit" | "ignore")[],
  });
}
