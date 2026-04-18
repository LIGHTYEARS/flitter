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
import type { ThreadPersistence, ThreadStore } from "@flitter/data";
import type { ThreadSnapshot } from "@flitter/schemas";
import type { CliContext } from "../context";

/**
 * 服务容器接口 (threads 命令所需的最小子集)
 *
 * 实际类型定义在 @flitter/flitter 的 container.ts
 */
export interface ThreadsCommandDeps {
  /** Thread 存储服务 */
  threadStore?: ThreadStore;
  /** Thread 持久化服务 (可选) */
  threadPersistence?: ThreadPersistence | null;
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
  void context;
  const threadStore = deps.threadStore;
  if (!threadStore) {
    process.stderr.write("Error: ThreadStore not available\n");
    process.exitCode = 1;
    return;
  }
  const entries$ = threadStore.observeThreadEntries();
  const entries = entries$.getValue();
  if (!entries || entries.length === 0) {
    process.stdout.write("No threads found.\n");
    return;
  }
  const limit = Number.parseInt(options.limit, 10) || 20;
  const limited = entries.slice(0, limit);
  if (options.format === "json") {
    process.stdout.write(`${JSON.stringify(limited, null, 2)}\n`);
    return;
  }
  const idWidth = 12;
  const titleWidth = 40;
  const dateWidth = 20;
  process.stdout.write(
    `${"ID".padEnd(idWidth)}  ${"Title".padEnd(titleWidth)}  ${"Last Active".padEnd(dateWidth)}\n`,
  );
  process.stdout.write(
    `${"─".repeat(idWidth)}  ${"─".repeat(titleWidth)}  ${"─".repeat(dateWidth)}\n`,
  );
  for (const entry of limited) {
    const id = (entry.id ?? "").slice(0, idWidth).padEnd(idWidth);
    const title = (entry.title ?? "Untitled").slice(0, titleWidth).padEnd(titleWidth);
    const date = new Date(entry.userLastInteractedAt ?? Date.now())
      .toLocaleString()
      .padEnd(dateWidth);
    process.stdout.write(`${id}  ${title}  ${date}\n`);
  }
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
  void context;
  void options;
  const threadStore = deps.threadStore;
  if (!threadStore) {
    process.stderr.write("Error: ThreadStore not available\n");
    process.exitCode = 1;
    return;
  }
  const id = crypto.randomUUID();
  threadStore.setCachedThread({
    id,
    v: 0,
    messages: [],
    relationships: [],
    created: Date.now(),
  } as unknown as ThreadSnapshot);
  process.stdout.write(`Created thread: ${id}\n`);
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
  void context;
  const threadStore = deps.threadStore;
  if (!threadStore) {
    process.stderr.write("Error: ThreadStore not available\n");
    process.exitCode = 1;
    return;
  }
  const thread = threadStore.getThread(threadId);
  if (!thread) {
    process.stderr.write(`Error: Thread "${threadId}" not found\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`Continuing thread: ${threadId}\nRun: flitter --thread-id ${threadId}\n`);
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
  void context;
  const threadStore = deps.threadStore;
  if (!threadStore) {
    process.stderr.write("Error: ThreadStore not available\n");
    process.exitCode = 1;
    return;
  }
  const snapshot = threadStore.getThreadSnapshot(threadId);
  if (!snapshot) {
    process.stderr.write(`Error: Thread "${threadId}" not found\n`);
    process.exitCode = 1;
    return;
  }
  threadStore.setCachedThread({ ...snapshot, archived: true } as unknown as ThreadSnapshot, {
    scheduleUpload: true,
  });
  process.stdout.write(`Archived thread: ${threadId}\n`);
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
  void context;
  const threadStore = deps.threadStore;
  if (!threadStore) {
    process.stderr.write("Error: ThreadStore not available\n");
    process.exitCode = 1;
    return;
  }
  const exists = threadStore.getThread(threadId);
  if (!exists) {
    process.stderr.write(`Error: Thread "${threadId}" not found\n`);
    process.exitCode = 1;
    return;
  }
  threadStore.deleteThread(threadId);
  if (deps.threadPersistence) {
    await deps.threadPersistence.delete(threadId);
  }
  process.stdout.write(`Deleted thread: ${threadId}\n`);
}
