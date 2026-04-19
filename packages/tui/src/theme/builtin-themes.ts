/**
 * 8 built-in themes matching amp's theme definitions.
 *
 * Each theme provides a ThemeSpec with name, label, background mode,
 * and a buildPalette function that returns a full ColorPalette.
 *
 * RGB values are extracted verbatim from amp reference:
 *   modules/1472_tail_anonymous.js:5379-5660
 *
 * Theme variable mapping (amp -> flitter):
 *   WJT -> TERMINAL_THEME
 *   DD0 / UIT -> DARK_THEME
 *   wD0 / HIT -> LIGHT_THEME
 *   BD0 / WIT -> CATPPUCCIN_MOCHA_THEME
 *   ND0 / qIT -> SOLARIZED_DARK_THEME
 *   UD0 / zIT -> SOLARIZED_LIGHT_THEME
 *   HD0 / FIT -> GRUVBOX_DARK_HARD_THEME
 *   WD0 / GIT -> NORD_THEME
 *
 * 逆向: modules/1472_tail_anonymous.js:5379-5660 — WJT through WD0
 *       modules/2652_unknown_yp.js — qJT array order, zD0 lookup
 *
 * @module
 */

import { Color } from "../screen/color.js";
import type { ColorPalette } from "./palette.js";

// ════════════════════════════════════════════════════
//  ThemeSpec interface
// ════════════════════════════════════════════════════

/**
 * Theme specification.
 *
 * Describes a theme's identity and how to build its palette.
 * The `background` field indicates the theme's color scheme:
 * - "dark" — always dark
 * - "light" — always light
 * - "dynamic" — adapts to terminal background (terminal theme only)
 *
 * 逆向: WJT, DD0, wD0, BD0, ND0, UD0, HD0, WD0 objects
 */
export interface ThemeSpec {
  /** Unique theme identifier (e.g. "dark", "catppuccin-mocha") */
  name: string;
  /** Human-readable display name (e.g. "Catppuccin Mocha") */
  label: string;
  /** Color scheme classification */
  background: "dark" | "light" | "dynamic";
  /** Build the color palette (terminal theme receives terminal RGB colors) */
  buildPalette: () => ColorPalette;
  /** Source provenance */
  source: { type: "builtin" } | { type: "custom"; path: string };
}

// ════════════════════════════════════════════════════
//  Dark palette — amp's UIT
// ════════════════════════════════════════════════════

/**
 * 逆向: UIT at modules/1472_tail_anonymous.js:5388-5413
 */
const DARK_PALETTE: ColorPalette = {
  background: Color.rgb(11, 13, 11),
  foreground: Color.rgb(246, 255, 245),
  mutedForeground: Color.rgb(156, 156, 156),
  border: Color.rgb(135, 139, 134),
  selection: Color.rgb(135, 139, 134),
  primary: Color.rgb(27, 135, 243),
  secondary: Color.rgb(24, 144, 154),
  accent: Color.rgb(234, 123, 188),
  success: Color.rgb(43, 161, 43),
  warning: Color.rgb(255, 183, 27),
  info: Color.rgb(66, 161, 255),
  destructive: Color.rgb(189, 43, 43),
  copyHighlight: Color.rgb(238, 170, 43),
  tableBorder: Color.rgb(135, 139, 134),
  cursor: Color.rgb(246, 255, 245),
  isLight: false,
  syntaxHighlight: {
    keyword: Color.rgb(255, 122, 198),
    string: Color.rgb(241, 250, 137),
    number: Color.rgb(191, 149, 249),
    comment: Color.rgb(98, 109, 167),
    function: Color.rgb(117, 219, 240),
    variable: Color.rgb(246, 255, 245),
    type: Color.rgb(82, 250, 124),
    operator: Color.rgb(246, 255, 245),
  },
};

// ════════════════════════════════════════════════════
//  Light palette — amp's HIT
// ════════════════════════════════════════════════════

/**
 * 逆向: HIT at modules/1472_tail_anonymous.js:5414-5440
 */
