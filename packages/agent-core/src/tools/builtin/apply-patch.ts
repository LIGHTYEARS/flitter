/**
 * @flitter/agent-core — ApplyPatchTool
 *
 * Multi-file editing tool using the Codex patch format.
 * Supports Add, Delete, Update, and Move file operations in a single call.
 *
 * 逆向: amp-cli-reversed/modules/2026_tail_anonymous.js
 *   - Parser XS (Kw): lines 13559-13570 (patch text → operations)
 *   - Executor Q5R: lines 13628-13770 (operations → file changes)
 *   - Hunk applicator X5R + K5R + oz: chunk-002.js:30788-30963
 *   - Tool spec TzR: lines 140072-140085
 *   - Examples Z5R: lines 139877-140010
 *   - Description J5R: lines 140010-140071
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { ToolContext, ToolResult, ToolSpec } from "../types";

// ─── Types ──────────────────────────────────────────────────

/** A single hunk within an Update operation */
export interface PatchChunk {
  /** Context/removed lines from the original file */
  oldLines: string[];
  /** Context/added lines for the new file */
  newLines: string[];
  /** Text after @@ — scope hint for disambiguation (e.g. "class Foo") */
  changeContext?: string;
  /** True if *** End of File marker is present — anchors to EOF */
  isEndOfFile?: boolean;
}

/** A parsed file operation */
export interface PatchOperation {
  type: "add" | "update" | "delete";
  path: string;
  /** For update+move: the destination path */
  movePath?: string;
  /** For add: the file contents (+ prefixes stripped) */
  contents?: string;
  /** For update: the hunks to apply */
  chunks?: PatchChunk[];
}

/** Result of parsing a patch */
export interface ParseResult {
  operations: PatchOperation[];
  warnings: string[];
}

/** Result of applying hunks to a file */
interface ApplyResult {
  content: string;
}

/** A splice record for bottom-to-top application */
interface SpliceRecord {
  startLine: number;
  deleteCount: number;
  insertLines: string[];
}

// ─── Unicode Normalizer ─────────────────────────────────────
// 逆向: sz() in chunk-002.js — normalizes smart quotes, dashes, ellipsis, NBSP

function normalizeUnicode(s: string): string {
  return s
    .replace(/[\u2018\u2019\u201A]/g, "'") // smart single quotes
    .replace(/[\u201C\u201D\u201E]/g, '"') // smart double quotes
    .replace(/[\u2013\u2014]/g, "-") // en/em dashes
    .replace(/\u2026/g, "...") // ellipsis
    .replace(/\u00A0/g, " "); // NBSP
}

// ─── Fuzzy Line Matching ────────────────────────────────────
// 逆向: oz() 5-tier cascade in chunk-002.js:30813

type CompareFn = (fileLine: string, patternLine: string) => boolean;

const MATCH_TIERS: { name: string; compare: CompareFn }[] = [
  { name: "exact", compare: (a, b) => a === b },
  { name: "rstrip", compare: (a, b) => a.trimEnd() === b.trimEnd() },
  { name: "trim", compare: (a, b) => a.trim() === b.trim() },
  {
    name: "unicode",
    compare: (a, b) => normalizeUnicode(a).trim() === normalizeUnicode(b).trim(),
  },
  {
    name: "spaceCollapsed",
    compare: (a, b) =>
      normalizeUnicode(a).replace(/\t/g, " ").replace(/ {2,}/g, " ").trim() ===
      normalizeUnicode(b).replace(/\t/g, " ").replace(/ {2,}/g, " ").trim(),
  },
];

/**
 * Scan fileLines forward from `startOffset` looking for a contiguous block
 * matching `pattern` lines. If `isEndOfFile` is true, try end-of-file position first.
 *
 * 逆向: qI() in chunk-002.js:30791
 */
