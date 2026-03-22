// DiffView widget — StatelessWidget that parses unified diff and renders with coloring
// Amp ref: Bn class — diff viewer with line-by-line coloring
// Source: .reference/widgets-catalog.md

import { Key } from '../core/key';
import { Color } from '../core/color';
import { TextStyle } from '../core/text-style';
import { TextSpan } from '../core/text-span';
import {
  Widget,
  StatelessWidget,
  type BuildContext,
} from '../framework/widget';
import { Column } from './flex';
import { Text } from './text';
import { Theme, type ThemeData } from './theme';
import { AppTheme, type AppThemeData } from './app-theme';
import { syntaxHighlight } from './syntax-highlight';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Classification of a diff line for styling purposes. */
type DiffLineType = 'addition' | 'deletion' | 'hunk-header' | 'context' | 'meta';

/** A parsed diff line with its type and original/new line numbers. */
interface DiffLine {
  readonly type: DiffLineType;
  readonly content: string;
  readonly oldLineNumber?: number;
  readonly newLineNumber?: number;
}

/** A parsed hunk from a unified diff. */
interface DiffHunk {
  readonly header: string;
  readonly lines: DiffLine[];
  readonly oldStart: number;
  readonly newStart: number;
}

// ---------------------------------------------------------------------------
// DiffView (Amp: Bn)
// ---------------------------------------------------------------------------

/**
 * A StatelessWidget that parses unified diff text and renders it with coloring.
 *
 * Each line is styled according to its diff type:
 * - Addition lines ('+') are shown in green (diffAdded from Theme)
 * - Deletion lines ('-') are shown in red (diffRemoved from Theme)
 * - Hunk headers ('@@ ... @@') are shown in info/cyan
 * - Context lines are shown in normal text color
 *
 * Usage:
 *   new DiffView({
 *     diff: unifiedDiffString,
 *     showLineNumbers: true,
 *     context: 3,
 *   })
 *
 * Amp ref: Bn class
 */
export class DiffView extends StatelessWidget {
  readonly diff: string;
  readonly showLineNumbers: boolean;
  readonly context?: number;

  constructor(opts: {
    key?: Key;
    diff: string;
    showLineNumbers?: boolean;
    context?: number;
    filePath?: string;
  }) {
    super(opts.key !== undefined ? { key: opts.key } : undefined);
    this.diff = opts.diff;
    this.showLineNumbers = opts.showLineNumbers ?? true;
    this.context = opts.context;
    this.filePath = opts.filePath;
  }

  /** Optional filePath hint for syntax highlighting of diff content. */
  readonly filePath?: string;

  build(context: BuildContext): Widget {
    const themeData = Theme.maybeOf(context);
    const appThemeData = AppTheme.maybeOf(context);
    const hunks = DiffView.parseDiff(this.diff);
    const lines = this._collectDisplayLines(hunks);
    const children: Widget[] = [];

    for (const line of lines) {
      const style = this._styleForLineType(line.type, themeData);
      let displayText: string;

      if (this.showLineNumbers && line.type !== 'meta' && line.type !== 'hunk-header') {
        const oldNum = line.oldLineNumber !== undefined
          ? String(line.oldLineNumber).padStart(4, ' ')
          : '    ';
        const newNum = line.newLineNumber !== undefined
          ? String(line.newLineNumber).padStart(4, ' ')
          : '    ';
        displayText = `${oldNum} ${newNum} ${line.content}`;
      } else {
        displayText = line.content;
      }

      // When AppTheme is present with syntax highlight config, colorize
      // addition and context line content using syntax highlighting.
      if (
        appThemeData &&
        this.filePath &&
        (line.type === 'addition' || line.type === 'context')
      ) {
        // Strip the leading +/space character for highlighting
        const rawContent = line.content.length > 0 ? line.content.slice(1) : '';
        if (rawContent.length > 0) {
          const highlightedSpans = syntaxHighlight(rawContent, appThemeData.syntaxHighlight, this.filePath);
          if (highlightedSpans.length > 0) {
            // Build prefix (line numbers + leading char)
            const prefix = this.showLineNumbers && line.type !== 'meta' && line.type !== 'hunk-header'
              ? (() => {
                  const oldNum = line.oldLineNumber !== undefined
                    ? String(line.oldLineNumber).padStart(4, ' ')
                    : '    ';
                  const newNum = line.newLineNumber !== undefined
                    ? String(line.newLineNumber).padStart(4, ' ')
                    : '    ';
                  return `${oldNum} ${newNum} ${line.content.charAt(0)}`;
                })()
              : line.content.charAt(0);

            const prefixSpan = new TextSpan({ text: prefix, style });
            const highlightedChildren = [prefixSpan, ...highlightedSpans];
            children.push(
              new Text({
                text: new TextSpan({ children: highlightedChildren }),
              }),
            );
            continue;
          }
        }
      }

      children.push(
        new Text({
          text: new TextSpan({ text: displayText, style }),
        }),
      );
    }

    // If no lines parsed, render a single empty line
    if (children.length === 0) {
      children.push(
        new Text({
          text: new TextSpan({ text: '', style: new TextStyle() }),
        }),
      );
    }

    return new Column({ children });
  }

  // ---------------------------------------------------------------------------
  // Diff Parsing
  // ---------------------------------------------------------------------------

