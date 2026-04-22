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
  status: "done" | "error" | "cancelled" | "in-progress" | "blocked-on-user" | "queued";
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
 */
export interface ThinkingItem {
  type: "thinking";
  text: string;
  isExpanded: boolean;
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

    // 逆向: ux0 — info role messages with manual_bash_invocation
    // Rendered as "$ cmd" or "$$ cmd" (hidden) in the system message style
    if (msg.role === "info") {
      if (typeof msg.content !== "string") {
        for (const block of msg.content) {
          if (block.type === "manual_bash_invocation" && block.args) {
            const cmd = ((block as Record<string, unknown>).args as Record<string, unknown>)
              .cmd as string;
            const hidden = block.hidden === true;
            if (cmd) {
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
      }
    }
    flushTextParts();

    if (pendingItems.length > 0) {
      flushActivityBuffer();
      items.push(...pendingItems);
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
        activityBuffer.push({
          kind: ACTIVITY_TOOLS[block.name],
          toolName: block.name,
          toolUseId: block.id,
          status:
            status === "rejected-by-user" ? "cancelled" : (status as ActivityAction["status"]),
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