function findMatch(
  fileLines: string[],
  pattern: string[],
  startOffset: number,
  compareFn: CompareFn,
  isEndOfFile?: boolean,
): number {
  if (pattern.length === 0) return startOffset;

  // End-of-file anchor: try the tail position first
  // 逆向: qI checks fileLines.length - pattern.length first when isEndOfFile
  if (isEndOfFile) {
    const eofStart = fileLines.length - pattern.length;
    if (eofStart >= 0 && matchesAt(fileLines, pattern, eofStart, compareFn)) {
      return eofStart;
    }
  }

  // Forward scan from startOffset
  const limit = fileLines.length - pattern.length;
  for (let i = startOffset; i <= limit; i++) {
    if (matchesAt(fileLines, pattern, i, compareFn)) {
      return i;
    }
  }
  return -1;
}

function matchesAt(
  fileLines: string[],
  pattern: string[],
  offset: number,
  compareFn: CompareFn,
): boolean {
  for (let j = 0; j < pattern.length; j++) {
    if (!compareFn(fileLines[offset + j], pattern[j])) {
      return false;
    }
  }
  return true;
}

/**
 * 5-tier fuzzy match cascade.
 * Returns { index, tierName } or null.
 *
 * 逆向: oz() in chunk-002.js:30813
 */
function fuzzyFind(
  fileLines: string[],
  pattern: string[],
  startOffset: number,
  isEndOfFile?: boolean,
): { index: number; tierName: string } | null {
  for (const tier of MATCH_TIERS) {
    const idx = findMatch(fileLines, pattern, startOffset, tier.compare, isEndOfFile);
    if (idx >= 0) {
      return { index: idx, tierName: tier.name };
    }
  }
  return null;
}

/**
 * When a fuzzy tier (not exact) is used, re-apply the file's actual
 * indentation to the newLines, preserving relative indent changes.
 *
 * 逆向: F5R in chunk-002.js
 */
function reindentNewLines(
  fileLines: string[],
  matchStart: number,
  oldLines: string[],
  newLines: string[],
): string[] {
  if (oldLines.length === 0) return newLines;

  // Find the indentation of the first non-empty old line
  const firstOldNonEmpty = oldLines.find((l) => l.trim().length > 0);
  if (!firstOldNonEmpty) return newLines;

  const patchIndent = firstOldNonEmpty.match(/^(\s*)/)?.[1] ?? "";

  // Find the indentation of the corresponding file line
  const firstFileNonEmpty = fileLines
    .slice(matchStart, matchStart + oldLines.length)
    .find((l) => l.trim().length > 0);
  if (!firstFileNonEmpty) return newLines;

  const fileIndent = firstFileNonEmpty.match(/^(\s*)/)?.[1] ?? "";

  if (patchIndent === fileIndent) return newLines;

  // Compute the difference and apply to new lines
  return newLines.map((line) => {
    if (line.trim().length === 0) return line;
    const lineIndent = line.match(/^(\s*)/)?.[1] ?? "";
    if (lineIndent.startsWith(patchIndent)) {
      return fileIndent + lineIndent.slice(patchIndent.length) + line.trimStart();
    }
    return line;
  });
}

// ─── Parser ─────────────────────────────────────────────────
// 逆向: XS() / Kw() in 2026_tail_anonymous.js:13559

/**
 * Strip heredoc wrapper if present.
 * 逆向: hlR() — handles `cat <<'EOF'...EOF` wrapping
 */
function stripHeredoc(text: string): string {
  const trimmed = text.trim();
  // Match: cat <<'EOF' or cat << 'EOF' at start, EOF at end
  const heredocMatch = trimmed.match(/^cat\s+<<\s*'?(\w+)'?\s*\n([\s\S]*)\n\1$/);
  if (heredocMatch) {
    return heredocMatch[2];
  }
  return text;
}

/**
 * Parse a Codex-format patch text into operations.
 *
 * 逆向: XS() (also called Kw) in 2026_tail_anonymous.js:13559
 */
