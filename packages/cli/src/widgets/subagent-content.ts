// packages/cli/src/widgets/subagent-content.ts
/**
 * Subagent content data pipeline.
 *
 * Extracts nested agent (subagent) content from thread messages,
 * keyed by the parent tool_use ID. Provides structured data for
 * rendering subagent tool calls, progress, and terminal messages.
 *
 * 逆向: jM0() in modules/2606_unknown_jM0.js
 * 逆向: xM0() in modules/2605_unknown_gM0.js — subagent tool name check
 * 逆向: $M0() in modules/2606_unknown_jM0.js — terminal assistant message extraction
 * 逆向: SM0() in modules/2607_unknown_OM0.js — synthetic ID generation
 * 逆向: OM0() in modules/2607_unknown_OM0.js — toolRun extraction from progress entry
 */

import type { RawContentBlock, RawMessage } from "./display-items.js";

// ─── Data Structures ─────────────────────────────────

/** SubagentTool — one nested tool call inside a subagent */
export interface SubagentTool {
  toolUse: {
    type: "tool_use";
    id: string;
    name: string;
    input: Record<string, unknown>;
    complete: boolean;
  };
  toolRun: {
    status: "done" | "error" | "in-progress" | "queued" | "cancelled" | "blocked-on-user";
    result?: unknown;
    error?: { message: string };
    reason?: string;
  };
  toolProgress?: { status?: string; content?: string };
}

/** ProgressChunk — from run.progress[] entries */
export interface ProgressChunk {
  message?: string;
  reasoning?: string;
  tool_uses?: Array<{
    id?: string;
    tool_name?: string;
    normalized_name?: string;
    input?: unknown;
    status?: string;
    result?: unknown;
    error?: { message: string };
  }>;
}

/** TerminalAssistantMessage — the subagent's final reply */
export interface TerminalAssistantMessage {
  content: Array<{ type: "text"; text: string } | { type: "thinking"; thinking: string }>;
  state: { type: "streaming" | "complete" | "cancelled" | "error" };
}

/** SubagentContent — complete content for one subagent invocation */
export interface SubagentContent {
  tools: SubagentTool[];
  terminalAssistantMessage?: TerminalAssistantMessage;
  progressChunks?: ProgressChunk[];
}

// ─── Constants ─────────────────────────────────────────

/**
 * Set of tool names that are subagent tools.
 * 逆向: xM0() — checks T === tt || T === ja || T === uc || T === Dt || T === _L
 * where tt="oracle", ja="finder", uc="librarian", Dt="Task", _L="code_review"
 */
const SUBAGENT_TOOL_NAMES = new Set(["oracle", "finder", "librarian", "Task", "code_review"]);

// ─── Helper exports ────────────────────────────────────

/**
 * Check if a tool name is a known subagent tool.
 * 逆向: xM0() in modules/2605_unknown_gM0.js
 */
export function isSubagentTool(toolName: string): boolean {
  return SUBAGENT_TOOL_NAMES.has(toolName);
}

/** Check if SubagentContent has a terminal assistant message. */
export function hasTerminalMessage(content: SubagentContent): boolean {
  return content.terminalAssistantMessage !== undefined;
}

// ─── Internal helpers ──────────────────────────────────

/**
 * Check if a status is terminal (done, error, rejected-by-user, cancelled).
 * 逆向: wt() in modules/1602_unknown_pm.js
 */
function isTerminalStatus(status: string): boolean {
  return (
    status === "done" ||
    status === "error" ||
    status === "rejected-by-user" ||
    status === "cancelled"
  );
}

/**
 * Generate a tool ID: use existing ID if non-empty, otherwise synthesize.
 * 逆向: SM0() in modules/2607_unknown_OM0.js
 */
function resolveToolId(entry: { id?: string }, parentId: string, fallbackIndex: number): string {
  if (typeof entry.id === "string" && entry.id.length > 0) return entry.id;
  return `${parentId}:progress:${fallbackIndex}`;
}

/**
 * Extract toolRun from a progress tool_uses entry.
 * 逆向: OM0() in modules/2607_unknown_OM0.js
 */
function extractToolRun(entry: {
  status?: string;
  result?: unknown;
  error?: unknown;
}): SubagentTool["toolRun"] {
  if (entry.status === "done" && entry.result !== undefined) {
    return { status: "done", result: entry.result };
  }
  if (entry.status === "error") {
    const errMsg =
      typeof entry.error === "string" && entry.error.length > 0
        ? entry.error
        : "Subagent tool failed";
    return { status: "error", error: { message: errMsg } };
  }
  return { status: (entry.status as SubagentTool["toolRun"]["status"]) ?? "in-progress" };
}

/**
 * Normalize input to a Record<string, unknown>.
 * 逆向: vM0() in modules/2606_unknown_jM0.js
 */
function normalizeInput(input: unknown): Record<string, unknown> {
  if (typeof input === "object" && input !== null && !Array.isArray(input)) {
    return input as Record<string, unknown>;
  }
  return {};
}

