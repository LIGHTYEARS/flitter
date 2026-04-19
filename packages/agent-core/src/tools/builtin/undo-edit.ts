/**
 * @flitter/agent-core — UndoEditTool
 *
 * Undo the last edit made to a file by reverting to the previous content.
 * Returns a git-style diff showing the changes that were undone.
 *
 * 逆向: RGR in modules/2026_tail_anonymous.js:14302-14334
 *   - Uses fileChangeTracker.getLastEdit() to peek at last change
 *   - Generates diff via $A(newContent, oldContent, path) (modules/1186_unknown_dWT.js:0)
 *   - Wraps diff in markdown fenced code block via SWT()
 *   - Writes oldContent back to disk via TGR()
 *   - Calls r.revert() to pop from tracker
 *   - Uses per-file mutex via gA(t).acquire()/release()
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { FileChangeTracker } from "../file-change-tracker";
import type { ToolContext, ToolResult, ToolSpec } from "../types";

/**
 * Create a simple unified diff between two strings.
 * 逆向: $A() in modules/1186_unknown_dWT.js:0-6
 * Uses line-by-line comparison to produce a minimal unified diff.
 */
function createUnifiedDiff(oldContent: string, newContent: string, filePath: string): string {
  const oldLines = oldContent.replace(/\r\n/g, "\n").split("\n");
  const newLines = newContent.replace(/\r\n/g, "\n").split("\n");

  const hunks: string[] = [];
  hunks.push(`--- ${filePath}`);
  hunks.push(`+++ ${filePath}`);

  // Simple line-by-line diff with context
  const CONTEXT = 3;
  let i = 0;
  let j = 0;

  // Find differing regions
  while (i < oldLines.length || j < newLines.length) {
    // Skip matching lines
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      i++;
      j++;
      continue;
    }

    // Found a difference — expand to include context
    const contextStart = Math.max(0, i - CONTEXT);
    // Find end of differing region
    let endOld = i;
    let endNew = j;

    // Advance through differing lines
    while (endOld < oldLines.length || endNew < newLines.length) {
      if (endOld < oldLines.length && endNew < newLines.length && oldLines[endOld] === newLines[endNew]) {
        // Check if we have enough matching lines to end the hunk
        let matchCount = 0;
        while (
          endOld + matchCount < oldLines.length &&
          endNew + matchCount < newLines.length &&
          oldLines[endOld + matchCount] === newLines[endNew + matchCount]
        ) {
          matchCount++;
          if (matchCount >= CONTEXT * 2) break;
        }
        if (matchCount >= CONTEXT * 2) break;
        endOld += matchCount;
        endNew += matchCount;
      } else {
        if (endOld < oldLines.length) endOld++;
        if (endNew < newLines.length) endNew++;
      }
    }

    const contextEnd = Math.min(Math.max(oldLines.length, newLines.length), Math.max(endOld, endNew) + CONTEXT);
    const hunkOldStart = contextStart + 1; // 1-indexed
    const hunkNewStart = Math.max(0, j - (i - contextStart)) + 1;
    const hunkOldLen = Math.min(oldLines.length, contextEnd) - contextStart;
    const hunkNewLen = Math.min(newLines.length, contextEnd - contextStart + (endNew - endOld) + contextStart) - Math.max(0, j - (i - contextStart)) + hunkNewStart - 1;

    // Build hunk using a simpler approach
    const hunkLines: string[] = [];

    // Context before
    for (let k = contextStart; k < i; k++) {
      if (k < oldLines.length) hunkLines.push(` ${oldLines[k]}`);
    }

    // Changed lines
    for (let k = i; k < endOld; k++) {
      hunkLines.push(`-${oldLines[k]}`);
    }
    for (let k = j; k < endNew; k++) {
      hunkLines.push(`+${newLines[k]}`);
    }

    // Context after
    for (let k = endOld; k < Math.min(oldLines.length, endOld + CONTEXT); k++) {
      hunkLines.push(` ${oldLines[k]}`);
    }

    // Calculate proper hunk header
    const removedCount = hunkLines.filter(l => l.startsWith("-")).length;
    const addedCount = hunkLines.filter(l => l.startsWith("+")).length;
    const contextCount = hunkLines.filter(l => l.startsWith(" ")).length;

    hunks.push(`@@ -${hunkOldStart},${removedCount + contextCount} +${hunkNewStart},${addedCount + contextCount} @@`);
    hunks.push(...hunkLines);

    // Move past this region
    i = endOld;
    j = endNew;
  }

  return hunks.join("\n");
}

/**
 * Wrap diff text in a markdown fenced code block.
 * 逆向: SWT() in modules/1186_unknown_dWT.js:12-18
 * Finds the minimum fence length that doesn't conflict with diff content.
 */
function wrapDiffAsMarkdown(diff: string): string {
  // Strip "No newline at end of file" markers
  const cleaned = diff.replace(/^\\ No newline at end of file(?:\r?\n|$)/gm, "");
  let fenceLen = 3;
  while (cleaned.includes("`".repeat(fenceLen))) fenceLen++;
  return `${"`".repeat(fenceLen)}diff\n${cleaned}${"`".repeat(fenceLen)}`;
}

/**
 * Factory: create UndoEditTool bound to a FileChangeTracker.
 *
 * 逆向: RGR receives fileChangeTracker from the tool environment context.
 * Flitter: we bind the tracker at registration time via factory pattern.
 */
export function createUndoEditTool(fileChangeTracker: FileChangeTracker): ToolSpec {
  return {
    name: "undo_edit",
    description:
      "Undo the last edit made to a file.\n\n" +
      "This command reverts the most recent edit made to the specified file. " +
      "It will restore the file to its state before the last edit was made.\n\n" +
      "Returns a git-style diff showing the changes that were undone as formatted markdown.",
    source: "builtin",
    isReadOnly: false,

    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Absolute path to the file whose last edit should be undone",
        },
      },
      required: ["path"],
    },

    executionProfile: undefined,
    // 逆向: undo_edit uses per-file mutex (gA(t).acquire())
    // Resource key is dynamic per file path; orchestrator conflict
    // detection is static so we use undefined like Edit/Write tools.

    async execute(args: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> {
      const filePath = args.path as string;

      // Validate path is provided and absolute
      if (!filePath || typeof filePath !== "string") {
        return {
          status: "error",
          error: "path is required and must be a string",
        };
      }

      if (!path.isAbsolute(filePath)) {
        return {
          status: "error",
          error: `Path must be absolute: ${filePath}`,
        };
      }

      // 逆向: RGR line 14313 — a.getLastEdit(t)
      const change = fileChangeTracker.getLastEdit(filePath);
      if (!change) {
        return {
          status: "error",
          error: `No edit history found for file '${filePath}'.`,
        };
      }

      // 逆向: RGR line 14321 — $A(r.newContent, r.oldContent, T.path)
      // Diff from new (current) to old (restoring) — shows what's being undone
      const diff = createUnifiedDiff(change.newContent, change.oldContent, filePath);
      const formatted = wrapDiffAsMarkdown(diff);

      // 逆向: RGR line 14323 — TGR(t.fsPath, r.oldContent, ...)
      try {
        fs.writeFileSync(filePath, change.oldContent, "utf-8");
      } catch (err) {
        return {
          status: "error",
          error: `Failed to write file: ${err instanceof Error ? err.message : String(err)}`,
        };
      }

      // 逆向: RGR line 14323 — r.revert()
      fileChangeTracker.revertLastEdit(filePath);

      return {
        status: "done",
        content: formatted,
        outputFiles: [filePath],
      };
    },
  };
}
