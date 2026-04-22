// packages/cli/src/widgets/display-items.ts
/**
 * DisplayItem types and thread-to-display-item transformer.
 *
 * Imports generateSimpleDiff to compute unified diffs for edit tool results.
 * 逆向: amp chunk-004.js:7793-7803 (diff field on tool result)
 *
 * Mirrors amp's yx0() pipeline (2154_Subagent_yx0.js):
 * raw thread messages -> flat list of typed display rows.
 *
 * The two-accumulator pattern (items array + activityBuffer) matches amp exactly:
 * - Activity tools (Read, Grep, Glob, etc.) get buffered into activityBuffer
 * - Heavy tools (Bash, Edit, Write) flush the buffer and produce their own rows
 * - At message boundaries, any pending activity buffer is flushed into an ActivityGroupItem
 *
 * 逆向: yx0 + ux0 (2154_Subagent_yx0.js, 2153_unknown_ux0.js)
 */

import { generateSimpleDiff } from "./diff-widget.js";

// ─── Display Item Types ─────────────────────────────

export type DisplayItem = MessageItem | ToolItem | ActivityGroupItem | ThinkingItem;

export interface MessageItem {
  type: "message";
  role: "user" | "assistant" | "system";
  text: string;
  /** Whether this message is currently streaming (逆向: msg.state?.type === "streaming") */
  isStreaming?: boolean;
  /** Number of image content blocks in this message (逆向: _8R image rendering) */
  images?: number;
  /** Token usage for this assistant message (逆向: NJT feature flag) */
  usage?: { inputTokens: number; outputTokens: number };
  /** Whether this user message was interrupted (逆向: S$ widget — R.interrupted → e.warning border) */
  interrupted?: boolean;
  /** Guidance files discovered for this user message (逆向: b8R widget) */
  discoveredGuidanceFiles?: Array<{ uri: string; lineCount: number }>;
}

/**
 * Tool kind for display differentiation.
 * 逆向: yx0 switch cases — bash, edit, create-file are top-level kinds;
 * read/search/list are activity kinds (normally grouped);
 * generic is the fallback for unrecognized tools.
 */
export type ToolKind = "bash" | "edit" | "create-file" | "read" | "search" | "generic";

export interface ToolItem {
  type: "tool";
  toolUseId: string;
  toolName: string;
  kind: ToolKind;
  status:
    | "done"
    | "error"
    | "cancelled"
    | "cancellation-requested"
    | "rejected-by-user"
    | "in-progress"
    | "blocked-on-user"
    | "queued";
  // bash-specific (逆向: yx0 Bash branch)
  command?: string;
  output?: string;
  exitCode?: number;
  // edit/create-file-specific (逆向: yx0 edit_file / create_file branches)
  path?: string;
  oldString?: string;
  newString?: string;
  // generic fallback
  args?: Record<string, unknown>;
  error?: string;
  /** Unified diff text for edit/create-file results (逆向: amp chunk-004.js:7793-7803) */
  diff?: string;
}

/**
 * A single action within an activity group.
 * 逆向: the `c()` accumulator items in yx0 — {kind, title, ...}
 */
export interface ActivityAction {
  kind: "read" | "search" | "list";
  toolName: string;
  toolUseId: string;
  status:
    | "done"
    | "error"
    | "cancelled"
    | "cancellation-requested"
    | "in-progress"
    | "blocked-on-user"
    | "queued";
  /** File path for Read, pattern/glob for search tools
   * 逆向: B9R (misc_utils.js:7776) R.input.path, W9R (misc_utils.js:8088) R.input.pattern */
  path?: string;
  /** Additional detail (pattern for search, range for read) */
  detail?: string;
}

/**
 * A group of lightweight tool actions collapsed into one row.
 * 逆向: yx0 `A()` calls + `l()` flush — the activity-group display item.
 */
