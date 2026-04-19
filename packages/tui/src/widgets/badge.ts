/**
 * Badge — inline colored pill widget.
 *
 * 逆向: T3R at chunk-006.js:38089 — scroll-aware list view with badges
 *       chunk-006.js context: badges used in todo lists, notification counts
 *
 * Renders as a compact inline pill: `[3]` or `[NEW]` with colored background.
 * Simple StatelessWidget with no interactivity.
 *
 * @module
 */

import type { Widget as WidgetInterface } from "../tree/element.js";
import { type BuildContext, StatelessWidget } from "../tree/stateless-widget.js";
import type { Key } from "../tree/widget.js";
import { RichText } from "./rich-text.js";
import { TextSpan } from "./text-span.js";
import { TextStyle } from "../screen/text-style.js";
import { Color } from "../screen/color.js";

// ════════════════════════════════════════════════════
//  Badge Widget
// ════════════════════════════════════════════════════

/** Badge constructor arguments. */
interface BadgeArgs {
  /** Optional key */
  key?: Key;
  /** Numeric count to display (e.g., 3 -> "[3]") */
  count?: number;
  /** Text label to display (e.g., "NEW" -> "[NEW]") */
  label?: string;
  /** Badge foreground color */
  color?: Color;
  /** Badge background color */
  backgroundColor?: Color;
  /** Whether to use bold text */
  bold?: boolean;
}

/**
 * Badge Widget.
 *
 * Renders as an inline colored pill: `[3]` or `[NEW]`.
 * If both count and label are provided, count takes precedence.
 * If neither is provided, renders an empty badge `[●]`.
 *
 * 逆向: T3R at chunk-006.js:38089 — used in list views with counts
 *
 * @example
 * ```ts
 * new Badge({ count: 3 });           // renders: [3]
 * new Badge({ label: "NEW" });       // renders: [NEW]
 * new Badge({ count: 42, color: Color.red() }); // renders: [42] in red
 * ```
 */
export class Badge extends StatelessWidget {
  readonly count: number | undefined;
  readonly label: string | undefined;
  readonly color: Color;
  readonly backgroundColor: Color | undefined;
  readonly bold: boolean;

  constructor(args: BadgeArgs) {
    super({ key: args.key });
    this.count = args.count;
    this.label = args.label;
    this.color = args.color ?? Color.yellow();
    this.backgroundColor = args.backgroundColor;
    this.bold = args.bold ?? true;
  }

  build(_context: BuildContext): WidgetInterface {
    // Determine display text
    let content: string;
    if (this.count !== undefined) {
      content = String(this.count);
    } else if (this.label) {
      content = this.label;
    } else {
      content = "●";
    }

    const text = `[${content}]`;

    return new RichText({
      text: new TextSpan({
        text,
        style: new TextStyle({
          foreground: this.color,
          bold: this.bold,
          ...(this.backgroundColor ? { background: this.backgroundColor } : {}),
        }),
      }),
    }) as unknown as WidgetInterface;
  }
}
