// packages/cli/src/widgets/diff-widget.ts
/**
 * DiffWidget -- inline unified diff renderer with color-coded lines.
 *
 * 逆向: cE0() (chunk-004.js:21105-21125)
 * Renders unified diff text with:
 * - Green for added lines (+)
 * - Red for removed lines (-)
 * - Dim for context lines (space prefix)
 * - Muted for meta lines (---/+++/@@)
 *
 * Also exports parseDiffLines() for testability and
 * generateSimpleDiff() for computing diffs from old/new strings.
 *
 * @module
 */

import { Color, RichText, TextSpan, TextStyle } from "@flitter/tui";
import type { AppTheme } from "./app-theme-controller.js";

// ════════════════════════════════════════════════════
//  Colors (terminal-indexed, matching amp's theme tokens)
// ════════════════════════════════════════════════════

/**
 * Diff line colors matching amp's theme tokens.
 * 逆向: chunk-004.js:29563-29566
 * - diffAdded: T.success → LT.green (indexed 2)
 * - diffRemoved: T.destructive → LT.red (indexed 1)
 * - diffContext: T.mutedForeground → default + dim
 */
const DIFF_ADDED_COLOR = Color.indexed(2);
const DIFF_REMOVED_COLOR = Color.indexed(1);
const DIFF_CONTEXT_COLOR = Color.default();
const DIFF_META_COLOR = Color.default();

// ════════════════════════════════════════════════════
//  Types
// ════════════════════════════════════════════════════

export type DiffLineType = "added" | "removed" | "context" | "meta";

export interface DiffLine {
  type: DiffLineType;
  text: string;
}

// ════════════════════════════════════════════════════
//  Parser
// ════════════════════════════════════════════════════

/**
 * Parse unified diff text into typed lines.
 *
 * 逆向: cE0 splits on "\n" then checks startsWith("+") / startsWith("-")
 * We add "meta" type for ---/+++/@@ header lines.
 */
export function parseDiffLines(diffText: string): DiffLine[] {
  if (!diffText || diffText.trim() === "") return [];

  const rawLines = diffText.split("\n");
  const result: DiffLine[] = [];

  for (const line of rawLines) {
    if (line.startsWith("---") || line.startsWith("+++") || line.startsWith("@@")) {
      result.push({ type: "meta", text: line });
    } else if (line.startsWith("+")) {
      result.push({ type: "added", text: line });
    } else if (line.startsWith("-")) {
      result.push({ type: "removed", text: line });
    } else {
      result.push({ type: "context", text: line });
    }
  }

  return result;
}

// ════════════════════════════════════════════════════
//  Diff generation
// ════════════════════════════════════════════════════

/**
 * Generate a minimal unified diff from old and new strings.
 *
 * 逆向: $A(T, R, a) in modules/1186_unknown_dWT.js
 * Uses `iM()` which is `createTwoFilesPatch` from the `diff` library.
 *
 * This implements a simple LCS-based prefix/suffix approach sufficient
 * for the common case of small edits. For exact `diff` library parity,
 * the `diff` package could be added as a dependency.
 */
export function generateSimpleDiff(oldStr: string, newStr: string, fileName = "file"): string {
  const oldLines = _normalizeLineEndings(oldStr).split("\n");
  const newLines = _normalizeLineEndings(newStr).split("\n");

  const result: string[] = [];
  result.push(`--- a/${fileName}`);
  result.push(`+++ b/${fileName}`);

  const { hunks } = _computeHunks(oldLines, newLines);

  for (const hunk of hunks) {
    result.push(
      `@@ -${hunk.oldStart + 1},${hunk.oldCount} +${hunk.newStart + 1},${hunk.newCount} @@`,
    );
    for (const line of hunk.lines) {
      result.push(line);
    }
  }

  return result.join("\n");
}

function _normalizeLineEndings(str: string): string {
  return str.replace(/\r\n/g, "\n");
}

interface _Hunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: string[];
}

/**
 * Compute diff hunks using a common prefix/suffix approach:
 * Find the largest common prefix and suffix, then emit a single hunk
 * for the changed middle section with 3 lines of context on each side.
 */
