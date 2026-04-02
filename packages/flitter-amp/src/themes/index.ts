// Amp Theme System — barrel export, AmpThemeProvider InheritedWidget, and helpers.
// Provides the AmpThemeProvider widget that propagates AmpTheme data down the tree,
// a deriveAppColors() helper to compute app-specific semantic colors from a base theme,
// and a registry of all built-in themes.

import { Color } from 'flitter-core/src/core/color';
import { Key } from 'flitter-core/src/core/key';
import { Widget, InheritedWidget, BuildContext } from 'flitter-core/src/framework/widget';
import type { AmpBaseTheme, AmpAppColors, AmpTheme, AmpSyntaxHighlight } from './amp-theme-data';
import { PerlinNoise } from '../utils/perlin-noise';
import { darkTheme } from './dark';
import { lightTheme } from './light';
import { catppuccinMochaTheme } from './catppuccin-mocha';
import { solarizedDarkTheme } from './solarized-dark';
import { solarizedLightTheme } from './solarized-light';
import { gruvboxDarkTheme } from './gruvbox-dark';
import { nordTheme } from './nord';

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export type { AmpBaseTheme, AmpAppColors, AmpTheme, AmpSyntaxHighlight } from './amp-theme-data';
export { darkTheme } from './dark';
export { lightTheme } from './light';
export { catppuccinMochaTheme } from './catppuccin-mocha';
export { solarizedDarkTheme } from './solarized-dark';
export { solarizedLightTheme } from './solarized-light';
export { gruvboxDarkTheme } from './gruvbox-dark';
export { nordTheme } from './nord';

// ---------------------------------------------------------------------------
// Theme registry — maps theme names to their AmpBaseTheme definitions
// ---------------------------------------------------------------------------

/**
 * Registry of all built-in themes keyed by name.
 * Used for theme selection by name (e.g. from CLI flags or config files).
 */
export const ampThemes: Readonly<Record<string, AmpBaseTheme>> = {
  'dark': darkTheme,
  'light': lightTheme,
  'catppuccin-mocha': catppuccinMochaTheme,
  'solarized-dark': solarizedDarkTheme,
  'solarized-light': solarizedLightTheme,
  'gruvbox-dark': gruvboxDarkTheme,
  'nord': nordTheme,
};

// ---------------------------------------------------------------------------
// deriveAppColors — compute AmpAppColors from an AmpBaseTheme
// ---------------------------------------------------------------------------

/**
 * Derives AMP application semantic colors from a base theme.
 *
 * Strict parity mode:
 * - Mirrors AMP's `x1.default(mode)` inventory and default mappings.
 * - Uses ANSI named colors / ansi256 indices for semantic roles.
 * - Only mode-sensitive values are `smartModeColor` and `rushModeColor`.
 */
