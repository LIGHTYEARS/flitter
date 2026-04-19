/**
 * Color palette types for the theme system.
 *
 * Defines the color palette interfaces used by all built-in and custom themes.
 * Each theme provides a ColorPalette with base colors, semantic colors,
 * and syntax highlighting colors.
 *
 * 逆向: modules/1472_tail_anonymous.js:5379-5660 — UIT/HIT/WIT/qIT/zIT/FIT/GIT palette objects
 *
 * @module
 */

import { Color } from "../screen/color.js";

/**
 * Syntax highlighting color scheme.
 *
 * Maps language token types to display colors. Used by code blocks
 * and inline code rendering.
 *
 * 逆向: syntaxHighlight sub-objects in each palette (e.g., UIT.syntaxHighlight)
 */
export interface SyntaxHighlightColors {
  /** Language keywords (if, else, return, etc.) */
  keyword: Color;
  /** String literals */
  string: Color;
  /** Numeric literals */
  number: Color;
  /** Comments */
  comment: Color;
  /** Function names */
  function: Color;
  /** Variable names */
  variable: Color;
  /** Type annotations */
  type: Color;
  /** Operators (+, -, =, etc.) */
  operator: Color;
}

/**
 * Complete color palette for a theme.
 *
 * Contains all base, semantic, and UI element colors needed to render
 * the application. Each built-in theme defines a full ColorPalette.
 *
 * Note: amp uses LT.rgb(r, g, b, alpha) for some colors (selection, tableBorder).
 * Since our Color class doesn't support alpha, we use the opaque RGB values.
 * The alpha channel is tracked separately where needed.
 *
 * 逆向: UIT (dark), HIT (light), WIT (catppuccin-mocha), qIT (solarized-dark),
 *       zIT (solarized-light), FIT (gruvbox-dark-hard), GIT (nord)
 */
export interface ColorPalette {
  /** Main background color */
  background: Color;
  /** Main foreground/text color */
  foreground: Color;
  /** Dimmed/secondary text color */
  mutedForeground: Color;
  /** Border color for UI elements */
  border: Color;
  /** Selection highlight background */
  selection: Color;
  /** Primary accent color (links, active states) */
  primary: Color;
  /** Secondary accent color */
  secondary: Color;
  /** Emphasis/highlight accent */
  accent: Color;
  /** Success/positive state color */
  success: Color;
  /** Warning state color */
  warning: Color;
  /** Informational state color */
  info: Color;
  /** Error/destructive action color */
  destructive: Color;
  /** Copy-to-clipboard highlight */
  copyHighlight: Color;
  /** Table border color */
  tableBorder: Color;
  /** Cursor color */
  cursor: Color;
  /** Whether this is a light theme (affects derived colors) */
  isLight: boolean;
  /** Syntax highlighting colors */
  syntaxHighlight: SyntaxHighlightColors;
}