function _computeHunks(oldLines: string[], newLines: string[]): { hunks: _Hunk[] } {
  // Find common prefix
  let prefixLen = 0;
  const minLen = Math.min(oldLines.length, newLines.length);
  while (prefixLen < minLen && oldLines[prefixLen] === newLines[prefixLen]) {
    prefixLen++;
  }

  // Find common suffix (but not overlapping with prefix)
  let suffixLen = 0;
  while (
    suffixLen < minLen - prefixLen &&
    oldLines[oldLines.length - 1 - suffixLen] === newLines[newLines.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }

  const oldChanged = oldLines.slice(prefixLen, oldLines.length - suffixLen);
  const newChanged = newLines.slice(prefixLen, newLines.length - suffixLen);

  if (oldChanged.length === 0 && newChanged.length === 0) {
    return { hunks: [] };
  }

  const contextBefore = Math.min(3, prefixLen);
  const contextAfter = Math.min(3, suffixLen);

  const hunkOldStart = prefixLen - contextBefore;
  const hunkNewStart = prefixLen - contextBefore;
  const hunkLines: string[] = [];

  // Context before
  for (let i = prefixLen - contextBefore; i < prefixLen; i++) {
    hunkLines.push(` ${oldLines[i]}`);
  }

  // Removed lines
  for (const line of oldChanged) {
    hunkLines.push(`-${line}`);
  }

  // Added lines
  for (const line of newChanged) {
    hunkLines.push(`+${line}`);
  }

  // Context after
  for (let i = oldLines.length - suffixLen; i < oldLines.length - suffixLen + contextAfter; i++) {
    if (i < oldLines.length) {
      hunkLines.push(` ${oldLines[i]}`);
    }
  }

  const oldCount = contextBefore + oldChanged.length + contextAfter;
  const newCount = contextBefore + newChanged.length + contextAfter;

  return {
    hunks: [
      {
        oldStart: hunkOldStart,
        oldCount,
        newStart: hunkNewStart,
        newCount,
        lines: hunkLines,
      },
    ],
  };
}

// ════════════════════════════════════════════════════
//  Widget
// ════════════════════════════════════════════════════

/**
 * Build a diff widget from unified diff text.
 *
 * 逆向: cE0(T, R) (chunk-004.js:21105-21125)
 * Returns a RichText widget with color-coded spans for each diff line.
 *
 * When an {@link AppTheme} is provided, uses semantic diff colors from the
 * theme (diffAdded, diffRemoved, diffChanged, diffContext). Falls back to
 * hardcoded indexed colors when no theme is available.
 *
 * 逆向: chunk-004.js:21113 `color: R.app.diffAdded`
 * 逆向: chunk-004.js:21115 `color: R.app.diffRemoved`
 *
 * This is a function (not a StatefulWidget) because the diff is immutable
 * once rendered — no state transitions needed.
 *
 * @param diffText - Unified diff text
 * @param appTheme - Optional AppTheme for semantic colors
 */
export function buildDiffWidget(diffText: string, appTheme?: AppTheme): RichText {
  const lines = parseDiffLines(diffText);
  if (lines.length === 0) {
    const contextColor = appTheme?.diffContext ?? DIFF_CONTEXT_COLOR;
    return new RichText({
      text: new TextSpan({
        text: "(no changes)",
        style: new TextStyle({ foreground: contextColor, dim: true }),
      }),
    });
  }

  const spans: TextSpan[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Newline between lines (逆向: cE0 pushes new G("\n") between lines)
    if (i > 0) {
      spans.push(new TextSpan({ text: "\n" }));
    }

    const color = _getLineColor(line.type, appTheme);
    const dim = line.type === "context" || line.type === "meta";

    spans.push(
      new TextSpan({
        text: line.text,
        style: new TextStyle({ foreground: color, dim }),
      }),
    );
  }

  return new RichText({
    text: new TextSpan({ children: spans }),
  });
}

/**
 * Get the color for a diff line type.
 *
 * When an AppTheme is provided, uses semantic colors:
 * 逆向: chunk-004.js:21113 — R.app.diffAdded
 * 逆向: chunk-004.js:21115 — R.app.diffRemoved
 *
 * @param type - Diff line type
 * @param appTheme - Optional AppTheme for semantic colors
 */
function _getLineColor(type: DiffLineType, appTheme?: AppTheme): Color {
  switch (type) {
    case "added":
      return appTheme?.diffAdded ?? DIFF_ADDED_COLOR;
    case "removed":
      return appTheme?.diffRemoved ?? DIFF_REMOVED_COLOR;
    case "context":
      return appTheme?.diffContext ?? DIFF_CONTEXT_COLOR;
    case "meta":
      return DIFF_META_COLOR;
  }
}
