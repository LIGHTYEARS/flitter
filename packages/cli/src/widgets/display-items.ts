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

import type { ChartData } from "@flitter/tui";
import { classifyBashCommand } from "../util/bash-classifier.js";
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
  /** Read range [start, end] line numbers (逆向: B9R R.input.read_range — misc_utils.js:7800-7809) */
  readRange?: [number, number];
  /** Guidance files discovered during this tool run (逆向: B9R a.result.discoveredGuidanceFiles — misc_utils.js:7811-7816) */
  guidanceFiles?: Array<{ uri: string; lineCount: number }>;
  /** Parsed chart data for "chart" tool results (逆向: c8R / s8R chart widget) */
  chartData?: ChartData;
  /** Unified diff text for edit/create-file results (逆向: amp chunk-004.js:7793-7803) */
  diff?: string;
  /**
   * Per-file diff data for apply_patch results.
   * 逆向: f50() (1928_unknown_g50.js) extracts result.files from toolRun when status=done.
   * 逆向: $9R (misc_utils.js:6962) renders each file with path, +additions, -deletions, and diff.
   */
  files?: Array<{
    path: string;
    type: "add" | "update" | "delete" | "move";
    additions: number;
    deletions: number;
    diff?: string;
  }>;
}

/**
 * A single action within an activity group.
 * 逆向: the `c()` accumulator items in yx0 — {kind, title, ...}
 * 逆向: Vw() (chunk-004.js:8765) returns {kind: "explore"} for Bash/unknown tools
 * 逆向: Ux0 (2171_unknown_Ux0.js) and Hx0 (2172_unknown_Hx0.js) use "thinking"
 * 逆向: qx0 (2174_unknown_qx0.js) uses both "thinking" and "explore"
 */
