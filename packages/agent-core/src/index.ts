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

// ─── Tools ─────────────────────────────────────────────
export type {
  ToolSpec,
  ToolResult,
  ToolContext,
  ResourceKey,
  ExecutionProfile,
  ToolDefinition,
} from "./tools/types";
export { ToolRegistry } from "./tools/registry";
export { ToolOrchestrator } from "./tools/orchestrator";
export type { ToolUseItem, OrchestratorCallbacks } from "./tools/orchestrator";

// ─── Built-in Tools ────────────────────────────────────
export { ReadTool } from "./tools/builtin/read";
export { WriteTool } from "./tools/builtin/write";
export { EditTool } from "./tools/builtin/edit";
export { BashTool } from "./tools/builtin/bash";
export { GrepTool } from "./tools/builtin/grep";
export { GlobTool } from "./tools/builtin/glob";
export { FuzzyFindTool } from "./tools/builtin/fuzzy-find";

// ─── Permissions ───────────────────────────────────────
export {
  matchToolPattern,
  matchDisablePattern,
  checkToolEnabled,
  matchPermissionMatcher,
  matchPermissionEntry,
} from "./permissions/matcher";
export { PermissionEngine, DEFAULT_PERMISSION_RULES } from "./permissions/engine";
export type { PermissionEngineOpts } from "./permissions/engine";
export { getToolFilePaths, checkGuardedFile } from "./permissions/guarded-files";

// ─── Prompt Assembly ───────────────────────────────────
export { collectContextBlocks } from "./prompt/context-blocks";
export type { ContextBlocksOptions } from "./prompt/context-blocks";

// ─── Worker ────────────────────────────────────────────
export type {
  InferenceState,
  AgentEvent,
  InferenceStartEvent,
  InferenceDeltaEvent,
  InferenceCompleteEvent,
  InferenceErrorEvent,
  ToolStartEvent,
  ToolDataEvent,
  ToolCompleteEvent,
  TurnCompleteEvent,
  CompactionStartEvent,
  CompactionCompleteEvent,
} from "./worker/events";
export { ThreadWorker } from "./worker/thread-worker";
export type {
  ThreadWorkerOptions,
  ToolApprovalResponse,
} from "./worker/thread-worker";

// ─── Sub-agent & Hooks ────────────────────────────────
export {
  parseHooksConfig,
  matchHookToTool,
  executePreHook,
  executePostHook,
} from "./subagent/hooks";
export type {
  HookType,
  HookConfig,
  HookResult,
  PreHookContext,
  PostHookContext,
} from "./subagent/hooks";
export { SubAgentManager } from "./subagent/subagent";
export type {
  SubAgentOptions,
  SubAgentResult,
  SubAgentInfo,
  SubAgentWorkerOptions,
  SubAgentManagerOptions,
} from "./subagent/subagent";
