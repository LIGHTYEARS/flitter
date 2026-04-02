// DefaultTextStyle — InheritedWidget that cascades TextStyle to descendants
// Amp ref: DefaultTextStyle pattern from Flutter
// Source: .reference/widgets-catalog.md

import { Key } from '../core/key';
import { TextStyle } from '../core/text-style';
import { Widget, InheritedWidget, BuildContext } from '../framework/widget';

/**
 * An InheritedWidget that provides a default TextStyle to descendant Text widgets.
 *
 * Usage:
 *   new DefaultTextStyle({
 *     style: new TextStyle({ bold: true }),
 *     child: someTextWidget,
 *   })
 *
 * Descendant widgets can look up the style via:
 *   DefaultTextStyle.of(context)
 */
export class DefaultTextStyle extends InheritedWidget {
  readonly style: TextStyle;

  constructor(opts: { key?: Key; style: TextStyle; child: Widget }) {
    super({
      key: opts.key,
      child: opts.child,
    });
    this.style = opts.style;
  }

  /**
   * Look up the nearest ancestor DefaultTextStyle and return its style.
   * Returns a default (empty) TextStyle if none is found.
   */
  static of(context: BuildContext): TextStyle {
    return DefaultTextStyle.maybeOf(context) ?? new TextStyle();
  }

  /**
   * Look up the nearest ancestor DefaultTextStyle and return its style,
   * or undefined if none is found.
   */
  static maybeOf(context: BuildContext): TextStyle | undefined {
    if (typeof context.dependOnInheritedWidgetOfExactType === 'function') {
      const element = context.dependOnInheritedWidgetOfExactType(DefaultTextStyle);
      if (element) {
        const widget = element.widget as DefaultTextStyle;
        return widget.style;
      }
    }
    return undefined;
  }

  updateShouldNotify(oldWidget: InheritedWidget): boolean {
    const old = oldWidget as DefaultTextStyle;
    return !this.style.equals(old.style);
  }
}
