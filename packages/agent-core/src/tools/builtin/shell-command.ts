/**
 * shell_command — Alternate shell tool for subagents
 *
 * Amp exposes `shell_command` alongside `Bash` with slightly different parameter names.
 * Subagents receive `shell_command` (via SUBAGENT_TYPE_REGISTRY tool patterns) instead
 * of `Bash`. The execution path is identical — `q5T` maps the params and delegates to
 * the same `IzT` shell execution function.
 *
 * 逆向: amp-cli-reversed/modules/2026_tail_anonymous.js:143002 (tool spec)
 *   - Parameters: command (required), workdir, login (boolean, default true), timeout_ms
 *   - preprocessArgs: bWR (shared with Bash — cd interception + ~ expansion)
 *
 * 逆向: amp-cli-reversed/modules/1299_unknown_q5T.js
 *   - Maps { command → cmd, workdir → cwd, timeout_ms → timeout_ms }
 *   - Then delegates to IzT (same as Bash tool execution)
 *
 * 逆向: amp-cli-reversed/chunk-005.js:22207-22215 (JVR — shell_command fn)
 *   - `let e = q5T(T); return IzT({ args: e, userInput: R }, a);`
 *
 * 逆向: amp-cli-reversed/chunk-006.js:29145-29146
 *   - `case "shell_command": return this.buildShellCommandTool(R, a);`
 */
import type { ToolSpec } from "../types";
import { BashTool } from "./bash";

// ─── ShellCommandTool ──────────────────────────────────

export const ShellCommandTool: ToolSpec = {
  name: "shell_command",
  source: "builtin",
  isReadOnly: false,

  description:
    "Execute a shell command. " +
    "Similar to Bash but with different parameter names. " +
    "Used by subagent workers for shell operations.",

  executionProfile: {
    serial: true,
    // Same as Bash — no orchestrator timeout (tool manages its own timeout)
    disableTimeout: true,
  },

  inputSchema: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The shell command to execute",
      },
      workdir: {
        type: "string",
        description:
          "Optional working directory for this command. If not specified, uses the session working directory.",
      },
      timeout_ms: {
        type: "number",
        description:
          "Optional timeout in milliseconds (max 600000). Defaults to 120000 (2 minutes).",
      },
      login: {
        type: "boolean",
        description:
          "Run with login shell semantics. Defaults to true. " +
          "Currently a no-op — reserved for future shell configuration.",
      },
    },
    required: ["command"],
    additionalProperties: false,
  },

  /**
   * Map shell_command params to Bash params.
   *
   * 逆向: q5T (modules/1299_unknown_q5T.js)
   *   return { cmd: T.command, cwd: T.workdir, timeout_ms: T.timeout_ms }
   *
   * We map to Bash's canonical names: command, cwd, timeout.
   */
  preprocessArgs(args) {
    const mapped: Record<string, unknown> = { ...args };

    // workdir → cwd
    if ("workdir" in mapped && !("cwd" in mapped)) {
      mapped.cwd = mapped.workdir;
      delete mapped.workdir;
    }

    // timeout_ms → timeout
    if ("timeout_ms" in mapped && !("timeout" in mapped)) {
      mapped.timeout = mapped.timeout_ms;
      delete mapped.timeout_ms;
    }

    // login is accepted but not forwarded — Bash tool always uses shell: true
    delete mapped.login;

    // Delegate to Bash's preprocessArgs for cd interception + cmd alias
    if (BashTool.preprocessArgs) {
      return BashTool.preprocessArgs(mapped);
    }
    return mapped;
  },

  // Reuse the exact same execution function as BashTool
  execute: BashTool.execute,
};
