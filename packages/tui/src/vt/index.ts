/**
 * VT/ANSI 终端解析器模块。
 *
 * 导出低层 VT 解析器（{@link VtParser}）和高层输入事件
 * 解析器（{@link InputParser}），以及所有相关的类型定义。
 *
 * @example
 * ```ts
 * import { VtParser, InputParser, MODIFIERS_NONE } from "./vt/index.js";
 * import type { VtEvent, InputEvent, KeyEvent } from "./vt/index.js";
 *
 * const input = new InputParser();
 * input.onInput((evt) => {
 *   if (evt.type === "key") console.log(evt.key);
 * });
 * input.feed(Buffer.from("\x1b[A"));
 * ```
 *
 * @module
 */

export * from "./types.js";
export { VtParser } from "./vt-parser.js";
export { InputParser } from "./input-parser.js";
