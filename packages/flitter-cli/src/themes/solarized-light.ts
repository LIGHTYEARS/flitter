/**
 * Solarized Light theme — Ethan Schoonover's Solarized palette (light variant).
 * Exact RGB values ported from flitter-amp.
 */

import { Color } from '../../../flitter-core/src/core/color';
import type { CliBaseTheme } from './theme-data';

export const solarizedLightTheme: CliBaseTheme = {
  background: Color.rgb(253, 246, 227),
  foreground: Color.rgb(101, 123, 131),
  mutedForeground: Color.rgb(147, 161, 161),
  border: Color.rgb(147, 161, 161),
  selection: Color.rgb(238, 232, 213).withAlpha(0.7),
  primary: Color.rgb(38, 139, 210),
  secondary: Color.rgb(42, 161, 152),
  accent: Color.rgb(181, 137, 0),
  success: Color.rgb(133, 153, 0),
  warning: Color.rgb(181, 137, 0),
  info: Color.rgb(38, 139, 210),
  destructive: Color.rgb(220, 50, 47),
  copyHighlight: Color.rgb(181, 137, 0),
  tableBorder: Color.rgb(147, 161, 161),
  cursor: Color.rgb(101, 123, 131),
  isLight: true,
  syntaxHighlight: {
    keyword: Color.rgb(133, 153, 0),
    string: Color.rgb(42, 161, 152),
    number: Color.rgb(211, 54, 130),
    comment: Color.rgb(147, 161, 161),
    function: Color.rgb(38, 139, 210),
    variable: Color.rgb(101, 123, 131),
    type: Color.rgb(181, 137, 0),
    operator: Color.rgb(101, 123, 131),
  },
};
