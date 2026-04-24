/**
 * AppThemeController — app-semantic color theme via InheritedWidget.
 *
 * {@link AppThemeController} provides semantic color tokens for the entire
 * application UI. While {@link ThemeController} carries base palette data
 * (primary, secondary, surface, etc.), AppThemeController carries
 * purpose-specific colors: tool status, diff highlighting, keybinds,
 * syntax highlighting, scrollbar, selection, mode indicators, etc.
 *
 * Consumers access the theme via `AppThemeController.of(context)`.
 *
 * 逆向: modules/2179_unknown_yS.js — class yS (AppTheme)
 * 逆向: $R.of(T).app — accessed via InheritedWidget from context
 *
 * @example
 * ```ts
 * // In a build method:
 * const appTheme = AppThemeController.of(context);
 * const style = new TextStyle({ color: appTheme.toolSuccess });
 * ```
 *
 * @module
 */

import type { Element, SyntaxHighlightColors, Widget } from "@flitter/tui";
import { Color, InheritedWidget } from "@flitter/tui";

// ════════════════════════════════════════════════════
//  AppTheme interface
// ════════════════════════════════════════════════════

/**
 * App-semantic color theme.
 *
 * Each field is a {@link Color} instance representing a semantic role
 * in the application UI. Matches amp's yS class 1:1.
 *
 * 逆向: modules/2179_unknown_yS.js lines 1-97 — all 47 fields
 */
export interface AppTheme {
  // ── Tool status colors ─────────────────────────────
  /** Tool execution in progress */
  toolRunning: Color;
  /** Tool completed successfully */
  toolSuccess: Color;
  /** Tool encountered an error */
  toolError: Color;
  /** Tool was cancelled */
  toolCancelled: Color;
  /** Tool name label */
  toolName: Color;

  // ── Message colors ─────────────────────────────────
  /** User message text */
  userMessage: Color;
  /** Assistant message text */
  assistantMessage: Color;
  /** System message text */
  systemMessage: Color;

  // ── Code colors ────────────────────────────────────
  /** Code block text */
  codeBlock: Color;
  /** Inline code text */
  inlineCode: Color;
  /** Syntax highlighting sub-colors */
  syntaxHighlight: SyntaxHighlightColors;

  // ── File & reference colors ────────────────────────
  /** File reference link */
  fileReference: Color;
  /** Filename label */
  filename: Color;

  // ── Status colors ──────────────────────────────────
  /** Processing/active state */
  processing: Color;
  /** Waiting state */
  waiting: Color;
  /** Completed state */
  completed: Color;
  /** Cancelled state */
  cancelled: Color;

  // ── UI element colors ──────────────────────────────
  /** Recommendation highlight */
  recommendation: Color;
  /** Suggestion text */
  suggestion: Color;
  /** Command text */
  command: Color;
  /** Keyboard shortcut label */
  keybind: Color;
  /** Button text */
  button: Color;
  /** Link text */
  link: Color;

  // ── Mode indicator colors ──────────────────────────
  /** Shell mode indicator */
  shellMode: Color;
  /** Shell mode hidden/dimmed */
  shellModeHidden: Color;
  /** Handoff mode indicator */
  handoffMode: Color;
  /** Handoff mode dimmed */
  handoffModeDim: Color;
  /** Queue mode indicator */
  queueMode: Color;

  // ── Diff colors ────────────────────────────────────
  /** Added lines in diff */
  diffAdded: Color;
  /** Removed lines in diff */
  diffRemoved: Color;
  /** Changed lines in diff */
  diffChanged: Color;
  /** Context lines in diff */
  diffContext: Color;

  // ── IDE integration colors ─────────────────────────
  /** IDE connected indicator */
  ideConnected: Color;
  /** IDE disconnected indicator */
  ideDisconnected: Color;
  /** IDE warning indicator */
  ideWarning: Color;

  // ── Scrollbar colors ───────────────────────────────
  /** Scrollbar thumb */
  scrollbarThumb: Color;
  /** Scrollbar track */
  scrollbarTrack: Color;
  /** Table border */
  tableBorder: Color;

  // ── Selection colors ───────────────────────────────
  /** Selection highlight background */
  selectionBackground: Color;
  /** Selection highlight foreground */
  selectionForeground: Color;
  /** Selected message highlight */
  selectedMessage: Color;

  // ── Smart/Rush mode colors ─────────────────────────
  /** Smart mode indicator */
  smartModeColor: Color;
  /** Rush mode indicator */
  rushModeColor: Color;

  // ── Thread graph colors ────────────────────────────
  /** Thread graph node */
  threadGraphNode: Color;
  /** Thread graph selected node */
  threadGraphNodeSelected: Color;
  /** Thread graph connector line */
  threadGraphConnector: Color;
}

// ════════════════════════════════════════════════════
//  Default theme factories
// ════════════════════════════════════════════════════

/**
 * Create the default AppTheme for the given mode.
 *
 * Color values match amp's yS.default() exactly.
 *
 * 逆向: modules/2179_unknown_yS.js lines 98-159 — static default(T)
 *
 * @param mode - "dark" or "light"
 * @returns AppTheme with default colors
 */
