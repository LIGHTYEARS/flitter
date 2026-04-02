// ForceDim — InheritedWidget that propagates a `forceDim` flag down the tree
// Amp ref: class ao extends yf (InheritedWidget)
//
// When forceDim is true, descendant widgets should render their content
// with dim styling (reduced brightness). Used to visually dim inactive
// or unfocused panes.
//
// Usage:
//   new ForceDim({
//     forceDim: true,
//     child: new Container({ child: ... }),
//   })
//
//   // In a widget's build method:
//   const shouldDim = ForceDim.shouldForceDim(context);

import { Key } from '../core/key';
import { Widget, InheritedWidget, type BuildContext } from '../framework/widget';

/**
 * An InheritedWidget that propagates a `forceDim` flag to descendants.
 *
 * Widgets that support dimming should check `ForceDim.shouldForceDim(context)`
 * in their build or paint methods and apply dim styling accordingly.
 *
 * Amp ref: class ao extends yf
 */
export class ForceDim extends InheritedWidget {
  readonly forceDim: boolean;

  constructor(opts: {
    key?: Key;
    forceDim: boolean;
    child: Widget;
  }) {
    super({ key: opts.key, child: opts.child });
    this.forceDim = opts.forceDim;
  }

  /**
   * Look up the nearest ForceDim ancestor and return its widget, or null.
   */
  static maybeOf(context: BuildContext): ForceDim | null {
    if (typeof context.dependOnInheritedWidgetOfExactType === 'function') {
      const element = context.dependOnInheritedWidgetOfExactType(ForceDim);
      if (element) {
        const widget = element.widget as ForceDim;
        return widget;
      }
    }
    return null;
  }

  /**
   * Returns true if the nearest ForceDim ancestor has forceDim=true.
   * Returns false if no ForceDim ancestor exists.
   */
  static shouldForceDim(context: BuildContext): boolean {
    return ForceDim.maybeOf(context)?.forceDim ?? false;
  }

  updateShouldNotify(oldWidget: ForceDim): boolean {
    return this.forceDim !== oldWidget.forceDim;
  }
}
