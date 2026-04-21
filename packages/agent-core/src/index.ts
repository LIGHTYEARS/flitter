/**
 * @flitter/agent-core — Agent 核心引擎
 *
 * Phase 10: Tool 系统 + 权限引擎 + 系统提示词 + ThreadWorker + 子代理 + Hook
 *
 * @example
 * ```ts
 * import {
 *   ToolRegistry, ToolOrchestrator,
 *   PermissionEngine,
 *   ThreadWorker,
 *   SubAgentManager,
 *   parseHooksConfig, executePreHook, executePostHook,
 * } from '@flitter/agent-core';
 * ```
 */

// ─── Commands ──────────────────────────────────────────
export type { MemoryCommandAction } from "./commands/memory-command";
export { parseMemoryCommand } from "./commands/memory-command";
export type { SessionTotals, TurnUsage } from "./cost/session-cost-tracker";
// ─── Cost Tracking ────────────────────────────────────
export { SessionCostTracker } from "./cost/session-cost-tracker";
// ─── Lifecycle Hooks ──────────────────────────────────
// ─── Admin Hook Matcher ───────────────────────────────
export type {
  AdminHookAction,
  AdminHookConfig,
  AdminHookOn,
  InternalHooks,
  LifecycleHookResult,
  PostExecuteContext,
  PreExecuteContext,
} from "./hooks";
export { filterValidHooks } from "./hooks";
// ─── Modes ────────────────────────────────────────────
export type { AgentMode, AgentModeSpec, ReasoningEffort } from "./modes/index";
export {
  AGENT_MODES,
  getModelForMode,
  getModeSpec,
  inferProviderFromModel,
  isDeepReasoningMode,
  isValidAgentMode,
  resolveReasoningEffort,
} from "./modes/index";
export type { PermissionEngineOpts } from "./permissions/engine";
export { DEFAULT_PERMISSION_RULES, PermissionEngine } from "./permissions/engine";
export { checkGuardedFile, getToolFilePaths } from "./permissions/guarded-files";
// ─── Permissions ───────────────────────────────────────
export {
  checkToolEnabled,
  matchDisablePattern,
  matchPermissionEntry,
  matchPermissionMatcher,
  matchToolPattern,
} from "./permissions/matcher";
// ─── Plugins ──────────────────────────────────────────────
export type {
  PluginAction,
  PluginActionAllow,
  PluginActionError,
  PluginActionModify,
  PluginActionRejectAndContinue,
  PluginActionSynthesize,
  PluginAgentEndEvent,
  PluginAgentEndResult,
  PluginAgentStartEvent,
  PluginAgentStartResult,
  PluginHostOptions,
  PluginInfo,
  PluginServiceOptions,
  PluginStateChange,
  PluginStatus,
  PluginToolCallEvent,
  PluginToolResultEvent,
  PluginToolResultOverride,
} from "./plugins/index";
export {
  GLOBAL_PLUGIN_DIR,
  generatePluginRuntime,
  MAX_AUTO_RESTARTS,
  PLUGIN_READY_EVENT,
  PLUGIN_READY_TIMEOUT_MS,
  PluginHost,
  PluginService,
  REQUEST_TIMEOUT_MS,
  RESTART_DELAY_MS,
  SHUTDOWN_GRACE_PERIOD_MS,
  validateRuntimeTemplate,
  WORKSPACE_PLUGIN_DIR,
} from "./plugins/index";
export type { ContextBlocksOptions } from "./prompt/context-blocks";
// ─── Prompt Assembly ───────────────────────────────────
export { collectContextBlocks } from "./prompt/context-blocks";
export type { BuildSystemPromptOptions } from "./prompt/system-prompt";
export { buildSystemPrompt } from "./prompt/system-prompt";
export type { HookActionContext, HookActionResult } from "./subagent/hook-applicator";
export { applyHookAction } from "./subagent/hook-applicator";
export type { DeclarativeHook, HookMatchResult } from "./subagent/hook-matcher";
export { matchPostExecuteHook, matchPreExecuteHook } from "./subagent/hook-matcher";
export type {
  HookConfig,
  HookResult,
  HookType,
  PostHookContext,
  PreHookContext,
} from "./subagent/hooks";
// ─── Sub-agent & Hooks ────────────────────────────────
export {
  executePostHook,
  executePreHook,
  matchHookToTool,
  parseHooksConfig,
} from "./subagent/hooks";
export type {
  SubAgentInfo,
  SubAgentManagerOptions,
  SubAgentOptions,
  SubAgentResult,
  SubAgentWorkerOptions,
} from "./subagent/subagent";
export { SubAgentManager } from "./subagent/subagent";
export type { SubAgentTypeConfig } from "./subagent/subagent-types";
export {
  getSubAgentToolPatterns,
  getSubAgentTypeConfig,
  SUBAGENT_TYPE_REGISTRY,
} from "./subagent/subagent-types";
// ─── Title Generation ─────────────────────────────────
export type {
  GenerateTitleOptions,
  GenerateTitleResult,
  TitleGenerationProvider,
  TitleGenerationResponse,
} from "./title/generate-title";
export {
  extractTextFromContent,
  generateThreadTitle,
  TITLE_MODEL,
  TITLE_SYSTEM_PROMPT,
  TITLE_TOOL_DEFINITION,
} from "./title/generate-title";
export type { SpawnFn } from "./toolbox/describe";
export {
  convertArgToSchema,
  parseLegacyTextFormat,
  probeToolScript,
  textSpecToToolboxSpec,
} from "./toolbox/describe";
export type { ExecuteOptions } from "./toolbox/execute";
export { argsToTextFormat, executeToolboxScript } from "./toolbox/execute";
// ─── Toolbox ──────────────────────────────────────────
export { ToolboxService } from "./toolbox/toolbox-service";
export {
  DEFAULT_EXECUTE_TIMEOUT_MS,
  DESCRIBE_TIMEOUT_MS,
  MAX_OUTPUT_LENGTH as TOOLBOX_MAX_OUTPUT_LENGTH,
  MAX_TOOLS_PER_DIRECTORY,
  resolveToolboxPaths,
  sanitizeToolName,
  TOOLBOX_PREFIX,
  toToolboxName,
} from "./toolbox/toolbox-utils";
export type {
  DescribeResult,
  LegacyTextSpec,
  ToolboxExecuteResult,
  ToolboxStatus,
  ToolboxToolInfo,
  ToolboxToolSpec,
  ToolboxToolStatus,
} from "./toolbox/types";
export { ApplyPatchTool } from "./tools/builtin/apply-patch";
export { BashTool } from "./tools/builtin/bash";
export { createCodeReviewTool } from "./tools/builtin/code-review";
export { createDeleteFileTool } from "./tools/builtin/delete-file";
export { EditTool } from "./tools/builtin/edit";
export { createFindThreadTool } from "./tools/builtin/find-thread";
export { createFinderTool } from "./tools/builtin/finder";
export { FormatFileTool } from "./tools/builtin/format-file";
export { FuzzyFindTool } from "./tools/builtin/fuzzy-find";
export { GetDiagnosticsTool } from "./tools/builtin/get-diagnostics";
export { GlobTool } from "./tools/builtin/glob";
export { GrepTool } from "./tools/builtin/grep";
export { buildLibrarianPrompt, createLibrarianTool } from "./tools/builtin/librarian";
// ─── Built-in Tools ────────────────────────────────────
export { buildOraclePrompt, createOracleTool } from "./tools/builtin/oracle";
export { ReadTool } from "./tools/builtin/read";
export { createReadMcpResourceTool } from "./tools/builtin/read-mcp-resource";
export { createReadThreadTool } from "./tools/builtin/read-thread";
export { ReadWebPageTool } from "./tools/builtin/read-web-page";
export { RestoreSnapshotTool } from "./tools/builtin/restore-snapshot";
export { ShellCommandTool } from "./tools/builtin/shell-command";
export { createSkillTool } from "./tools/builtin/skill-tool";
export { createTaskTool } from "./tools/builtin/task";
export { createTaskListTool, TaskStore } from "./tools/builtin/task-list";
export type { TodoItem } from "./tools/builtin/todo-write";
export { getTodosFromThread, TodoReadTool, TodoWriteTool } from "./tools/builtin/todo-write";
export { createUndoEditTool } from "./tools/builtin/undo-edit";
export { WebSearchTool } from "./tools/builtin/web-search";
export { WriteTool } from "./tools/builtin/write";
// ─── Tools — EarliestNonDisabledTool ─────────────────────
export type { ToolUseEntry } from "./tools/earliest-non-disabled";
export { findEarliestNonDisabledTool } from "./tools/earliest-non-disabled";
export type { FileChange } from "./tools/file-change-tracker";
export { FileChangeTracker } from "./tools/file-change-tracker";
export type { GitHubApiResult, GitHubFetchOptions } from "./tools/github";
// ─── GitHub Tools ─────────────────────────────────────
export {
  createCiStatusTool,
  createCommitSearchTool,
  createGitHubClient,
  createGitHubDiffTool,
  createGitHubTools,
  createGlobGitHubTool,
  createListDirectoryGitHubTool,
  createListRepositoriesTool,
  createReadGitHubTool,
  createSearchGitHubTool,
  GitHubClient,
  globMatch,
  parseRepository,
  resolveGitHubToken,
} from "./tools/github";
export type { OrchestratorCallbacks, ToolThreadEvent, ToolUseItem } from "./tools/orchestrator";
export { isDangerousToResume, isTerminalStatus, ToolOrchestrator } from "./tools/orchestrator";
// ─── Tools — CLI Filters ─────────────────────────────────
export type { CliToolFilters } from "./tools/registry";
export { ToolRegistry } from "./tools/registry";
// ─── Tools ─────────────────────────────────────────────
export type {
  ExecutionProfile,
  ResourceKey,
  ToolContext,
  ToolDefinition,
  ToolMessage,
  ToolResult,
  ToolSpec,
} from "./tools/types";
// ─── Worker ────────────────────────────────────────────
export type {
  AgentEvent,
  ApprovalRequestEvent,
  CompactionCompleteEvent,
  CompactionStartEvent,
  InferenceCompleteEvent,
  InferenceDeltaEvent,
  InferenceErrorEvent,
  InferenceStartEvent,
  InferenceState,
  RetryClearedEvent,
  RetryCountdownEvent,
  RetryStartEvent,
  ToolCompleteEvent,
  ToolDataEvent,
  ToolStartEvent,
  TurnCompleteEvent,
} from "./worker/events";
// ─── Worker — ProcessAssistantMessage ────────────────────
export { processAssistantMessage } from "./worker/process-assistant-message";
export {
  isContextLimitError,
  isNetworkError,
  isOverloadedError,
  isRetryableError,
  isStreamStalledError,
  RetryScheduler,
} from "./worker/retry-scheduler";
export type {
  HandoffState,
  ThreadWorkerOptions,
  ToolApprovalResponse,
} from "./worker/thread-worker";
export { hasIncompleteToolUse, ThreadWorker } from "./worker/thread-worker";
// ─── Worker — ThreadWorkerService ────────────────────────
export type { ThreadWorkerFactory } from "./worker/thread-worker-service";
export { ThreadWorkerService } from "./worker/thread-worker-service";
