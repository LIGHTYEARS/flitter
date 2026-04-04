/**
 * Catppuccin Mocha theme — warm dark theme from the Catppuccin palette.
 * Exact RGB values ported from flitter-amp.
 */

import { Color } from '../../../flitter-core/src/core/color';
import type { CliBaseTheme } from './theme-data';

export const catppuccinMochaTheme: CliBaseTheme = {
  background: Color.rgb(30, 30, 46),
  foreground: Color.rgb(205, 214, 244),
  mutedForeground: Color.rgb(166, 173, 200),
  border: Color.rgb(108, 112, 134),
  selection: Color.rgb(88, 91, 112).withAlpha(0.6),
  primary: Color.rgb(137, 180, 250),
  secondary: Color.rgb(116, 199, 236),
  accent: Color.rgb(245, 194, 231),
  success: Color.rgb(166, 227, 161),
  warning: Color.rgb(249, 226, 175),
  info: Color.rgb(137, 180, 250),
  destructive: Color.rgb(243, 139, 168),
  copyHighlight: Color.rgb(249, 226, 175),
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
