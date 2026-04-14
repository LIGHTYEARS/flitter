/**
 * Thread 管理命令处理器
 *
 * 处理 `flitter threads` 子命令: list/new/continue/archive/delete。
 * 通过 ServiceContainer.threadStore 进行 CRUD 操作。
 *
 * 逆向参考: thread 管理逻辑散布在 cli-entrypoint.js 中
 *
 * @example
 * ```typescript
 * import { handleThreadsList, handleThreadsNew } from "./threads";
 *
 * threadsCmd.command("list").action((opts) =>
 *   handleThreadsList(container, context, opts)
 * );
 * ```
 */
import type { ThreadStore } from "@flitter/data";
import type { CliContext } from "../context";

/**
 * 服务容器接口 (threads 命令所需的最小子集)
 *
 * 实际类型定义在 @flitter/flitter 的 container.ts
 */
export interface ThreadsCommandDeps {
  /** Thread 存储服务 */
  threadStore?: ThreadStore;
}

/** threads list 命令选项 */
export interface ThreadsListOptions {
  /** 最大显示数量 */
  limit: string;
  /** 输出格式 (table|json) */
  format: "table" | "json";
}

/** threads new 命令选项 */
export interface ThreadsNewOptions {
  /** LLM 模型名称 */
  model?: string;
}

/**
 * 处理 threads list 命令
 *
 * @param deps - Thread 管理所需的依赖服务
 * @param context - CLI 运行上下文
 * @param options - 命令选项 (limit, format)
 */
export async function handleThreadsList(
  deps: ThreadsCommandDeps,
  context: CliContext,
  options: ThreadsListOptions,
): Promise<void> {
  // TODO: Plan 11-02/11-03 实现 thread 列表展示
  void deps;
  void context;
  void options;
}

/**
 * 处理 threads new 命令
 *
 * @param deps - Thread 管理所需的依赖服务
 * @param context - CLI 运行上下文
 * @param options - 命令选项 (model)
 */
export async function handleThreadsNew(
  deps: ThreadsCommandDeps,
  context: CliContext,
  options: ThreadsNewOptions,
): Promise<void> {
  // TODO: 实现创建新 thread
  void deps;
  void context;
  void options;
}

/**
 * 处理 threads continue 命令
 *
 * @param deps - Thread 管理所需的依赖服务
 * @param context - CLI 运行上下文
 * @param threadId - 要继续的 Thread ID
 */
export async function handleThreadsContinue(
  deps: ThreadsCommandDeps,
  context: CliContext,
  threadId: string,
): Promise<void> {
  // TODO: 实现继续 thread
  void deps;
  void context;
  void threadId;
}

/**
 * 处理 threads archive 命令
 *
 * @param deps - Thread 管理所需的依赖服务
 * @param context - CLI 运行上下文
 * @param threadId - 要归档的 Thread ID
 */
export async function handleThreadsArchive(
  deps: ThreadsCommandDeps,
  context: CliContext,
  threadId: string,
): Promise<void> {
  // TODO: 实现归档 thread
  void deps;
  void context;
  void threadId;
}

/**
 * 处理 threads delete 命令
 *
 * @param deps - Thread 管理所需的依赖服务
 * @param context - CLI 运行上下文
 * @param threadId - 要删除的 Thread ID
 */
export async function handleThreadsDelete(
  deps: ThreadsCommandDeps,
  context: CliContext,
  threadId: string,
): Promise<void> {
  // TODO: 实现删除 thread
  void deps;
  void context;
  void threadId;
}
