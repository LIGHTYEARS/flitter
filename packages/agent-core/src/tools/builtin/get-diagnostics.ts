/**
 * get_diagnostics — LSP-like diagnostics via language-specific linters
 *
 * Amp's `get_diagnostics` connects to an IDE plugin over WebSocket.
 * Since flitter has no IDE bridge, we shell out to common type-checkers/linters
 * and parse their output into a normalized diagnostic format.
 *
 * 逆向: amp-cli-reversed/modules/1381_unknown_U5R.js
 *   - Input: { path: string }
 *   - Calls Us.requestDiagnosticsFromIDE(path)
 *   - Returns { status: "done", result: DiagnosticEntry[], trackFiles }
 *
 * Supported checkers (auto-detected by file extension / project markers):
 *   - TypeScript: `npx tsc --noEmit --pretty false`
 *   - Python: `ruff check --output-format json`
 *   - Go: `go vet ./...` (JSON output)
 *   - Rust: `cargo check --message-format json`
 *   - Generic: falls back to no diagnostics with an info message
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { spawn } from "@flitter/util";
import type { ToolContext, ToolResult, ToolSpec } from "../types";

// ─── Diagnostic types ────────────────────────────────────

export interface DiagnosticEntry {
  file: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  severity: "error" | "warning" | "info" | "hint";
  message: string;
  source?: string;
}

// ─── Shared config ──────────────────────────────────────

/** Max time to wait for a checker process (10 seconds). */
const CHECKER_TIMEOUT_MS = 10_000;

type Language = "typescript" | "python" | "go" | "rust" | "unknown";

function detectLanguage(targetPath: string): Language {
  // Check file extension
  const ext = path.extname(targetPath).toLowerCase();
  if ([".ts", ".tsx", ".js", ".jsx"].includes(ext)) return "typescript";
  if ([".py", ".pyi"].includes(ext)) return "python";
  if (ext === ".go") return "go";
  if (ext === ".rs") return "rust";

  // Check directory markers
  try {
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      const files = fs.readdirSync(targetPath);
      if (files.includes("tsconfig.json") || files.includes("package.json")) return "typescript";
      if (files.includes("pyproject.toml") || files.includes("setup.py")) return "python";
      if (files.includes("go.mod")) return "go";
      if (files.includes("Cargo.toml")) return "rust";
    }
  } catch {
    // Path doesn't exist or unreadable — fall through
  }

  return "unknown";
}

// ─── TypeScript diagnostics ─────────────────────────────

/**
 * Parse tsc output (with --pretty false) into diagnostics.
 * Format: `path(line,col): error TS2345: message`
 */
function parseTscOutput(output: string): DiagnosticEntry[] {
  const diagnostics: DiagnosticEntry[] = [];
  const lineRegex = /^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.+)$/gm;

  let match: RegExpExecArray | null;
  while ((match = lineRegex.exec(output)) !== null) {
    diagnostics.push({
      file: match[1]!,
      line: Number.parseInt(match[2]!, 10),
      column: Number.parseInt(match[3]!, 10),
      severity: match[4] === "error" ? "error" : "warning",
      message: match[6]!,
      source: `typescript(${match[5]})`,
    });
  }
  return diagnostics;
}

async function getTypeScriptDiagnostics(
  targetPath: string,
  cwd: string,
): Promise<DiagnosticEntry[]> {
  // Find tsconfig.json relative to target
  const searchDir = fs.statSync(targetPath).isDirectory() ? targetPath : path.dirname(targetPath);
  const args = ["tsc", "--noEmit", "--pretty", "false"];

  // If target is a specific file, use --noEmit on just that file (if no tsconfig)
  const hasTsconfig =
    fs.existsSync(path.join(searchDir, "tsconfig.json")) ||
    fs.existsSync(path.join(cwd, "tsconfig.json"));

  if (!hasTsconfig) {
    // No tsconfig — check individual file
    args.push(targetPath);
  }

  try {
    const result = await spawn("npx", args, {
      cwd: hasTsconfig ? cwd : searchDir,
      timeout: CHECKER_TIMEOUT_MS,
    });
    // tsc exits non-zero on errors, which is expected
    return parseTscOutput(result.stdout + result.stderr);
  } catch {
    return [];
  }
}

// ─── Python diagnostics (ruff) ──────────────────────────

interface RuffDiagnostic {
  filename: string;
  location: { row: number; column: number };
  end_location?: { row: number; column: number };
  code: string;
  message: string;
}

async function getPythonDiagnostics(targetPath: string, cwd: string): Promise<DiagnosticEntry[]> {
  try {
    const result = await spawn("ruff", ["check", "--output-format", "json", targetPath], {
      cwd,
      timeout: CHECKER_TIMEOUT_MS,
    });
    if (!result.stdout.trim()) return [];

    const items: RuffDiagnostic[] = JSON.parse(result.stdout);
    return items.map((item) => ({
      file: item.filename,
      line: item.location.row,
      column: item.location.column,
      endLine: item.end_location?.row,
      endColumn: item.end_location?.column,
      severity: "warning" as const,
      message: item.message,
      source: `ruff(${item.code})`,
    }));
  } catch {
    return [];
  }
}

// ─── Go diagnostics ─────────────────────────────────────

