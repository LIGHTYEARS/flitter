/**
 * HelpTable — responsive two-column table widget.
 *
 * Renders rows as single RichText lines with padded left column + right column,
 * matching amp's approach where each row is a single text span with space-padding
 * alignment between columns.
 *
 * 逆向参考:
 * - class U8R at misc_utils.js:9825-9887
 * - Left-column width constant: hz0 = 24 (2026_tail_anonymous.js:23679)
 * - Each row: RichText( keys(styled) + " " + desc(styled) + padding + "  " + keys(styled) + " " + desc(styled) )
 * - Padding: " ".repeat(Math.max(0, hz0 - (keys.length + 1 + desc.length)))
 *
 * @module
 */

import type { Widget as WidgetInterface } from "../tree/element.js";
import { type BuildContext, StatelessWidget } from "../tree/stateless-widget.js";
import type { Key } from "../tree/widget.js";
import { Column } from "./column.js";
import { RichText } from "./rich-text.js";
import { TextSpan } from "./text-span.js";

// ════════════════════════════════════════════════════
//  Constants
// ════════════════════════════════════════════════════

/**
 * Default left-column width.
 *
 * 逆向: hz0 = 24 (2026_tail_anonymous.js:23679)
 * This is the fixed character width allocated for the left column content.
 */
const DEFAULT_LEFT_COLUMN_WIDTH = 24;

/**
 * Gap string inserted between left and right columns.
 *
 * 逆向: misc_utils.js:9858 — `new G(o + "  ", t)` — padding ends with 2 extra spaces
 */
const COLUMN_GAP = "  ";

// ════════════════════════════════════════════════════
//  Types
// ════════════════════════════════════════════════════

/** A single row in the help table: left entry + right entry. */
export interface HelpTableRow {
  /** Left column content — plain string or pre-styled TextSpan. */
  left: string | TextSpan;
  /** Right column content — plain string or pre-styled TextSpan. */
  right: string | TextSpan;
}

/** HelpTable constructor arguments. */
interface HelpTableArgs {
  /** Optional widget key. */
  key?: Key;
  /** Table rows — each with a left and right entry. */
  rows: HelpTableRow[];
  /**
   * Override for left-column width in characters.
   * When omitted, uses the amp default of 24 (hz0).
   */
  leftColumnWidth?: number;
}

// ════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════

/**
 * Compute the plain-text length of a column entry.
 *
 * For a plain string, returns string.length.
 * For a TextSpan, recursively extracts plain text via toPlainText().
 */
function entryTextLength(entry: string | TextSpan): number {
  if (typeof entry === "string") return entry.length;
  return entry.toPlainText().length;
}

/**
 * Convert a column entry to a TextSpan (wrapping plain strings).
 */
function entryToSpan(entry: string | TextSpan): TextSpan {
  if (entry instanceof TextSpan) return entry;
  return new TextSpan({ text: entry });
}

// ════════════════════════════════════════════════════
//  HelpTable Widget
// ════════════════════════════════════════════════════

/**
 * Two-column help table widget.
 *
 * Renders each row as a single RichText with the left entry padded to a fixed
 * width, followed by a gap, then the right entry. This matches amp's U8R
 * implementation which uses space-padding rather than layout widgets for
 * column alignment.
 *
 * 逆向: U8R at misc_utils.js:9825 — shortcuts popup table
 *
 * @example
 * ```ts
 * const table = new HelpTable({
 *   rows: [
 *     { left: "Ctrl+O", right: "command palette" },
 *     { left: "Ctrl+R", right: "prompt history" },
 *   ],
 * });
 * ```
 *
 * @example Using TextSpan for styled entries:
 * ```ts
 * const table = new HelpTable({
 *   rows: [
 *     {
 *       left: new TextSpan({
 *         children: [
 *           new TextSpan({ text: "Ctrl+O", style: keyStyle }),
 *           new TextSpan({ text: " command palette", style: descStyle }),
 *         ],
 *       }),
 *       right: new TextSpan({
 *         children: [
 *           new TextSpan({ text: "Ctrl+R", style: keyStyle }),
 *           new TextSpan({ text: " prompt history", style: descStyle }),
 *         ],
 *       }),
 *     },
 *   ],
 * });
 * ```
 */
export class HelpTable extends StatelessWidget {
  /** Table rows. */
  readonly rows: HelpTableRow[];

  /** Fixed left-column width in characters. */
  readonly leftColumnWidth: number;

  constructor(args: HelpTableArgs) {
    super({ key: args.key });
    this.rows = args.rows;
    this.leftColumnWidth = args.leftColumnWidth ?? DEFAULT_LEFT_COLUMN_WIDTH;
  }

  /**
   * Build the widget tree.
   *
   * 逆向: U8R.build() at misc_utils.js:9833-9887
   * - For each row: compute left entry text length
   * - Pad with spaces to fill leftColumnWidth
   * - Append COLUMN_GAP ("  ") then right entry
   * - Wrap in a single RichText
   * - Stack all rows in a Column
   */
  build(_context: BuildContext): WidgetInterface {
    const rowWidgets = this.rows.map((row) => {
      const leftLen = entryTextLength(row.left);
      // 逆向: o = " ".repeat(Math.max(0, hz0 - l))  (misc_utils.js:9854)
      const padding = " ".repeat(Math.max(0, this.leftColumnWidth - leftLen));

      const leftSpan = entryToSpan(row.left);
      const rightSpan = entryToSpan(row.right);

      // 逆向: misc_utils.js:9857-9858
      // new xT({ text: new G("", void 0, [leftSpan, padding+"  ", rightSpan]) })
      // Single RichText per row with padding between columns
      return new RichText({
        text: new TextSpan({
          children: [leftSpan, new TextSpan({ text: padding + COLUMN_GAP }), rightSpan],
        }),
      });
    });

    return new Column({
      crossAxisAlignment: "start",
      mainAxisSize: "min",
      children: rowWidgets,
    }) as unknown as WidgetInterface;
  }
}

export { DEFAULT_LEFT_COLUMN_WIDTH };
