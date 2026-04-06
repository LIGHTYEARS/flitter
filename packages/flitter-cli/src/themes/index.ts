/**
 * CLI Theme System — barrel export, CliThemeProvider InheritedWidget, and helpers.
 *
 * Provides the CliThemeProvider widget that propagates CliTheme data down the tree,
 * a deriveAppColors() helper to compute app-specific semantic colors from a base theme,
 * and a registry of all built-in themes.
 */

import { Color } from '../../../flitter-core/src/core/color';
import { Key } from '../../../flitter-core/src/core/key';
import { Widget, InheritedWidget, BuildContext } from '../../../flitter-core/src/framework/widget';
import type { CliBaseTheme, CliAppColors, CliTheme, CliSyntaxHighlight } from './theme-data';
import { darkTheme } from './dark';
import { lightTheme } from './light';
import { catppuccinMochaTheme } from './catppuccin-mocha';
import { solarizedDarkTheme } from './solarized-dark';
import { solarizedLightTheme } from './solarized-light';
import { gruvboxDarkTheme } from './gruvbox-dark';
import { nordTheme } from './nord';
import { PerlinNoise } from '../utils/perlin-animation';

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export type { CliBaseTheme, CliAppColors, CliTheme, CliSyntaxHighlight } from './theme-data';
export { darkTheme } from './dark';
export { lightTheme } from './light';
export { catppuccinMochaTheme } from './catppuccin-mocha';
export { solarizedDarkTheme } from './solarized-dark';
export { solarizedLightTheme } from './solarized-light';
export { gruvboxDarkTheme } from './gruvbox-dark';
export { nordTheme } from './nord';

// ---------------------------------------------------------------------------
// Theme registry — maps theme names to their CliBaseTheme definitions
// ---------------------------------------------------------------------------

/**
 * Registry of all built-in themes keyed by name.
 * Used for theme selection by name (e.g. from CLI flags or config files).
 */
export const cliThemes: Readonly<Record<string, CliBaseTheme>> = {
  'dark': darkTheme,
  'light': lightTheme,
  'catppuccin-mocha': catppuccinMochaTheme,
  'solarized-dark': solarizedDarkTheme,
  'solarized-light': solarizedLightTheme,
  'gruvbox-dark': gruvboxDarkTheme,
  'nord': nordTheme,
};

// ---------------------------------------------------------------------------
// deriveAppColors — compute CliAppColors from a CliBaseTheme
// ---------------------------------------------------------------------------

/**
 * Derives CLI application semantic colors from a base theme.
 *
 * Mirrors flitter-amp's deriveAppColors() with strict parity:
 * - Uses ANSI named colors / ansi256 indices for semantic roles.
 * - Only mode-sensitive values are smartModeColor and rushModeColor.
 */
export function deriveAppColors(base: CliBaseTheme): CliAppColors {
  const ansi8 = Color.ansi256(8);
  const smartModeColor = base.isLight ? Color.rgb(0, 140, 70) : Color.rgb(0, 255, 136);
  const rushModeColor = base.isLight ? Color.rgb(180, 100, 0) : Color.rgb(255, 215, 0);

  const syntaxHighlight: CliSyntaxHighlight = {
    keyword: Color.blue,
    string: Color.green,
    number: Color.yellow,
    comment: ansi8,
    function: Color.cyan,
    variable: Color.defaultColor,
    type: Color.magenta,
    operator: Color.defaultColor,
  };

  return {
    toolRunning: Color.blue,
    toolSuccess: Color.green,
    toolError: Color.red,
    toolCancelled: Color.yellow,
    toolName: Color.defaultColor,

    userMessage: Color.cyan,
    assistantMessage: Color.defaultColor,
    systemMessage: ansi8,

    codeBlock: Color.defaultColor,
    inlineCode: Color.yellow,
    syntaxHighlight,

    fileReference: Color.cyan,
    processing: Color.blue,
    waiting: Color.yellow,
    completed: Color.green,
    cancelled: ansi8,

    recommendation: Color.blue,
    suggestion: Color.magenta,
    command: Color.yellow,
    filename: Color.cyan,
    keybind: Color.blue,
    button: Color.cyan,
    link: Color.blue,

    shellMode: Color.blue,
    shellModeHidden: ansi8,
    handoffMode: Color.magenta,
    handoffModeDim: Color.rgb(128, 0, 128),
    queueMode: Color.rgb(160, 160, 160),

    diffAdded: Color.green,
    diffRemoved: Color.red,
    diffChanged: Color.yellow,
    diffContext: ansi8,

    ideConnected: Color.green,
    ideDisconnected: Color.red,
    ideWarning: Color.yellow,

    scrollbarThumb: Color.defaultColor,
    scrollbarTrack: ansi8,
    tableBorder: ansi8,

    selectionBackground: Color.yellow,
    selectionForeground: Color.black,
    selectedMessage: Color.green,

    smartModeColor,
    rushModeColor,

    threadGraphNode: Color.blue,
    threadGraphNodeSelected: Color.yellow,
    threadGraphConnector: Color.defaultColor,
  };
}

