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

export type { SessionTotals, TurnUsage } from "./cost/session-cost-tracker";
// ─── Cost Tracking ────────────────────────────────────
export { SessionCostTracker } from "./cost/session-cost-tracker";

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
export { EditTool } from "./tools/builtin/edit";
export { FuzzyFindTool } from "./tools/builtin/fuzzy-find";
export { GlobTool } from "./tools/builtin/glob";
export { GrepTool } from "./tools/builtin/grep";
// ─── Built-in Tools ────────────────────────────────────
export { ReadTool } from "./tools/builtin/read";
export { createTaskTool } from "./tools/builtin/task";
export { WriteTool } from "./tools/builtin/write";
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