export function createDefaultAppTheme(mode: "dark" | "light" = "dark"): AppTheme {
  const isLight = mode === "light";

  // 逆向: amp conditionally adjusts smartModeColor and rushModeColor for light themes
  const smartModeColor = isLight ? Color.rgb(0, 140, 70) : Color.rgb(0, 255, 136);
  const rushModeColor = isLight ? Color.rgb(180, 100, 0) : Color.rgb(255, 215, 0);

  return {
    // Tool status — 逆向: lines 103-107
    toolRunning: Color.blue(),
    toolSuccess: Color.green(),
    toolError: Color.red(),
    toolCancelled: Color.yellow(),
    toolName: Color.default(),

    // Messages — 逆向: lines 108-110
    userMessage: Color.cyan(),
    assistantMessage: Color.default(),
    systemMessage: Color.indexed(8),

    // Code — 逆向: lines 111-112
    codeBlock: Color.default(),
    inlineCode: Color.yellow(),

    // Syntax highlighting — 逆向: lines 113-122
    syntaxHighlight: {
      keyword: Color.blue(),
      string: Color.green(),
      number: Color.yellow(),
      comment: Color.indexed(8),
      function: Color.cyan(),
      variable: Color.default(),
      type: Color.magenta(),
      operator: Color.default(),
    },

    // File references — 逆向: lines 123, 132
    fileReference: Color.cyan(),
    filename: Color.cyan(),

    // Status — 逆向: lines 124-127
    processing: Color.blue(),
    waiting: Color.yellow(),
    completed: Color.green(),
    cancelled: Color.indexed(8),

    // UI elements — 逆向: lines 128-134
    recommendation: Color.blue(),
    suggestion: Color.magenta(),
    command: Color.yellow(),
    keybind: Color.blue(),
    button: Color.cyan(),
    link: Color.blue(),

    // Mode indicators — 逆向: lines 135-139
    shellMode: Color.blue(),
    shellModeHidden: Color.indexed(8),
    handoffMode: Color.magenta(),
    handoffModeDim: Color.rgb(128, 0, 128),
    queueMode: Color.rgb(160, 160, 160),

    // Diff — 逆向: lines 140-143
    diffAdded: Color.green(),
    diffRemoved: Color.red(),
    diffChanged: Color.yellow(),
    diffContext: Color.indexed(8),

    // IDE integration — 逆向: lines 144-146
    ideConnected: Color.green(),
    ideDisconnected: Color.red(),
    ideWarning: Color.yellow(),

    // Scrollbar & table — 逆向: lines 147-149
    scrollbarThumb: Color.default(),
    scrollbarTrack: Color.indexed(8),
    tableBorder: Color.indexed(8),

    // Selection — 逆向: lines 150-152
    selectionBackground: Color.yellow(),
    selectionForeground: Color.black(),
    selectedMessage: Color.green(),

    // Smart/Rush mode — 逆向: lines 153-154
    smartModeColor,
    rushModeColor,

    // Thread graph — 逆向: lines 155-157
    threadGraphNode: Color.blue(),
    threadGraphNodeSelected: Color.yellow(),
    threadGraphConnector: Color.default(),
  };
}

// ════════════════════════════════════════════════════
//  AppThemeController InheritedWidget
// ════════════════════════════════════════════════════

/**
 * InheritedWidget that provides {@link AppTheme} to the widget tree.
 *
 * Mirrors the pattern established by {@link ThemeController} for base theme
 * data, but carries app-semantic colors instead of palette colors.
 *
 * 逆向: $R.of(T).app — amp accesses AppTheme via InheritedWidget context
 * 逆向: modules/2179_unknown_yS.js — yS class carried by this widget
 *
 * @example
 * ```ts
 * // Inject in widget tree:
 * new AppThemeController({
 *   theme: createDefaultAppTheme("dark"),
 *   child: myAppWidget,
 * })
 *
 * // Consume in build():
 * const appTheme = AppThemeController.of(context);
 * ```
 */
export class AppThemeController extends InheritedWidget {
  /** The app theme data carried by this widget */
  readonly theme: AppTheme;

  /**
   * Create an AppThemeController.
   *
   * @param opts - Configuration
   * @param opts.theme - AppTheme instance to provide
   * @param opts.child - Child widget
   */
  constructor(opts: { theme: AppTheme; child: Widget }) {
    super({ child: opts.child });
    this.theme = opts.theme;
  }

  /**
   * Determine whether dependents should be notified.
   *
   * Uses reference equality — a new AppTheme object triggers rebuild.
   *
   * @param oldWidget - Previous AppThemeController
   * @returns true if theme reference changed
   */
  updateShouldNotify(oldWidget: AppThemeController): boolean {
    return this.theme !== oldWidget.theme;
  }

  /**
   * Retrieve the nearest AppTheme from the widget tree.
   *
   * @param context - Build context (Element)
   * @returns AppTheme from the nearest ancestor AppThemeController
   * @throws Error if no AppThemeController exists in the ancestor tree
   */
  static of(context: Element): AppTheme {
    const element = context.dependOnInheritedWidgetOfExactType(AppThemeController);
    if (!element) {
      throw new Error("AppThemeController not found in ancestor tree");
    }
    return (element.widget as AppThemeController).theme;
  }

  /**
   * Retrieve the nearest AppTheme, returning null if not found.
   *
   * 逆向: amp's nullable theme access — some widgets fall back gracefully
   *
   * @param context - Build context (Element)
   * @returns AppTheme or null
   */
  static maybeOf(context: Element): AppTheme | null {
    const element = context.dependOnInheritedWidgetOfExactType(AppThemeController);
    if (!element) {
      return null;
    }
    return (element.widget as AppThemeController).theme;
  }

  /**
   * Convenience factory: create an AppThemeController with the default dark theme.
   *
   * @param child - Child widget
   * @returns AppThemeController with dark defaults
   */
  static defaultDark(child: Widget): AppThemeController {
    return new AppThemeController({
      theme: createDefaultAppTheme("dark"),
      child,
    });
  }

  /**
   * Convenience factory: create an AppThemeController with the default light theme.
   *
   * @param child - Child widget
   * @returns AppThemeController with light defaults
   */
  static defaultLight(child: Widget): AppThemeController {
    return new AppThemeController({
      theme: createDefaultAppTheme("light"),
      child,
    });
  }
}
