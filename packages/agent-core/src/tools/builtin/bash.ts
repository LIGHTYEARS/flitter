/**
 * BashTool — Execute shell commands in a subprocess
 *
 * Spawns a child process via `child_process.spawn` with shell: true.
 * Supports configurable timeout, abort signal cancellation, and output truncation.
 */
import { type ChildProcess, spawn as cpSpawn } from "node:child_process";
import type { ToolContext, ToolResult, ToolSpec } from "../types";

// ─── Constants ───────────────────────────────────────────

/** Default command timeout in milliseconds (2 minutes) */
const DEFAULT_TIMEOUT = 120_000;

/** Maximum allowed timeout in milliseconds (10 minutes) */
const MAX_TIMEOUT = 600_000;

/** Maximum output length in characters before truncation */
const MAX_OUTPUT_LENGTH = 30_000;

/** Grace period after SIGTERM before sending SIGKILL (5 seconds) */
const SIGTERM_GRACE_PERIOD = 5_000;

// ─── Internal types ──────────────────────────────────────

interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

// ─── Helper functions ────────────────────────────────────

/**
 * Truncate output that exceeds MAX_OUTPUT_LENGTH.
 * Keeps equal head/tail portions with a marker in the middle.
 */
export function truncateOutput(output: string): string {
  if (output.length <= MAX_OUTPUT_LENGTH) {
    return output;
  }

  const marker =
    "\n\n[output truncated -- " +
    (
      output.length -
      MAX_OUTPUT_LENGTH +
      "[output truncated --  chars omitted]".length +
      "\n\n\n\n".length
    ).toString() +
    " chars omitted]\n\n";

  // Recalculate with actual marker length
  const halfLength = Math.floor((MAX_OUTPUT_LENGTH - marker.length) / 2);
  const head = output.slice(0, halfLength);
  const tail = output.slice(output.length - halfLength);
  const omitted = output.length - halfLength * 2;
  const finalMarker = `\n\n[output truncated -- ${omitted} chars omitted]\n\n`;

  return head + finalMarker + tail;
}

/**
 * Gracefully kill a child process: SIGTERM first, then SIGKILL after grace period.
 */
function killGracefully(child: ChildProcess): void {
  try {
    child.kill("SIGTERM");
  } catch {
    // Process may already be dead
  }

  const graceTimer = setTimeout(() => {
    if (!child.killed) {
      try {
        child.kill("SIGKILL");
      } catch {
        // Process may already be dead
      }
    }
  }, SIGTERM_GRACE_PERIOD);

  // Don't let the grace timer keep the event loop alive
  graceTimer.unref();
}

/**
 * Execute a shell command in a subprocess.
 *
 * @param command - The shell command string to execute
 * @param options - Execution options (cwd, timeout, signal, env)
 * @returns ShellResult with stdout, stderr, exitCode, and timedOut flag
 */
function executeShell(
  command: string,
  options: {
    cwd: string;
    timeout: number;
    signal: AbortSignal;
    env?: NodeJS.ProcessEnv;
  },
): Promise<ShellResult> {
  const { cwd, timeout, signal, env } = options;

  return new Promise<ShellResult>((resolve, reject) => {
    const child = cpSpawn(command, {
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
      cwd,
      env: env ?? process.env,
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let timedOut = false;
    let killed = false;

    // Collect stdout
    child.stdout!.on("data", (chunk: Buffer) => {
      stdoutChunks.push(chunk);
    });

    // Collect stderr
    child.stderr!.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });

    // Timeout handler
    const timer = setTimeout(() => {
      timedOut = true;
      killGracefully(child);
    }, timeout);

    // AbortSignal handler
    const onAbort = () => {
      killed = true;
      killGracefully(child);
    };
    signal.addEventListener("abort", onAbort, { once: true });

    // Process close
    child.on("close", (code: number | null) => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);

      if (killed && !timedOut) {
        reject(new DOMException("The operation was aborted", "AbortError"));
        return;
      }

      resolve({
        stdout: Buffer.concat(stdoutChunks).toString("utf-8"),
        stderr: Buffer.concat(stderrChunks).toString("utf-8"),
        exitCode: code ?? 1,
        timedOut,
      });
    });

    // Spawn error (e.g. command not found at OS level)
    child.on("error", (err: Error) => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      reject(err);
    });
  });
}

// ─── BashTool ────────────────────────────────────────────

/**
 * BashTool: Execute bash commands in a child process.
 *
 * - Commands run with `shell: true` so pipes, redirects, etc. work.
 * - Serial execution profile ensures no concurrent shell commands.
 * - Output is truncated if it exceeds MAX_OUTPUT_LENGTH.
 */
export const BashTool: ToolSpec = {
  name: "Bash",
  source: "builtin",
  isReadOnly: false,

  description:
    "Executes a bash command in a subprocess. " +
    "Working directory persists between commands via context. " +
    "Supports configurable timeout (default 2 minutes, max 10 minutes). " +
    "Output exceeding 30000 characters is truncated.",

  executionProfile: {
    serial: true,
  },

  inputSchema: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The bash command to execute",
      },
      timeout: {
        type: "number",
        description:
          "Optional timeout in milliseconds (max 600000). Defaults to 120000 (2 minutes).",
      },
      description: {
        type: "string",
        description: "A brief description of what the command does, for logging purposes.",
      },
    },
    required: ["command"],
    additionalProperties: false,
  },

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    // ── Validate command ───────────────────────────────
    const command = args.command;
    if (typeof command !== "string" || command.trim().length === 0) {
      return {
        status: "error",
        error: "command must be a non-empty string",
      };
    }

    // ── Parse timeout ──────────────────────────────────
    const rawTimeout = typeof args.timeout === "number" ? args.timeout : DEFAULT_TIMEOUT;
    const timeout = Math.min(Math.max(rawTimeout, 0), MAX_TIMEOUT);

    // ── Execute ────────────────────────────────────────
    try {
      const result = await executeShell(command, {
        cwd: context.workingDirectory,
        timeout,
        signal: context.signal,
      });

      // ── Merge output ───────────────────────────────
      let output = "";
      if (result.stdout && result.stderr) {
        output = result.stdout + "\n" + result.stderr;
      } else {
        output = result.stdout || result.stderr;
      }

      // ── Truncate ───────────────────────────────────
      const content = truncateOutput(output);

      // ── Build result ───────────────────────────────
      const toolResult: ToolResult = {
        status: "done",
        content,
        data: {
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
        },
      };

      // ── Timeout annotation ─────────────────────────
      if (result.timedOut) {
        toolResult.content =
          (toolResult.content || "") + `\n\nCommand timed out after ${timeout}ms`;
      }

      return toolResult;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return {
          status: "error",
          error: "Command was cancelled",
        };
      }

      const message = err instanceof Error ? err.message : String(err);
      return {
        status: "error",
        error: message,
      };
    }
  },
};
