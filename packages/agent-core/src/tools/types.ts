/**
 * @flitter/agent-core — 工具系统核心类型
 *
 * ToolSpec 接口、执行配置、工具结果、工具上下文
 * 从 amp-cli-reversed/app/tool-execution-engine.js 提取
 *
 * @example
 * ```ts
 * import type { ToolSpec, ToolResult, ToolContext } from '@flitter/agent-core';
 * const tool: ToolSpec = {
 *   name: 'read',
 *   description: 'Read a file',
 *   inputSchema: { type: 'object', properties: { path: { type: 'string' } } },
 *   execute: async (args, ctx) => ({ status: 'done', content: '...' }),
 *   source: 'builtin',
 * };
 * ```
 */

import type { Config, Settings, ToolRunInternalStatus, ToolSource } from "@flitter/schemas";
import type { Observable, Subject } from "@flitter/util";

// ─── 执行配置 ────────────────────────────────────────────

/**
 * 资源键: 标识工具访问的资源及其模式
 * 用于 ToolOrchestrator 的并行/串行冲突检测
 *
 * @example
 * ```ts
 * const key: ResourceKey = { key: '/path/to/file', mode: 'write' };
 * ```
 */
export interface ResourceKey {
  /** 资源标识 (如文件路径、"bash"、"network") */
  key: string;
  /** 访问模式 */
  mode: "read" | "write";
}

/**
 * 执行配置: 控制工具的并行/串行行为
 * 逆向: MwR 中的冲突检测参数
 *
 * @example
 * ```ts
 * const profile: ExecutionProfile = { serial: true };
 * const profile2: ExecutionProfile = { resourceKeys: [{ key: 'bash', mode: 'write' }] };
 * ```
 */
export interface ExecutionProfile {
  /** 如果 true, 工具必须独占执行 (不与其他工具并行) */
  serial?: boolean;
  /** 工具访问的资源列表 */
  resourceKeys?: ResourceKey[];
}

// ─── 工具结果 ────────────────────────────────────────────

/**
 * 工具执行结果
 * status 映射到 @flitter/schemas 的 ToolRunInternalStatus
 *
 * @example
 * ```ts
 * const result: ToolResult = { status: 'done', content: 'File contents here' };
 * ```
 */
export interface ToolResult {
  /** 执行状态 */
  status: ToolRunInternalStatus;
  /** 文本输出 (供 LLM 阅读) */
  content?: string;
  /** 错误消息 */
  error?: string;
  /** 结构化数据 */
  data?: Record<string, unknown>;
  /** 工具写入的文件路径列表 */
  outputFiles?: string[];
}

// ─── 工具上下文 ──────────────────────────────────────────

/**
 * 工具执行上下文: 每次工具调用时注入
 *
 * @example
 * ```ts
 * const context: ToolContext = {
 *   workingDirectory: '/home/user/project',
 *   signal: new AbortController().signal,
 *   threadId: 'thread-123',
 *   config: { settings: {}, secrets: secretStore },
 * };
 * ```
 */
export interface ToolContext {
  /** 当前工作目录 */
  workingDirectory: string;
  /** 取消信号 */
  signal: AbortSignal;
  /** 所属线程 ID */
  threadId: string;
  /** 运行时配置 */
  config: Config;
  /** 流式消息输出管道 (工具可写入中间消息) */
  toolMessages?: Subject<string>;
  /** 用户输入 (blocked-on-user 恢复时传入) */
  userInput?: string;
}

// ─── 工具定义 ────────────────────────────────────────────

/**
 * ToolSpec: 完整的工具定义接口
 * 所有内置工具和外部工具 (MCP/Toolbox) 必须实现此接口
 *
 * @example
 * ```ts
 * const spec: ToolSpec = {
 *   name: 'grep',
 *   description: 'Search files using regex',
 *   inputSchema: { type: 'object', properties: { pattern: { type: 'string' } } },
 *   execute: async (args, ctx) => ({ status: 'done', content: 'matches...' }),
 *   source: 'builtin',
 *   isReadOnly: true,
 *   executionProfile: { resourceKeys: [{ key: 'filesystem', mode: 'read' }] },
 * };
 * ```
 */
export interface ToolSpec {
  /** 唯一工具名 */
  name: string;
  /** 工具描述 (用于 LLM prompt) */
  description: string;
  /** 输入参数 JSON Schema */
  inputSchema: Record<string, unknown>;
  /** 工具执行函数 */
  execute(
    args: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolResult> | Observable<ToolResult>;
  /** 并行/串行执行配置 */
  executionProfile?: ExecutionProfile;
  /** 是否为只读操作 (权限系统提示) */
  isReadOnly?: boolean;
  /** 动态启用检查 (返回 false 时工具不出现在 LLM prompt) */
  isEnabled?: (config: Settings) => boolean;
  /** 工具来源: "builtin" | { mcp: string } | { toolbox: string } */
  source: ToolSource;
}

// 重新导出 ToolDefinition 以便下游直接从 tools/types 引用
export type { ToolDefinition } from "@flitter/llm";