export function deriveAppColors(base: AmpBaseTheme): AmpAppColors {
  const ansi8 = Color.ansi256(8);
  const smartModeColor = base.isLight ? Color.rgb(0, 140, 70) : Color.rgb(0, 255, 136);
  const rushModeColor = base.isLight ? Color.rgb(180, 100, 0) : Color.rgb(255, 215, 0);

  const syntaxHighlight: AmpSyntaxHighlight = {
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
// createAmpTheme — build a complete AmpTheme from an AmpBaseTheme
// ---------------------------------------------------------------------------

/**
 * Creates a complete AmpTheme by combining a base theme with derived app colors.
 */
export function createAmpTheme(base: AmpBaseTheme): AmpTheme {
  return {
    base,
    app: deriveAppColors(base),
  };
}

/**
 * Returns the Color associated with the given agent mode name.
 */
export function agentModeColor(mode: string, theme: AmpTheme): Color {
  if (mode === 'smart') return theme.app.smartModeColor;
  if (mode === 'rush') return theme.app.rushModeColor;
  return theme.base.foreground;
}

/**
 * Base hue angles (0-360) for each known agent mode.
 * Used by perlinAgentModeColor to seed the Perlin noise offset.
 *   - smart: green  (140°)
 *   - code:  blue   (220°)
 *   - ask:   purple (280°)
 *   - rush:  gold   (45°)
 */
const MODE_HUE_MAP: Record<string, number> = {
  smart: 140,
  code: 220,
  ask: 280,
  rush: 45,
};

/**
 * Converts an HSL triplet (h: 0-360, s: 0-1, l: 0-1) to an RGB Color.
 */
function hslToColor(h: number, s: number, l: number): Color {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60)       { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else              { r = c; b = x; }
  return Color.rgb(
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  );
}

/**
 * Returns a Perlin-noise-modulated Color for the given agent mode.
 *
 * Each mode has a base hue. The Perlin noise field creates smooth, subtle
 * variation in hue (±12°) and lightness (±0.06) over time, producing an
 * organic color pulse suitable for status indicators and the DensityOrb.
 *
 * @param mode  Agent mode name (e.g. 'smart', 'code', 'ask', 'rush').
 * @param t     Continuous time value (e.g. elapsed seconds or frame counter).
 * @param isLight  Whether the current theme is light mode. Controls base
 *                 saturation and lightness so the pulse looks good on both
 *                 light and dark backgrounds.
 */
export function perlinAgentModeColor(
  mode: string,
  t: number,
  isLight = false,
): Color {
  const baseHue = MODE_HUE_MAP[mode] ?? 140;
  const noise = PerlinNoise.shared;

  const hueShift = noise.value1d(t * 0.4 + baseHue * 0.01) * 12;
  const lumShift = noise.value1d(t * 0.3 + 100 + baseHue * 0.01) * 0.06;

  const h = ((baseHue + hueShift) % 360 + 360) % 360;
  const s = isLight ? 0.65 : 0.80;
  const l = (isLight ? 0.40 : 0.60) + lumShift;

  return hslToColor(h, s, l);
}

// ---------------------------------------------------------------------------
// AmpThemeProvider — InheritedWidget that propagates AmpTheme down the tree
// ---------------------------------------------------------------------------

/**
 * An InheritedWidget that propagates AmpTheme data to descendant widgets.
 *
 * Usage:
 *   new AmpThemeProvider({
 *     theme: createAmpTheme(darkTheme),
 *     child: appRoot,
 *   })
 *
 * Descendants read the theme via:
 *   AmpThemeProvider.of(context)      // throws if not found
 *   AmpThemeProvider.maybeOf(context)  // returns undefined if not found
 */
export class AmpThemeProvider extends InheritedWidget {
  readonly theme: AmpTheme;

  constructor(opts: { theme: AmpTheme; child: Widget; key?: Key }) {
    super({ key: opts.key, child: opts.child });
    this.theme = opts.theme;
  }

  /**
   * Look up the nearest ancestor AmpThemeProvider and return its AmpTheme.
   * Throws if no AmpThemeProvider ancestor is found.
   */
  static of(context: BuildContext): AmpTheme {
    const result = AmpThemeProvider.maybeOf(context);
    if (result === undefined) {
      throw new Error(
        'AmpThemeProvider.of() called with a context that does not contain an ' +
          'AmpThemeProvider ancestor. Ensure an AmpThemeProvider widget is an ' +
          'ancestor of this widget.',
      );
    }
    return result;
  }

  /**
   * Look up the nearest ancestor AmpThemeProvider and return its AmpTheme,
   * or undefined if none is found.
   */
  static maybeOf(context: BuildContext): AmpTheme | undefined {
    if (typeof context.dependOnInheritedWidgetOfExactType === 'function') {
      const element = context.dependOnInheritedWidgetOfExactType(AmpThemeProvider);
      if (element) {
        const widget = element.widget as AmpThemeProvider;
        return widget.theme;
      }
    }
    return undefined;
  }

  updateShouldNotify(oldWidget: InheritedWidget): boolean {
    const old = oldWidget as AmpThemeProvider;
    return !ampThemeEquals(this.theme, old.theme);
  }
}

// ---------------------------------------------------------------------------
// Equality helpers
// ---------------------------------------------------------------------------

/**
 * Deep equality check for AmpTheme — compares base and app color fields.
 */
function ampThemeEquals(a: AmpTheme, b: AmpTheme): boolean {
  return ampBaseThemeEquals(a.base, b.base) && ampAppColorsEquals(a.app, b.app);
}

/**
 * Deep equality check for AmpBaseTheme.
 */
function ampBaseThemeEquals(a: AmpBaseTheme, b: AmpBaseTheme): boolean {
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
 * Deep equality check for AmpAppColors.
 */
function ampAppColorsEquals(a: AmpAppColors, b: AmpAppColors): boolean {
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
