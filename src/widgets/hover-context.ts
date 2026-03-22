// HoverContext — InheritedWidget that propagates hover state to descendants
// Amp ref: J_ class
// Source: .reference/widgets-catalog.md

import { Key } from '../core/key';
import { Widget, InheritedWidget, BuildContext } from '../framework/widget';

/**
 * An InheritedWidget that propagates whether a subtree is currently
 * under mouse hover.
 *
 * Usage:
 *   new HoverContext({
 *     isHovered: true,
 *     child: someWidget,
 *   })
 *
 * Descendants read the hover state via:
 *   HoverContext.of(context) // returns boolean
 *
 * Amp ref: J_ class
 */
export class HoverContext extends InheritedWidget {
  readonly isHovered: boolean;

  constructor(opts: { isHovered: boolean; child: Widget; key?: Key }) {
    super({
      key: opts.key,
      child: opts.child,
    });
    this.isHovered = opts.isHovered;
  }

  /**
   * Look up the nearest ancestor HoverContext and return its isHovered value.
   * Returns false if no HoverContext ancestor is found (default: not hovered).
   */
  static of(context: BuildContext): boolean {
    return HoverContext.maybeOf(context) ?? false;
  }

  /**
   * Look up the nearest ancestor HoverContext and return its isHovered value,
   * or undefined if none is found.
   */
  static maybeOf(context: BuildContext): boolean | undefined {
    const ctx = context as any;
    if (typeof ctx.dependOnInheritedWidgetOfExactType === 'function') {
      const element = ctx.dependOnInheritedWidgetOfExactType(HoverContext);
      if (element) {
        const widget = element.widget as HoverContext;
        return widget.isHovered;
      }
    }
    return undefined;
  }

  updateShouldNotify(oldWidget: InheritedWidget): boolean {
    const old = oldWidget as HoverContext;
    return this.isHovered !== old.isHovered;
  }
}
