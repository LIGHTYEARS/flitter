/**
 * todo_write / todo_read — Task tracking tools
 *
 * `todo_write` is a stateless tool: the LLM writes todo items as tool input,
 * the execution is a no-op (returns success immediately), and the todo state
 * lives entirely in the conversation history. The TUI reads todos by scanning
 * backward through messages for the most recent `todo_write` tool_use block.
 *
 * `todo_read` reads the current todos from the thread via `getTodosFromThread`.
 *
 * 逆向: amp-cli-reversed/chunk-005.js:13192 — `llR = "todo_write"`
 *
 * 逆向: amp-cli-reversed/modules/1601_unknown_O0T.js:30-44 — `O0T(T)`
 *   Scans thread.messages backward, stops at summary boundary, returns
 *   first `todo_write` input's `.todos` array (or `.content` string fallback).
 *
 * 逆向: amp-cli-reversed/chunk-006.js:29078 — TUI dispatch:
 *   `case "todo_write": this.buildTodoWriteTool(T, R, a);`
 *   `case "todo_read": this.buildGenericTool(T, R, a, void 0, "Read TODOs");`
 *
 * 逆向: amp-cli-reversed/chunk-002.js:19649 — system prompt:
 *   "You have access to the `todo_write` and `todo_read` tools..."
 */
import type { ToolSpec } from "../types";

// ─── Types ────────────────────────────────────────────────

export interface TodoItem {
  content: string;
  status?: "pending" | "in-progress" | "completed";
}

// ─── Thread scanner (O0T equivalent) ─────────────────────

/**
 * Scan thread messages backward for the most recent `todo_write` invocation.
 *
 * 逆向: O0T (modules/1601_unknown_O0T.js:30-44)
 *   - Iterates messages in reverse
 *   - Stops at summary boundary (info message with summary.type === "message")
 *   - Returns `input.todos` (array) or `input.content` (string fallback)
 */
export function getTodosFromThread(
  messages: ReadonlyArray<{ role: string; content?: readonly unknown[]; state?: unknown }>,
): TodoItem[] | string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];

    // Stop at summary boundary
    if (msg?.role === "info") {
      const content = msg.content as readonly Record<string, unknown>[] | undefined;
      if (
        content?.some(
          (block) =>
            block.type === "summary" &&
            (block.summary as Record<string, unknown>)?.type === "message",
        )
      ) {
        break;
      }
    }

    // Only check completed assistant messages with tool_use stop reason
    if (msg?.role !== "assistant") continue;
    const state = msg.state as Record<string, unknown> | undefined;
    if (!state || state.type !== "complete" || state.stopReason !== "tool_use") continue;

    const content = msg.content as readonly Record<string, unknown>[] | undefined;
    if (!content) continue;

    for (const block of content) {
      if (block.type !== "tool_use" || block.name !== "todo_write") continue;
      const input = block.input as Record<string, unknown> | undefined;
      if (!input) continue;

      // Primary: array form
      const todos = input.todos;
      if (Array.isArray(todos)) return todos as TodoItem[];

      // Fallback: string content
      const contentStr = input.content;
      if (typeof contentStr === "string") return contentStr;
    }
  }
  return undefined;
}

// ─── TodoWriteTool ────────────────────────────────────────

export const TodoWriteTool: ToolSpec = {
  name: "todo_write",
  source: "builtin",
  isReadOnly: true, // No side effects — state lives in conversation history

  description:
    "Write and update the todo list for tracking progress on tasks. " +
    "Each call replaces the entire list. Items have content (text) and " +
    "status (pending, in-progress, or completed). " +
    "Use this frequently to keep the user informed of your progress.",

  inputSchema: {
    type: "object",
    properties: {
      todos: {
        type: "array",
        description: "The complete list of todo items (replaces previous list)",
        items: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description: "The task description",
            },
            status: {
              type: "string",
              enum: ["pending", "in-progress", "completed"],
              description: "Current status of the task (default: pending)",
            },
          },
          required: ["content"],
        },
      },
      content: {
        type: "string",
        description:
          "Alternative: write todos as a plain text string (one per line). " +
          "Prefer the todos array format when possible.",
      },
    },
    additionalProperties: false,
  },

  /**
   * No-op execution — the tool's value is that the input becomes
   * part of the conversation history, which the TUI reads back.
   */
  execute: async () => {
    return { status: "done", content: "Todos updated." };
  },
};

// ─── TodoReadTool ─────────────────────────────────────────

export const TodoReadTool: ToolSpec = {
  name: "todo_read",
  source: "builtin",
  isReadOnly: true,

  description: "Read the current todo list from the conversation.",

  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },

  /**
   * Read todos from the thread's message history.
   *
   * 逆向: chunk-006.js:29080
   *   `case "todo_read": return this.buildGenericTool(T, R, a, void 0, "Read TODOs");`
   *
   * The tool needs access to thread messages via context. Since `ToolContext`
   * provides `todos` (set by ThreadWorker via O0T), we read from there.
   * For now, return a generic message — the actual data comes from the
   * ToolRunEnvironment which the TUI renders directly.
   */
  execute: async (_args, ctx) => {
    // Access todos from the tool run environment if available
    const todos = (ctx as unknown as Record<string, unknown>)?.todos;
    if (todos) {
      return {
        status: "done",
        content: JSON.stringify(todos),
      };
    }
    return { status: "done", content: "No todos found." };
  },
};
