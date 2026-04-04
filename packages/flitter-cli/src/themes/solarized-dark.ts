/**
 * Solarized Dark theme — Ethan Schoonover's Solarized palette (dark variant).
 * Exact RGB values ported from flitter-amp.
 */

import { Color } from '../../../flitter-core/src/core/color';
import type { CliBaseTheme } from './theme-data';

export const solarizedDarkTheme: CliBaseTheme = {
  background: Color.rgb(0, 43, 54),
  foreground: Color.rgb(147, 161, 161),
  mutedForeground: Color.rgb(101, 123, 131),
  border: Color.rgb(88, 110, 117),
  selection: Color.rgb(7, 54, 66).withAlpha(0.6),
  primary: Color.rgb(38, 139, 210),
  secondary: Color.rgb(42, 161, 152),
  accent: Color.rgb(181, 137, 0),
  success: Color.rgb(133, 153, 0),
  warning: Color.rgb(181, 137, 0),
  info: Color.rgb(38, 139, 210),
  destructive: Color.rgb(220, 50, 47),
  copyHighlight: Color.rgb(181, 137, 0),
  tableBorder: Color.rgb(88, 110, 117),
  cursor: Color.rgb(147, 161, 161),
  isLight: false,
  syntaxHighlight: {
    keyword: Color.rgb(133, 153, 0),
    string: Color.rgb(42, 161, 152),
    number: Color.rgb(211, 54, 130),
    comment: Color.rgb(101, 123, 131),
    function: Color.rgb(38, 139, 210),
    variable: Color.rgb(147, 161, 161),
    type: Color.rgb(181, 137, 0),
    operator: Color.rgb(147, 161, 161),
  },
};
