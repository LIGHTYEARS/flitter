/**
 * Agent 事件类型: InferenceState + AgentEvent 判别联合
 *
 * ThreadWorker 向外层 (TUI) 发出的事件流类型定义
 * 逆向: ov 内部事件分发 (tool-execution-engine.js 2450-2876)
 */
import type { StreamDelta } from "@flitter/llm";
import type { ToolResult } from "../tools/types";

// ─── 推理状态 ────────────────────────────────────────────

/**
 * 推理状态
 * - idle: 空闲, 等待用户输入或操作
 * - running: 推理中 (LLM 流式输出或工具执行)
 * - cancelled: 用户取消了推理
 */
export type InferenceState = "idle" | "running" | "cancelled";

// ─── Agent 事件 ──────────────────────────────────────────

/**
 * Agent 事件: ThreadWorker 向外层 (TUI) 发出的事件流
 * 逆向: ov 内部事件分发
 *
 * 使用判别联合 (discriminated union), type 字段区分事件种类
 */
export type AgentEvent =
  | InferenceStartEvent
  | InferenceDeltaEvent
  | InferenceCompleteEvent
  | InferenceErrorEvent
  | ToolStartEvent
  | ToolDataEvent
  | ToolCompleteEvent
  | ApprovalRequestEvent
  | TurnCompleteEvent
  | CompactionStartEvent
  | CompactionCompleteEvent
  | RetryStartEvent
  | RetryCountdownEvent
  | RetryClearedEvent;

/** LLM 推理开始 */
export interface InferenceStartEvent {
  type: "inference:start";
}

/** LLM 流式增量输出 */
export interface InferenceDeltaEvent {
  type: "inference:delta";
  delta: StreamDelta;
}

/** LLM 推理完成 (单轮流式结束) */
export interface InferenceCompleteEvent {
  type: "inference:complete";
  usage?: { inputTokens: number; outputTokens: number };
}

/** LLM 推理错误 */
export interface InferenceErrorEvent {
  type: "inference:error";
  error: Error;
}

/** 工具开始执行 */
export interface ToolStartEvent {
  type: "tool:start";
  toolUseId: string;
  toolName: string;
}

/** 工具数据事件 (中间结果或最终结果) */
export interface ToolDataEvent {
  type: "tool:data";
  toolUseId: string;
  data: ToolResult;
}

/** 工具执行完成 */
export interface ToolCompleteEvent {
  type: "tool:complete";
  toolUseId: string;
}

/**
 * 工具审批请求事件
 * 逆向: amp's toolService.requestApproval pushes to pendingApprovals$ BehaviorSubject,
 * which FWT.syncPendingApprovalsToThreadState listens to. Flitter emits a discrete
 * AgentEvent instead, so the TUI can render an ApprovalWidget.
 */
export interface ApprovalRequestEvent {
  type: "approval:request";
  toolUseId: string;
  toolName: string;
  args: Record<string, unknown>;
  reason: string;
}

/** 完整 turn 完成 (无更多 tool_use, agent 回复结束) */
export interface TurnCompleteEvent {
  type: "turn:complete";
}

/** 上下文压缩开始 */
export interface CompactionStartEvent {
  type: "compaction:start";
}

/** 上下文压缩完成 */
export interface CompactionCompleteEvent {
  type: "compaction:complete";
}

/**
 * Retry countdown started (error + initial delay).
 * 逆向: amp exposes retryCountdownSeconds via status observable (1244:221-229)
 */
export interface RetryStartEvent {
  type: "retry:start";
  error: Error;
  delaySeconds: number;
  attempt: number;
}

/** Retry countdown tick (remaining seconds) */
export interface RetryCountdownEvent {
  type: "retry:countdown";
  remainingSeconds: number;
}

/** Retry countdown cleared (manual retry or new message) */
export interface RetryClearedEvent {
  type: "retry:cleared";
}
