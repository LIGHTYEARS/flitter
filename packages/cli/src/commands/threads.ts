/**
 * Thread 管理命令处理器
 *
 * 处理 `flitter threads` 子命令: list/new/continue/archive/delete/
 * export/markdown/rename/label/search/usage。
 * 通过 ServiceContainer.threadStore 进行 CRUD 操作。
 *
 * 逆向参考: thread 管理逻辑散布在 cli-entrypoint.js 中
 *   - export: 2012_unknown_sF0.js — JSON.stringify(thread)
 *   - markdown: 2011_unknown_cF0.js → KN() in 1866_unknown_KN.js
 *   - rename: 2008_unknown_rF0.js — validate name, update title
 *   - label: 2014_unknown_nF0.js → BKT() in 0289_unknown_BKT.js
 *   - search: 2023_unknown_uF0.js — server-side /api/threads/find
 *   - usage: 2576_unknown_OL0.js — server-side threadDisplayCostInfo
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
import type {
  AssistantThreadMessage,
  ThreadContentBlock,
  ThreadMessage,
  ThreadSnapshot,
  UserThreadMessage,
} from "@flitter/schemas";
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

// ─── Export ──────────────────────────────────────────────

/**
 * 处理 threads export 命令
 *
 * 逆向: sF0 in 2012_unknown_sF0.js
 * - Loads thread snapshot via NA(threadId, deps)
 * - JSON.stringify(snapshot, null, 2) → stdout
 *
 * @param deps - Thread 管理所需的依赖服务
 * @param context - CLI 运行上下文
 * @param threadId - 要导出的 Thread ID
 */
export async function handleThreadsExport(
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

  // Try in-memory first, fall back to persistence layer
  let snapshot = threadStore.getThreadSnapshot(threadId);
  if (!snapshot && deps.threadPersistence) {
    snapshot = (await deps.threadPersistence.load(threadId)) ?? undefined;
  }

  if (!snapshot) {
    process.stderr.write(`Error: Thread "${threadId}" not found\n`);
    process.exitCode = 1;
    return;
  }

  process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
}

// ─── Markdown ────────────────────────────────────────────

/**
 * Render a thread message as a markdown section.
 *
 * 逆向: pxR in 1868_unknown__xR.js
 * - user → "## User" + text blocks
 * - assistant → "## Assistant" + text blocks
 * - info → "## Info" + text blocks
 */
function renderMessageToMarkdown(message: ThreadMessage): string {
  const lines: string[] = [];

  switch (message.role) {
    case "user": {
      lines.push("## User");
      for (const block of message.content) {
        const text = extractBlockText(block);
        if (text) lines.push(text);
      }
      break;
    }
    case "assistant": {
      lines.push("## Assistant");
      for (const block of message.content) {
        const text = extractBlockText(block);
        if (text) lines.push(text);
      }
      // Include usage summary if available
      const usage = (message as AssistantThreadMessage).usage;
      if (usage) {
        lines.push(
          `*Model: ${usage.model}, Input: ${usage.inputTokens}, Output: ${usage.outputTokens}*`,
        );
      }
      break;
    }
    case "info": {
      lines.push("## Info");
      for (const block of message.content) {
        const text = extractBlockText(block);
        if (text) lines.push(text);
      }
      break;
    }
  }

  return lines.join("\n\n");
}

/**
 * Extract displayable text from a ThreadContentBlock.
 *
 * 逆向: various block renderers in 1868_unknown__xR.js
 */
function extractBlockText(block: ThreadContentBlock): string | null {
  switch (block.type) {
    case "text":
      return block.text;
    case "tool_use":
      return `**Tool Use:** \`${block.name}\`\n\`\`\`json\n${JSON.stringify(block.input, null, 2)}\n\`\`\``;
    case "tool_result":
      return block.output
        ? `**Tool Result** (${block.status ?? "done"}):\n\`\`\`\n${block.output}\n\`\`\``
        : `**Tool Result** (${block.status ?? "done"})`;
    case "thinking":
      return `*Thinking:* ${block.thinking}`;
    case "summary":
      return `*Summary:* ${block.summary.summary}`;
    default:
      return null;
  }
}