export interface ActivityGroupItem {
  type: "activity-group";
  actions: ActivityAction[];
  summary: string;
  hasInProgress: boolean;
  /** Whether this is a subagent activity group (逆向: chunk-006.js:28457-28786) */
  isSubagent?: boolean;
  /** Display label for the subagent (逆向: qv.name field) */
  subagentLabel?: string;
}

/**
 * A thinking block from the assistant's reasoning.
 *
 * 逆向: Rd class (chunk-006.js:16846-17009) — ThinkingBlock widget.
 * Collapsed shows "✓ Thinking ▶", expanded shows full text with "▼".
 * 逆向: fJT.build() — isCancelled → warning color; isStreaming → accent + spinner; else → success + ✓
 */
export interface ThinkingItem {
  type: "thinking";
  text: string;
  isExpanded: boolean;
  /** Whether this thinking block is currently streaming (逆向: fJT isComplete = !isStreaming) */
  isStreaming?: boolean;
  /** Whether this thinking block was cancelled mid-stream (逆向: fJT isCancelled → warning color) */
  isCancelled?: boolean;
}

// ─── Tool classification ─────────────────────────────

/** Tools that get their own full row with command+output (逆向: yx0 Bash/shell_command branch) */
const BASH_TOOLS = new Set(["Bash", "shell_command"]);

/** Tools that get their own full row with file path (逆向: yx0 edit_file/apply_patch/undo_edit) */
const EDIT_TOOLS = new Set(["Edit", "edit_file", "apply_patch", "undo_edit"]);

/** Tools that get their own full row with file path (逆向: yx0 create_file branch) */
const CREATE_TOOLS = new Set(["Write", "create_file"]);

/**
 * Tools grouped into activity rows (逆向: yx0 `c()` calls).
 * Read -> read, Grep/Glob/FuzzyFind -> search, file_tree -> list, etc.
 */
const ACTIVITY_TOOLS: Record<string, "read" | "search" | "list"> = {
  Read: "read",
  Grep: "search",
  Glob: "search",
  FuzzyFind: "search",
  file_tree: "list",
  read_thread: "read",
  find_thread: "search",
  skill: "read",
  get_diagnostics: "read",
};

/** Tools to silently skip (逆向: _x0 set / bx0 check in 2153_unknown_ux0.js) */
const HIDDEN_TOOLS = new Set(["thread_status"]);

// ─── Raw message types ───────────────────────────────

export interface RawContentBlock {
  type: string;
  text?: string;
  thinking?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  complete?: boolean;
  toolUseID?: string;
  run?: { status: string; result?: unknown; error?: { message: string; errorCode?: string } };
  [key: string]: unknown;
}

// ─── Transformer ─────────────────────────────────────

/**
 * Transform raw thread messages into a flat display item list.
 *
 * This mirrors amp's two-phase approach:
 * 1. ux0() preprocesses messages, joining tool_use blocks with their tool_result
 * 2. yx0() classifies each joined pair into display items
 *
 * We combine both phases here since our message format is simpler.
 *
 * 逆向: yx0 + ux0 (2154_Subagent_yx0.js, 2153_unknown_ux0.js)
 */