// ---------------------------------------------------------------------------
// createCliTheme — build a complete CliTheme from a CliBaseTheme
// ---------------------------------------------------------------------------

/**
 * Creates a complete CliTheme by combining a base theme with derived app colors.
 */
export function createCliTheme(base: CliBaseTheme): CliTheme {
  return {
    base,
    app: deriveAppColors(base),
  };
}

/**
 * Return the appropriate color for the given agent mode string.
 * Falls back to the base foreground color for unknown modes.
 */
export function agentModeColor(mode: string, theme: CliTheme): Color {
  if (mode === 'smart') return theme.app.smartModeColor;
  if (mode === 'rush') return theme.app.rushModeColor;
  return theme.base.foreground;
}

// ---------------------------------------------------------------------------
// Perlin-driven agent mode color
// ---------------------------------------------------------------------------

const MODE_HUE_MAP: Record<string, number> = {
  smart: 210,    // blue
  code: 150,     // green-cyan
  ask: 45,       // orange
  rush: 0,       // red
  default: 150,  // green
};

function hslToColor(h: number, s: number, l: number): Color {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return Color.rgb(
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  );
}

export function perlinAgentModeColor(mode: string, t: number, isLight: boolean): Color {
  const baseHue = MODE_HUE_MAP[mode] ?? MODE_HUE_MAP['default'];
  const noise = PerlinNoise.shared;
  const hueOffset = noise.value1d(t * 0.3) * 24 - 12;  // +/- 12 degrees
  const lightnessOffset = noise.value1d(t * 0.3 + 100) * 0.12 - 0.06; // +/- 0.06
  const h = (baseHue + hueOffset + 360) % 360;
  const s = 0.7;
  const baseLightness = isLight ? 0.45 : 0.6;
  const l = Math.max(0, Math.min(1, baseLightness + lightnessOffset));
  return hslToColor(h, s, l);
}

// ---------------------------------------------------------------------------
// CliThemeProvider — InheritedWidget that propagates CliTheme down the tree
// ---------------------------------------------------------------------------

/**
 * An InheritedWidget that propagates CliTheme data to descendant widgets.
 *
 * Usage:
 *   new CliThemeProvider({
 *     theme: createCliTheme(darkTheme),
 *     child: appRoot,
 *   })
 *
 * Descendants read the theme via:
 *   CliThemeProvider.of(context)      // throws if not found
 *   CliThemeProvider.maybeOf(context)  // returns undefined if not found
 */
export class CliThemeProvider extends InheritedWidget {
  readonly theme: CliTheme;

  constructor(opts: { theme: CliTheme; child: Widget; key?: Key }) {
    super({ key: opts.key, child: opts.child });
    this.theme = opts.theme;
  }

  /**
   * Look up the nearest ancestor CliThemeProvider and return its CliTheme.
   * Throws if no CliThemeProvider ancestor is found.
   */
  static of(context: BuildContext): CliTheme {
    const result = CliThemeProvider.maybeOf(context);
    if (result === undefined) {
      throw new Error(
        'CliThemeProvider.of() called with a context that does not contain a ' +
          'CliThemeProvider ancestor. Ensure a CliThemeProvider widget is an ' +
          'ancestor of this widget.',
      );
    }
    return result;
  }

  /**
   * Look up the nearest ancestor CliThemeProvider and return its CliTheme,
   * or undefined if none is found.
   */
  static maybeOf(context: BuildContext): CliTheme | undefined {
    if (typeof context.dependOnInheritedWidgetOfExactType === 'function') {
      const element = context.dependOnInheritedWidgetOfExactType(CliThemeProvider);
      if (element) {
        const widget = element.widget as CliThemeProvider;
        return widget.theme;
      }
    }
    return undefined;
  }

  updateShouldNotify(oldWidget: InheritedWidget): boolean {
    const old = oldWidget as CliThemeProvider;
    return !cliThemeEquals(this.theme, old.theme);
  }
}

// ---------------------------------------------------------------------------
// Equality helpers
// ---------------------------------------------------------------------------

/**
 * Deep equality check for CliTheme — compares base and app color fields.
 */
function cliThemeEquals(a: CliTheme, b: CliTheme): boolean {
  return cliBaseThemeEquals(a.base, b.base) && cliAppColorsEquals(a.app, b.app);
}

/**
 * Deep equality check for CliBaseTheme.
 */
