/**
 * @flitter/cli widgets 模块导出。
 *
 * 提供 ThemeController、ConfigProvider、AppWidget、ThreadStateWidget、
 * InputField、ConversationView — 替代 interactive.ts 中的 stub 对象。
 *
 * @example
 * ```ts
 * import {
 *   ThemeController,
 *   ConfigProvider,
 *   AppWidget,
 *   InputField,
 *   ConversationView,
 *   type ThemeData,
 * } from "./widgets";
 * ```
 *
 * @module
 */

export { ThemeController, type ThemeData } from "./theme-controller.js";
export { ConfigProvider } from "./config-provider.js";
export { AppWidget, AppWidgetState, type AppWidgetConfig } from "./app-widget.js";
export {
  ThreadStateWidget,
  ThreadStateWidgetState,
  type ThreadStateWidgetConfig,
} from "./thread-state-widget.js";
export {
  InputField,
  InputFieldState,
  type InputFieldConfig,
} from "./input-field.js";
export {
  ConversationView,
  ConversationViewState,
  type ConversationViewConfig,
  type Message,
} from "./conversation-view.js";
export { StatusBar, type StatusBarConfig } from "./status-bar.js";