export function transformThreadToDisplayItems(messages: RawMessage[]): DisplayItem[] {
  // Phase 1: Build tool_use → tool_result lookup (逆向: ux0 Map-based join)
  const resultMap = new Map<string, RawContentBlock>();
  for (const msg of messages) {
    if (typeof msg.content === "string") continue;
    for (const block of msg.content) {
      if (block.type === "tool_result" && block.toolUseID) {
        resultMap.set(block.toolUseID, block);
      }
    }
  }

  // Phase 2: Walk messages and build display items (逆向: yx0 main loop)
  const items: DisplayItem[] = [];
  const activityBuffer: ActivityAction[] = [];

  /**
   * Flush pending activity actions into an ActivityGroupItem.
   * 逆向: yx0 `l()` function
   */
  const flushActivityBuffer = () => {
    if (activityBuffer.length === 0) return;
    const hasInProgress = activityBuffer.some((a) => a.status === "in-progress");
    items.push({
      type: "activity-group",
      actions: [...activityBuffer],
      summary: buildActivitySummary(activityBuffer),
      hasInProgress,
    });
    activityBuffer.length = 0;
  };

  for (const msg of messages) {
    if (typeof msg.content === "string") {
      // Simple string content (legacy format)
      if (msg.role !== "user" || !msg.content) continue;
      flushActivityBuffer();
      items.push({ type: "message", role: msg.role, text: msg.content });
      continue;
    }

    if (msg.role === "info") {
      if (typeof msg.content !== "string") {
        for (let blockIdx = 0; blockIdx < msg.content.length; blockIdx++) {
          const block = msg.content[blockIdx];
          if (block.type === "manual_bash_invocation" && block.args) {
            const cmd = ((block as Record<string, unknown>).args as Record<string, unknown>)
              .cmd as string;
            if (!cmd) continue;

            const toolRun = (block as Record<string, unknown>).toolRun as
              | {
                  status: string;
                  result?: { output?: string; exitCode?: number };
                  error?: { message?: string };
                }
              | undefined;

            if (toolRun) {
              // 逆向: yx0 manualBashInvocation → bash ToolItem with output/exitCode/error
              flushActivityBuffer();
              const msgId = (msg as Record<string, unknown>).messageId ?? "info";
              items.push({
                type: "tool",
                toolUseId: `manual-bash:${msgId}:${blockIdx}`,
                toolName: "Bash",
                kind: "bash",
                status: (toolRun.status as ToolItem["status"]) ?? "done",
                command: cmd,
                output:
                  typeof toolRun.result?.output === "string" ? toolRun.result.output : undefined,
                exitCode:
                  typeof toolRun.result?.exitCode === "number"
                    ? toolRun.result.exitCode
                    : undefined,
                error: toolRun.error?.message,
              });
            } else {
              // Fallback: no toolRun data, render as system text (逆向: DN0 hidden prefix)
              const hidden = block.hidden === true;
              flushActivityBuffer();
              items.push({
                type: "message",
                role: "system",
                text: `${hidden ? "$$" : "$"} ${cmd}`,
              });
            }
          }
        }
      }
      continue;
    }

    // Extract text blocks and thinking blocks as items
    // 逆向: gB() in chunk-005.js:2089-2127 — iterates content blocks,
    // accumulates text into markdown items, emits ThinkingItem for type==="thinking"
    const textParts: string[] = [];
    const pendingItems: DisplayItem[] = [];
    let imageCount = 0;

    const flushTextParts = () => {
      if (textParts.length === 0) return;
      const joined = textParts.join("");
      if (
        joined.trim().length > 0 &&
        (msg.role === "user" || msg.role === "assistant" || msg.role === "system")
      ) {
        const contentArr = msg.content as RawContentBlock[];
        const hasToolResults = contentArr.some((b) => b.type === "tool_result");
        if (!hasToolResults || joined.trim()) {
          pendingItems.push({
            type: "message",
            role: msg.role,
            text: joined,
            ...(msg.state?.type === "streaming" ? { isStreaming: true } : {}),
            ...(imageCount > 0 ? { images: imageCount } : {}),
            ...((msg as Record<string, unknown>).interrupted === true ? { interrupted: true } : {}),
            ...(Array.isArray((msg as Record<string, unknown>).discoveredGuidanceFiles)
              ? {
                  discoveredGuidanceFiles: (msg as Record<string, unknown>)
                    .discoveredGuidanceFiles as Array<{ uri: string; lineCount: number }>,
                }
              : {}),
          });
        }
      }
      textParts.length = 0;
    };

    for (const block of msg.content) {
      if (block.type === "text" && block.text) {
        textParts.push(block.text);
      } else if (block.type === "thinking" && typeof block.thinking === "string") {
        // 逆向: gB() line 2119-2124 — flush text, then emit ThinkingItem (Rd widget)
        flushTextParts();
        pendingItems.push({
          type: "thinking",
          text: block.thinking as string,
          isExpanded: false,
        });
      } else if (block.type === "image") {
        imageCount++;
      }
    }
    flushTextParts();

    // 逆向: x8R._buildThinkingBlock — only the last thinking block gets streaming/cancelled flags
    const msgState = msg.state?.type;
    if (msgState === "streaming" || msgState === "cancelled") {
      for (let j = pendingItems.length - 1; j >= 0; j--) {
        if (pendingItems[j].type === "thinking") {
          const thinkingItem = pendingItems[j] as ThinkingItem;
          if (msgState === "streaming") {
            thinkingItem.isStreaming = true;
          } else {
            thinkingItem.isCancelled = true;
          }
          break;
        }
      }
    }

    if (pendingItems.length > 0) {
      flushActivityBuffer();
      items.push(...pendingItems);
    }

    // After the content-block loop, check for usage on assistant messages
    // 逆向: x8R._buildAssistantMessageWidget appends token usage summary
    if (msg.role === "assistant") {
      const rawUsage = (msg as unknown as Record<string, unknown>).usage as
        | { inputTokens: number; outputTokens: number }
        | undefined;
      if (rawUsage && pendingItems.length > 0) {
        const lastItem = pendingItems[pendingItems.length - 1];
        if (lastItem.type === "message" && lastItem.role === "assistant") {
          lastItem.usage = rawUsage;
        }
      }
    }

    // Process tool_use blocks (逆向: yx0 main classification switch)
    for (const block of msg.content) {
      if (block.type !== "tool_use") continue;
      if (!block.id || !block.name) continue;
      // 逆向: bx0(p) hidden tool check
      if (HIDDEN_TOOLS.has(block.name)) continue;

      const result = resultMap.get(block.id);
      const status = (result?.run?.status as ToolItem["status"]) ?? "in-progress";

      // Classify the tool (逆向: yx0 if/else chain)
      if (ACTIVITY_TOOLS[block.name]) {
        // 逆向: yx0 `c()` calls for Read, Grep, Glob, file_tree, etc.
        // 逆向: B9R (misc_utils.js:7776) R.input.path, W9R (misc_utils.js:8088) R.input.pattern
        const toolPath =
          typeof block.input?.file_path === "string"
            ? (block.input.file_path as string)
            : typeof block.input?.path === "string"
              ? (block.input.path as string)
              : undefined;
        const toolDetail =
          typeof block.input?.pattern === "string"
            ? (block.input.pattern as string)
            : typeof block.input?.glob === "string"
              ? (block.input.glob as string)
              : undefined;
        activityBuffer.push({
          kind: ACTIVITY_TOOLS[block.name],
          toolName: block.name,
          toolUseId: block.id,
          status:
            status === "rejected-by-user" ? "cancelled" : (status as ActivityAction["status"]),
          path: toolPath,
          detail: toolDetail,
        });
      } else if (BASH_TOOLS.has(block.name)) {
        // 逆向: yx0 `(p === "Bash" || p === "shell_command")` branch
        flushActivityBuffer();
        items.push({
          type: "tool",
          toolUseId: block.id,
          toolName: block.name,
          kind: "bash",
          status,
          command: typeof block.input?.command === "string" ? block.input.command : undefined,
          output: typeof result?.run?.result === "string" ? result.run.result : undefined,
          error: result?.run?.status === "error" ? result?.run?.error?.message : undefined,
        });
      } else if (EDIT_TOOLS.has(block.name)) {
        // 逆向: yx0 edit_file branch
        // Previously skipped non-done edits. Now show them without diff.
        flushActivityBuffer();
        // 逆向: amp chunk-004.js:7793-7803 — diff field on edit tool result (only when done)
        const diffText =
          status === "done" &&
          typeof block.input?.old_string === "string" &&
          typeof block.input?.new_string === "string"
            ? generateSimpleDiff(
                block.input.old_string as string,
                block.input.new_string as string,
                (block.input.file_path as string) ?? "file",
              )
            : undefined;
        items.push({
          type: "tool",
          toolUseId: block.id,
          toolName: block.name,
          kind: "edit",
          status,
          path: typeof block.input?.file_path === "string" ? block.input.file_path : undefined,
          oldString:
            typeof block.input?.old_string === "string" ? block.input.old_string : undefined,
          newString:
            typeof block.input?.new_string === "string" ? block.input.new_string : undefined,
          diff: diffText,
        });
      } else if (CREATE_TOOLS.has(block.name)) {
        // 逆向: yx0 `(p === "create_file")` branch
        flushActivityBuffer();
        items.push({
          type: "tool",
          toolUseId: block.id,
          toolName: block.name,
          kind: "create-file",
          status,
          path: typeof block.input?.file_path === "string" ? block.input.file_path : undefined,
        });
      } else if (block.name === "web_search") {
        // 逆向: yx0 web_search branch — w1T(_) extracts query (or objective)
        flushActivityBuffer();
        const query =
          typeof block.input?.query === "string"
            ? block.input.query
            : typeof block.input?.objective === "string"
              ? block.input.objective
              : "";
        items.push({
          type: "tool",
          toolUseId: block.id,
          toolName: "Web Search",
          kind: "generic",
          status,
          args: { detail: query },
          error: result?.run?.status === "error" ? result?.run?.error?.message : undefined,
        });
      } else if (block.name === "read_web_page") {
        // 逆向: yx0 read_web_page branch — D1T(_) extracts URL
        flushActivityBuffer();
        const url = typeof block.input?.url === "string" ? block.input.url.trim() : "";
        items.push({
          type: "tool",
          toolUseId: block.id,
          toolName: "read_web_page",
          kind: "generic",
          status,
          args: { detail: url },
          error: result?.run?.status === "error" ? result?.run?.error?.message : undefined,
        });
      } else if (block.name === "mermaid") {
        // 逆向: yx0 mermaid branch
        flushActivityBuffer();
        const code = typeof block.input?.code === "string" ? block.input.code : "";
        const truncated = code.length > 60 ? code.slice(0, 60) + "..." : code;
        items.push({
          type: "tool",
          toolUseId: block.id,
          toolName: "Mermaid",
          kind: "generic",
          status,
          args: { detail: truncated },
          error: result?.run?.status === "error" ? result?.run?.error?.message : undefined,
        });
      } else if (block.name === "task_list") {
        // 逆向: yx0 task_list branch
        flushActivityBuffer();
        const action = typeof block.input?.action === "string" ? block.input.action.trim() : "";
        const title = typeof block.input?.title === "string" ? block.input.title.trim() : "";
        const detail =
          action && title
            ? `Task list: ${action} "${title}"`
            : action
              ? `Task list: ${action}`
              : "Task list";
        items.push({
          type: "tool",
          toolUseId: block.id,
          toolName: "task_list",
          kind: "generic",
          status,
          args: { detail },
          error: result?.run?.status === "error" ? result?.run?.error?.message : undefined,
        });
      } else {
        // 逆向: yx0 fallback at end of if/else chain
        flushActivityBuffer();
        items.push({
          type: "tool",
          toolUseId: block.id,
          toolName: block.name,
          kind: "generic",
          status,
          args: block.input,
          error: result?.run?.status === "error" ? result?.run?.error?.message : undefined,
        });
      }
    }
  }

  // Final flush (逆向: yx0 `l()` call after main loop, line 449)
  flushActivityBuffer();
  return deduplicateEdits(items);
}