const LIGHT_PALETTE: ColorPalette = {
  background: Color.rgb(250, 250, 248),
  foreground: Color.rgb(11, 13, 11),
  mutedForeground: Color.rgb(89, 89, 89),
  border: Color.rgb(135, 139, 134),
  selection: Color.rgb(135, 139, 134),
  primary: Color.rgb(11, 115, 218),
  secondary: Color.rgb(27, 118, 126),
  accent: Color.rgb(189, 40, 127),
  success: Color.rgb(42, 111, 42),
  warning: Color.rgb(158, 110, 5),
  info: Color.rgb(0, 128, 255),
  destructive: Color.rgb(212, 68, 68),
  copyHighlight: Color.rgb(189, 128, 15),
  tableBorder: Color.rgb(135, 139, 134),
  cursor: Color.rgb(11, 13, 11),
  isLight: true,
  syntaxHighlight: {
    keyword: Color.rgb(195, 34, 125),
    string: Color.rgb(141, 152, 27),
    number: Color.rgb(92, 41, 163),
    comment: Color.rgb(123, 128, 157),
    function: Color.rgb(20, 156, 184),
    variable: Color.rgb(11, 13, 11),
    type: Color.rgb(36, 143, 62),
    operator: Color.rgb(11, 13, 11),
  },
};

// ════════════════════════════════════════════════════
//  Catppuccin Mocha palette — amp's WIT
// ════════════════════════════════════════════════════

/**
 * 逆向: WIT at modules/1472_tail_anonymous.js:5441-5467
 */
const CATPPUCCIN_MOCHA_PALETTE: ColorPalette = {
  background: Color.rgb(30, 30, 46),
  foreground: Color.rgb(205, 214, 244),
  mutedForeground: Color.rgb(166, 173, 200),
  border: Color.rgb(108, 112, 134),
  selection: Color.rgb(88, 91, 112),
  primary: Color.rgb(137, 180, 250),
  secondary: Color.rgb(116, 199, 236),
  accent: Color.rgb(245, 194, 231),
  success: Color.rgb(166, 227, 161),
  warning: Color.rgb(249, 226, 175),
  info: Color.rgb(137, 180, 250),
  destructive: Color.rgb(243, 139, 168),
  copyHighlight: Color.rgb(250, 179, 135),
  tableBorder: Color.rgb(108, 112, 134),
  cursor: Color.rgb(205, 214, 244),
  isLight: false,
  syntaxHighlight: {
    keyword: Color.rgb(203, 166, 247),
    string: Color.rgb(166, 227, 161),
    number: Color.rgb(250, 179, 135),
    comment: Color.rgb(127, 132, 156),
    function: Color.rgb(137, 180, 250),
    variable: Color.rgb(205, 214, 244),
    type: Color.rgb(249, 226, 175),
    operator: Color.rgb(148, 226, 213),
  },
};

// ════════════════════════════════════════════════════
//  Solarized Dark palette — amp's qIT
// ════════════════════════════════════════════════════

/**
 * 逆向: qIT at modules/1472_tail_anonymous.js:5468-5494
 */
const SOLARIZED_DARK_PALETTE: ColorPalette = {
  background: Color.rgb(0, 43, 54),
  foreground: Color.rgb(147, 161, 161),
  mutedForeground: Color.rgb(101, 123, 131),
  border: Color.rgb(88, 110, 117),
  selection: Color.rgb(7, 54, 66),
  primary: Color.rgb(38, 139, 210),
  secondary: Color.rgb(42, 161, 152),
  accent: Color.rgb(181, 137, 0),
  success: Color.rgb(133, 153, 0),
  warning: Color.rgb(203, 75, 22),
  info: Color.rgb(38, 139, 210),
  destructive: Color.rgb(220, 50, 47),
  copyHighlight: Color.rgb(108, 113, 196),
  tableBorder: Color.rgb(88, 110, 117),
  cursor: Color.rgb(147, 161, 161),
  isLight: false,
  syntaxHighlight: {
    keyword: Color.rgb(133, 153, 0),
    string: Color.rgb(42, 161, 152),
    number: Color.rgb(211, 54, 130),
    comment: Color.rgb(88, 110, 117),
    function: Color.rgb(38, 139, 210),
    variable: Color.rgb(181, 137, 0),
    type: Color.rgb(203, 75, 22),
    operator: Color.rgb(147, 161, 161),
  },
};

