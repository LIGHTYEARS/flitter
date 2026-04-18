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

export type DisplayItem = MessageItem | ToolItem | ActivityGroupItem;

export interface MessageItem {
  type: "message";
  role: "user" | "assistant" | "system";
  text: string;
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
  status: "done" | "error" | "cancelled" | "rejected-by-user" | "in-progress";
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
  status: "done" | "error" | "cancelled" | "in-progress";
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

interface RawContentBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  complete?: boolean;
  toolUseID?: string;
  run?: { status: string; result?: unknown; error?: { message: string; errorCode?: string } };
  [key: string]: unknown;
}

interface RawMessage {
  role: "user" | "assistant" | "system" | "info";
  content: string | RawContentBlock[];
  state?: { type: string };
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

    // Extract text blocks as message items (逆向: ux0 text filtering with hidden/trim checks)
    const textParts: string[] = [];
    for (const block of msg.content) {
      if (block.type === "text" && block.text) {
        textParts.push(block.text);
      }
    }
    if (
      textParts.length > 0 &&
      (msg.role === "user" || msg.role === "assistant" || msg.role === "system")
    ) {
      // Only emit message item if there's actual text content.
      // Skip user messages that only contain tool_result blocks (逆向: ux0 user branch
      // filters out tool_result-only messages, only emitting text/image content).
      const hasToolResults = msg.content.some((b) => b.type === "tool_result");
      if (!hasToolResults || textParts.some((t) => t.trim())) {
        flushActivityBuffer();
        items.push({ type: "message", role: msg.role, text: textParts.join("") });
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
        // 逆向: yx0 `(p === "edit_file")` and `(p === "undo_edit")` branches
        // 逆向: W4(m.status) guard — amp skips edit items unless status is "done"
        if (status !== "done") continue;
        flushActivityBuffer();
        // 逆向: amp chunk-004.js:7793-7803 — diff field on edit tool result
        const diffText =
          typeof block.input?.old_string === "string" && typeof block.input?.new_string === "string"
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
  return items;
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