/**
 * Build a summary string for an activity group.
 *
 * 逆向: cfT() in 2177_unknown_cfT.js
 * Produces strings like "1 read, 2 searches" with proper pluralization.
 * amp iterates [read, search, web, explore, list] in order with custom plural forms.
 */
function buildActivitySummary(actions: ActivityAction[]): string {
  const counts: Record<string, number> = {};
  for (const a of actions) {
    counts[a.kind] = (counts[a.kind] ?? 0) + 1;
  }
  const parts: string[] = [];
  // 逆向: cfT iterates kinds in fixed order: read, search, web, explore, list
  // "search" uses custom plural "searches" (not "searchs")
  if (counts.read) parts.push(`${counts.read} read${counts.read > 1 ? "s" : ""}`);
  if (counts.search) parts.push(`${counts.search} search${counts.search > 1 ? "es" : ""}`);
  if (counts.list) parts.push(`${counts.list} list${counts.list > 1 ? "s" : ""}`);
  return parts.join(", ") || "activity";
}

// ─── Edit deduplication (Px0) ───────────────────────

/**
 * Merge consecutive edit/create-file tool items targeting the same file path.
 *
 * 逆向: Px0() in modules/2155_unknown_Px0.js
 *
 * Three merge cases:
 * 1. edit + edit (same path): diffs concatenated, status from newer
 * 2. create-file + create-file (same path): newer replaces older
 * 3. create-file + edit (same path): merged into single edit
 */
