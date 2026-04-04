/**
 * Gruvbox Dark theme — retro groove color scheme.
 * Exact RGB values ported from flitter-amp.
 */

import { Color } from '../../../flitter-core/src/core/color';
import type { CliBaseTheme } from './theme-data';

export const gruvboxDarkTheme: CliBaseTheme = {
  background: Color.rgb(29, 32, 33),
  foreground: Color.rgb(235, 219, 178),
  mutedForeground: Color.rgb(168, 153, 132),
  border: Color.rgb(102, 92, 84),
  selection: Color.rgb(102, 92, 84).withAlpha(0.5),
  primary: Color.rgb(250, 189, 47),
  secondary: Color.rgb(131, 165, 152),
  accent: Color.rgb(211, 134, 155),
  success: Color.rgb(184, 187, 38),
  warning: Color.rgb(250, 189, 47),
  info: Color.rgb(131, 165, 152),
  destructive: Color.rgb(251, 73, 52),
  copyHighlight: Color.rgb(250, 189, 47),
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
    type: Color.rgb(131, 165, 152),
    operator: Color.rgb(235, 219, 178),
  },
};
