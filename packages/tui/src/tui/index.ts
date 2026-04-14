/**
 * TUI 终端控制器模块。
 *
 * 导出 {@link TuiController} 及相关类型定义。
 *
 * @example
 * ```ts
 * import { TuiController } from "./tui/index.js";
 * import type { TerminalSize, TerminalCapabilities, CapabilityEvent } from "./tui/index.js";
 *
 * const ctrl = new TuiController();
 * ctrl.init();
 * ```
 *
 * @module
 */

export { TuiController } from "./tui-controller.js";
export type {
  TerminalCapabilities,
  TerminalSize,
  CapabilityEvent,
} from "./tui-controller.js";