export interface ActivityAction {
  kind: "read" | "search" | "list" | "explore" | "thinking";
  toolName: string;
  toolUseId: string;
  status:
    | "done"
    | "error"
    | "cancelled"
    | "cancellation-requested"
    | "rejected-by-user"
    | "in-progress"
    | "blocked-on-user"
    | "queued";
  /** File path for Read, pattern/glob for search tools
   * 逆向: B9R (misc_utils.js:7776) R.input.path, W9R (misc_utils.js:8088) R.input.pattern */
  path?: string;
  /** Additional detail (pattern for search, range for read) */
  detail?: string;
  /** Read range [start, end] line numbers (逆向: B9R R.input.read_range — misc_utils.js:7800-7809) */
  readRange?: [number, number];
  /** Guidance files discovered during this tool run (逆向: B9R a.result.discoveredGuidanceFiles — misc_utils.js:7811-7816, $b() — chunk-004.js:37537-37542) */
  guidanceFiles?: Array<{ uri: string; lineCount: number }>;
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
 * Default-collapsed at all times (including streaming). Shows "✓ Thinking ▶"
 * or spinner + "Thinking ▶" when streaming. Click to expand shows full text with "▼".
 * Divergence from amp: amp shows streaming content always; we default-collapse for cleaner UI.
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

/** Tools that get their own full row with file path (逆向: yx0 edit_file/undo_edit) */
const EDIT_TOOLS = new Set(["Edit", "edit_file", "undo_edit"]);

/** Tools that get their own full row with file path (逆向: yx0 create_file branch) */
const CREATE_TOOLS = new Set(["Write", "create_file"]);

/**
 * Tools grouped into activity rows (逆向: yx0 `c()` calls).
 * Reserved for future DTW/thread-controller view.
 * In the main chat view (f8R/x8R), all tools render standalone (逆向: Bs.buildThreadItemWidget).
 */
const ACTIVITY_TOOLS: Record<string, "read" | "search" | "list"> = {};

/** Read tool gets standalone row with file path + range (逆向: Bs.buildReadTool → B9R → x3) */
const READ_TOOLS = new Set(["Read"]);

/** Grep tool gets standalone row with pattern (逆向: Bs.buildGrepTool → W9R → x3) */
const GREP_TOOLS = new Set(["Grep"]);

/**
 * Other formerly-grouped tools get generic standalone rows.
 * 逆向: Bs.buildGenericTool, Bs.buildToolWidget switch — each gets its own x3 row.
 */
const GENERIC_STANDALONE_TOOLS: Record<string, { displayName: string; detailKey: string }> = {
  Glob: { displayName: "Glob", detailKey: "pattern" },
  FuzzyFind: { displayName: "FuzzyFind", detailKey: "query" },
  file_tree: { displayName: "List", detailKey: "path" },
  read_thread: { displayName: "Read Thread", detailKey: "path" },
  find_thread: { displayName: "Find Thread", detailKey: "query" },
  skill: { displayName: "Skill", detailKey: "description" },
  get_diagnostics: { displayName: "Get Diagnostics", detailKey: "path" },
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
              const msgId = (msg as unknown as Record<string, unknown>).messageId ?? "info";
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
            ...((msg as unknown as Record<string, unknown>).interrupted === true
              ? { interrupted: true }
              : {}),
            ...(Array.isArray((msg as unknown as Record<string, unknown>).discoveredGuidanceFiles)
              ? {
                  discoveredGuidanceFiles: (msg as unknown as Record<string, unknown>)
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
    // Divergence from amp: we only mark thinking as streaming if no text block follows it.
    // When content is [thinking, text], thinking has finished — only text is still streaming.
    // Amp marks thinking as streaming even when text follows (because it shows content expanded),
    // but we default-collapse thinking, so a spinning header with finished content is misleading.
    const msgState = msg.state?.type;
    if (msgState === "streaming" || msgState === "cancelled") {
      // Find the index of the last thinking block in msg.content
      const contentArr = msg.content as RawContentBlock[];
      let lastThinkingContentIdx = -1;
      for (let k = contentArr.length - 1; k >= 0; k--) {
        if (contentArr[k].type === "thinking") {
          lastThinkingContentIdx = k;
          break;
        }
      }

      // Check if any non-thinking content block follows the last thinking block
      const hasContentAfterThinking =
        lastThinkingContentIdx >= 0 &&
        contentArr
          .slice(lastThinkingContentIdx + 1)
          .some(
            (b) =>
              (b.type === "text" && b.text && b.text.trim().length > 0) || b.type === "tool_use",
          );

      for (let j = pendingItems.length - 1; j >= 0; j--) {
        if (pendingItems[j].type === "thinking") {
          const thinkingItem = pendingItems[j] as ThinkingItem;
          if (msgState === "streaming" && !hasContentAfterThinking) {
            thinkingItem.isStreaming = true;
          } else if (msgState === "cancelled") {
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

    // 逆向: ai() in 2167_unknown_Ex0.js:9-11 — extract first truthy string from known property names
    const extractDetail = (input: Record<string, unknown> | undefined): string | undefined => {
      if (!input) return undefined;
      for (const key of [
        "path",
        "filePattern",
        "pattern",
        "query",
        "url",
        "objective",
        "description",
        "prompt",
      ]) {
        const v = input[key];
        if (typeof v === "string" && v.trim()) return v.trim();
      }
      return undefined;
    };

    // Process tool_use blocks (逆向: yx0 main classification switch)
    for (const block of msg.content) {
      if (block.type !== "tool_use") continue;
      if (!block.id || !block.name) continue;
      // 逆向: bx0(p) hidden tool check
      if (HIDDEN_TOOLS.has(block.name)) continue;

      const result = resultMap.get(block.id);
      const status = (result?.run?.status as ToolItem["status"]) ?? "in-progress";

      // Classify the tool (逆向: Bs.buildToolWidget switch — main chat view f8R/x8R path)

      if (READ_TOOLS.has(block.name)) {
        // 逆向: Bs.buildReadTool → B9R → x3 (misc_utils.js:7776-7823)
        flushActivityBuffer();
        const toolPath =
          typeof block.input?.file_path === "string"
            ? (block.input.file_path as string)
            : typeof block.input?.path === "string"
              ? (block.input.path as string)
              : undefined;

        let readRange: [number, number] | undefined;
        if (Array.isArray(block.input?.read_range)) {
          const [start, end] = block.input.read_range as [unknown, unknown];
          if (typeof start === "number" && typeof end === "number" && start >= 0 && end >= 0) {
            readRange = [start, end];
          }
        }

        let guidanceFiles: Array<{ uri: string; lineCount: number }> | undefined;
        if (
          result?.run?.status === "done" &&
          typeof result.run.result === "object" &&
          result.run.result !== null &&
          Array.isArray((result.run.result as Record<string, unknown>).discoveredGuidanceFiles)
        ) {
          guidanceFiles = (result.run.result as Record<string, unknown>)
            .discoveredGuidanceFiles as Array<{ uri: string; lineCount: number }>;
        }

        items.push({
          type: "tool",
          toolUseId: block.id,
          toolName: block.name,
          kind: "read",
          status,
          path: toolPath,
          readRange,
          guidanceFiles,
          error: result?.run?.status === "error" ? result?.run?.error?.message : undefined,
        });
      } else if (GREP_TOOLS.has(block.name)) {
        // 逆向: Bs.buildGrepTool → W9R → x3 (misc_utils.js:8088)
        flushActivityBuffer();
        const pattern =
          typeof block.input?.pattern === "string" ? (block.input.pattern as string) : undefined;
        const grepPath =
          typeof block.input?.path === "string" ? (block.input.path as string) : undefined;
        items.push({
          type: "tool",
          toolUseId: block.id,
          toolName: block.name,
          kind: "search",
          status,
          path: grepPath,
          args: pattern ? { detail: pattern } : undefined,
          error: result?.run?.status === "error" ? result?.run?.error?.message : undefined,
        });
      } else if (GENERIC_STANDALONE_TOOLS[block.name]) {
        // 逆向: Bs.buildGenericTool → x3 (misc_utils.js various buildXTool methods)
        flushActivityBuffer();
        const config = GENERIC_STANDALONE_TOOLS[block.name];
        const detail =
          typeof block.input?.[config.detailKey] === "string"
            ? (block.input[config.detailKey] as string)
            : extractDetail(block.input as Record<string, unknown> | undefined);
        items.push({
          type: "tool",
          toolUseId: block.id,
          toolName: config.displayName,
          kind: "generic",
          status,
          args: detail ? { detail } : (block.input as Record<string, unknown>),
          error: result?.run?.status === "error" ? result?.run?.error?.message : undefined,
        });
      } else if (ACTIVITY_TOOLS[block.name]) {
        // Reserved for future DTW/thread-controller view (currently empty map)
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
        // 逆向: yx0 `(p === "Bash" || p === "shell_command")` branch (chunk-004.js:7752-7787)
        // 逆向: WO(P) → IzR → yzT to detect sed/perl write-like commands
        // 逆向: only sed and perl are promoted to kind:"edit"; other write-like programs stay bash
        //       (chunk-004.js:7756: k.isWriteLike && (k.program === "sed" || k.program === "perl"))
        const cmd = typeof block.input?.command === "string" ? block.input.command : undefined;
        const classification = cmd ? classifyBashCommand(cmd) : undefined;

        flushActivityBuffer();
        if (
          classification?.isWriteLike &&
          (classification.program === "sed" || classification.program === "perl")
        ) {
          // Promote sed/perl write-like commands to kind:"edit"
          // 逆向: chunk-004.js:7758-7765
          items.push({
            type: "tool",
            toolUseId: block.id,
            toolName: block.name,
            kind: "edit",
            status,
            // 逆向: path: k.path ?? P — fall back to raw command if $zR couldn't extract a path
            path: classification.path ?? cmd,
            command: cmd,
            error: result?.run?.status === "error" ? result?.run?.error?.message : undefined,
          });
        } else {
          items.push({
            type: "tool",
            toolUseId: block.id,
            toolName: block.name,
            kind: "bash",
            status,
            command: cmd,
            output: typeof result?.run?.result === "string" ? result.run.result : undefined,
            error: result?.run?.status === "error" ? result?.run?.error?.message : undefined,
          });
        }
      } else if (block.name === "apply_patch") {
        // 逆向: $9R (misc_utils.js:6962) — Apply Patch widget renders per-file diff blocks
        // 逆向: f50() (1928_unknown_g50.js) — extracts result.files when status=done and files array present
        //   f50: T?.status === "done" && typeof T.result === "object" && "files" in T.result && Array.isArray(T.result.files)
        flushActivityBuffer();
        const applyRun = result?.run;
        const applyResult =
          applyRun?.status === "done" &&
          typeof applyRun.result === "object" &&
          applyRun.result !== null &&
          "files" in (applyRun.result as Record<string, unknown>) &&
          Array.isArray((applyRun.result as Record<string, unknown>).files)
            ? (applyRun.result as Record<string, unknown>)
            : undefined;
        const fileEntries = applyResult?.files as Array<Record<string, unknown>> | undefined;
        const summary =
          typeof applyResult?.summary === "string" ? (applyResult.summary as string) : undefined;
        // Map each file entry to our typed shape (逆向: $9R iterates h.files with .additions/.deletions/.diff)
        const files = fileEntries?.map((f) => ({
          path: typeof f.path === "string" ? f.path : "",
          type: (["add", "update", "delete", "move"].includes(f.type as string)
            ? f.type
            : "update") as "add" | "update" | "delete" | "move",
          additions: typeof f.additions === "number" ? (f.additions as number) : 0,
          deletions: typeof f.deletions === "number" ? (f.deletions as number) : 0,
          diff: typeof f.diff === "string" ? (f.diff as string) : undefined,
        }));
        items.push({
          type: "tool",
          toolUseId: block.id,
          toolName: block.name,
          kind: "edit",
          status,
          path: summary,
          files,
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
      } else if (block.name === "finder") {
        // 逆向: chunk-004.js:7878 — p === "finder" → Ux0(m, query) builder
        // finder is a specialized sub-agent for codebase search
        flushActivityBuffer();
        const { actions: finderActions, summary: finderSummary } = buildSpecializedActivityGroup(
          "finder",
          block,
          result,
          status,
        );
        items.push({
          type: "activity-group",
          actions: finderActions,
          summary: finderSummary,
          hasInProgress: status === "in-progress" || status === "queued",
        });
      } else if (block.name === "code_review") {
        // 逆向: chunk-004.js:7969 — p === "code_review" → qx0(m, input) builder
        flushActivityBuffer();
        const { actions: reviewActions, summary: reviewSummary } = buildSpecializedActivityGroup(
          "code_review",
          block,
          result,
          status,
        );
        items.push({
          type: "activity-group",
          actions: reviewActions,
          summary: reviewSummary,
          hasInProgress: status === "in-progress" || status === "queued",
        });
      } else if (block.name === "code_tour") {
        // 逆向: chunk-004.js:7981 — p === "code_tour" → Hx0(m, input) builder
        flushActivityBuffer();
        const { actions: tourActions, summary: tourSummary } = buildSpecializedActivityGroup(
          "code_tour",
          block,
          result,
          status,
        );
        items.push({
          type: "activity-group",
          actions: tourActions,
          summary: tourSummary,
          hasInProgress: status === "in-progress" || status === "queued",
        });
      } else if (block.name === "Task") {
        // 逆向: yx0 Task branch — render as Subagent with description detail
        // Uses extractDetail (逆向: ai()) to find the best detail string
        // Extended: detect mode input for finder/code_review/code_tour specialized builders
        // 逆向: yx0 activity-group dispatch (chunk-004.js:7878-7991)
        flushActivityBuffer();
        const mode = typeof block.input?.mode === "string" ? block.input.mode : undefined;

        if (mode === "finder" || mode === "code_review" || mode === "code_tour") {
          const { actions: modeActions, summary: modeSummary } = buildSpecializedActivityGroup(
            mode,
            block,
            result,
            status,
          );
          items.push({
            type: "activity-group",
            actions: modeActions,
            summary: modeSummary,
            hasInProgress: status === "in-progress" || status === "queued",
          });
        } else {
          const detail =
            extractDetail(block.input as Record<string, unknown>) ??
            JSON.stringify(block.input ?? {});
          items.push({
            type: "tool",
            toolUseId: block.id,
            toolName: "Subagent",
            kind: "generic",
            status,
            args: { detail },
            error: result?.run?.status === "error" ? result?.run?.error?.message : undefined,
          });
        }
      } else if (block.name === "chart") {
        // 逆向: c8R / s8R (chunk-006.js:30792-30904) — chart tool widget.
        //   Reads toolRun.result.data (or toolUse.input.data) as JSON string.
        //   Reads toolUse.input.{chartType, xColumn, yColumns, title, stacked, horizontal, ...}
        //   to build ChartData via v50() (1931_unknown_v50.js).
        //   Falls through to generic display (name + cmd detail) when no result yet.
        flushActivityBuffer();
        const chartInput = block.input as Record<string, unknown> | undefined;
        const chartRun = result?.run;
        const chartResultData =
          typeof (chartRun?.result as Record<string, unknown> | undefined)?.data === "string"
            ? ((chartRun!.result as Record<string, unknown>).data as string)
            : typeof chartInput?.data === "string"
              ? chartInput.data
              : undefined;

        // Build ChartData from parsed JSON (逆向: v50 pipeline)
        let parsedChartData: ChartData | undefined;
        if (chartResultData && status === "done") {
          try {
            const rawData = JSON.parse(chartResultData);
            if (!Array.isArray(rawData)) {
              throw new Error("Expected JSON array");
            }
            const chartTypeRaw =
              typeof chartInput?.chartType === "string" ? chartInput.chartType : "bar";
            const xColumn = typeof chartInput?.xColumn === "string" ? chartInput.xColumn : "";
            const yColumns = Array.isArray(chartInput?.yColumns)
              ? (chartInput.yColumns as string[])
              : [];
            const stacked = typeof chartInput?.stacked === "boolean" ? chartInput.stacked : false;
            const horizontal =
              typeof chartInput?.horizontal === "boolean" ? chartInput.horizontal : false;

            // Map chartType + flags to our ChartData.chartType (逆向: v50 lines 20-22)
            let chartType: ChartData["chartType"];
            if (chartTypeRaw === "bar") {
              if (horizontal) chartType = "horizontal-bar";
              else if (stacked && yColumns.length > 1) chartType = "stacked-bar";
              else chartType = "bar";
            } else if (chartTypeRaw === "area") {
              chartType = stacked ? "stacked-area" : "line";
            } else {
              chartType = "line";
            }

            // Build series (逆向: v50 lines 59-88 — per-yColumn series)
            const MAX_POINTS = 100;
            const series = yColumns.map((yCol) => {
              const values: number[] = [];
              const xLabelsForSeries: string[] = [];
              for (const row of rawData as Record<string, unknown>[]) {
                if (typeof row !== "object" || row === null) continue;
                const xVal = row[xColumn];
                const yVal = row[yCol];
                if (xVal === undefined || yVal === undefined) continue;
                const num = Number(yVal);
                if (!Number.isFinite(num)) continue;
                values.push(num);
                xLabelsForSeries.push(String(xVal));
                if (values.length >= MAX_POINTS) break;
              }
              return {
                label: yColumns.length > 1 ? yCol : "default",
                values,
                _xLabels: xLabelsForSeries,
              };
            });

            const xLabels = series[0]?._xLabels ?? [];
            const cleanSeries = series.map(({ _xLabels: _unused, ...rest }) => rest);

            parsedChartData = {
              chartType,
              series: cleanSeries,
              xLabels,
              title: typeof chartInput?.title === "string" ? chartInput.title : undefined,
              xAxisLabel:
                typeof chartInput?.xAxisLabel === "string"
                  ? chartInput.xAxisLabel
                  : xColumn || undefined,
              yAxisLabel:
                typeof chartInput?.yAxisLabel === "string"
                  ? chartInput.yAxisLabel
                  : yColumns[0] || undefined,
            };
          } catch {
            // Parse failure — fall back to generic display (no chart rendered)
          }
        }

        const cmdDetail = typeof chartInput?.cmd === "string" ? chartInput.cmd : undefined;
        const titleDetail = typeof chartInput?.title === "string" ? chartInput.title : undefined;
        const detail = titleDetail ?? cmdDetail ?? "chart";

        items.push({
          type: "tool",
          toolUseId: block.id,
          toolName: "chart",
          kind: "generic",
          status,
          args: { detail },
          error: result?.run?.status === "error" ? result?.run?.error?.message : undefined,
          ...(parsedChartData ? { chartData: parsedChartData } : {}),
        });
      } else {
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

// ─── Specialized activity group builders ──────────────

/**
 * Build actions and summary for specialized sub-agent tools.
 *
 * Handles finder, code_review, and code_tour — each maps to a dedicated
 * amp builder function that interprets progress data and constructs
 * typed ActivityAction items.
 *
 * 逆向: Ux0() (2171_unknown_Ux0.js) — finder builder
 * 逆向: qx0() (2174_unknown_qx0.js) — code_review builder
 * 逆向: Hx0() (2172_unknown_Hx0.js) — code_tour builder
 * 逆向: dispatch at chunk-004.js:7878-7991
 *
 * Note: amp uses FtT(m) to extract progress.tool_uses from the tool run,
 * which we do not have access to in the current display pipeline (we only
 * have the tool_use block and the result status). We match the fallback
 * behaviors of each builder when no progress data is available.
 */
function buildSpecializedActivityGroup(
  mode: "finder" | "code_review" | "code_tour",
  block: RawContentBlock,
  result: RawContentBlock | undefined,
  status: ToolItem["status"],
): { actions: ActivityAction[]; summary: string } {
  const seen = new Set<string>();
  const actions: ActivityAction[] = [];

  /** Deduplicated push (逆向: t() closure in qx0/Hx0 — dedup by `${kind}:${title}`) */
  const push = (kind: ActivityAction["kind"], detail: string) => {
    const key = `${kind}:${detail}`;
    if (seen.has(key)) return;
    seen.add(key);
    actions.push({
      kind,
      toolName: block.name ?? "",
      toolUseId: block.id ?? "",
      status,
      detail,
    });
  };

  if (mode === "finder") {
    // 逆向: Ux0() — when FtT returns empty, push fallback "Search codebase: ${query}"
    // We have no progress data here so always use the fallback path.
    const query = typeof block.input?.query === "string" ? block.input.query.trim() : undefined;
    push("explore", query ? `Search codebase: ${query}` : "Search codebase");
    if (status === "done") push("explore", "Search complete");
    const summary = query ? `finder: ${query}` : "finder";
    return { actions, summary };
  }

  if (mode === "code_review") {
    // 逆向: qx0() — status-based fallback when no progress actions
    const thoroughness =
      typeof block.input?.thoroughness === "string" ? block.input.thoroughness : undefined;
    const summaryLabel = thoroughness === "quick" ? "quick code review" : "code review";

    if (status === "queued") {
      push("thinking", "Code review queued");
    } else if (status === "done") {
      push("explore", "Code review complete");
    } else if (status === "error") {
      const errMsg = result?.run?.status === "error" ? result?.run?.error?.message : undefined;
      push("explore", errMsg ? `Code review failed: ${errMsg}` : "Code review failed");
    }

    // 逆向: qx0() final fallback — if a.length === 0 push default thinking action
    if (actions.length === 0) {
      push("thinking", status === "queued" ? "Code review queued" : "Reviewing code changes...");
    }

    return { actions, summary: summaryLabel };
  }

  if (mode === "code_tour") {
    // 逆向: Hx0() — status-based fallback when no progress actions
    if (status === "done") {
      push("explore", "Code tour complete");
    } else if (status === "error") {
      const errMsg = result?.run?.status === "error" ? result?.run?.error?.message : undefined;
      push("explore", errMsg ? `Code tour failed: ${errMsg}` : "Code tour failed");
    }

    // 逆向: Hx0() final fallback — if a.length === 0 push default thinking action
    if (actions.length === 0) {
      push("thinking", status === "queued" ? "Code tour queued" : "Generating code tour...");
    }

    // 逆向: Hx0() — r = focus.trim(); summary: `code tour: ${r}` or "code tour"
    const focus = typeof block.input?.focus === "string" ? block.input.focus.trim() : undefined;
    const summary = focus ? `code tour: ${focus}` : "code tour";
    return { actions, summary };
  }

  // Should never reach here given typed parameter, but TS needs exhaustive return
  return { actions, summary: mode };
}

/**
 * Build a summary string for an activity group.
 *
 * 逆向: cfT() in 2177_unknown_cfT.js
 * Produces strings like "1 read, 2 searches" with proper pluralization.
 * amp iterates [read, search, web, explore, list] in order with custom plural forms.
 * "explore" uses plural "explorations" (逆向: cfT — "exploration" entry).
 */
function buildActivitySummary(actions: ActivityAction[]): string {
  const counts: Record<string, number> = {};
  for (const a of actions) {
    counts[a.kind] = (counts[a.kind] ?? 0) + 1;
  }
  const parts: string[] = [];
  // 逆向: cfT iterates kinds in fixed order: read, search, web, explore, list
  // "search" uses custom plural "searches" (not "searchs")
  // "explore" uses "exploration"/"explorations" (逆向: cfT entry ["explore", "exploration", void 0])
  // 逆向: lW0 (2816_unknown_lW0.js) uses "file read" / "file reads"
  if (counts.read) parts.push(`${counts.read} file read${counts.read > 1 ? "s" : ""}`);
  if (counts.search) parts.push(`${counts.search} search${counts.search > 1 ? "es" : ""}`);
  if (counts.explore) parts.push(`${counts.explore} exploration${counts.explore > 1 ? "s" : ""}`);
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