/**
 * Render a full thread snapshot as markdown.
 *
 * 逆向: KN() in 1866_unknown_KN.js
 * - Frontmatter (title, threadId, created, agentMode)
 * - Each message rendered via pxR
 *
 * @param thread - Thread snapshot to render
 * @returns Markdown string
 */
export function renderThreadAsMarkdown(thread: ThreadSnapshot): string {
  const sections: string[] = [];

  // Frontmatter (逆向: AxR in 1867_unknown_AxR.js)
  const frontmatter = ["---"];
  if (thread.title) frontmatter.push(`title: ${thread.title}`);
  frontmatter.push(`threadId: ${thread.id}`);
  if (thread.agentMode) frontmatter.push(`agentMode: ${thread.agentMode}`);
  frontmatter.push("---");
  sections.push(frontmatter.join("\n"));

  // Title heading
  if (thread.title) {
    sections.push(`# ${thread.title}`);
  }

  // Messages
  for (const message of thread.messages) {
    sections.push(renderMessageToMarkdown(message));
  }

  return sections.join("\n\n");
}

/**
 * 处理 threads markdown 命令
 *
 * 逆向: cF0 in 2011_unknown_cF0.js
 * - Loads thread, calls KN(thread) → markdown → stdout
 *
 * @param deps - Thread 管理所需的依赖服务
 * @param context - CLI 运行上下文
 * @param threadId - 要渲染的 Thread ID
 */
export async function handleThreadsMarkdown(
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

  let snapshot = threadStore.getThreadSnapshot(threadId);
  if (!snapshot && deps.threadPersistence) {
    snapshot = (await deps.threadPersistence.load(threadId)) ?? undefined;
  }

  if (!snapshot) {
    process.stderr.write(`Error: Thread "${threadId}" not found\n`);
    process.exitCode = 1;
    return;
  }

  if (snapshot.messages.length === 0) {
    process.stderr.write("Error: Cannot render an empty thread.\n");
    process.exitCode = 1;
    return;
  }

  const md = renderThreadAsMarkdown(snapshot);
  process.stdout.write(`${md}\n`);
}

// ─── Rename ──────────────────────────────────────────────

/**
 * 处理 threads rename 命令
 *
 * 逆向: rF0 in 2008_unknown_rF0.js
 * - Validates name not empty, not > 256 chars
 * - Loads thread, checks not empty
 * - Updates title via conversation delta { type: "title", value }
 * - For local-only: directly mutates snapshot title
 *
 * @param deps - Thread 管理所需的依赖服务
 * @param context - CLI 运行上下文
 * @param threadId - 要重命名的 Thread ID
 * @param newName - 新标题
 */
export async function handleThreadsRename(
  deps: ThreadsCommandDeps,
  context: CliContext,
  threadId: string,
  newName: string,
): Promise<void> {
  void context;
  const threadStore = deps.threadStore;
  if (!threadStore) {
    process.stderr.write("Error: ThreadStore not available\n");
    process.exitCode = 1;
    return;
  }

  // 逆向: rF0 validates name constraints
  const trimmed = newName.trim();
  if (trimmed.length === 0) {
    process.stderr.write("Error: Thread name cannot be empty\n");
    process.exitCode = 1;
    return;
  }
  if (trimmed.length > 256) {
    process.stderr.write("Error: Thread name cannot exceed 256 characters\n");
    process.exitCode = 1;
    return;
  }

  let snapshot = threadStore.getThreadSnapshot(threadId);
  if (!snapshot && deps.threadPersistence) {
    snapshot = (await deps.threadPersistence.load(threadId)) ?? undefined;
    if (snapshot) {
      threadStore.setCachedThread(snapshot);
    }
  }

  if (!snapshot) {
    process.stderr.write(`Error: Thread "${threadId}" not found\n`);
    process.exitCode = 1;
    return;
  }

  // 逆向: rF0 checks thread not empty
  if (snapshot.messages.length === 0) {
    process.stderr.write("Error: Cannot rename an empty thread.\n");
    process.exitCode = 1;
    return;
  }

  // Update the title locally (逆向: conversation delta { type: "title", value })
  const updated: ThreadSnapshot = { ...snapshot, title: trimmed };
  threadStore.setCachedThread(updated, { scheduleUpload: true });

  process.stdout.write(`Renamed thread ${threadId} to "${trimmed}"\n`);
}