/**
 * Apply cancellation propagation: if parent was cancelled and child is not
 * in a terminal state, mark child as cancelled.
 * 逆向: `t` closure in jM0() — lines 18-25
 */
function applyCancellation(
  parentRun: { status: string } | undefined,
  childRun: SubagentTool["toolRun"],
): SubagentTool["toolRun"] {
  if (!parentRun || parentRun.status !== "cancelled" || isTerminalStatus(childRun.status)) {
    return childRun;
  }
  return { status: "cancelled", reason: "Parent subagent was cancelled" };
}

/**
 * Extract the terminal assistant message from a set of messages.
 * Returns the last assistant message that has meaningful text/thinking content.
 * 逆向: $M0() in modules/2606_unknown_jM0.js — iterates messages, keeps last valid gM0 result
 * 逆向: gM0() in modules/2605_unknown_gM0.js — filters content for text/thinking blocks
 */
function extractTerminalAssistantMessage(
  messages: Array<RawMessage & { parentToolUseId?: string }>,
): TerminalAssistantMessage | undefined {
  let result: TerminalAssistantMessage | undefined;

  for (const msg of messages) {
    if (msg.role !== "assistant") continue;
    if (typeof msg.content === "string") continue;
    const stateType = msg.state?.type;
    if (!stateType) continue;

    // 逆向: gM0 — skip error state, filter content for valid blocks
    if (stateType === "error") continue;

    let filteredContent: TerminalAssistantMessage["content"];

    if (stateType === "cancelled") {
      // 逆向: gM0 cancelled branch — only text blocks, skip if empty
      const textBlocks = (msg.content as RawContentBlock[])
        .filter((b) => b.type === "text" && typeof b.text === "string")
        .map((b) => ({ type: "text" as const, text: b.text! }));
      const joinedText = textBlocks
        .map((b) => b.text)
        .join("")
        .trim();
      if (joinedText.length === 0) continue;
      filteredContent = textBlocks;
    } else {
      // 逆向: gM0 streaming/complete branch — text and thinking blocks
      const validBlocks: TerminalAssistantMessage["content"] = [];
      for (const block of msg.content as RawContentBlock[]) {
        if (
          block.type === "text" &&
          typeof block.text === "string" &&
          block.text.trim().length > 0
        ) {
          validBlocks.push({ type: "text", text: block.text });
        } else if (
          block.type === "thinking" &&
          typeof block.thinking === "string" &&
          block.thinking.trim().length > 0
        ) {
          validBlocks.push({ type: "thinking", thinking: block.thinking });
        }
      }
      if (validBlocks.length === 0) continue;
      filteredContent = validBlocks;
    }

    result = {
      content: filteredContent,
      state: { type: stateType as TerminalAssistantMessage["state"]["type"] },
    };
  }

  return result;
}

// ─── Main builder ──────────────────────────────────────

/**
 * Build subagent content keyed by parent tool_use ID.
 *
 * Two data paths (逆向: jM0):
 * 1. Messages with `parentToolUseId` → group by that ID, extract tool_result blocks
 *    (match with corresponding tool_use blocks), find last assistant message as terminal.
 * 2. `tool_result` blocks whose `run.progress` array contains `tool_uses` → extract
 *    as SubagentTool[]. Path 1 data takes priority over Path 2.
 */
