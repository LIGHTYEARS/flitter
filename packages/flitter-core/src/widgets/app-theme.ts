// AppTheme — InheritedModel that provides application-specific theme data
// Amp ref: h8 class. Distinct from Theme (w3) — both coexist in widget tree.
// AppTheme provides syntax highlighting config, app-level colors, etc.
// Source: .reference/widgets-catalog.md

import { Key } from '../core/key';
import { Color } from '../core/color';
import { Widget, InheritedModel, InheritedWidget, BuildContext } from '../framework/widget';

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
// AppTheme InheritedModel (Amp: h8)
// ---------------------------------------------------------------------------

export type AppThemeAspect = 'syntaxHighlight' | 'colors';

export class AppTheme extends InheritedModel<AppThemeAspect> {
  readonly data: AppThemeData;

  constructor(opts: { data: AppThemeData; child: Widget; key?: Key }) {
    super({
      key: opts.key,
      child: opts.child,
    });
    this.data = opts.data;
  }

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

  static maybeOf(context: BuildContext): AppThemeData | undefined {
    if (typeof context.dependOnInheritedWidgetOfExactType === 'function') {
      const element = context.dependOnInheritedWidgetOfExactType(AppTheme);
      if (element) {
        const widget = element.widget as AppTheme;
        return widget.data;
      }
    }
    return undefined;
  }

  static syntaxHighlightOf(context: BuildContext): SyntaxHighlightConfig | undefined {
    const theme = InheritedModel.inheritFrom<AppTheme, AppThemeAspect>(context, {
      widgetType: AppTheme,
      aspect: 'syntaxHighlight',
    });
    return theme?.data.syntaxHighlight;
  }

  static colorsOf(context: BuildContext): AppThemeData['colors'] | undefined {
    const theme = InheritedModel.inheritFrom<AppTheme, AppThemeAspect>(context, {
      widgetType: AppTheme,
      aspect: 'colors',
    });
    return theme?.data.colors;
  }

  static defaultTheme(): AppThemeData {
    return {
      syntaxHighlight: {
        keyword: Color.blue,
        string: Color.green,
        comment: Color.brightBlack,
        number: Color.yellow,
        type: Color.magenta,
        function: Color.cyan,
        operator: Color.defaultColor,
        punctuation: Color.defaultColor,
        variable: Color.defaultColor,
        property: Color.defaultColor,
        tag: Color.red,
        attribute: Color.yellow,
        default: Color.defaultColor,
      },
      colors: {
        background: Color.defaultColor,
        foreground: Color.defaultColor,
        accent: Color.magenta,
        muted: Color.brightBlack,
        border: Color.defaultColor,
      },
    };
  }

  updateShouldNotify(oldWidget: InheritedWidget): boolean {
    const old = oldWidget as AppTheme;
    return !appThemeDataEquals(this.data, old.data);
  }

  updateShouldNotifyDependent(
    oldWidget: InheritedModel<AppThemeAspect>,
    dependencies: Set<AppThemeAspect>,
  ): boolean {
    const old = oldWidget as AppTheme;
    for (const aspect of dependencies) {
      switch (aspect) {
        case 'syntaxHighlight':
          if (!syntaxHighlightConfigEquals(this.data.syntaxHighlight, old.data.syntaxHighlight)) {
            return true;
          }
          break;
        case 'colors':
          if (
            !this.data.colors.background.equals(old.data.colors.background) ||
            !this.data.colors.foreground.equals(old.data.colors.foreground) ||
            !this.data.colors.accent.equals(old.data.colors.accent) ||
            !this.data.colors.muted.equals(old.data.colors.muted) ||
            !this.data.colors.border.equals(old.data.colors.border)
          ) {
            return true;
          }
          break;
      }
    }
    return false;
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