  /**
   * Parse a unified diff string into hunks.
   * Exported as static for testability.
   */
  static parseDiff(diff: string): DiffHunk[] {
    const lines = diff.split('\n');
    const hunks: DiffHunk[] = [];
    let currentHunk: {
      header: string;
      lines: DiffLine[];
      oldStart: number;
      newStart: number;
      oldLine: number;
      newLine: number;
    } | undefined;

    for (const rawLine of lines) {
      // Hunk header: @@ -old,count +new,count @@
      const hunkMatch = rawLine.match(/^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@(.*)$/);

      if (hunkMatch) {
        // Save previous hunk
        if (currentHunk) {
          hunks.push({
            header: currentHunk.header,
            lines: currentHunk.lines,
            oldStart: currentHunk.oldStart,
            newStart: currentHunk.newStart,
          });
        }

        const oldStart = parseInt(hunkMatch[1]!, 10);
        const newStart = parseInt(hunkMatch[2]!, 10);

        currentHunk = {
          header: rawLine,
          lines: [],
          oldStart,
          newStart,
          oldLine: oldStart,
          newLine: newStart,
        };
        continue;
      }

      // Meta lines (--- a/file, +++ b/file, diff --git, index, etc.)
      if (!currentHunk) {
        // Lines before any hunk are meta lines
        // Skip empty trailing lines
        if (rawLine.length > 0) {
          // We don't create hunks for meta lines; they're handled separately
          // But to display them, we'll create a virtual meta hunk
          if (hunks.length === 0 || hunks[hunks.length - 1]!.header !== '__meta__') {
            hunks.push({
              header: '__meta__',
              lines: [],
              oldStart: 0,
              newStart: 0,
            });
          }
          hunks[hunks.length - 1]!.lines.push({
            type: 'meta',
            content: rawLine,
          });
        }
        continue;
      }

      // Inside a hunk: classify lines
      if (rawLine.startsWith('+')) {
        currentHunk.lines.push({
          type: 'addition',
          content: rawLine,
          newLineNumber: currentHunk.newLine,
        });
        currentHunk.newLine++;
      } else if (rawLine.startsWith('-')) {
        currentHunk.lines.push({
          type: 'deletion',
          content: rawLine,
          oldLineNumber: currentHunk.oldLine,
        });
        currentHunk.oldLine++;
      } else if (rawLine === '\\ No newline at end of file') {
        currentHunk.lines.push({
          type: 'meta',
          content: rawLine,
        });
      } else {
        // Context line (starts with ' ' or is empty within hunk)
        currentHunk.lines.push({
          type: 'context',
          content: rawLine,
          oldLineNumber: currentHunk.oldLine,
          newLineNumber: currentHunk.newLine,
        });
        currentHunk.oldLine++;
        currentHunk.newLine++;
      }
    }

    // Save the last hunk
    if (currentHunk) {
      hunks.push({
        header: currentHunk.header,
        lines: currentHunk.lines,
        oldStart: currentHunk.oldStart,
        newStart: currentHunk.newStart,
      });
    }

    return hunks;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Collect all display lines from parsed hunks, applying context filtering
   * if this.context is specified.
   */
  private _collectDisplayLines(hunks: DiffHunk[]): DiffLine[] {
    const result: DiffLine[] = [];

    for (const hunk of hunks) {
      if (hunk.header === '__meta__') {
        // Add meta lines directly
        result.push(...hunk.lines);
        continue;
      }

      // Add hunk header line
      result.push({
        type: 'hunk-header',
        content: hunk.header,
      });

      if (this.context !== undefined) {
        // Filter to only show N context lines around changes
        const filteredLines = this._filterContextLines(hunk.lines, this.context);
        result.push(...filteredLines);
      } else {
        result.push(...hunk.lines);
      }
    }

    return result;
  }

  /**
   * Filter hunk lines to only include context lines within `n` lines of a change.
   */
  private _filterContextLines(lines: DiffLine[], n: number): DiffLine[] {
    // Mark which lines should be included
    const include = new Array<boolean>(lines.length).fill(false);

    // Find all changed line indices
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (line.type === 'addition' || line.type === 'deletion') {
        // Include this line and n context lines before and after
        for (let j = Math.max(0, i - n); j <= Math.min(lines.length - 1, i + n); j++) {
          include[j] = true;
        }
      }
    }

    const result: DiffLine[] = [];
    let lastIncluded = -1;

    for (let i = 0; i < lines.length; i++) {
      if (include[i]) {
        // Add separator if there's a gap
        if (lastIncluded >= 0 && i - lastIncluded > 1) {
          result.push({
            type: 'meta',
            content: '  ...',
          });
        }
        result.push(lines[i]!);
        lastIncluded = i;
      }
    }

    return result;
  }

  /**
   * Get the TextStyle for a given diff line type, using theme colors if available.
   */
  private _styleForLineType(type: DiffLineType, themeData?: ThemeData): TextStyle {
    switch (type) {
      case 'addition':
        return new TextStyle({
          foreground: themeData?.diffAdded ?? Color.rgb(80, 200, 120),
        });
      case 'deletion':
        return new TextStyle({
          foreground: themeData?.diffRemoved ?? Color.rgb(240, 80, 80),
        });
      case 'hunk-header':
        return new TextStyle({
          foreground: themeData?.info ?? Color.rgb(97, 175, 239),
        });
      case 'meta':
        return new TextStyle({
          foreground: themeData?.textSecondary ?? Color.rgb(150, 150, 150),
          bold: true,
        });
      case 'context':
      default:
        return new TextStyle({
          foreground: themeData?.text ?? Color.rgb(220, 220, 220),
        });
    }
  }
}
