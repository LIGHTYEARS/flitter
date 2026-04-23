/**
 * runApp — 启动 TUI 应用的顶层入口。
 *
 * 逆向: T1T in tui-render-pipeline.js:199-203
 *
 * 提供简洁的一行启动入口: `await runApp(myWidget)`
 * 内部获取 WidgetsBinding.instance 并调用 binding.runApp(widget)。
 *
 * @example
 * ```ts
 * import { runApp } from "@flitter/tui";
 * await runApp(new MyAppWidget());
 * ```
 *
 * @module
 */

import type { Element, Widget } from "../tree/element.js";
import type { TerminalCapabilities } from "../tui/tui-controller.js";
import { WidgetsBinding } from "./widgets-binding.js";

/**
 * runApp 选项。
 */
export interface RunAppOptions {
  /**
   * 根元素挂载完成后的回调。
   *
   * 在 binding.runApp 中 rootElement.mount() 完成后调用。
   * 供外部注入挂载完成后的初始化逻辑。
   *
   * @param element - 挂载后的根 Element
   */
  onRootElementMounted?: (element: Element) => void;

  /**
   * 终端能力检测完成后、Widget 树挂载前的回调。
   *
   * 在 binding.runApp 中 waitForCapabilities() 完成后、rootElement.mount() 前调用。
   * 供外部根据终端能力（如背景亮度）动态调整配置（如主题选择）。
   *
   * 逆向: amp uses IH() (background luminance global) after capability detection
   *   to influence theme rendering. This callback exposes the same information
   *   before the widget tree is built, enabling flitter's theme auto-selection.
   *
   * @param capabilities - 已检测到的终端能力
   */
  onCapabilitiesReady?: (capabilities: TerminalCapabilities) => void;
}

/**
 * runApp — 启动 TUI 应用的顶层入口。
 *
 * 逆向: T1T in tui-render-pipeline.js:199-203
 *
 * 这是 @flitter/tui 的主要公开 API。
 * 内部获取 WidgetsBinding 单例实例，可选地设置根元素挂载回调，
 * 然后调用 binding.runApp(widget) 启动应用。
 *
 * @param widget - 应用根 Widget
 * @param options - 可选配置
 * @returns Promise<void>，应用退出时 resolve
 *
 * @example
 * ```ts
 * import { runApp } from "@flitter/tui";
 *
 * // 最简启动
 * await runApp(new MyAppWidget());
 *
 * // 带回调
 * await runApp(new MyAppWidget(), {
 *   onRootElementMounted: (element) => {
 *     console.log("根元素已挂载:", element);
 *   },
 * });
 * ```
 */
export async function runApp(widget: Widget, options?: RunAppOptions): Promise<void> {
  const binding = WidgetsBinding.instance;
  if (options?.onRootElementMounted) {
    binding.setRootElementMountedCallback(options.onRootElementMounted);
  }
  await binding.runApp(widget, { onCapabilitiesReady: options?.onCapabilitiesReady });
}