export function parsePatch(patchText: string): ParseResult {
  const stripped = stripHeredoc(patchText.trim());
  const lines = stripped.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const operations: PatchOperation[] = [];
  const warnings: string[] = [];

  const beginIdx = lines.findIndex((l) => l.trim() === "*** Begin Patch");
  const endIdx = lines.findIndex((l) => l.trim() === "*** End Patch");

  if (beginIdx === -1 && endIdx === -1) {
    throw new Error(
      `Invalid patch format: missing *** Begin Patch and *** End Patch markers.\n` +
        `Expected format:\n*** Begin Patch\n*** Add File: path/to/file.ts\n+file contents\n*** End Patch`,
    );
  }
  if (beginIdx === -1) {
    throw new Error("Invalid patch format: missing *** Begin Patch marker.");
  }
  if (endIdx === -1) {
    throw new Error("Invalid patch format: missing *** End Patch marker.");
  }
  if (endIdx < beginIdx) {
    throw new Error("Invalid patch format: *** End Patch appears before *** Begin Patch.");
  }

  // Check for content before Begin
  for (let i = 0; i < beginIdx; i++) {
    if (lines[i].trim().length > 0) {
      warnings.push("Non-empty content found before *** Begin Patch (ignored)");
      break;
    }
  }

  // Check for content after End
  for (let i = endIdx + 1; i < lines.length; i++) {
    if (lines[i].trim().length > 0) {
      warnings.push("Non-empty content found after *** End Patch (ignored)");
      break;
    }
  }

  // Parse between Begin and End
  let idx = beginIdx + 1;
  while (idx < endIdx) {
    const line = lines[idx].trim();

    if (line.startsWith("*** Add File: ")) {
      const filePath = line.slice("*** Add File: ".length).trim();
      idx++;
      let contents = "";
      while (idx < endIdx && !lines[idx].trim().startsWith("*** ")) {
        const contentLine = lines[idx];
        if (contentLine.startsWith("+")) {
          contents += contentLine.slice(1) + "\n";
        } else if (contentLine.trim() === "") {
          // Empty line in add block — treat as blank content line
          contents += "\n";
        } else {
          throw new Error(
            `Invalid patch format: Add File lines must start with '+'. Got: "${contentLine}"`,
          );
        }
        idx++;
      }
      operations.push({ type: "add", path: filePath, contents });
    } else if (line.startsWith("*** Delete File: ")) {
      const filePath = line.slice("*** Delete File: ".length).trim();
      operations.push({ type: "delete", path: filePath });
      idx++;
    } else if (line.startsWith("*** Update File: ")) {
      const filePath = line.slice("*** Update File: ".length).trim();
      idx++;

      // Check for optional Move to
      let movePath: string | undefined;
      if (idx < endIdx && lines[idx].trim().startsWith("*** Move to: ")) {
        movePath = lines[idx].trim().slice("*** Move to: ".length).trim();
        idx++;
      }

      // Parse hunks
      const chunks: PatchChunk[] = [];
      while (idx < endIdx && !lines[idx].trim().startsWith("*** ")) {
        // Skip empty lines between hunks
        if (
          lines[idx].trim() === "" &&
          !(lines[idx].startsWith(" ") || lines[idx].startsWith("-") || lines[idx].startsWith("+"))
        ) {
          idx++;
          continue;
        }

        if (lines[idx].trim().startsWith("@@")) {
          // Collect @@ headers (multiple allowed)
          let changeContext = "";
          while (idx < endIdx && lines[idx].trim().startsWith("@@")) {
            const headerText = lines[idx].trim().slice(2).trim();
            if (headerText) {
              changeContext += (changeContext ? "\n" : "") + headerText;
            }
            idx++;
          }

          // Collect hunk lines
          const oldLines: string[] = [];
          const newLines: string[] = [];
          let isEndOfFile = false;

          while (idx < endIdx) {
            const hunkLine = lines[idx];
            if (hunkLine.trim().startsWith("*** ")) {
              if (hunkLine.trim() === "*** End of File") {
                isEndOfFile = true;
                idx++;
              }
              break;
            }
            if (hunkLine.trim().startsWith("@@")) break;

            if (hunkLine.startsWith(" ")) {
              oldLines.push(hunkLine.slice(1));
              newLines.push(hunkLine.slice(1));
            } else if (hunkLine.startsWith("-")) {
              oldLines.push(hunkLine.slice(1));
            } else if (hunkLine.startsWith("+")) {
              newLines.push(hunkLine.slice(1));
            } else if (hunkLine.trim() === "") {
              // Blank line within a hunk — treat as context
              oldLines.push("");
              newLines.push("");
            } else {
              // Unrecognized line — skip (amp skips too)
              break;
            }
            idx++;
          }

          if (oldLines.length > 0 || newLines.length > 0) {
            chunks.push({
              oldLines,
              newLines,
              changeContext: changeContext || undefined,
              isEndOfFile: isEndOfFile || undefined,
            });
          }
        } else if (
          lines[idx].startsWith(" ") ||
          lines[idx].startsWith("-") ||
          lines[idx].startsWith("+")
        ) {
          // Hunk without @@ header (implicit)
          const oldLines: string[] = [];
          const newLines: string[] = [];
          let isEndOfFile = false;

          while (idx < endIdx) {
            const hunkLine = lines[idx];
            if (hunkLine.trim().startsWith("*** ")) {
              if (hunkLine.trim() === "*** End of File") {
                isEndOfFile = true;
                idx++;
              }
              break;
            }
            if (hunkLine.trim().startsWith("@@")) break;

            if (hunkLine.startsWith(" ")) {
              oldLines.push(hunkLine.slice(1));
              newLines.push(hunkLine.slice(1));
            } else if (hunkLine.startsWith("-")) {
              oldLines.push(hunkLine.slice(1));
            } else if (hunkLine.startsWith("+")) {
              newLines.push(hunkLine.slice(1));
            } else if (hunkLine.trim() === "") {
              oldLines.push("");
              newLines.push("");
            } else {
              break;
            }
            idx++;
          }

          if (oldLines.length > 0 || newLines.length > 0) {
            chunks.push({
              oldLines,
              newLines,
              isEndOfFile: isEndOfFile || undefined,
            });
          }
        } else {
          // Unrecognized line — skip
          idx++;
        }
      }

      operations.push({
        type: "update",
        path: filePath,
        movePath,
        chunks,
      });
    } else if (line === "" || line.startsWith("@@")) {
      // Skip blank lines between operations
      idx++;
    } else {
      // Unrecognized line — skip (amp skips silently)
      idx++;
    }
  }

  return { operations, warnings };
}

