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

export { Color } from "./color.js";
export type { ColorKind } from "./color.js";
export { TextStyle } from "./text-style.js";
export type { TextStyleOptions } from "./text-style.js";
export { Cell } from "./cell.js";
export { ScreenBuffer } from "./buffer.js";
export { Screen } from "./screen.js";
export type { DirtyRegion } from "./screen.js";
export {
  AnsiRenderer,
  ESC,
  CSI,
  CUP,
  CUF,
  CUB,
  CUU,
  CUD,
  HIDE_CURSOR,
  SHOW_CURSOR,
  CLEAR_SCREEN,
  CLEAR_LINE,
  SGR,
  SGR_RESET,
  ALT_SCREEN_ON,
  ALT_SCREEN_OFF,
  MOUSE_ON,
  MOUSE_OFF,
  PASTE_ON,
  PASTE_OFF,
} from "./ansi-renderer.js";
