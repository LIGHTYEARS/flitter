/**
 * 屏幕渲染模块。
 *
 * 导出屏幕缓冲区系统（双缓冲、脏区域追踪）和 ANSI 差分渲染器的全部公共 API。
 *
 * @example
 * ```ts
 * import {
 *   Screen, ScreenBuffer, Cell, TextStyle, Color, AnsiRenderer,
 *   CUP, SGR_RESET, ALT_SCREEN_ON, MOUSE_ON, PASTE_ON,
 * } from "./screen/index.js";
 *
 * const screen = new Screen(80, 24);
 * const renderer = new AnsiRenderer();
 * screen.writeChar(0, 0, "A", new TextStyle({ bold: true }));
 * const output = renderer.render(screen);
 * screen.present();
 * ```
 *
 * @module
 */

export type { ColorDepth } from "./ansi-renderer.js";
export {
  ALT_SCREEN_OFF,
  ALT_SCREEN_ON,
  AnsiRenderer,
  CLEAR_LINE,
  CLEAR_SCREEN,
  CSI,
  CUB,
  CUD,
  CUF,
  CUP,
  CUU,
  ESC,
  HIDE_CURSOR,
  MOUSE_OFF,
  MOUSE_ON,
  PASTE_OFF,
  PASTE_ON,
  SGR,
  SGR_RESET,
  SHOW_CURSOR,
} from "./ansi-renderer.js";
export { ScreenBuffer } from "./buffer.js";
export { Cell } from "./cell.js";
export type { ColorKind } from "./color.js";
export { Color, rgbToXterm256, xterm256ToAnsi16 } from "./color.js";
export type { DirtyRegion } from "./screen.js";
export { Screen } from "./screen.js";
export type { TextStyleOptions } from "./text-style.js";
export { TextStyle } from "./text-style.js";
