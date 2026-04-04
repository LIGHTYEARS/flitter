/**
 * Light theme — CLI light color scheme with exact RGB values
 * ported from flitter-amp.
 */

import { Color } from '../../../flitter-core/src/core/color';
import type { CliBaseTheme } from './theme-data';

export const lightTheme: CliBaseTheme = {
  background: Color.rgb(250, 250, 248),
  foreground: Color.rgb(11, 13, 11),
  mutedForeground: Color.rgb(89, 89, 89),
  border: Color.rgb(135, 139, 134),
  selection: Color.rgb(135, 139, 134).withAlpha(0.2),
  primary: Color.rgb(11, 115, 218),
  secondary: Color.rgb(27, 118, 126),
  accent: Color.rgb(189, 40, 127),
  success: Color.rgb(42, 111, 42),
  warning: Color.rgb(158, 110, 5),
  info: Color.rgb(11, 115, 218),
  destructive: Color.rgb(212, 68, 68),
  copyHighlight: Color.rgb(158, 110, 5),
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
