/**
 * Dark theme — CLI default dark color scheme with exact RGB values
 * ported from flitter-amp.
 */

import { Color } from '../../../flitter-core/src/core/color';
import type { CliBaseTheme } from './theme-data';

export const darkTheme: CliBaseTheme = {
  background: Color.rgb(11, 13, 11),
  foreground: Color.rgb(246, 255, 245),
  mutedForeground: Color.rgb(156, 156, 156),
  border: Color.rgb(135, 139, 134),
  selection: Color.rgb(135, 139, 134).withAlpha(0.35),
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
