/**
 * Toggle / Checkbox widget.
 *
 * 逆向: chunk-006.js:26516 — onChanged: this.widget.props.onToggle
 *       chunk-006.js:26967 — onClick: () => this.widget.props.onToggle(!a)
 *       P0R at chunk-006.js:23274 — render object for toggle-like measurement
 *
 * A focusable toggle widget that displays a checkbox indicator with an
 * optional label. Supports keyboard interaction (Space to toggle, Enter
 * to confirm) and mouse click.
 *
 * @module
 */

import type { Widget as WidgetInterface } from "../tree/element.js";
import { type BuildContext, StatelessWidget } from "../tree/stateless-widget.js";
import type { Key } from "../tree/widget.js";
import { Row } from "./row.js";
import { Text } from "./text.js";
import { Focus } from "./focus.js";
import { GestureDetector } from "./gesture-detector.js";
import { TextSpan } from "./text-span.js";
import { RichText } from "./rich-text.js";
import { TextStyle } from "../screen/text-style.js";
import { Color } from "../screen/color.js";

// ════════════════════════════════════════════════════
//  Toggle indicator characters
// ════════════════════════════════════════════════════

/**
 * Visual indicators for toggle state.
 *
 * 逆向: amp uses various toggle indicators depending on context:
 *   chunk-006.js:26967 — expandable sections with toggle
 *   Uses ● / ○ for radio-style, [x] / [ ] for checkbox-style
 */
const CHECKED_INDICATOR = "●";
const UNCHECKED_INDICATOR = "○";
const CHECKED_BOX = "[x]";
const UNCHECKED_BOX = "[ ]";

// ════════════════════════════════════════════════════
//  Toggle Widget
// ════════════════════════════════════════════════════

/** Toggle visual style. */
export type ToggleStyle = "circle" | "checkbox";

/** Toggle constructor arguments. */
interface ToggleArgs {
  /** Optional key */
  key?: Key;
  /** Current toggle state */
  value: boolean;
  /** Called when the toggle state changes */
  onChanged: (value: boolean) => void;
  /** Optional label text */
  label?: string;
  /** Visual style: "circle" (●/○) or "checkbox" ([x]/[ ]) */
  style?: ToggleStyle;
  /** Whether the widget can receive focus, default true */
  autofocus?: boolean;
  /** Custom color for checked state */
  checkedColor?: Color;
  /** Debug label for the focus node */
  debugLabel?: string;
}

/**
 * Toggle / Checkbox Widget.
 *
 * Displays a focusable toggle indicator with optional label.
 * Supports keyboard (Space/Enter) and mouse click toggling.
 *
 * 逆向: chunk-006.js:26516 — onChanged callback pattern
 *       chunk-006.js:26967 — onClick toggle pattern
 *
 * @example
 * ```ts
 * new Toggle({
 *   value: isEnabled,
 *   onChanged: (v) => { isEnabled = v; },
 *   label: "Enable feature",
 *   style: "checkbox",
 * });
 * ```
 */
export class Toggle extends StatelessWidget {
  readonly value: boolean;
  readonly onChanged: (value: boolean) => void;
  readonly label: string | undefined;
  readonly toggleStyle: ToggleStyle;
  readonly autofocus: boolean;
  readonly checkedColor: Color | undefined;
  readonly debugLabel: string | undefined;

  constructor(args: ToggleArgs) {
    super({ key: args.key });
    this.value = args.value;
    this.onChanged = args.onChanged;
    this.label = args.label;
    this.toggleStyle = args.style ?? "circle";
    this.autofocus = args.autofocus ?? false;
    this.checkedColor = args.checkedColor;
    this.debugLabel = args.debugLabel;
  }

  /**
   * Build the toggle widget.
   *
   * Structure: Focus > GestureDetector > Row > [indicator, label?]
   *
   * 逆向: amp wraps toggleable elements in Focus + click handler
   */
  build(_context: BuildContext): WidgetInterface {
    const indicator = this._buildIndicator();
    const children: WidgetInterface[] = [indicator as unknown as WidgetInterface];

    if (this.label) {
      children.push(
        new Text({ data: ` ${this.label}` }) as unknown as WidgetInterface,
      );
    }

    const row = new Row({ children }) as unknown as WidgetInterface;

    // Wrap in GestureDetector for mouse click
    const clickable = new GestureDetector({
      onTap: () => this.onChanged(!this.value),
      child: row,
    }) as unknown as WidgetInterface;

    // Wrap in Focus for keyboard interaction
    // 逆向: chunk-006.js uses C8 (Focus) wrapper with onKey handler
    return new Focus({
      autofocus: this.autofocus,
      debugLabel: this.debugLabel ?? "Toggle",
      onKey: (event) => {
        if (event.key === " " || event.key === "Enter") {
          this.onChanged(!this.value);
          return "handled";
        }
        return "ignored";
      },
      child: clickable,
    }) as unknown as WidgetInterface;
  }

  /**
   * Build the indicator part (●/○ or [x]/[ ]).
   */
  private _buildIndicator(): RichText {
    let text: string;
    if (this.toggleStyle === "checkbox") {
      text = this.value ? CHECKED_BOX : UNCHECKED_BOX;
    } else {
      text = this.value ? CHECKED_INDICATOR : UNCHECKED_INDICATOR;
    }

    const color = this.value
      ? (this.checkedColor ?? Color.green())
      : Color.rgb(128, 128, 128);

    return new RichText({
      text: new TextSpan({
        text,
        style: new TextStyle({ foreground: color }),
      }),
    });
  }
}