// ─── Label ───────────────────────────────────────────────

/**
 * 处理 threads label 命令
 *
 * 逆向: nF0 in 2014_unknown_nF0.js → BKT in 0289_unknown_BKT.js
 * - amp calls N3.addThreadLabels({ thread, labels }, { config })
 * - For local-only: append labels to snapshot.labels, deduplicate
 *
 * @param deps - Thread 管理所需的依赖服务
 * @param context - CLI 运行上下文
 * @param threadId - 要标记的 Thread ID
 * @param labels - 要添加的标签列表
 */
export async function handleThreadsLabel(
  deps: ThreadsCommandDeps,
  context: CliContext,
  threadId: string,
  labels: string[],
): Promise<void> {
  void context;
  const threadStore = deps.threadStore;
  if (!threadStore) {
    process.stderr.write("Error: ThreadStore not available\n");
    process.exitCode = 1;
    return;
  }

  if (labels.length === 0) {
    process.stderr.write("Error: At least one label is required\n");
    process.exitCode = 1;
    return;
  }

  let snapshot = threadStore.getThreadSnapshot(threadId);
  if (!snapshot && deps.threadPersistence) {
    snapshot = (await deps.threadPersistence.load(threadId)) ?? undefined;
    if (snapshot) {
      threadStore.setCachedThread(snapshot);
    }
  }

  if (!snapshot) {
    process.stderr.write(`Error: Thread "${threadId}" not found\n`);
    process.exitCode = 1;
    return;
  }

  // Merge existing labels with new ones, deduplicate
  // 逆向: BKT returns merged label list from server; locally we merge + dedupe
  const existingLabels = snapshot.labels ?? [];
  const mergedLabels = [...new Set([...existingLabels, ...labels])];

  const updated: ThreadSnapshot = { ...snapshot, labels: mergedLabels };
  threadStore.setCachedThread(updated, { scheduleUpload: true });

  process.stdout.write(`Thread ${threadId} labels: ${mergedLabels.join(", ")}\n`);
}

// ─── Search ──────────────────────────────────────────────

/** threads search 命令选项 */
export interface ThreadsSearchOptions {
  /** 最大结果数 */
  limit: string;
  /** 分页偏移量 */
  offset: string;
  /** 输出 JSON */
  json?: boolean;
}

/**
 * 处理 threads search 命令
 *
 * 逆向: uF0 in 2023_unknown_uF0.js
 * - amp calls /api/threads/find?q=...&limit=...&offset=...
 * - For local-only: scan cached thread entries for text match
 *
 * NOTE: amp's search is server-side with full-text indexing.
 * This local implementation provides basic substring matching
 * on cached thread titles and IDs as a fallback.
 *
 * @param deps - Thread 管理所需的依赖服务
 * @param context - CLI 运行上下文
 * @param query - 搜索查询
 * @param options - 搜索选项
 */
