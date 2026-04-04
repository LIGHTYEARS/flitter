/**
 * Nord theme — Arctic, north-bluish color palette.
 * Exact RGB values ported from flitter-amp.
 */

import { Color } from '../../../flitter-core/src/core/color';
import type { CliBaseTheme } from './theme-data';

export const nordTheme: CliBaseTheme = {
  background: Color.rgb(46, 52, 64),
  foreground: Color.rgb(216, 222, 233),
  mutedForeground: Color.rgb(143, 150, 163),
  border: Color.rgb(76, 86, 106),
  selection: Color.rgb(76, 86, 106).withAlpha(0.5),
  primary: Color.rgb(136, 192, 208),
  secondary: Color.rgb(129, 161, 193),
  accent: Color.rgb(180, 142, 173),
  success: Color.rgb(163, 190, 140),
  warning: Color.rgb(235, 203, 139),
  info: Color.rgb(136, 192, 208),
  destructive: Color.rgb(191, 97, 106),
  copyHighlight: Color.rgb(235, 203, 139),
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
    type: Color.rgb(235, 203, 139),
    operator: Color.rgb(216, 222, 233),
  },
};
