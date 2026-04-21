/**
 * Tests for todo_write / todo_read tools
 *
 * Tests: tool specs, no-op execution, getTodosFromThread scanner
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getTodosFromThread, type TodoItem, TodoReadTool, TodoWriteTool } from "../todo-write";

// ─── TodoWriteTool spec ──────────────────────────────────

describe("TodoWriteTool", () => {
  it("should have correct name", () => {
    assert.equal(TodoWriteTool.name, "todo_write");
  });

  it("should be a builtin tool", () => {
    assert.equal(TodoWriteTool.source, "builtin");
  });

  it("should be read-only (no side effects)", () => {
    assert.equal(TodoWriteTool.isReadOnly, true);
  });

  it("should accept todos array in input schema", () => {
    const props = (TodoWriteTool.inputSchema as Record<string, unknown>).properties as Record<
      string,
      unknown
    >;
    assert.ok(props.todos, "should have todos property");
    assert.ok(props.content, "should have content fallback property");
  });

  it("should have required fields on todo items", () => {
    const props = (TodoWriteTool.inputSchema as Record<string, unknown>).properties as Record<
      string,
      Record<string, unknown>
    >;
    const items = props.todos.items as Record<string, unknown>;
    assert.deepEqual(items.required, ["content"]);
  });

  it("should execute as no-op and return success", async () => {
    const result = await TodoWriteTool.execute!(
      {
        todos: [
          { content: "Task 1", status: "pending" },
          { content: "Task 2", status: "completed" },
        ],
      },
      {} as never,
    );
    assert.equal(result.status, "done");
    assert.ok(typeof result.content === "string");
  });

  it("should execute with string content form", async () => {
    const result = await TodoWriteTool.execute!({ content: "- Task 1\n- Task 2" }, {} as never);
    assert.equal(result.status, "done");
  });

  it("should execute with empty todos", async () => {
    const result = await TodoWriteTool.execute!({ todos: [] }, {} as never);
    assert.equal(result.status, "done");
  });
});

// ─── TodoReadTool spec ───────────────────────────────────

describe("TodoReadTool", () => {
  it("should have correct name", () => {
    assert.equal(TodoReadTool.name, "todo_read");
  });

  it("should be read-only", () => {
    assert.equal(TodoReadTool.isReadOnly, true);
  });

  it("should return 'No todos found.' when no context", async () => {
    const result = await TodoReadTool.execute!({}, {} as never);
    assert.equal(result.status, "done");
    assert.equal(result.content, "No todos found.");
  });

  it("should return todos from context when available", async () => {
    const todos = [{ content: "Task 1", status: "pending" }];
    const ctx = { todos } as unknown as never;
    const result = await TodoReadTool.execute!({}, ctx);
    assert.equal(result.status, "done");
    assert.equal(result.content, JSON.stringify(todos));
  });
});

// ─── getTodosFromThread ──────────────────────────────────

describe("getTodosFromThread", () => {
  it("should return undefined for empty messages", () => {
    assert.equal(getTodosFromThread([]), undefined);
  });

  it("should return undefined when no todo_write found", () => {
    const messages = [
      { role: "user", content: [{ type: "text", text: "hello" }] },
      {
        role: "assistant",
        content: [{ type: "text", text: "hi" }],
        state: { type: "complete", stopReason: "end_turn" },
      },
    ];
    assert.equal(getTodosFromThread(messages), undefined);
  });

  it("should find todos array in most recent assistant message", () => {
    const todos: TodoItem[] = [
      { content: "Task 1", status: "pending" },
      { content: "Task 2", status: "completed" },
    ];
    const messages = [
      { role: "user", content: [{ type: "text", text: "do work" }] },
      {
        role: "assistant",
        content: [{ type: "tool_use", name: "todo_write", id: "t1", input: { todos } }],
        state: { type: "complete", stopReason: "tool_use" },
      },
    ];
    assert.deepEqual(getTodosFromThread(messages), todos);
  });

  it("should find string content fallback", () => {
    const messages = [
      {
        role: "assistant",
        content: [
          {
            type: "tool_use",
            name: "todo_write",
            id: "t1",
            input: { content: "- Task 1\n- Task 2" },
          },
        ],
        state: { type: "complete", stopReason: "tool_use" },
      },
    ];
    assert.equal(getTodosFromThread(messages), "- Task 1\n- Task 2");
  });

  it("should return the most recent todo_write (scan backward)", () => {
    const oldTodos: TodoItem[] = [{ content: "Old task" }];
    const newTodos: TodoItem[] = [{ content: "New task", status: "in-progress" }];
    const messages = [
      {
        role: "assistant",
        content: [{ type: "tool_use", name: "todo_write", id: "t1", input: { todos: oldTodos } }],
        state: { type: "complete", stopReason: "tool_use" },
      },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "t1" }] },
      {
        role: "assistant",
        content: [{ type: "tool_use", name: "todo_write", id: "t2", input: { todos: newTodos } }],
        state: { type: "complete", stopReason: "tool_use" },
      },
    ];
    assert.deepEqual(getTodosFromThread(messages), newTodos);
  });

  it("should stop at summary boundary", () => {
    const beforeSummary: TodoItem[] = [{ content: "Before summary" }];
    const afterSummary: TodoItem[] = [{ content: "After summary" }];
    const messages = [
      {
        role: "assistant",
        content: [
          { type: "tool_use", name: "todo_write", id: "t1", input: { todos: beforeSummary } },
        ],
        state: { type: "complete", stopReason: "tool_use" },
      },
      {
        role: "info",
        content: [{ type: "summary", summary: { type: "message" } }],
      },
      {
        role: "assistant",
        content: [
          { type: "tool_use", name: "todo_write", id: "t2", input: { todos: afterSummary } },
        ],
        state: { type: "complete", stopReason: "tool_use" },
      },
    ];
    // Should find afterSummary (most recent), not cross the summary boundary
    assert.deepEqual(getTodosFromThread(messages), afterSummary);
  });

  it("should return undefined if only todo_write is before summary boundary", () => {
    const beforeSummary: TodoItem[] = [{ content: "Before summary" }];
    const messages = [
      {
        role: "assistant",
        content: [
          { type: "tool_use", name: "todo_write", id: "t1", input: { todos: beforeSummary } },
        ],
        state: { type: "complete", stopReason: "tool_use" },
      },
      {
        role: "info",
        content: [{ type: "summary", summary: { type: "message" } }],
      },
      { role: "user", content: [{ type: "text", text: "continue" }] },
      {
        role: "assistant",
        content: [{ type: "text", text: "ok" }],
        state: { type: "complete", stopReason: "end_turn" },
      },
    ];
    assert.equal(getTodosFromThread(messages), undefined);
  });

  it("should skip incomplete assistant messages", () => {
    const todos: TodoItem[] = [{ content: "Task" }];
    const messages = [
      {
        role: "assistant",
        content: [{ type: "tool_use", name: "todo_write", id: "t1", input: { todos } }],
        state: { type: "streaming" }, // not complete
      },
    ];
    assert.equal(getTodosFromThread(messages), undefined);
  });

  it("should skip non-tool_use stop reasons", () => {
    const todos: TodoItem[] = [{ content: "Task" }];
    const messages = [
      {
        role: "assistant",
        content: [{ type: "tool_use", name: "todo_write", id: "t1", input: { todos } }],
        state: { type: "complete", stopReason: "end_turn" },
      },
    ];
    assert.equal(getTodosFromThread(messages), undefined);
  });

  it("should ignore non-todo_write tool_use blocks", () => {
    const messages = [
      {
        role: "assistant",
        content: [
          { type: "tool_use", name: "Bash", id: "t1", input: { command: "ls" } },
          {
            type: "tool_use",
            name: "todo_write",
            id: "t2",
            input: { todos: [{ content: "Found it" }] },
          },
        ],
        state: { type: "complete", stopReason: "tool_use" },
      },
    ];
    assert.deepEqual(getTodosFromThread(messages), [{ content: "Found it" }]);
  });

  it("should handle messages with no content", () => {
    const messages = [{ role: "assistant", state: { type: "complete", stopReason: "tool_use" } }];
    assert.equal(getTodosFromThread(messages), undefined);
  });
});