// ─── Hunk Applicator ────────────────────────────────────────
// 逆向: X5R + K5R + V5R in chunk-002.js:30788-30963

/**
 * Apply parsed chunks to file content.
 *
 * 逆向: X5R in chunk-002.js:30963
 */
export function applyHunks(
  filePath: string,
  fileContent: string,
  chunks: PatchChunk[],
): ApplyResult {
  const isCRLF = fileContent.includes("\r\n");
  const normalized = fileContent.replace(/\r\n/g, "\n");

  // Split into lines — strip trailing empty line from final newline
  let fileLines = normalized.split("\n");
  if (fileLines.length > 0 && fileLines[fileLines.length - 1] === "") {
    fileLines = fileLines.slice(0, -1);
  }

  // Build splice records
  // 逆向: K5R in chunk-002.js:30902
  const splices: SpliceRecord[] = [];
  let cursor = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const label = `chunk ${i + 1}/${chunks.length}`;

    // Handle @@ changeContext — advance cursor to the scope
    if (chunk.changeContext) {
      const contextLines = chunk.changeContext.split("\n");
      const contextMatch = fuzzyFind(fileLines, contextLines, cursor);
      if (contextMatch) {
        cursor = contextMatch.index + contextLines.length;
      }
      // If changeContext doesn't match, continue with current cursor
      // (amp does the same — context is a hint, not a hard requirement)
    }

    // Insert-only hunks (no old lines to match)
    if (chunk.oldLines.length === 0) {
      if (chunk.newLines.length > 0) {
        const insertAt = chunk.isEndOfFile ? fileLines.length : cursor;
        splices.push({
          startLine: insertAt,
          deleteCount: 0,
          insertLines: [...chunk.newLines],
        });
      }
      continue;
    }

    // Find where the old lines match in the file
    const match = fuzzyFind(fileLines, chunk.oldLines, cursor, chunk.isEndOfFile);

    if (!match) {
      // Build debug hint
      // 逆向: amp shows first 3 expected lines + up to 3 candidate locations
      const firstNonEmpty = chunk.oldLines.find((l) => l.trim().length > 0);
      const candidates: number[] = [];
      if (firstNonEmpty) {
        for (let j = 0; j < fileLines.length && candidates.length < 3; j++) {
          if (fileLines[j].trim() === firstNonEmpty.trim()) {
            candidates.push(j + 1); // 1-indexed
          }
        }
      }
      const expected = chunk.oldLines
        .slice(0, 3)
        .map((l) => `  ${l}`)
        .join("\n");
      const hint =
        candidates.length > 0
          ? `\nFirst expected line found at line(s): ${candidates.join(", ")}`
          : "";
      throw new Error(
        `Could not find matching lines in ${filePath} (${label}).` +
          `\nExpected:\n${expected}${hint}` +
          `\nSearched from line ${cursor + 1}.`,
      );
    }

    // Advance cursor past the match
    cursor = match.index + chunk.oldLines.length;

    // Re-indent new lines if fuzzy match tier was not exact
    let finalNewLines = chunk.newLines;
    if (match.tierName !== "exact") {
      finalNewLines = reindentNewLines(fileLines, match.index, chunk.oldLines, chunk.newLines);
    }

    splices.push({
      startLine: match.index,
      deleteCount: chunk.oldLines.length,
      insertLines: finalNewLines,
    });
  }

  // Check for overlapping splices
  // 逆向: G5R in chunk-002.js
  const sorted = [...splices].sort((a, b) => a.startLine - b.startLine);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const prevEnd = prev.startLine + prev.deleteCount;
    if (prevEnd > curr.startLine) {
      throw new Error(
        `Overlapping patch chunks in ${filePath}: replacement starting at line ${curr.startLine + 1} ` +
          `overlaps previous replacement ending at line ${prevEnd}.`,
      );
    }
  }

  // Apply splices bottom-to-top to preserve line indices
  // 逆向: V5R in chunk-002.js
  for (let i = sorted.length - 1; i >= 0; i--) {
    const s = sorted[i];
    fileLines.splice(s.startLine, s.deleteCount, ...s.insertLines);
  }

  // Rejoin with newline + ensure trailing newline
  let result = fileLines.join("\n");
  if (!result.endsWith("\n")) {
    result += "\n";
  }

  // Restore CRLF if original was CRLF
  if (isCRLF) {
    result = result.replace(/\n/g, "\r\n");
  }

  return { content: result };
}

