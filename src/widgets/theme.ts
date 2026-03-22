// Theme — InheritedWidget that provides color scheme data to descendants
// Amp ref: w3 class. DiffView, Button, RenderText all read colors from Theme.
// Source: .reference/widgets-catalog.md

import { Key } from '../core/key';
import { Color } from '../core/color';
import { Widget, InheritedWidget, BuildContext } from '../framework/widget';

/**
 * Immutable data class holding all color definitions for a theme.
 *
 * Every field is a Color — consumers call Theme.of(context) to obtain
 * the ThemeData and then read the specific color they need.
 */
export interface ThemeData {
  readonly primary: Color;
  readonly background: Color;
  readonly surface: Color;
  readonly text: Color;
  readonly textSecondary: Color;
  readonly success: Color;
  readonly error: Color; // called "destructive" in Amp
  readonly warning: Color;
  readonly info: Color;
  readonly border: Color;
  readonly scrollbarThumb: Color;
  readonly scrollbarTrack: Color;
  readonly diffAdded: Color;
  readonly diffRemoved: Color;
  readonly selectionBackground: Color;
}

/**
 * An InheritedWidget that propagates ThemeData down the widget tree.
 *
 * Usage:
 *   new Theme({
 *     data: Theme.defaultTheme(),
 *     child: appRoot,
 *   })
 *
 * Descendants read the theme via:
 *   Theme.of(context)
 *
 * Amp ref: w3 class
 */
export class Theme extends InheritedWidget {
  readonly data: ThemeData;

  constructor(opts: { data: ThemeData; child: Widget; key?: Key }) {
    super({
      key: opts.key,
      child: opts.child,
    });
    this.data = opts.data;
  }

  /**
   * Look up the nearest ancestor Theme and return its ThemeData.
   * Throws if no Theme ancestor is found.
   */
  static of(context: BuildContext): ThemeData {
    const result = Theme.maybeOf(context);
    if (result === undefined) {
      throw new Error(
        'Theme.of() called with a context that does not contain a Theme ancestor. ' +
          'Ensure a Theme widget is an ancestor of this widget.',
      );
    }
    return result;
  }

  /**
   * Look up the nearest ancestor Theme and return its ThemeData,
   * or undefined if none is found.
   */
  static maybeOf(context: BuildContext): ThemeData | undefined {
    const ctx = context as any;
    if (typeof ctx.dependOnInheritedWidgetOfExactType === 'function') {
      const element = ctx.dependOnInheritedWidgetOfExactType(Theme);
      if (element) {
        const widget = element.widget as Theme;
        return widget.data;
      }
    }
    return undefined;
  }

  /**
   * Returns a sensible default dark-terminal theme.
   * Colors are chosen for readability on typical dark terminal backgrounds.
   */
  static defaultTheme(): ThemeData {
    return {
      primary: Color.rgb(97, 175, 239), // soft blue
      background: Color.rgb(30, 30, 30), // near-black
      surface: Color.rgb(45, 45, 45), // slightly lighter than bg
      text: Color.rgb(220, 220, 220), // off-white
      textSecondary: Color.rgb(150, 150, 150), // dim gray
      success: Color.rgb(80, 200, 120), // green
      error: Color.rgb(240, 80, 80), // red ("destructive" in Amp)
      warning: Color.rgb(240, 200, 70), // yellow-orange
      info: Color.rgb(97, 175, 239), // same as primary
      border: Color.rgb(80, 80, 80), // medium gray
      scrollbarThumb: Color.rgb(100, 100, 100), // gray
      scrollbarTrack: Color.rgb(40, 40, 40), // dark gray
      diffAdded: Color.rgb(80, 200, 120), // green
      diffRemoved: Color.rgb(240, 80, 80), // red
      selectionBackground: Color.rgb(60, 80, 120), // blue-gray
    };
  }

  updateShouldNotify(oldWidget: InheritedWidget): boolean {
    const old = oldWidget as Theme;
    return !themeDataEquals(this.data, old.data);
  }
}

/**
 * Deep equality check for ThemeData — compares every color field.
 */
function themeDataEquals(a: ThemeData, b: ThemeData): boolean {
  return (
    a.primary.equals(b.primary) &&
    a.background.equals(b.background) &&
    a.surface.equals(b.surface) &&
    a.text.equals(b.text) &&
    a.textSecondary.equals(b.textSecondary) &&
    a.success.equals(b.success) &&
    a.error.equals(b.error) &&
    a.warning.equals(b.warning) &&
    a.info.equals(b.info) &&
    a.border.equals(b.border) &&
    a.scrollbarThumb.equals(b.scrollbarThumb) &&
    a.scrollbarTrack.equals(b.scrollbarTrack) &&
    a.diffAdded.equals(b.diffAdded) &&
    a.diffRemoved.equals(b.diffRemoved) &&
    a.selectionBackground.equals(b.selectionBackground)
  );
}
