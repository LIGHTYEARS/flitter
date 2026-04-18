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

export { AppWidget, type AppWidgetConfig, AppWidgetState } from "./app-widget.js";
export { ConfigProvider } from "./config-provider.js";
export {
  ConversationView,
  type ConversationViewConfig,
  ConversationViewState,
  type Message,
} from "./conversation-view.js";
export {
  InputField,
  type InputFieldConfig,
  InputFieldState,
} from "./input-field.js";
export {
  CONTEXT_DANGER,
  CONTEXT_RECOMMENDATION,
  CONTEXT_WARNING,
  deriveStatusMessage,
  StatusBar,
  type StatusBarConfig,
  type StatusBarState,
} from "./status-bar.js";
export { ThemeController, type ThemeData } from "./theme-controller.js";
export {
  ThreadStateWidget,
  type ThreadStateWidgetConfig,
  ThreadStateWidgetState,
} from "./thread-state-widget.js";
