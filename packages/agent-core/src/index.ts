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
export type { InternalHooks, LifecycleHookResult } from "./hooks";
// ─── Admin Hook Matcher ───────────────────────────────
export type {
  AdminHookAction,
  AdminHookConfig,
  AdminHookOn,
  PostExecuteContext,
  PreExecuteContext,
} from "./hooks";
export {
  filterValidHooks,
} from "./hooks";
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
export { BashTool } from "./tools/builtin/bash";
export { createDeleteFileTool } from "./tools/builtin/delete-file";
export { EditTool } from "./tools/builtin/edit";
export { FuzzyFindTool } from "./tools/builtin/fuzzy-find";
export { GlobTool } from "./tools/builtin/glob";
export { GrepTool } from "./tools/builtin/grep";
export { createReadMcpResourceTool } from "./tools/builtin/read-mcp-resource";
// ─── Built-in Tools ────────────────────────────────────
export { ReadTool } from "./tools/builtin/read";
export { createSkillTool } from "./tools/builtin/skill-tool";
export { createTaskTool } from "./tools/builtin/task";
export { createUndoEditTool } from "./tools/builtin/undo-edit";
export { WriteTool } from "./tools/builtin/write";
export { FileChangeTracker } from "./tools/file-change-tracker";
export type { FileChange } from "./tools/file-change-tracker";
// ─── GitHub Tools ─────────────────────────────────────
export {
  createGitHubClient,
  createGitHubTools,
  createReadGitHubTool,
  createSearchGitHubTool,
  createCommitSearchTool,
  createListDirectoryGitHubTool,
  createGlobGitHubTool,
  createGitHubDiffTool,
  createListRepositoriesTool,
  GitHubClient,
  resolveGitHubToken,
  parseRepository,
  globMatch,
} from "./tools/github";
export type { GitHubApiResult, GitHubFetchOptions } from "./tools/github";
export type { OrchestratorCallbacks, ToolThreadEvent, ToolUseItem } from "./tools/orchestrator";
export { ToolOrchestrator } from "./tools/orchestrator";
export { ToolRegistry } from "./tools/registry";
// ─── Tools ─────────────────────────────────────────────
export type {
  ExecutionProfile,
  ResourceKey,
  ToolContext,
  ToolDefinition,
  ToolResult,
  ToolSpec,
} from "./tools/types";
// ─── Toolbox ──────────────────────────────────────────
export { ToolboxService } from "./toolbox/toolbox-service";
export { probeToolScript, parseLegacyTextFormat, textSpecToToolboxSpec, convertArgToSchema } from "./toolbox/describe";
export type { SpawnFn } from "./toolbox/describe";
export { executeToolboxScript, argsToTextFormat } from "./toolbox/execute";
export type { ExecuteOptions } from "./toolbox/execute";
export {
  sanitizeToolName,
  toToolboxName,
  resolveToolboxPaths,
  TOOLBOX_PREFIX,
  MAX_TOOLS_PER_DIRECTORY,
  DESCRIBE_TIMEOUT_MS,
  MAX_OUTPUT_LENGTH as TOOLBOX_MAX_OUTPUT_LENGTH,
  DEFAULT_EXECUTE_TIMEOUT_MS,
} from "./toolbox/toolbox-utils";
export type {
  ToolboxToolSpec,
  LegacyTextSpec,
  ToolboxToolStatus,
  ToolboxToolInfo,
  ToolboxStatus,
  DescribeResult,
  ToolboxExecuteResult,
} from "./toolbox/types";
// ─── Plugins ──────────────────────────────────────────────
export type {
  PluginAction,
  PluginActionAllow,
  PluginActionError,
  PluginActionModify,
  PluginActionRejectAndContinue,
  PluginActionSynthesize,
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
  MAX_AUTO_RESTARTS,
  PLUGIN_READY_EVENT,
  PLUGIN_READY_TIMEOUT_MS,
  PluginHost,
  PluginService,
  REQUEST_TIMEOUT_MS,
  RESTART_DELAY_MS,
  SHUTDOWN_GRACE_PERIOD_MS,
  WORKSPACE_PLUGIN_DIR,
  generatePluginRuntime,
  validateRuntimeTemplate,
} from "./plugins/index";
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
export {
  isContextLimitError,
  isNetworkError,
  isOverloadedError,
  isRetryableError,
  isStreamStalledError,
  RetryScheduler,
} from "./worker/retry-scheduler";
export type {
  ThreadWorkerOptions,
  ToolApprovalResponse,
} from "./worker/thread-worker";
export { hasIncompleteToolUse, ThreadWorker } from "./worker/thread-worker";
