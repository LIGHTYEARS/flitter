/**
 * format_file — Run configured formatter on a file
 *
 * Detects the file type by extension and runs the appropriate formatter.
 * Falls back to common formatters (prettier, biome) when no language-specific
 * formatter is available.
 *
 * 逆向: amp-cli-reversed/chunk-006.js:29161-29166
 *   - `case "format_file": { let { input: t } = R; return this.buildGenericTool(T, R, a, t.path, "Format"); }`
 *   - Takes `path` as primary parameter
 *   - Rendered in TUI as a generic tool with "Format" label
 *
 * 逆向: amp-cli-reversed/chunk-005.js:13203
 *   - `AlR = "format_file"` — tool name constant
 *
 * Supported formatters (auto-detected by file extension / project markers):
 *   - TypeScript/JavaScript: `npx prettier --write` or `npx biome format --write`
 *   - Python: `ruff format` or `black`
 *   - Go: `gofmt -w`
 *   - Rust: `rustfmt`
 *   - Generic: falls back to prettier
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { spawn } from "@flitter/util";
import type { ToolContext, ToolResult, ToolSpec } from "../types";

// ─── Constants ─────────────────────────────────────────

/** Max time to wait for a formatter process (15 seconds) */
const FORMATTER_TIMEOUT_MS = 15_000;

type FormatterKind = "prettier" | "biome" | "gofmt" | "rustfmt" | "ruff" | "black" | "unknown";

// ─── Formatter detection ───────────────────────────────

interface FormatterConfig {
  kind: FormatterKind;
  command: string[];
}

/**
 * Detect which formatter to use for a given file path.
 *
 * Priority:
 * 1. Language-specific formatter (gofmt, rustfmt, ruff/black)
 * 2. Project-level config detection (biome.json → biome, otherwise prettier)
 * 3. Default to prettier
 */
export function detectFormatter(filePath: string, cwd: string): FormatterConfig {
  const ext = path.extname(filePath).toLowerCase();

  // Go files → gofmt
  if (ext === ".go") {
    return { kind: "gofmt", command: ["gofmt", "-w", filePath] };
  }

  // Rust files → rustfmt
  if (ext === ".rs") {
    return { kind: "rustfmt", command: ["rustfmt", filePath] };
  }

  // Python files → ruff format (preferred) or black
  if ([".py", ".pyi"].includes(ext)) {
    return { kind: "ruff", command: ["ruff", "format", filePath] };
  }

  // JS/TS/JSON/CSS/HTML/YAML/MD → check for biome.json, else prettier
  if (
    [
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      ".json",
      ".jsonc",
      ".css",
      ".scss",
      ".html",
      ".yaml",
      ".yml",
      ".md",
      ".mdx",
      ".graphql",
      ".vue",
      ".svelte",
    ].includes(ext)
  ) {
    // Check for biome config
    if (
      fs.existsSync(path.join(cwd, "biome.json")) ||
      fs.existsSync(path.join(cwd, "biome.jsonc"))
    ) {
      return { kind: "biome", command: ["npx", "biome", "format", "--write", filePath] };
    }
    // Default to prettier
    return { kind: "prettier", command: ["npx", "prettier", "--write", filePath] };
  }

  // Unknown extension — try prettier as a general formatter
  return { kind: "prettier", command: ["npx", "prettier", "--write", filePath] };
}

// ─── Execution ─────────────────────────────────────────

async function execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
  const targetPath = args.path as string | undefined;
  if (!targetPath) {
    return { status: "error", error: "Missing required parameter: path" };
  }

  const resolved = path.isAbsolute(targetPath)
    ? targetPath
    : path.resolve(context.workingDirectory, targetPath);

  // Check file exists and is a file (not directory)
  try {
    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      return {
        status: "error",
        error: `Path is a directory, not a file: ${resolved}. Provide a file path.`,
      };
    }
  } catch {
    return { status: "error", error: `File not found: ${resolved}` };
  }

  const formatter = detectFormatter(resolved, context.workingDirectory);

  try {
    const [cmd, ...cmdArgs] = formatter.command;
    const result = await spawn(cmd!, cmdArgs, {
      cwd: context.workingDirectory,
      timeout: FORMATTER_TIMEOUT_MS,
    });

    // Most formatters write to the file directly (--write flag)
    // and output nothing or a summary to stdout/stderr
    const output = (result.stdout + result.stderr).trim();

    return {
      status: "done",
      content: output
        ? `Formatted ${resolved} using ${formatter.kind}:\n${output}`
        : `Formatted ${resolved} using ${formatter.kind}`,
      data: {
        path: resolved,
        formatter: formatter.kind,
      },
    };
  } catch (err: unknown) {
    // If the primary formatter fails, try a fallback
    const message = err instanceof Error ? err.message : String(err);

    // Python: if ruff fails, try black
    if (formatter.kind === "ruff") {
      try {
        const result = await spawn("black", [resolved], {
          cwd: context.workingDirectory,
          timeout: FORMATTER_TIMEOUT_MS,
        });
        const output = (result.stdout + result.stderr).trim();
        return {
          status: "done",
          content: output
            ? `Formatted ${resolved} using black (ruff fallback):\n${output}`
            : `Formatted ${resolved} using black (ruff fallback)`,
          data: { path: resolved, formatter: "black" },
        };
      } catch {
        // Both failed
      }
    }

    return {
      status: "error",
      error: `Failed to format ${resolved} with ${formatter.kind}: ${message}`,
    };
  }
}

// ─── Tool Spec ─────────────────────────────────────────

export const FormatFileTool: ToolSpec = {
  name: "format_file",
  description:
    "Format a file using the appropriate formatter for its language. " +
    "Auto-detects the formatter based on file extension and project config (biome.json, etc.). " +
    "Supported: TypeScript/JavaScript (prettier/biome), Python (ruff/black), Go (gofmt), Rust (rustfmt).",
  source: "builtin",
  isReadOnly: false,

  inputSchema: {
    type: "object",
    required: ["path"],
    properties: {
      path: {
        type: "string",
        description: "Absolute path to the file to format.",
      },
    },
  },

  execute,
};