async function getGoDiagnostics(targetPath: string, _cwd: string): Promise<DiagnosticEntry[]> {
  const diagnostics: DiagnosticEntry[] = [];
  const goDir = fs.statSync(targetPath).isDirectory() ? targetPath : path.dirname(targetPath);

  try {
    const result = await spawn("go", ["vet", "./..."], { cwd: goDir, timeout: CHECKER_TIMEOUT_MS });
    // go vet output: `file.go:line:col: message`
    const lineRegex = /^(.+?):(\d+):(\d+):\s+(.+)$/gm;
    const output = result.stderr + result.stdout;

    let match: RegExpExecArray | null;
    while ((match = lineRegex.exec(output)) !== null) {
      diagnostics.push({
        file: path.resolve(goDir, match[1]!),
        line: Number.parseInt(match[2]!, 10),
        column: Number.parseInt(match[3]!, 10),
        severity: "warning",
        message: match[4]!,
        source: "go vet",
      });
    }
  } catch {
    // go vet not available
  }

  return diagnostics;
}

// ─── Rust diagnostics ───────────────────────────────────

interface CargoMessage {
  reason: string;
  message?: {
    level: string;
    message: string;
    spans: Array<{
      file_name: string;
      line_start: number;
      column_start: number;
      line_end: number;
      column_end: number;
    }>;
  };
}

async function getRustDiagnostics(targetPath: string, _cwd: string): Promise<DiagnosticEntry[]> {
  const diagnostics: DiagnosticEntry[] = [];
  const cargoDir = fs.statSync(targetPath).isDirectory() ? targetPath : path.dirname(targetPath);

  try {
    const result = await spawn("cargo", ["check", "--message-format", "json"], {
      cwd: cargoDir,
      timeout: CHECKER_TIMEOUT_MS,
    });
    const lines = (result.stdout + result.stderr).split("\n").filter(Boolean);

    for (const line of lines) {
      try {
        const msg: CargoMessage = JSON.parse(line);
        if (msg.reason === "compiler-message" && msg.message) {
          const span = msg.message.spans[0];
          if (span) {
            diagnostics.push({
              file: path.resolve(cargoDir, span.file_name),
              line: span.line_start,
              column: span.column_start,
              endLine: span.line_end,
              endColumn: span.column_end,
              severity: msg.message.level === "error" ? "error" : "warning",
              message: msg.message.message,
              source: "rustc",
            });
          }
        }
      } catch {
        // Not JSON or malformed — skip
      }
    }
  } catch {
    // cargo not available
  }

  return diagnostics;
}

// ─── Main execution ─────────────────────────────────────

async function execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
  const targetPath = args.path as string | undefined;
  if (!targetPath) {
    return { status: "error", error: "Missing required parameter: path" };
  }

  const resolved = path.isAbsolute(targetPath)
    ? targetPath
    : path.resolve(context.workingDirectory, targetPath);

  // Check path exists
  let isDir: boolean;
  try {
    isDir = fs.statSync(resolved).isDirectory();
  } catch {
    return { status: "error", error: `Path not found: ${resolved}` };
  }

  const language = detectLanguage(resolved);
  let diagnostics: DiagnosticEntry[];

  switch (language) {
    case "typescript":
      diagnostics = await getTypeScriptDiagnostics(resolved, context.workingDirectory);
      break;
    case "python":
      diagnostics = await getPythonDiagnostics(resolved, context.workingDirectory);
      break;
    case "go":
      diagnostics = await getGoDiagnostics(resolved, context.workingDirectory);
      break;
    case "rust":
      diagnostics = await getRustDiagnostics(resolved, context.workingDirectory);
      break;
    default:
      return {
        status: "done",
        content: `No diagnostics checker available for this file type. Supported: TypeScript, Python (ruff), Go, Rust.`,
        data: { diagnostics: [], language: "unknown" },
      };
  }

  // Filter to target path if it's a specific file
  if (!isDir) {
    diagnostics = diagnostics.filter(
      (d) => path.resolve(context.workingDirectory, d.file) === resolved,
    );
  }

  // Format output
  if (diagnostics.length === 0) {
    return {
      status: "done",
      content: `No diagnostics found for ${resolved}`,
      data: { diagnostics: [], language },
    };
  }

  const lines = diagnostics.map(
    (d) =>
      `${d.file}:${d.line}:${d.column}: ${d.severity} ${d.source ? `[${d.source}] ` : ""}${d.message}`,
  );

  return {
    status: "done",
    content: lines.join("\n"),
    data: { diagnostics, language, trackFiles: [...new Set(diagnostics.map((d) => d.file))] },
  };
}

// ─── Tool spec ──────────────────────────────────────────

export const GetDiagnosticsTool: ToolSpec = {
  name: "get_diagnostics",
  description:
    "Get diagnostics (errors, warnings) for a file or directory. " +
    "Shells out to language-specific checkers: TypeScript (tsc), Python (ruff), Go (go vet), Rust (cargo check). " +
    "Prefer passing a directory path over individual files for efficiency. " +
    "Output is shown in the UI so do not repeat/summarize the diagnostics.",
  source: "builtin",
  isReadOnly: true,

  inputSchema: {
    type: "object",
    required: ["path"],
    properties: {
      path: {
        type: "string",
        description:
          "Absolute path to a file or directory to check. Directory is preferred over per-file calls.",
      },
    },
  },

  execute,
};
