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

export {
  type AppTheme,
  AppThemeController,
  createDefaultAppTheme,
} from "./app-theme-controller.js";
export { AppWidget, type AppWidgetConfig, AppWidgetState } from "./app-widget.js";
export {
  type ApprovalRequest,
  type ApprovalResponse,
  type ApprovalScope,
  ApprovalWidget,
} from "./approval-widget.js";
export {
  detectShellCommand,
  getShellModeBorderColor,
  type ShellCommandResult,
} from "./command-detection.js";
export { FlitterCommandPaletteProvider } from "./command-palette-provider.js";
export { ConfigProvider } from "./config-provider.js";
export {
  ContextAnalyzer,
  type ContextAnalyzerConfig,
  ContextAnalyzerState,
  type TokenBreakdown,
} from "./context-analyzer.js";
export {
  ConversationView,
  type ConversationViewConfig,
  ConversationViewState,
  type Message,
} from "./conversation-view.js";
export {
  type ActivityGroupItem,
  type DisplayItem,
  type MessageItem,
  type ThinkingItem,
  type ToolItem,
  transformThreadToDisplayItems,
} from "./display-items.js";
export {
  ExpandableToolHeader,
  type ExpandableToolHeaderConfig,
  ExpandableToolHeaderState,
  type ToolStatus,
} from "./expandable-tool-header.js";
export { FileAutocomplete, type FileAutocompleteConfig } from "./file-autocomplete.js";
export {
  cwdRelativePath,
  GuidanceFileDisplay,
  type GuidanceFileDisplayConfig,
  type GuidanceFileEntry,
} from "./guidance-file-display.js";
export {
  type HandoffStatus,
  HandoffToolWidget,
  type HandoffToolWidgetConfig,
  HandoffToolWidgetState,
} from "./handoff-tool-widget.js";
export {
  InputField,
  type InputFieldConfig,
  InputFieldState,
} from "./input-field.js";
export {
  LibrarianSubToolWidget,
  type LibrarianSubToolWidgetConfig,
  LibrarianToolWidget,
  type LibrarianToolWidgetConfig,
  type LibrarianVariant,
} from "./librarian-tool-widget.js";
export {
  OracleToolWidget,
  type OracleToolWidgetConfig,
} from "./oracle-tool-widget.js";
export { SHORTCUT_ROWS, ShortcutsPopup } from "./shortcuts-popup.js";
export { SlashCommandAutocomplete } from "./slash-command-autocomplete.js";
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
  ThreadPicker,
  type ThreadPickerConfig,
  type ThreadPickerEntry,
  ThreadPickerState,
} from "./thread-picker.js";
export {
  ThreadStateWidget,
  type ThreadStateWidgetConfig,
  ThreadStateWidgetState,
} from "./thread-state-widget.js";
export {
  type ToolboxEntry,
  ToolboxListWidget,
  type ToolboxListWidgetConfig,
  type ToolEntry,
  type ToolStatus as ToolboxRegistrationStatus,
} from "./toolbox-list-widget.js";
export {
  type ToolboxToolProgress,
  type ToolboxToolStatus,
  ToolboxToolWidget,
  type ToolboxToolWidgetConfig,
  ToolboxToolWidgetState,
} from "./toolbox-tool-widget.js";
export { WelcomeScreen } from "./welcome-screen.js";