export function buildSubagentContentByParentID(
  messages: RawMessage[],
): Record<string, SubagentContent> {
  // Phase 1 (Path 2): Collect subagent tool_results with progress data
  // 逆向: jM0 lines 16-17 — find tool_result blocks for subagent tools
  const parentRunMap = new Map<string, { status: string; progress?: ProgressChunk[] }>();

  for (const msg of messages) {
    if (typeof msg.content === "string") continue;
    for (const block of msg.content as RawContentBlock[]) {
      if (
        block.type === "tool_result" &&
        block.toolUseID &&
        typeof block.run === "object" &&
        block.run
      ) {
        // Check if this tool_result corresponds to a subagent tool
        // We need to look up the tool_use to check its name
        parentRunMap.set(block.toolUseID, {
          status: block.run.status,
          progress: Array.isArray((block.run as Record<string, unknown>).progress)
            ? ((block.run as Record<string, unknown>).progress as ProgressChunk[])
            : undefined,
        });
      }
    }
  }

  // Find which of these are subagent tools by checking tool_use blocks
  const subagentParentIds = new Set<string>();
  for (const msg of messages) {
    if (typeof msg.content === "string") continue;
    for (const block of msg.content as RawContentBlock[]) {
      if (block.type === "tool_use" && block.id && block.name && isSubagentTool(block.name)) {
        if (parentRunMap.has(block.id)) {
          subagentParentIds.add(block.id);
        }
      }
    }
  }

  // Build Path 2 data: extract tools from run.progress
  // 逆向: jM0 lines 28-51
  const result: Record<string, SubagentContent> = {};

  for (const parentId of subagentParentIds) {
    const parentRun = parentRunMap.get(parentId)!;
    const tools: SubagentTool[] = [];

    const progress = parentRun.progress;
    if (Array.isArray(progress)) {
      let fallbackIndex = 0;
      for (const chunk of progress) {
        if (!chunk.tool_uses) continue;
        for (const entry of chunk.tool_uses) {
          const toolId = resolveToolId(entry as { id?: string }, parentId, fallbackIndex);
          if (!entry.id || entry.id.length === 0) fallbackIndex++;

          const toolName = entry.normalized_name ?? entry.tool_name ?? "";
          const input = normalizeInput(entry.input);
          const toolRun = extractToolRun(
            entry as { status?: string; result?: unknown; error?: unknown },
          );

          tools.push({
            toolUse: {
              type: "tool_use",
              complete: true,
              id: toolId,
              name: toolName,
              input,
            },
            toolRun: applyCancellation(parentRun, toolRun),
          });
        }
      }
    }

    result[parentId] = { tools };
  }

  // Phase 2 (Path 1): Group messages by parentToolUseId
  // 逆向: jM0 lines 52-85
  const groupedByParent = new Map<string, Array<RawMessage & { parentToolUseId?: string }>>();
  for (const msg of messages) {
    const parentId = (msg as RawMessage & { parentToolUseId?: string }).parentToolUseId;
    if (!parentId) continue;
    const group = groupedByParent.get(parentId) ?? [];
    group.push(msg as RawMessage & { parentToolUseId?: string });
    groupedByParent.set(parentId, group);
  }

  for (const [parentId, groupMessages] of groupedByParent) {
    // Build tool_use → tool_result lookup for this group
    const resultMap = new Map<string, RawContentBlock>();
    for (const msg of groupMessages) {
      if (typeof msg.content === "string") continue;
      for (const block of msg.content as RawContentBlock[]) {
        if (block.type === "tool_result" && block.toolUseID) {
          resultMap.set(block.toolUseID, block);
        }
      }
    }

    // Extract tool pairs (tool_use + tool_result)
    const parentRun = parentRunMap.get(parentId);
    const tools: SubagentTool[] = [];
    for (const msg of groupMessages) {
      if (msg.role !== "assistant") continue;
      if (typeof msg.content === "string") continue;
      for (const block of msg.content as RawContentBlock[]) {
        if (block.type !== "tool_use" || !block.id || !block.name) continue;
        const toolResult = resultMap.get(block.id);
        const toolRun: SubagentTool["toolRun"] = toolResult?.run
          ? extractToolRun({
              status: toolResult.run.status,
              result: toolResult.run.result,
              error: toolResult.run.error?.message,
            })
          : { status: "in-progress" };

        tools.push({
          toolUse: {
            type: "tool_use",
            complete: block.complete ?? true,
            id: block.id,
            name: block.name,
            input: normalizeInput(block.input),
          },
          toolRun: applyCancellation(parentRun, toolRun),
        });
      }
    }

    // Extract terminal assistant message
    const terminalMsg = extractTerminalAssistantMessage(groupMessages);

    // Path 1 takes priority: use Path 1 tools if available, else keep Path 2
    const existing = result[parentId] ?? { tools: [] };
    result[parentId] = {
      tools: tools.length > 0 ? tools : existing.tools,
      ...(terminalMsg ? { terminalAssistantMessage: terminalMsg } : {}),
    };
  }

  return result;
}

// ─── Public API for widget layer ─────────────────────

/**
 * When parent is cancelled, propagate cancellation to all non-terminal child tools.
 * Returns a new SubagentContent (does not mutate input).
 * 逆向: jM0 `t()` closure — but applied at widget layer for late status updates
 */
export function propagateCancellation(content: SubagentContent): SubagentContent {
  return {
    ...content,
    tools: content.tools.map((tool) => {
      if (isTerminalStatus(tool.toolRun.status)) return tool;
      return {
        ...tool,
        toolRun: {
          ...tool.toolRun,
          status: "cancelled" as const,
          reason: "Parent subagent was cancelled",
        },
      };
    }),
  };
}

/**
 * Compute a cache signature for SubagentContent. Used to detect when widget needs rebuild.
 * 逆向: o8R() in 1950_unknown_o8R.js
 */
export function computeSubagentSignature(content: SubagentContent | undefined): string {
  if (!content) return "none";
  const toolsSig = content.tools
    .map(
      (t) =>
        `${t.toolUse.id}|${t.toolUse.name}|${t.toolRun.status}|${t.toolProgress?.status ?? "none"}`,
    )
    .join("|");
  const msgSig = content.terminalAssistantMessage
    ? `msg:${content.terminalAssistantMessage.state.type}:${content.terminalAssistantMessage.content.length}`
    : "no-msg";
  return `tools:${toolsSig}|assistant:${msgSig}`;
}