// ─── Tool Description ───────────────────────────────────────
// 逆向: J5R in 2026_tail_anonymous.js:140010-140071

const APPLY_PATCH_DESCRIPTION = `Apply a patch to one or more files using the Codex patch format.

You MUST read the file before applying a patch to it.

## Patch Format

The patch must be wrapped in \`*** Begin Patch\` and \`*** End Patch\` markers.

Each operation starts with one of three headers:
- \`*** Add File: <path>\` - create a new file. Every following line must start with \`+\`.
- \`*** Delete File: <path>\` - remove an existing file. Nothing follows.
- \`*** Update File: <path>\` - patch an existing file (optionally with a rename via \`*** Move to:\`).

### Grammar

\`\`\`
Patch       := Begin { FileOp } End
Begin       := "*** Begin Patch" NEWLINE
End         := "*** End Patch" NEWLINE
FileOp      := AddFile | DeleteFile | UpdateFile
AddFile     := "*** Add File: " path NEWLINE { "+" line NEWLINE }
DeleteFile  := "*** Delete File: " path NEWLINE
UpdateFile  := "*** Update File: " path NEWLINE [ MoveTo ] { Hunk }
MoveTo      := "*** Move to: " newPath NEWLINE
Hunk        := "@@" [ " " header ] NEWLINE { HunkLine } [ "*** End of File" NEWLINE ]
HunkLine    := (" " | "-" | "+") text NEWLINE
\`\`\`

## Context Rules
- By default, show **3 lines** of unchanged code immediately above and 3 lines immediately below each change.
- Treat 3 lines as a minimum, not a target. For large files, repeated code, or any edit that could plausibly match in multiple places, prefer **5-10 lines** of unchanged context on each side.
- If 3 lines of context is insufficient to uniquely identify the location, use the \`@@\` operator to indicate the class or function the snippet belongs to. For example:
  \`@@ class BaseClass\`
  [3+ lines of pre-context]
  [changes]
  [3+ lines of post-context]
- If a code block is repeated so many times that even a single \`@@\` header and 3 lines of context cannot uniquely identify it, use multiple \`@@\` statements to narrow the location.

## Additional Rules
- For Add File: every content line MUST start with \`+\` (which gets stripped)
- For Update File hunks: lines start with \` \` (context), \`-\` (remove), or \`+\` (add)
- Use \`*** End of File\` marker to anchor changes at end of file
- Multiple files can be patched in a single call
- File paths can be relative or absolute

## Reliability Tips
- Repeated blocks: include a unique \`@@ ...\` header, and add 5-10 or more context lines until the target is unique.
- If you only read part of a file, do not guess. Read more of the file and expand the context until the hunk can match only once.
- Indentation-sensitive files: keep indentation exactly as in the file (tabs vs spaces). Do not reindent unrelated lines.
- Insert-only hunks (no \`-\` lines): avoid unanchored insert-only hunks; include a nearby unchanged context line.
- Ambiguous matches are worse than verbose hunks. Prefer a longer patch over a shorter patch that could apply in multiple places.`;