export function deduplicateEdits(items: DisplayItem[]): DisplayItem[] {
  if (items.length <= 1) return items;

  const result: DisplayItem[] = [items[0]];

  for (let i = 1; i < items.length; i++) {
    const prev = result[result.length - 1];
    const curr = items[i];

    // Only merge consecutive tool items (逆向: Px0 `e.type === "tool" && a.type === "tool"` guard)
    if (prev.type !== "tool" || curr.type !== "tool") {
      result.push(curr);
      continue;
    }

    // Must have same path and both be file-related (逆向: t.path === r.path check)
    const prevPath = prev.path;
    const currPath = curr.path;
    if (!prevPath || !currPath || prevPath !== currPath) {
      result.push(curr);
      continue;
    }

    // Case 1: edit + edit (逆向: Px0 lines 9-31)
    if (prev.kind === "edit" && curr.kind === "edit") {
      result[result.length - 1] = {
        ...prev,
        toolUseId: curr.toolUseId,
        status: curr.status === "error" ? "error" : curr.status,
        diff: prev.diff && curr.diff ? `${prev.diff}\n${curr.diff}` : (curr.diff ?? prev.diff),
        error: curr.error ?? prev.error,
      };
      continue;
    }

    // Case 2: create-file + create-file (逆向: Px0 lines 32-44)
    if (prev.kind === "create-file" && curr.kind === "create-file") {
      result[result.length - 1] = { ...curr, toolUseId: prev.toolUseId };
      continue;
    }

    // Case 3: create-file + edit (逆向: Px0 lines 45-67)
    if (prev.kind === "create-file" && curr.kind === "edit") {
      result[result.length - 1] = {
        ...curr,
        toolUseId: prev.toolUseId,
        kind: "edit",
        diff: curr.diff,
      };
      continue;
    }

    result.push(curr);
  }

  return result;
}

// ─── Streaming projection ───────────────────────────

/**
 * The exported RawMessage shape used by projectStreamingMessage.
 * Internal alias exposed for use in thread-state-widget.ts.
 */
export interface RawMessage {
  role: "user" | "assistant" | "system" | "info";
  content: string | RawContentBlock[];
  state?: { type: string };
}

/**
 * Project a synthetic assistant message from streaming content blocks.
 *
 * 逆向: Wp0() in modules/0374_unknown_Wp0.js
 *   function Wp0(streamingMessageId, streamingBlocks, messageCount, parentToolUseId) {
 *     if (!streamingMessageId || streamingBlocks.length === 0) return null;
 *     return { role: "assistant", content: streamingBlocks,
 *              state: { type: "streaming" }, ... };
 *   }
 *
 * Returns null if there are no streaming blocks or no active streaming message.
 */
export function projectStreamingMessage(
  streamingBlocks: RawContentBlock[],
  streamingMessageId: string | null,
): RawMessage | null {
  if (!streamingMessageId || streamingBlocks.length === 0) return null;
  return {
    role: "assistant",
    content: streamingBlocks,
    state: { type: "streaming" },
  };
}
