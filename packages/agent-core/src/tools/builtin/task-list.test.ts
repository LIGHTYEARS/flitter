/**
 * Tests for task_list tool
 * 逆向: chunk-005.js:149274-149373 (_XR)
 */

import { describe, it, beforeEach } from "bun:test";
import assert from "node:assert/strict";
import { createTaskListTool, TaskStore } from "./task-list";
import type { ToolContext } from "../types";

function makeContext(): ToolContext {
  return {
    workingDirectory: "/tmp",
    signal: new AbortController().signal,
    threadId: "test-thread",
    config: { settings: {} as Record<string, unknown>, secrets: {} as never },
  };
}

describe("createTaskListTool", () => {
  let store: TaskStore;
  let tool: ReturnType<typeof createTaskListTool>;

  beforeEach(() => {
    store = new TaskStore();
    tool = createTaskListTool(store);
  });

  describe("spec", () => {
    it("has correct name", () => {
      assert.equal(tool.name, "task_list");
    });

    it("has correct source", () => {
      assert.equal(tool.source, "builtin");
    });

    it("requires action", () => {
      const schema = tool.inputSchema as {
        required: string[];
        properties: Record<string, { enum?: string[] }>;
      };
      assert.deepEqual(schema.required, ["action"]);
      assert.deepEqual(schema.properties.action.enum, [
        "create",
        "list",
        "get",
        "update",
        "delete",
      ]);
    });
  });

  describe("create action", () => {
    it("creates a task with title", async () => {
      const result = await tool.execute(
        { action: "create", title: "Build feature" },
        makeContext(),
      );
      assert.equal(result.status, "done");
      assert.ok(result.content?.includes("Build feature"));
      assert.ok(result.data?.task);
    });

    it("returns error without title", async () => {
      const result = await tool.execute({ action: "create" }, makeContext());
      assert.equal(result.status, "error");
      assert.ok((result as { error: string }).error?.includes("title"));
    });

    it("creates task with dependencies", async () => {
      const r1 = await tool.execute(
        { action: "create", title: "Task A" },
        makeContext(),
      );
      const taskA = (r1.data as { task: { id: string } }).task;

      const r2 = await tool.execute(
        {
          action: "create",
          title: "Task B",
          dependsOn: [taskA.id],
        },
        makeContext(),
      );
      assert.equal(r2.status, "done");
      const taskB = (r2.data as { task: { dependsOn: string[] } }).task;
      assert.deepEqual(taskB.dependsOn, [taskA.id]);
    });

    it("creates task with parentID", async () => {
      const r1 = await tool.execute(
        { action: "create", title: "Parent" },
        makeContext(),
      );
      const parent = (r1.data as { task: { id: string } }).task;

      const r2 = await tool.execute(
        {
          action: "create",
          title: "Child",
          parentID: parent.id,
        },
        makeContext(),
      );
      assert.equal(r2.status, "done");
      const child = (r2.data as { task: { parentID: string } }).task;
      assert.equal(child.parentID, parent.id);
    });
  });

  describe("list action", () => {
    it("lists tasks excluding completed by default", async () => {
      await tool.execute(
        { action: "create", title: "Open task" },
        makeContext(),
      );
      await tool.execute(
        { action: "create", title: "Done task", status: "completed" },
        makeContext(),
      );

      const result = await tool.execute({ action: "list" }, makeContext());
      assert.equal(result.status, "done");
      assert.ok(result.content?.includes("Open task"));
      assert.ok(!result.content?.includes("Done task"));
    });

    it("filters by status when specified", async () => {
      await tool.execute(
        { action: "create", title: "Open task" },
        makeContext(),
      );
      await tool.execute(
        { action: "create", title: "Done task", status: "completed" },
        makeContext(),
      );

      const result = await tool.execute(
        { action: "list", status: "completed" },
        makeContext(),
      );
      assert.equal(result.status, "done");
      assert.ok(!result.content?.includes("Open task"));
      assert.ok(result.content?.includes("Done task"));
    });

    it("filters by ready (all deps completed)", async () => {
      const r1 = await tool.execute(
        { action: "create", title: "Blocker" },
        makeContext(),
      );
      const blocker = (r1.data as { task: { id: string } }).task;

      await tool.execute(
        {
          action: "create",
          title: "Blocked task",
          dependsOn: [blocker.id],
        },
        makeContext(),
      );
      await tool.execute(
        { action: "create", title: "Ready task" },
        makeContext(),
      );

      const result = await tool.execute(
        { action: "list", ready: true },
        makeContext(),
      );
      assert.equal(result.status, "done");
      assert.ok(result.content?.includes("Ready task"));
      assert.ok(result.content?.includes("Blocker"));
      assert.ok(!result.content?.includes("Blocked task"));
    });

    it("respects limit", async () => {
      for (let i = 0; i < 5; i++) {
        await tool.execute(
          { action: "create", title: `Task ${i}` },
          makeContext(),
        );
      }
      const result = await tool.execute(
        { action: "list", limit: 2 },
        makeContext(),
      );
      const tasks = (result.data as { tasks: unknown[] }).tasks;
      assert.equal(tasks.length, 2);
    });

    it("returns empty message when no tasks", async () => {
      const result = await tool.execute({ action: "list" }, makeContext());
      assert.equal(result.status, "done");
      assert.ok(result.content?.includes("No tasks"));
    });
  });

  describe("get action", () => {
    it("returns task details", async () => {
      const r1 = await tool.execute(
        {
          action: "create",
          title: "My Task",
          description: "Do the thing",
        },
        makeContext(),
      );
      const task = (r1.data as { task: { id: string } }).task;

      const result = await tool.execute(
        { action: "get", taskID: task.id },
        makeContext(),
      );
      assert.equal(result.status, "done");
      assert.ok(result.content?.includes("My Task"));
      assert.ok(result.content?.includes("Do the thing"));
    });

    it("returns error for missing taskID", async () => {
      const result = await tool.execute({ action: "get" }, makeContext());
      assert.equal(result.status, "error");
    });

    it("returns error for unknown task", async () => {
      const result = await tool.execute(
        { action: "get", taskID: "nonexistent" },
        makeContext(),
      );
      assert.equal(result.status, "error");
    });
  });

  describe("update action", () => {
    it("updates task fields", async () => {
      const r1 = await tool.execute(
        { action: "create", title: "Original" },
        makeContext(),
      );
      const task = (r1.data as { task: { id: string } }).task;

      const result = await tool.execute(
        {
          action: "update",
          taskID: task.id,
          title: "Updated",
          status: "completed",
        },
        makeContext(),
      );
      assert.equal(result.status, "done");
      assert.ok(result.content?.includes("Updated"));
      assert.ok(result.content?.includes("completed"));
    });

    it("returns error for missing taskID", async () => {
      const result = await tool.execute({ action: "update" }, makeContext());
      assert.equal(result.status, "error");
    });
  });

  describe("delete action", () => {
    it("soft-deletes a task", async () => {
      const r1 = await tool.execute(
        { action: "create", title: "To delete" },
        makeContext(),
      );
      const task = (r1.data as { task: { id: string } }).task;

      const delResult = await tool.execute(
        { action: "delete", taskID: task.id },
        makeContext(),
      );
      assert.equal(delResult.status, "done");

      // Verify it's gone from list
      const listResult = await tool.execute({ action: "list" }, makeContext());
      assert.ok(!listResult.content?.includes("To delete"));
    });

    it("returns error for missing taskID", async () => {
      const result = await tool.execute({ action: "delete" }, makeContext());
      assert.equal(result.status, "error");
    });

    it("returns error for unknown task", async () => {
      const result = await tool.execute(
        { action: "delete", taskID: "nonexistent" },
        makeContext(),
      );
      assert.equal(result.status, "error");
    });
  });

  describe("unknown action", () => {
    it("returns error for unknown action", async () => {
      const result = await tool.execute(
        { action: "purge" },
        makeContext(),
      );
      assert.equal(result.status, "error");
      assert.ok((result as { error: string }).error?.includes("Unknown action"));
    });
  });

  describe("missing action", () => {
    it("returns error when action is missing", async () => {
      const result = await tool.execute({}, makeContext());
      assert.equal(result.status, "error");
    });
  });
});
