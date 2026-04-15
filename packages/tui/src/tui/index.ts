/**
 * TUI 终端控制器模块。
 *
 * 导出 {@link TuiController} 及相关类型定义，
 * 以及 {@link TtyInputSource}/{@link TtyOutputTarget} 终端 I/O 抽象。
 *
 * @example
 * ```ts
 * import { TuiController, createTtyInput, createTtyOutput } from "./tui/index.js";
 * import type { TerminalSize, TerminalCapabilities, TtyInputSource, TtyOutputTarget } from "./tui/index.js";
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

export {
  createTtyInput,
  createDevTtyInput,
  createStdinFallback,
  createTtyOutput,
  isBunWithTtyBug,
  stripAnsiEscapes,
} from "./tty-input.js";
export type {
  TtyInputSource,
  TtyOutputTarget,
  TtyInputOptions,
} from "./tty-input.js";
