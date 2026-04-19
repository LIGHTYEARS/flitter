/**
 * Theme system module.
 *
 * Exports palette types, built-in theme definitions, and the theme registry.
 *
 * @module
 */

export type { ColorPalette, SyntaxHighlightColors } from "./palette.js";
export type { ThemeSpec } from "./builtin-themes.js";
export {
  BUILTIN_THEMES,
  CATPPUCCIN_MOCHA_THEME,
  DARK_THEME,
  GRUVBOX_DARK_HARD_THEME,
  LIGHT_THEME,
  NORD_THEME,
  SOLARIZED_DARK_THEME,
  SOLARIZED_LIGHT_THEME,
  TERMINAL_THEME,
} from "./builtin-themes.js";
export { ThemeRegistry } from "./theme-registry.js";