function cliBaseThemeEquals(a: CliBaseTheme, b: CliBaseTheme): boolean {
  return (
    a.isLight === b.isLight &&
    a.background.equals(b.background) &&
    a.foreground.equals(b.foreground) &&
    a.mutedForeground.equals(b.mutedForeground) &&
    a.border.equals(b.border) &&
    a.selection.equals(b.selection) &&
    a.primary.equals(b.primary) &&
    a.secondary.equals(b.secondary) &&
    a.accent.equals(b.accent) &&
    a.success.equals(b.success) &&
    a.warning.equals(b.warning) &&
    a.info.equals(b.info) &&
    a.destructive.equals(b.destructive) &&
    a.copyHighlight.equals(b.copyHighlight) &&
    a.tableBorder.equals(b.tableBorder) &&
    a.cursor.equals(b.cursor) &&
    a.syntaxHighlight.keyword.equals(b.syntaxHighlight.keyword) &&
    a.syntaxHighlight.string.equals(b.syntaxHighlight.string) &&
    a.syntaxHighlight.number.equals(b.syntaxHighlight.number) &&
    a.syntaxHighlight.comment.equals(b.syntaxHighlight.comment) &&
    a.syntaxHighlight.function.equals(b.syntaxHighlight.function) &&
    a.syntaxHighlight.variable.equals(b.syntaxHighlight.variable) &&
    a.syntaxHighlight.type.equals(b.syntaxHighlight.type) &&
    a.syntaxHighlight.operator.equals(b.syntaxHighlight.operator)
  );
}

/**
 * Deep equality check for CliAppColors.
 */
function cliAppColorsEquals(a: CliAppColors, b: CliAppColors): boolean {
  return (
    a.toolRunning.equals(b.toolRunning) &&
    a.toolSuccess.equals(b.toolSuccess) &&
    a.toolError.equals(b.toolError) &&
    a.toolCancelled.equals(b.toolCancelled) &&
    a.toolName.equals(b.toolName) &&
    a.userMessage.equals(b.userMessage) &&
    a.assistantMessage.equals(b.assistantMessage) &&
    a.systemMessage.equals(b.systemMessage) &&
    a.codeBlock.equals(b.codeBlock) &&
    a.inlineCode.equals(b.inlineCode) &&
    a.syntaxHighlight.keyword.equals(b.syntaxHighlight.keyword) &&
    a.syntaxHighlight.string.equals(b.syntaxHighlight.string) &&
    a.syntaxHighlight.number.equals(b.syntaxHighlight.number) &&
    a.syntaxHighlight.comment.equals(b.syntaxHighlight.comment) &&
    a.syntaxHighlight.function.equals(b.syntaxHighlight.function) &&
    a.syntaxHighlight.variable.equals(b.syntaxHighlight.variable) &&
    a.syntaxHighlight.type.equals(b.syntaxHighlight.type) &&
    a.syntaxHighlight.operator.equals(b.syntaxHighlight.operator) &&
    a.fileReference.equals(b.fileReference) &&
    a.processing.equals(b.processing) &&
    a.waiting.equals(b.waiting) &&
    a.completed.equals(b.completed) &&
    a.cancelled.equals(b.cancelled) &&
    a.recommendation.equals(b.recommendation) &&
    a.suggestion.equals(b.suggestion) &&
    a.command.equals(b.command) &&
    a.filename.equals(b.filename) &&
    a.keybind.equals(b.keybind) &&
    a.button.equals(b.button) &&
    a.link.equals(b.link) &&
    a.shellMode.equals(b.shellMode) &&
    a.shellModeHidden.equals(b.shellModeHidden) &&
    a.handoffMode.equals(b.handoffMode) &&
    a.handoffModeDim.equals(b.handoffModeDim) &&
    a.queueMode.equals(b.queueMode) &&
    a.diffAdded.equals(b.diffAdded) &&
    a.diffRemoved.equals(b.diffRemoved) &&
    a.diffChanged.equals(b.diffChanged) &&
    a.diffContext.equals(b.diffContext) &&
    a.ideConnected.equals(b.ideConnected) &&
    a.ideDisconnected.equals(b.ideDisconnected) &&
    a.ideWarning.equals(b.ideWarning) &&
    a.scrollbarThumb.equals(b.scrollbarThumb) &&
    a.scrollbarTrack.equals(b.scrollbarTrack) &&
    a.tableBorder.equals(b.tableBorder) &&
    a.selectionBackground.equals(b.selectionBackground) &&
    a.selectionForeground.equals(b.selectionForeground) &&
    a.selectedMessage.equals(b.selectedMessage) &&
    a.smartModeColor.equals(b.smartModeColor) &&
    a.rushModeColor.equals(b.rushModeColor) &&
    a.threadGraphNode.equals(b.threadGraphNode) &&
    a.threadGraphNodeSelected.equals(b.threadGraphNodeSelected) &&
    a.threadGraphConnector.equals(b.threadGraphConnector)
  );
}
