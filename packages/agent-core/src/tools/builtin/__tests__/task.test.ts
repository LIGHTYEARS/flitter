import { describe, expect, test } from "bun:test";
import type { Config } from "@flitter/schemas";
import type { SubAgentOptions } from "../../../subagent/subagent";
import type { SubAgentRunner, SubAgentRunnerEvent } from "../../../subagent/subagent-runner";
import { createTaskTool } from "../task";

function createMockRunner(opts: {
  runFn: (spawnOpts: SubAgentOptions) => Promise<SubAgentRunnerEvent>;
}): SubAgentRunner {
  return {
    run: opts.runFn,
  } as unknown as SubAgentRunner;
}

describe("TaskTool", () => {
  test("has correct name, description, and inputSchema", () => {
    const mockRunner = createMockRunner({
      runFn: async () => ({ status: "done", turns: [], message: "" }),
    });
    const tool = createTaskTool(mockRunner);

    expect(tool.name).toBe("Task");
    expect(tool.source).toBe("builtin");
    expect(tool.inputSchema.properties).toHaveProperty("prompt");
    expect(tool.inputSchema.properties).toHaveProperty("description");
    expect(tool.inputSchema.required).toContain("prompt");
    expect(tool.inputSchema.required).toContain("description");
  });

  test("execute calls runner.run and returns result with progress", async () => {
    let runCalledWith: SubAgentOptions | null = null;
    const mockRunner = createMockRunner({
      runFn: async (opts) => {
        runCalledWith = opts;
        return {
          status: "done",
          message: "Done! Created the file.",
          turns: [
            {
              message: "Done! Created the file.",
              activeTools: new Map(),
            },
          ],
        };
      },
    });

    const tool = createTaskTool(mockRunner);
    const context = {
      workingDirectory: "/tmp/test",
      signal: AbortSignal.timeout(5000),
      threadId: "parent-thread",
      config: {} as unknown as Config,
    };

    const result = await tool.execute(
      { prompt: "Create a new file", description: "Create file" },
      context,
    );

    expect(runCalledWith).not.toBeNull();
    expect(runCalledWith!.prompt).toBe("Create a new file");
    expect(runCalledWith!.description).toBe("Create file");
    expect(runCalledWith!.parentThreadId).toBe("parent-thread");
    expect(result.status).toBe("done");
    expect(result.content).toBe("Done! Created the file.");
    expect(result.progress).toBeDefined();
    expect(result.progress!.length).toBe(1);
  });

  test("execute returns error status on spawn failure", async () => {
    const mockRunner = createMockRunner({
      runFn: async () => ({
        status: "error",
        message: "Out of tokens",
        turns: [],
      }),
    });

    const tool = createTaskTool(mockRunner);
    const context = {
      workingDirectory: "/tmp/test",
      signal: AbortSignal.timeout(5000),
      threadId: "parent-thread",
      config: {} as unknown as Config,
    };

    const result = await tool.execute({ prompt: "Do something", description: "Task" }, context);

    expect(result.status).toBe("error");
    expect(result.error).toBe("Out of tokens");
  });

  test("execute handles timeout via error event", async () => {
    const mockRunner = createMockRunner({
      runFn: async () => ({
        status: "error",
        message: "Sub-agent timed out",
        turns: [
          {
            message: "partial work done",
            activeTools: new Map([
              ["t1", { id: "t1", tool_name: "Read", status: "done", result: "contents" }],
            ]),
          },
        ],
      }),
    });

    const tool = createTaskTool(mockRunner);
    const context = {
      workingDirectory: "/tmp/test",
      signal: AbortSignal.timeout(5000),
      threadId: "parent-thread",
      config: {} as unknown as Config,
    };

    const result = await tool.execute({ prompt: "Long task", description: "Long" }, context);

    expect(result.status).toBe("error");
    expect(result.error).toContain("timed out");
    // Progress should still be populated even on error
    expect(result.progress).toBeDefined();
    expect(result.progress!.length).toBe(1);
    expect(result.progress![0]!.tool_uses!.length).toBe(1);
  });

  test("execute returns error on missing prompt", async () => {
    const mockRunner = createMockRunner({
      runFn: async () => ({ status: "done", turns: [], message: "" }),
    });

    const tool = createTaskTool(mockRunner);
    const context = {
      workingDirectory: "/tmp/test",
      signal: AbortSignal.timeout(5000),
      threadId: "parent-thread",
      config: {} as unknown as Config,
    };

    const result = await tool.execute({ description: "No prompt" }, context);

    expect(result.status).toBe("error");
    expect(result.error).toContain("prompt");
  });
});