// ════════════════════════════════════════════════════
//  Solarized Light palette — amp's zIT
// ════════════════════════════════════════════════════

/**
 * 逆向: zIT at modules/1472_tail_anonymous.js:5495-5521
 */
const SOLARIZED_LIGHT_PALETTE: ColorPalette = {
  background: Color.rgb(253, 246, 227),
  foreground: Color.rgb(101, 123, 131),
  mutedForeground: Color.rgb(147, 161, 161),
  border: Color.rgb(147, 161, 161),
  selection: Color.rgb(238, 232, 213),
  primary: Color.rgb(38, 139, 210),
  secondary: Color.rgb(42, 161, 152),
  accent: Color.rgb(181, 137, 0),
  success: Color.rgb(133, 153, 0),
  warning: Color.rgb(203, 75, 22),
  info: Color.rgb(38, 139, 210),
  destructive: Color.rgb(220, 50, 47),
  copyHighlight: Color.rgb(108, 113, 196),
  tableBorder: Color.rgb(147, 161, 161),
  cursor: Color.rgb(101, 123, 131),
  isLight: true,
  syntaxHighlight: {
    keyword: Color.rgb(133, 153, 0),
    string: Color.rgb(42, 161, 152),
    number: Color.rgb(211, 54, 130),
    comment: Color.rgb(147, 161, 161),
    function: Color.rgb(38, 139, 210),
    variable: Color.rgb(181, 137, 0),
    type: Color.rgb(203, 75, 22),
    operator: Color.rgb(101, 123, 131),
  },
};

// ════════════════════════════════════════════════════
//  Gruvbox Dark Hard palette — amp's FIT
// ════════════════════════════════════════════════════

/**
 * 逆向: FIT at modules/1472_tail_anonymous.js:5522-5548
 */
const GRUVBOX_DARK_HARD_PALETTE: ColorPalette = {
  background: Color.rgb(29, 32, 33),
  foreground: Color.rgb(235, 219, 178),
  mutedForeground: Color.rgb(168, 153, 132),
  border: Color.rgb(102, 92, 84),
  selection: Color.rgb(60, 56, 54),
  primary: Color.rgb(250, 189, 47),
  secondary: Color.rgb(131, 165, 152),
  accent: Color.rgb(211, 134, 155),
  success: Color.rgb(184, 187, 38),
  warning: Color.rgb(254, 128, 25),
  info: Color.rgb(131, 165, 152),
  destructive: Color.rgb(251, 73, 52),
  copyHighlight: Color.rgb(215, 153, 33),
  tableBorder: Color.rgb(102, 92, 84),
  cursor: Color.rgb(235, 219, 178),
  isLight: false,
  syntaxHighlight: {
    keyword: Color.rgb(251, 73, 52),
    string: Color.rgb(184, 187, 38),
    number: Color.rgb(211, 134, 155),
    comment: Color.rgb(146, 131, 116),
    function: Color.rgb(250, 189, 47),
    variable: Color.rgb(235, 219, 178),
    type: Color.rgb(142, 192, 124),
    operator: Color.rgb(254, 128, 25),
  },
};

// ════════════════════════════════════════════════════
//  Nord palette — amp's GIT
// ════════════════════════════════════════════════════

/**
 * 逆向: GIT at modules/1472_tail_anonymous.js:5549-5575
 */
const NORD_PALETTE: ColorPalette = {
  background: Color.rgb(46, 52, 64),
  foreground: Color.rgb(216, 222, 233),
  mutedForeground: Color.rgb(163, 171, 184),
  border: Color.rgb(76, 86, 106),
  selection: Color.rgb(59, 66, 82),
  primary: Color.rgb(136, 192, 208),
  secondary: Color.rgb(129, 161, 193),
  accent: Color.rgb(180, 142, 173),
  success: Color.rgb(163, 190, 140),
  warning: Color.rgb(235, 203, 139),
  info: Color.rgb(94, 129, 172),
  destructive: Color.rgb(191, 97, 106),
  copyHighlight: Color.rgb(208, 135, 112),
  tableBorder: Color.rgb(76, 86, 106),
  cursor: Color.rgb(216, 222, 233),
  isLight: false,
  syntaxHighlight: {
    keyword: Color.rgb(129, 161, 193),
    string: Color.rgb(163, 190, 140),
    number: Color.rgb(180, 142, 173),
    comment: Color.rgb(97, 110, 136),
    function: Color.rgb(136, 192, 208),
    variable: Color.rgb(216, 222, 233),
    type: Color.rgb(143, 188, 187),
    operator: Color.rgb(129, 161, 193),
  },
};

