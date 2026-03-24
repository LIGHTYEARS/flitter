// AppTheme — InheritedWidget that provides application-specific theme data
// Amp ref: h8 class. Distinct from Theme (w3) — both coexist in widget tree.
// AppTheme provides syntax highlighting config, app-level colors, etc.
// Source: .reference/widgets-catalog.md

import { Key } from '../core/key';
import { Color } from '../core/color';
import { Widget, InheritedWidget, BuildContext } from '../framework/widget';

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

/**
 * Configuration for syntax highlighting colors.
 * Each field maps a token type to a Color used for rendering.
 */
export interface SyntaxHighlightConfig {
  readonly keyword: Color;
  readonly string: Color;
  readonly comment: Color;
  readonly number: Color;
  readonly type: Color;
  readonly function: Color;
  readonly operator: Color;
  readonly punctuation: Color;
  readonly variable: Color;
  readonly property: Color;
  readonly tag: Color;
  readonly attribute: Color;
  readonly default: Color;
}

/**
 * Application-level theme data, distinct from ThemeData (which provides
 * base UI colors). AppThemeData provides syntax highlighting configuration
 * and additional app-specific color definitions.
 */
export interface AppThemeData {
  readonly syntaxHighlight: SyntaxHighlightConfig;
  readonly colors: {
    readonly background: Color;
    readonly foreground: Color;
    readonly accent: Color;
    readonly muted: Color;
    readonly border: Color;
  };
}

// ---------------------------------------------------------------------------
// AppTheme InheritedWidget (Amp: h8)
// ---------------------------------------------------------------------------

/**
 * An InheritedWidget that propagates AppThemeData down the widget tree.
 *
 * Usage:
 *   new AppTheme({
 *     data: AppTheme.defaultTheme(),
 *     child: appRoot,
 *   })
 *
 * Descendants read the theme via:
 *   AppTheme.of(context)
 *
 * AppTheme is DISTINCT from Theme (w3) -- both can coexist as ancestors
 * in the widget tree. Theme provides base UI colors; AppTheme provides
 * application-specific configuration like syntax highlighting.
 *
 * Amp ref: h8 class
 */
export class AppTheme extends InheritedWidget {
  readonly data: AppThemeData;

  constructor(opts: { data: AppThemeData; child: Widget; key?: Key }) {
    super({
      key: opts.key,
      child: opts.child,
    });
    this.data = opts.data;
  }

  /**
   * Look up the nearest ancestor AppTheme and return its AppThemeData.
   * Throws if no AppTheme ancestor is found.
   */
  static of(context: BuildContext): AppThemeData {
    const result = AppTheme.maybeOf(context);
    if (result === undefined) {
      throw new Error(
        'AppTheme.of() called with a context that does not contain an AppTheme ancestor. ' +
          'Ensure an AppTheme widget is an ancestor of this widget.',
      );
    }
    return result;
  }

  /**
   * Look up the nearest ancestor AppTheme and return its AppThemeData,
   * or undefined if none is found.
   */
  static maybeOf(context: BuildContext): AppThemeData | undefined {
    const ctx = context as any;
    if (typeof ctx.dependOnInheritedWidgetOfExactType === 'function') {
      const element = ctx.dependOnInheritedWidgetOfExactType(AppTheme);
      if (element) {
        const widget = element.widget as AppTheme;
        return widget.data;
      }
    }
    return undefined;
  }

  /**
   * Returns a default AppTheme matching Amp CLI's app theme (XP.default("dark")).
   * Uses ANSI named colors so the palette adapts to the user's terminal theme.
   */
  static defaultTheme(): AppThemeData {
    return {
      syntaxHighlight: {
        keyword: Color.blue,            // Amp: w0.blue
        string: Color.green,            // Amp: w0.green
        comment: Color.brightBlack,     // Amp: w0.index(8) — dark gray
        number: Color.yellow,           // Amp: w0.yellow
        type: Color.magenta,            // Amp: w0.magenta
        function: Color.cyan,           // Amp: w0.cyan
        operator: Color.defaultColor,   // Amp: w0.default()
        punctuation: Color.defaultColor, // Amp: no explicit — use terminal default
        variable: Color.defaultColor,   // Amp: w0.default()
        property: Color.defaultColor,   // Amp: no explicit — use terminal default
        tag: Color.red,                 // Amp: closest to destructive/red
        attribute: Color.yellow,        // Amp: closest to number/yellow
        default: Color.defaultColor,    // Amp: w0.default()
      },
      colors: {
        background: Color.defaultColor,  // Amp: transparent / terminal bg
        foreground: Color.defaultColor,  // Amp: w0.default() — terminal fg
        accent: Color.magenta,           // Amp: w0.magenta (accent in px)
        muted: Color.brightBlack,        // Amp: w0.index(8) — dark gray
        border: Color.defaultColor,      // Amp: w0.default()
      },
    };
  }

  updateShouldNotify(oldWidget: InheritedWidget): boolean {
    const old = oldWidget as AppTheme;
    return !appThemeDataEquals(this.data, old.data);
  }
}

// ---------------------------------------------------------------------------
// Equality helpers
// ---------------------------------------------------------------------------

function syntaxHighlightConfigEquals(
  a: SyntaxHighlightConfig,
  b: SyntaxHighlightConfig,
): boolean {
  return (
    a.keyword.equals(b.keyword) &&
    a.string.equals(b.string) &&
    a.comment.equals(b.comment) &&
    a.number.equals(b.number) &&
    a.type.equals(b.type) &&
    a.function.equals(b.function) &&
    a.operator.equals(b.operator) &&
    a.punctuation.equals(b.punctuation) &&
    a.variable.equals(b.variable) &&
    a.property.equals(b.property) &&
    a.tag.equals(b.tag) &&
    a.attribute.equals(b.attribute) &&
    a.default.equals(b.default)
  );
}

function appThemeDataEquals(a: AppThemeData, b: AppThemeData): boolean {
  return (
    syntaxHighlightConfigEquals(a.syntaxHighlight, b.syntaxHighlight) &&
    a.colors.background.equals(b.colors.background) &&
    a.colors.foreground.equals(b.colors.foreground) &&
    a.colors.accent.equals(b.colors.accent) &&
    a.colors.muted.equals(b.colors.muted) &&
    a.colors.border.equals(b.colors.border)
  );
}
