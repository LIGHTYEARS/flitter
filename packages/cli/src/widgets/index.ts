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
  formatTokenCount,
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
export { WelcomeScreen } from "./welcome-screen.js";
export {
  ApprovalWidget,
  type ApprovalRequest,
  type ApprovalResponse,
  type ApprovalScope,
} from "./approval-widget.js";
export { FlitterCommandPaletteProvider } from "./command-palette-provider.js";
export { ShortcutsPopup, SHORTCUT_ROWS } from "./shortcuts-popup.js";
export { SlashCommandAutocomplete } from "./slash-command-autocomplete.js";
export { detectShellCommand, getShellModeBorderColor, type ShellCommandResult } from "./command-detection.js";
export { FileAutocomplete, type FileAutocompleteConfig } from "./file-autocomplete.js";
export {
  type DisplayItem,
  type MessageItem,
  type ToolItem,
  type ActivityGroupItem,
  type ThinkingItem,
  transformThreadToDisplayItems,
} from "./display-items.js";