export async function handleThreadsSearch(
  deps: ThreadsCommandDeps,
  context: CliContext,
  query: string,
  options: ThreadsSearchOptions,
): Promise<void> {
  void context;
  const threadStore = deps.threadStore;
  if (!threadStore) {
    process.stderr.write("Error: ThreadStore not available\n");
    process.exitCode = 1;
    return;
  }

  const limit = Number.parseInt(options.limit, 10) || 20;
  const offset = Number.parseInt(options.offset, 10) || 0;
  const queryLower = query.toLowerCase();

  // Local search: match against thread entries (title, id)
  // 逆向: amp uses server-side search; this is a local fallback
  const entries$ = threadStore.observeThreadEntries();
  const entries = entries$.getValue();

  if (!entries || entries.length === 0) {
    process.stdout.write("No threads found matching your query.\n");
    return;
  }

  const matches = entries.filter((e) => {
    const title = (e.title ?? "").toLowerCase();
    const id = e.id.toLowerCase();
    return title.includes(queryLower) || id.includes(queryLower);
  });

  const paged = matches.slice(offset, offset + limit);

  if (paged.length === 0) {
    process.stdout.write("No threads found matching your query.\n");
    return;
  }

  if (options.json) {
    const data = paged.map((e) => ({
      id: e.id,
      title: e.title || null,
      updatedAt: new Date(e.userLastInteractedAt).toISOString(),
    }));
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
    return;
  }

  // Table format (逆向: uF0 prints Title, Last Updated, Thread ID columns)
  const idWidth = 12;
  const titleWidth = 40;
  const dateWidth = 20;

  process.stdout.write(
    `${"Title".padEnd(titleWidth)}  ${"Last Updated".padEnd(dateWidth)}  ${"Thread ID".padEnd(idWidth)}\n`,
  );
  process.stdout.write(
    `${"─".repeat(titleWidth)}  ${"─".repeat(dateWidth)}  ${"─".repeat(idWidth)}\n`,
  );

  for (const entry of paged) {
    const title = (entry.title ?? "Untitled").slice(0, titleWidth).padEnd(titleWidth);
    const date = new Date(entry.userLastInteractedAt).toLocaleString().padEnd(dateWidth);
    const id = entry.id.slice(0, idWidth).padEnd(idWidth);
    process.stdout.write(`${title}  ${date}  ${id}\n`);
  }

  if (matches.length > offset + limit) {
    process.stdout.write("\nMore results available. Use --limit to see more.\n");
  }
}

// ─── Usage ───────────────────────────────────────────────

/**
 * 处理 threads usage 命令
 *
 * 逆向: OL0 in 2576_unknown_OL0.js → dL0 in 2577_unknown_dL0.js
 * - amp calls N3.threadDisplayCostInfo({ threadID }) server-side
 * - For local-only: sum up usage from assistant messages in thread
 *
 * NOTE: amp's usage is server-side with cost calculation.
 * This local implementation aggregates token counts from
 * cached assistant message usage data.
 *
 * @param deps - Thread 管理所需的依赖服务
 * @param context - CLI 运行上下文
 * @param threadId - 要查询的 Thread ID
 */
export async function handleThreadsUsage(
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

  let snapshot = threadStore.getThreadSnapshot(threadId);
  if (!snapshot && deps.threadPersistence) {
    snapshot = (await deps.threadPersistence.load(threadId)) ?? undefined;
  }

  if (!snapshot) {
    process.stderr.write(`Error: Thread "${threadId}" not found\n`);
    process.exitCode = 1;
    return;
  }

  // Aggregate usage from assistant messages
  // 逆向: amp uses server-side cost info; locally we sum token counts
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheCreation = 0;
  let totalCacheRead = 0;
  const models = new Set<string>();

  for (const msg of snapshot.messages) {
    if (msg.role === "assistant") {
      const assistantMsg = msg as UserThreadMessage | AssistantThreadMessage;
      if ("usage" in assistantMsg && assistantMsg.usage) {
        const u = assistantMsg.usage;
        totalInputTokens += u.inputTokens;
        totalOutputTokens += u.outputTokens;
        totalCacheCreation += u.cacheCreationInputTokens ?? 0;
        totalCacheRead += u.cacheReadInputTokens ?? 0;
        models.add(u.model);
      }
    }
  }

  if (totalInputTokens === 0 && totalOutputTokens === 0) {
    process.stdout.write("No usage recorded for this thread yet.\n");
    return;
  }

  process.stdout.write(`Thread: ${threadId}\n`);
  if (snapshot.title) {
    process.stdout.write(`Title: ${snapshot.title}\n`);
  }
  process.stdout.write(`Models: ${[...models].join(", ") || "unknown"}\n`);
  process.stdout.write(`\nToken Usage:\n`);
  process.stdout.write(`  Input tokens:          ${totalInputTokens.toLocaleString()}\n`);
  process.stdout.write(`  Output tokens:         ${totalOutputTokens.toLocaleString()}\n`);
  process.stdout.write(`  Cache creation tokens: ${totalCacheCreation.toLocaleString()}\n`);
  process.stdout.write(`  Cache read tokens:     ${totalCacheRead.toLocaleString()}\n`);
  process.stdout.write(
    `  Total tokens:          ${(totalInputTokens + totalOutputTokens).toLocaleString()}\n`,
  );
}