// ════════════════════════════════════════════════════
//  Theme specs
// ════════════════════════════════════════════════════

/**
 * Terminal theme — adapts to terminal's own colors.
 *
 * In amp, this reads actual terminal RGB colors via OSC queries.
 * For now, falls back to the dark palette.
 *
 * 逆向: WJT at modules/1472_tail_anonymous.js:5379-5386
 */
export const TERMINAL_THEME: ThemeSpec = {
  name: "terminal",
  label: "Terminal",
  background: "dynamic",
  buildPalette: () => DARK_PALETTE,
  source: { type: "builtin" },
};

/**
 * 逆向: DD0 at modules/1472_tail_anonymous.js:5577-5587
 */
export const DARK_THEME: ThemeSpec = {
  name: "dark",
  label: "Dark",
  background: "dark",
  buildPalette: () => DARK_PALETTE,
  source: { type: "builtin" },
};

/**
 * 逆向: wD0 at modules/1472_tail_anonymous.js:5588-5598
 */
export const LIGHT_THEME: ThemeSpec = {
  name: "light",
  label: "Light",
  background: "light",
  buildPalette: () => LIGHT_PALETTE,
  source: { type: "builtin" },
};

/**
 * 逆向: BD0 at modules/1472_tail_anonymous.js:5599-5611
 */
export const CATPPUCCIN_MOCHA_THEME: ThemeSpec = {
  name: "catppuccin-mocha",
  label: "Catppuccin Mocha",
  background: "dark",
  buildPalette: () => CATPPUCCIN_MOCHA_PALETTE,
  source: { type: "builtin" },
};

/**
 * 逆向: ND0 at modules/1472_tail_anonymous.js:5612-5624
 */
export const SOLARIZED_DARK_THEME: ThemeSpec = {
  name: "solarized-dark",
  label: "Solarized Dark",
  background: "dark",
  buildPalette: () => SOLARIZED_DARK_PALETTE,
  source: { type: "builtin" },
};

/**
 * 逆向: UD0 at modules/1472_tail_anonymous.js:5625-5637
 */
export const SOLARIZED_LIGHT_THEME: ThemeSpec = {
  name: "solarized-light",
  label: "Solarized Light",
  background: "light",
  buildPalette: () => SOLARIZED_LIGHT_PALETTE,
  source: { type: "builtin" },
};

/**
 * 逆向: HD0 at modules/1472_tail_anonymous.js:5638-5650
 */
export const GRUVBOX_DARK_HARD_THEME: ThemeSpec = {
  name: "gruvbox-dark-hard",
  label: "Gruvbox Dark Hard",
  background: "dark",
  buildPalette: () => GRUVBOX_DARK_HARD_PALETTE,
  source: { type: "builtin" },
};

/**
 * 逆向: WD0 at modules/1472_tail_anonymous.js:5648-5659
 */
export const NORD_THEME: ThemeSpec = {
  name: "nord",
  label: "Nord",
  background: "dark",
  buildPalette: () => NORD_PALETTE,
  source: { type: "builtin" },
};

/**
 * All 8 built-in themes in amp's canonical order.
 *
 * 逆向: qJT = [WJT, DD0, wD0, BD0, ND0, UD0, HD0, WD0]
 *       at modules/1472_tail_anonymous.js:5660
 */
export const BUILTIN_THEMES: readonly ThemeSpec[] = [
  TERMINAL_THEME,
  DARK_THEME,
  LIGHT_THEME,
  CATPPUCCIN_MOCHA_THEME,
  SOLARIZED_DARK_THEME,
  SOLARIZED_LIGHT_THEME,
  GRUVBOX_DARK_HARD_THEME,
  NORD_THEME,
];