// ─── Tool Spec ──────────────────────────────────────────────
// 逆向: TzR in 2026_tail_anonymous.js:140072-140085

export const ApplyPatchTool: ToolSpec = {
  name: "apply_patch",
  description: APPLY_PATCH_DESCRIPTION,
  source: "builtin",
  isReadOnly: false,

  inputSchema: {
    type: "object",
    properties: {
      patchText: {
        type: "string",
        description: "The full patch text that describes all changes to be made",
      },
    },
    required: ["patchText"],
    additionalProperties: false,
  },

  executionProfile: { serial: true },

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const patchText = args.patchText as string;

    // Validate patchText
    if (!patchText || typeof patchText !== "string") {
      return {
        status: "error",
        error: "patchText is required and must be a string",
      };
    }

    // Parse
    let parsed: ParseResult;
    try {
      parsed = parsePatch(patchText);
    } catch (err) {
      return {
        status: "error",
        error: `apply_patch parse failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    if (parsed.operations.length === 0) {
      const normalized = patchText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
      if (normalized === "*** Begin Patch\n*** End Patch") {
        return {
          status: "error",
          error:
            "patch rejected: empty patch body. You sent a patch with no file operations between " +
            '"*** Begin Patch" and "*** End Patch". Include at least one file operation ' +
            '(e.g., "*** Update File: path/to/file").',
        };
      }
      return {
        status: "error",
        error:
          "apply_patch verification failed: no operations found. " +
          'Ensure the patch follows the correct format with "*** Begin Patch", ' +
          'file operations like "*** Update File: path/to/file", and "*** End Patch".',
      };
    }

    // Execute operations
    const workDir = context.workingDirectory;
    const results: string[] = [];
    const noChangeFiles: string[] = [];

    for (let i = 0; i < parsed.operations.length; i++) {
      const op = parsed.operations[i];
      const label = `[${i + 1}/${parsed.operations.length}]`;

      // Resolve path
      let resolvedPath: string;
      try {
        resolvedPath = path.isAbsolute(op.path) ? op.path : path.resolve(workDir, op.path);
      } catch (err) {
        return {
          status: "error",
          error: `${label} invalid path "${op.path}": ${err instanceof Error ? err.message : String(err)}`,
        };
      }

      switch (op.type) {
        case "add": {
          // Ensure trailing newline for add
          let contents = op.contents ?? "";
          if (contents.length > 0 && !contents.endsWith("\n")) {
            contents += "\n";
          }

          // Create directories
          const dir = path.dirname(resolvedPath);
          fs.mkdirSync(dir, { recursive: true });

          // Write file
          fs.writeFileSync(resolvedPath, contents, "utf-8");

          const lineCount = contents.split("\n").length - 1;
          results.push(`add: ${op.path} (+${lineCount}/-0)`);
          break;
        }

        case "delete": {
          // Verify file exists
          if (!fs.existsSync(resolvedPath)) {
            return {
              status: "error",
              error: `${label} delete ${op.path}: file not found. Cannot delete a file that doesn't exist.`,
            };
          }

          const oldContent = fs.readFileSync(resolvedPath, "utf-8");
          const deletedLines = oldContent.split("\n").length;

          fs.unlinkSync(resolvedPath);
          results.push(`delete: ${op.path} (+0/-${deletedLines})`);
          break;
        }

        case "update": {
          // Read existing file
          if (!fs.existsSync(resolvedPath)) {
            return {
              status: "error",
              error: `${label} update ${op.path}: file not found. Cannot update a file that doesn't exist.`,
            };
          }

          const oldContent = fs.readFileSync(resolvedPath, "utf-8");

          // Apply hunks
          let applyResult: ApplyResult;
          try {
            applyResult = applyHunks(op.path, oldContent, op.chunks ?? []);
          } catch (err) {
            return {
              status: "error",
              error: `${label} ${err instanceof Error ? err.message : String(err)}`,
            };
          }

          // Check for no-op
          if (applyResult.content === oldContent) {
            noChangeFiles.push(op.path);
            continue;
          }

          // Count additions/deletions
          const oldLines = oldContent.split("\n");
          const newLines = applyResult.content.split("\n");
          let additions = 0;
          let deletions = 0;
          // Simple line-count diff
          if (newLines.length > oldLines.length) {
            additions = newLines.length - oldLines.length;
          } else {
            deletions = oldLines.length - newLines.length;
          }
          // Count changed lines by comparing the splices
          // For a more accurate count, compare line-by-line
          const minLen = Math.min(oldLines.length, newLines.length);
          for (let j = 0; j < minLen; j++) {
            if (oldLines[j] !== newLines[j]) {
              additions++;
              deletions++;
            }
          }

          // Handle move
          if (op.movePath) {
            const resolvedMovePath = path.isAbsolute(op.movePath)
              ? op.movePath
              : path.resolve(workDir, op.movePath);

            // Create destination directory
            fs.mkdirSync(path.dirname(resolvedMovePath), { recursive: true });
            // Write to new path
            fs.writeFileSync(resolvedMovePath, applyResult.content, "utf-8");
            // Delete old file
            fs.unlinkSync(resolvedPath);
            results.push(`move: ${op.path} → ${op.movePath} (+${additions}/-${deletions})`);
          } else {
            // Write updated content
            fs.writeFileSync(resolvedPath, applyResult.content, "utf-8");
            results.push(`update: ${op.path} (+${additions}/-${deletions})`);
          }
          break;
        }
      }
    }

    // Check if all operations were no-ops
    if (results.length === 0 && noChangeFiles.length > 0) {
      return {
        status: "error",
        error:
          `patch rejected: the patch produced no changes. The content you provided is identical ` +
          `to what is already in the file(s): ${noChangeFiles.join(", ")}. ` +
          `Read the file first to see its current content.`,
      };
    }

    // Build output
    let output = results.join("\n");
    if (parsed.warnings.length > 0) {
      output = `Warnings:\n${parsed.warnings.map((w) => `  - ${w}`).join("\n")}\n\n${output}`;
    }

    return {
      status: "done",
      content: output,
    };
  },
};
