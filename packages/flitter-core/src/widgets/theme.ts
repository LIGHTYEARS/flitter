// Theme — InheritedModel that provides color scheme data to descendants
// Migrated from InheritedWidget to InheritedModel for aspect-based dependency
// tracking (GAP-SUM-071 / W5-4). Dependents can subscribe to specific aspects
// (e.g. 'primary', 'diffAdded') and only rebuild when those aspects change.
// Amp ref: w3 class. DiffView, Button, RenderText all read colors from Theme.
// Source: .reference/widgets-catalog.md

import { Key } from '../core/key';
import { Color } from '../core/color';
import { Widget, InheritedModel, InheritedWidget, BuildContext } from '../framework/widget';

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
 * Aspect type for Theme — each key of ThemeData is a subscribable aspect.
 * Consumers that only need e.g. 'diffAdded' can use Theme.aspectOf() to
 * avoid rebuilds when unrelated colors change.
 */
export type ThemeAspect = keyof ThemeData;

/**
 * An InheritedModel that propagates ThemeData down the widget tree with
 * fine-grained aspect-based dependency tracking.
 *
 * Usage:
 *   new Theme({
 *     data: Theme.defaultTheme(),
 *     child: appRoot,
 *   })
 *
 * Descendants read the full theme (unconditional rebuild) via:
 *   Theme.of(context)
 *
 * Descendants that only need specific aspects use:
 *   Theme.aspectOf(context, 'primary')
 *   Theme.aspectOf(context, 'diffAdded')
 *
 * Amp ref: w3 class
 */
export class Theme extends InheritedModel<ThemeAspect> {
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
   * Registers an unconditional dependency — the caller rebuilds whenever
   * any theme color changes.
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
   * Registers an unconditional dependency (rebuilds on any change).
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
   * Look up the nearest ancestor Theme and return its ThemeData,
   * registering a dependency on a specific aspect only.
   * The caller will only rebuild when the specified aspect changes.
   *
   * @param context - The BuildContext of the consuming widget
   * @param aspect - The ThemeData field to subscribe to (e.g. 'primary', 'diffAdded')
   * @returns The ThemeData, or undefined if no Theme ancestor exists
   */
  static aspectOf(context: BuildContext, aspect: ThemeAspect): ThemeData | undefined {
    const theme = InheritedModel.inheritFrom<Theme, ThemeAspect>(context, {
      widgetType: Theme,
      aspect,
    });
    return theme?.data;
  }

  /**
   * Returns a default theme matching Amp CLI's color scheme (px.default()).
   * Uses ANSI named colors so the palette adapts to the user's terminal theme.
   */
  static defaultTheme(): ThemeData {
    return {
      primary: Color.blue,             // Amp: w0.blue
      background: Color.defaultColor,  // Amp: w0.none() — transparent, terminal bg shows through
      surface: Color.defaultColor,     // Amp: no direct equivalent, use terminal default
      text: Color.defaultColor,        // Amp: w0.default() — terminal foreground
      textSecondary: Color.defaultColor, // Amp: w0.default() (mutedForeground)
      success: Color.green,            // Amp: w0.green
      error: Color.red,               // Amp: w0.red (destructive)
      warning: Color.yellow,           // Amp: w0.yellow
      info: Color.brightBlue,          // Amp: w0.index(12) — bright blue
      border: Color.defaultColor,      // Amp: w0.default()
      scrollbarThumb: Color.defaultColor, // Amp: w0.default()
      scrollbarTrack: Color.brightBlack, // Amp: w0.index(8) — dark gray
      diffAdded: Color.green,          // Amp: w0.green
      diffRemoved: Color.red,          // Amp: w0.red
      selectionBackground: Color.brightBlack, // Amp: w0.index(8)
    };
  }

  /**
   * Coarse-grained notification check (InheritedWidget contract).
   * Returns true if any color field changed between old and new widget.
   */
  updateShouldNotify(oldWidget: InheritedWidget): boolean {
    const old = oldWidget as Theme;
    return !themeDataEquals(this.data, old.data);
  }

  /**
   * Fine-grained notification check (InheritedModel contract).
   * Only returns true if at least one of the aspects the dependent
   * subscribed to actually changed.
   */
  updateShouldNotifyDependent(
    oldWidget: InheritedModel<ThemeAspect>,
    dependencies: Set<ThemeAspect>,
  ): boolean {
    const old = oldWidget as Theme;
    for (const aspect of dependencies) {
      if (!this.data[aspect].equals(old.data[aspect])) {
        return true;
      }
    }
    return false;
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
