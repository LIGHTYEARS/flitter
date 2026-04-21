/**
 * BashTool — Execute shell commands in a subprocess
 *
 * Spawns a child process via `child_process.spawn` with shell: true.
 * Supports configurable timeout, abort signal cancellation, and output truncation.
 */
import { type ChildProcess, spawn as cpSpawn } from "node:child_process";
import { resolve as pathResolve } from "node:path";
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

// ─── cd interception ────────────────────────────────────

/**
 * Parse a `cd path` command from the start of a shell command string.
 *
 * 逆向: amp's bWR (1300_unknown_bWR.js) uses a full parsimmon-based shell AST
 * parser (IaT class). For flitter, we use a regex approach that handles the
 * common patterns:
 *
 * - `cd path` → { resolvedPath, remainder: "" }
 * - `cd path && rest` → { resolvedPath, remainder: "rest" }
 * - `cd path; rest` → { resolvedPath, remainder: "rest" }
 * - `cd "quoted path"` or `cd 'quoted'` → handles quotes
 *
 * Returns undefined if the command is not a simple cd, matching amp's behavior
 * of skipping dynamic/computed cd targets.
 */
function parseCdCommand(command: string): { resolvedPath: string; remainder: string } | undefined {
  // Match: cd <path> [&& rest | ; rest | end]
  // Path can be: unquoted, double-quoted, or single-quoted
  const cdRegex = /^cd\s+(?:"([^"]+)"|'([^']+)'|(\S+))(?:\s*(&&|;)\s*(.*))?$/;
  const match = cdRegex.exec(command);
  if (!match) return undefined;

  const rawPath = match[1] ?? match[2] ?? match[3];
  if (!rawPath) return undefined;

  // Skip dynamic paths (containing $, backtick, or subshell)
  // 逆向: amp's parser returns Symbol("Dynamic") for these; we skip them
  if (rawPath.includes("$") || rawPath.includes("`")) return undefined;

  // Expand ~ to home directory
  // 逆向: bWR expands ~ to process.env.HOME || process.env.USERPROFILE
  let expandedPath = rawPath;
  if (expandedPath.startsWith("~")) {
    const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
    expandedPath = home + expandedPath.slice(1);
  }

  // Resolve relative paths against cwd (will be resolved again in execute, but
  // we need an absolute path for the cwd field)
  const resolvedPath = pathResolve(expandedPath);

  // Extract remainder (commands after && or ;)
  const separator = match[4]; // && or ;
  const rest = match[5] ?? "";
  const remainder = separator && rest ? rest.trim() : "";

  return { resolvedPath, remainder };
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
    // 逆向: amp uses `meta: { disableTimeout: !0 }` on Bash (chunk-005.js:146312)
    disableTimeout: true,
  },

  inputSchema: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The bash command to execute",
      },
      cwd: {
        type: "string",
        description:
          "Optional working directory for this command. If not specified, uses the session working directory.",
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

  // 逆向: amp's Bash tool accepts `cmd` (chunk-005.js:2282 fallback logic)
  // and intercepts `cd path` to rewrite `cwd` (bWR in 1300_unknown_bWR.js)
  preprocessArgs(args) {
    // Step 1: Alias `cmd` → `command`
    if ("cmd" in args && !("command" in args)) {
      args = { ...args, command: args.cmd };
    }

    // Step 2: If `cwd` already set explicitly, skip `cd` detection
    // 逆向: bWR early-returns when T.cwd is already set
    if (typeof args.cwd === "string" && args.cwd.trim().length > 0) {
      // Expand ~ in explicit cwd
      // 逆向: bWR expands ~ to HOME/USERPROFILE
      const cwd = args.cwd as string;
      if (cwd.startsWith("~")) {
        const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
        return { ...args, cwd: home + cwd.slice(1) };
      }
      return args;
    }

    // Step 3: Detect `cd path` at the start of the command
    // 逆向: amp uses a full shell AST parser (IaT / parsimmon) to detect cd.
    // We use a regex approach that handles the common cases:
    // - `cd path` (simple cd)
    // - `cd path && rest` (cd followed by chained commands)
    // - `cd "path with spaces"` (quoted path)
    // - `cd 'path with spaces'` (single-quoted path)
    // Cases intentionally NOT handled (matching amp's behavior):
    // - `cd` with no args (bare cd to home)
    // - `cd -` (OLDPWD)
    // - `cd $(expr)` / `cd $VAR` (dynamic paths)
    const command = typeof args.command === "string" ? args.command.trim() : "";
    if (command) {
      const cdMatch = parseCdCommand(command);
      if (cdMatch) {
        const newArgs: Record<string, unknown> = { ...args };
        newArgs.cwd = cdMatch.resolvedPath;
        if (cdMatch.remainder) {
          newArgs.command = cdMatch.remainder;
        } else {
          // Pure `cd path` — replace with a no-op that succeeds
          newArgs.command = "true";
        }
        return newArgs;
      }
    }

    return args;
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

    // ── Resolve cwd ───────────────────────────────────
    // 逆向: amp's Bash tool accepts `cwd` (or `workdir` via shell_command alias)
    // to override the working directory per-command.
    const cwd =
      typeof args.cwd === "string" && args.cwd.trim().length > 0
        ? args.cwd.trim()
        : context.workingDirectory;

    // ── Execute ────────────────────────────────────────
    try {
      const result = await executeShell(command, {
        cwd,
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
