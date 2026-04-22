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

import { parseThreadQuery } from "@flitter/agent-core";
import type { ThreadMeta, ThreadPersistence, ThreadStore } from "@flitter/data";
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
  /** 包含已归档的 threads */
  includeArchived?: boolean;
}

/** threads new 命令选项 */
export interface ThreadsNewOptions {
  /** LLM 模型名称 */
  model?: string;
  /** 线程可见性 (private, public, unlisted, workspace, group) */
  visibility?: string;
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
  // 逆向: amp-cli-reversed/modules/2020_unknown_l$T.js:6
  //   `observeThreadList({ includeArchived: t.includeArchived ?? false })`
  // Filters out subagent threads and optionally archived threads.
  const entries = threadStore.observeThreadList({
    includeArchived: options.includeArchived === true,
  });
  if (entries.length === 0) {
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

  // 逆向: Yz0 line 350 — amp's threads new applies --visibility after creation
  if (options.visibility) {
    const level = options.visibility.toLowerCase();
    if (!VALID_VISIBILITY_LEVELS.includes(level as UserVisibilityLevel)) {
      process.stderr.write(
        `Warning: Invalid visibility "${options.visibility}". Must be one of: ${VALID_VISIBILITY_LEVELS.join(", ")}\n`,
      );
    } else {
      const meta = visibilityToMeta(level as UserVisibilityLevel);
      try {
        await threadStore.updateThreadMeta(id, meta);
      } catch {
        // If remote is unavailable, fall back to local setVisibility
        threadStore.setVisibility?.(id, meta.visibility as never);
      }
    }
  }

  process.stdout.write(`Created thread: ${id}\n`);
}

/**
 * 处理 threads continue 命令
 *
 * 逆向: amp-cli-reversed/chunk-005.js:4888-4903
 *   - `threads continue [threadIDOrURL]` — ID is optional
 *   - `--last` flag: continue the most recent thread directly
 *   - When `--last || threadID || executeMode` → resolve without picker
 *
 * @param deps - Thread 管理所需的依赖服务
 * @param context - CLI 运行上下文
 * @param threadId - 要继续的 Thread ID (optional)
 * @param options - Command options including --last flag
 */
export async function handleThreadsContinue(
  deps: ThreadsCommandDeps,
  context: CliContext,
  threadId?: string,
  options?: { last?: boolean },
): Promise<void> {
  void context;
  const threadStore = deps.threadStore;
  if (!threadStore) {
    process.stderr.write("Error: ThreadStore not available\n");
    process.exitCode = 1;
    return;
  }

  // Resolve thread ID: explicit > --last (most recent) > error
  let resolvedId = threadId;
  if (!resolvedId && options?.last) {
    // 逆向: n$T(null, "interactive") — resolve most recent thread
    const recentIds = threadStore.listRecentThreadIds?.(1);
    if (recentIds && recentIds.length > 0) {
      resolvedId = recentIds[0];
    } else {
      process.stderr.write("Error: No threads available. Create one with `flitter threads new`.\n");
      process.exitCode = 1;
      return;
    }
  }

  if (!resolvedId) {
    process.stderr.write(
      "Error: Thread ID is required. Provide a thread ID or use --last to continue the most recent thread.\n",
    );
    process.exitCode = 1;
    return;
  }

  const thread = threadStore.getThread(resolvedId);
  if (!thread) {
    process.stderr.write(`Error: Thread "${resolvedId}" not found\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(
    `Continuing thread: ${resolvedId}\nRun: flitter --thread-id ${resolvedId}\n`,
  );
}

/**
 * 处理 threads archive 命令
 *
 * 逆向: azT:241-258 — archive(threadId, archived):
 *   e = await this.exclusiveSyncReadWriter(T);
 *   e.update(t => { t.archived = R; t.v++; });
 *   await e.asyncDispose();
 *   await this.uploadThreadNow(T);
 *
 * Flitter: single command with --unarchive flag to toggle direction.
 * Now calls uploadThreadNow() for immediate remote sync (GAP-DATA-05).
 *
 * @param deps - Thread 管理所需的依赖服务
 * @param context - CLI 运行上下文
 * @param threadId - 要归档的 Thread ID
 * @param options - Command options including --unarchive flag
 */
export async function handleThreadsArchive(
  deps: ThreadsCommandDeps,
  context: CliContext,
  threadId: string,
  options?: { unarchive?: boolean },
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
  const archived = !(options?.unarchive === true);
  // 逆向: azT increments version + sets archived, then uploads immediately
  threadStore.setCachedThread(
    { ...snapshot, archived, v: snapshot.v + 1 } as unknown as ThreadSnapshot,
    { scheduleUpload: true },
  );
  // GAP-DATA-05: immediate upload (matching amp's uploadThreadNow after archive)
  await threadStore.uploadThreadNow(threadId);
  process.stdout.write(`${archived ? "Archived" : "Unarchived"} thread: ${threadId}\n`);
}

/**
 * Valid user-facing visibility levels.
 * 逆向: urT() in modules/2513_unknown_urT.js validates against these levels.
 */
const VALID_VISIBILITY_LEVELS = ["private", "unlisted", "public", "workspace", "group"] as const;
type UserVisibilityLevel = (typeof VALID_VISIBILITY_LEVELS)[number];

/**
 * Map user-facing visibility level to thread metadata object.
 *
 * 逆向: MA(T) in modules/2514_unknown_MA.js
 *   ```
 *   function MA(T) {
 *     switch (T) {
 *       case "public": return { visibility: "public_discoverable" };
 *       case "unlisted": return { visibility: "public_unlisted" };
 *       case "workspace": return { visibility: "thread_workspace_shared" };
 *       case "private": return { visibility: "private", sharedGroupIDs: [] };
 *       case "group": return { visibility: "private", shareWithAllCreatorGroups: true };
 *     }
 *   }
 *   ```
 */
export function visibilityToMeta(level: UserVisibilityLevel): ThreadMeta {
  switch (level) {
    case "public":
      return { visibility: "public_discoverable" };
    case "unlisted":
      return { visibility: "public_unlisted" };
    case "workspace":
      return { visibility: "thread_workspace_shared" };
    case "private":
      return { visibility: "private", sharedGroupIDs: [] };
    case "group":
      return { visibility: "private", shareWithAllCreatorGroups: true };
  }
}

/**
 * 处理 threads share 命令
 *
 * 逆向: oF0 in modules/2013_unknown_oF0.js
 *   ```
 *   if (i) await r.threadService.updateThreadMeta(a, MA(i));
 *   C9.write(oR.green(`✓ Thread ${a} visibility changed to ${i}.\n`));
 *   ```
 *
 * @param deps - Thread 管理所需的依赖服务
 * @param context - CLI 运行上下文
 * @param threadId - Thread ID to share
 * @param options - Command options (--visibility)
 */
export async function handleThreadsShare(
  deps: ThreadsCommandDeps,
  context: CliContext,
  threadId: string,
  options: { visibility?: string },
): Promise<void> {
  void context;
  const threadStore = deps.threadStore;
  if (!threadStore) {
    process.stderr.write("Error: ThreadStore not available\n");
    process.exitCode = 1;
    return;
  }

  const level = options.visibility;
  if (!level) {
    process.stderr.write(
      `Error: Must specify --visibility <level>\nValid levels: ${VALID_VISIBILITY_LEVELS.join(", ")}\n`,
    );
    process.exitCode = 1;
    return;
  }

  // 逆向: urT() validates the level string
  if (!VALID_VISIBILITY_LEVELS.includes(level as UserVisibilityLevel)) {
    process.stderr.write(
      `Error: Invalid visibility. Must be one of: ${VALID_VISIBILITY_LEVELS.join(", ")}\n`,
    );
    process.exitCode = 1;
    return;
  }

  const snapshot = threadStore.getThreadSnapshot(threadId);
  if (!snapshot) {
    process.stderr.write(`Error: Thread "${threadId}" not found\n`);
    process.exitCode = 1;
    return;
  }

  // 逆向: oF0 — calls updateThreadMeta(id, MA(visibility))
  const meta = visibilityToMeta(level as UserVisibilityLevel);
  try {
    await threadStore.updateThreadMeta(threadId, meta);
    process.stdout.write(`\u2713 Thread ${threadId} visibility changed to ${level}.\n`);
  } catch (err) {
    // Fallback to local-only update if no remote transport
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("No remote transport")) {
      // Apply locally via setVisibility
      threadStore.setVisibility(
        threadId,
        meta.visibility as
          | "private"
          | "public_unlisted"
          | "public_discoverable"
          | "thread_workspace_shared",
      );
      process.stdout.write(
        `\u2713 Thread ${threadId} visibility changed to ${level} (local only).\n`,
      );
    } else {
      process.stderr.write(`Error: Failed to update visibility: ${msg}\n`);
      process.exitCode = 1;
    }
  }
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
 * - For local-only: parse DSL query and apply filters against cached thread entries
 *
 * NOTE: amp's search is server-side with full-text indexing.
 * This local implementation applies DSL filters (keywords, file, repo, author,
 * after, before, is:archived, label) against cached thread entries.
 *
 * @param deps - Thread 管理所需的依赖服务
 * @param context - CLI 运行上下文
 * @param query - 搜索查询 (DSL)
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

  // Parse DSL query
  const parsed = parseThreadQuery(query);
  const { keywords, file, repo, author, after, before, isArchived, label } = parsed;
  const hasFilters =
    keywords.length > 0 ||
    file !== undefined ||
    repo !== undefined ||
    author !== undefined ||
    after !== undefined ||
    before !== undefined ||
    isArchived !== undefined ||
    label !== undefined;

  // Load all entries — always include archived so is:archived filter works correctly
  const entries = threadStore.observeThreadList({ includeArchived: true });

  if (entries.length === 0) {
    process.stdout.write("No threads found matching your query.\n");
    return;
  }

  const matches = entries.filter((e) => {
    // is:archived filter
    if (isArchived !== undefined) {
      if ((e.archived === true) !== isArchived) return false;
    }

    // label: filter
    if (label !== undefined) {
      const snapshot = threadStore.getThreadSnapshot(e.id);
      const snapshotLabels = ((snapshot as { labels?: string[] } | undefined)?.labels ?? []).map(
        (l) => l.toLowerCase(),
      );
      if (!snapshotLabels.includes(label.toLowerCase())) return false;
    }

    // after: / before: date filters — use userLastInteractedAt
    if (after !== undefined) {
      if (e.userLastInteractedAt < after.getTime()) return false;
    }
    if (before !== undefined) {
      if (e.userLastInteractedAt >= before.getTime()) return false;
    }

    // author: filter — check creatorUserID
    if (author !== undefined && author !== "me") {
      const creatorId = (e.creatorUserID ?? "").toLowerCase();
      if (!creatorId.includes(author.toLowerCase())) return false;
    }
    // author:me → no server-side user ID available locally; include all threads

    // For keyword/file/repo filters we need the snapshot text
    const needsText = keywords.length > 0 || file !== undefined || repo !== undefined;
    if (needsText) {
      const snapshot = threadStore.getThreadSnapshot(e.id);
      if (!snapshot) {
        // No snapshot loaded: fall back to title/id match for keywords
        if (keywords.length > 0) {
          const titleLower = (e.title ?? "").toLowerCase();
          const idLower = e.id.toLowerCase();
          const hasKeyword = keywords.some(
            (kw) => titleLower.includes(kw.toLowerCase()) || idLower.includes(kw.toLowerCase()),
          );
          if (!hasKeyword) return false;
        }
        if (file !== undefined || repo !== undefined) return false;
        return true;
      }

      // Build full text
      const parts: string[] = [];
      if (snapshot.title) parts.push(snapshot.title);
      for (const msg of snapshot.messages) {
        const content = (msg as { content: unknown }).content;
        if (typeof content === "string") {
          parts.push(content);
        } else if (Array.isArray(content)) {
          for (const block of content as Array<Record<string, unknown>>) {
            if (block.type === "text" && typeof block.text === "string") {
              parts.push(block.text as string);
            }
          }
        }
      }
      const fullText = parts.join(" ").toLowerCase();

      // keyword matching
      if (keywords.length > 0) {
        const hasAll = keywords.every((kw) => fullText.includes(kw.toLowerCase()));
        if (!hasAll) return false;
      }

      // file: filter
      if (file !== undefined) {
        if (!fullText.includes(file.toLowerCase())) return false;
      }

      // repo: filter
      if (repo !== undefined) {
        if (!fullText.includes(repo.toLowerCase())) return false;
      }
    }

    return !hasFilters
      ? // No filters at all — match everything (same as original behavior for empty query)
        (e.title ?? "").toLowerCase().includes(query.toLowerCase()) ||
          e.id.toLowerCase().includes(query.toLowerCase())
      : true;
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

// ─── Dashboard ──────────────────────────────────────────

/** threads dashboard 命令选项 */
export interface ThreadsDashboardOptions {
  /** 最大显示数量 */
  limit: string;
  /** 输出格式 (table|json) */
  format: "table" | "json";
}

/**
 * 处理 threads dashboard 命令
 *
 * 逆向: e0R:202-244 (continue command shows thread list via wQ FuzzyPicker)
 * amp's thread list in the command palette shows ID, title, workspace, date,
 * and message count. This CLI version provides a text table.
 *
 * NOTE: The full TUI FuzzyPicker composition is Agent 4's job.
 * This handler outputs a formatted text table suitable for the terminal.
 *
 * @param deps - Thread 管理所需的依赖服务
 * @param context - CLI 运行上下文
 * @param options - 命令选项 (limit, format)
 */
export async function handleThreadsDashboard(
  deps: ThreadsCommandDeps,
  context: CliContext,
  options: ThreadsDashboardOptions,
): Promise<void> {
  void context;
  const threadStore = deps.threadStore;
  if (!threadStore) {
    process.stderr.write("Error: ThreadStore not available\n");
    process.exitCode = 1;
    return;
  }

  const entries = threadStore.observeThreadList({ includeArchived: false });
  if (entries.length === 0) {
    process.stdout.write("No threads found.\n");
    return;
  }

  const limit = Number.parseInt(options.limit, 10) || 50;
  const limited = entries.slice(0, limit);

  if (options.format === "json") {
    const data = limited.map((e) => ({
      id: e.id,
      title: e.title || null,
      updatedAt: new Date(e.userLastInteractedAt).toISOString(),
      archived: e.archived ?? false,
    }));
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
    return;
  }

  // 逆向: e0R:202-244 — thread list shows title, date, status columns
  const idWidth = 12;
  const titleWidth = 36;
  const dateWidth = 20;
  const statusWidth = 10;
  const msgsWidth = 6;

  process.stdout.write(
    `${"ID".padEnd(idWidth)}  ${"Title".padEnd(titleWidth)}  ${"Last Active".padEnd(dateWidth)}  ${"Status".padEnd(statusWidth)}  ${"Msgs".padEnd(msgsWidth)}\n`,
  );
  process.stdout.write(
    `${"─".repeat(idWidth)}  ${"─".repeat(titleWidth)}  ${"─".repeat(dateWidth)}  ${"─".repeat(statusWidth)}  ${"─".repeat(msgsWidth)}\n`,
  );

  for (const entry of limited) {
    const id = (entry.id ?? "").slice(0, idWidth).padEnd(idWidth);
    const title = (entry.title ?? "Untitled").slice(0, titleWidth).padEnd(titleWidth);
    const date = new Date(entry.userLastInteractedAt ?? Date.now())
      .toLocaleString()
      .padEnd(dateWidth);
    const status = (entry.archived ? "archived" : "active").padEnd(statusWidth);
    // Message count: try to get from snapshot, fall back to "?"
    let msgCount = "?";
    try {
      const snapshot = threadStore.getThreadSnapshot(entry.id);
      if (snapshot) {
        msgCount = String(snapshot.messages?.length ?? 0);
      }
    } catch {
      // ignore — not all entries have loaded snapshots
    }
    process.stdout.write(`${id}  ${title}  ${date}  ${status}  ${msgCount.padEnd(msgsWidth)}\n`);
  }

  if (entries.length > limit) {
    process.stdout.write(`\n(Showing ${limit} of ${entries.length} threads)\n`);
  }
}
