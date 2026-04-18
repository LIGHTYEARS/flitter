import { describe, expect, test } from "bun:test";
import type { Config } from "@flitter/schemas";
import type { SubAgentManager, SubAgentOptions } from "../../../subagent/subagent";
import { createTaskTool } from "../task";

describe("TaskTool", () => {
  test("has correct name, description, and inputSchema", () => {
    const mockManager = {} as SubAgentManager;
    const tool = createTaskTool(mockManager);

    expect(tool.name).toBe("Task");
    expect(tool.source).toBe("builtin");
    expect(tool.inputSchema.properties).toHaveProperty("prompt");
    expect(tool.inputSchema.properties).toHaveProperty("description");
    expect(tool.inputSchema.required).toContain("prompt");
    expect(tool.inputSchema.required).toContain("description");
  });

  test("execute calls subAgentManager.spawn with prompt and description", async () => {
    let spawnCalledWith: SubAgentOptions | null = null;
    const mockManager = {
      spawn: async (opts: SubAgentOptions) => {
        spawnCalledWith = opts;
        return {
          threadId: "child-1",
          response: "Done! Created the file.",
          status: "completed" as const,
        };
      },
    } as unknown as SubAgentManager;

    const tool = createTaskTool(mockManager);
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

    expect(spawnCalledWith).not.toBeNull();
    expect(spawnCalledWith!.prompt).toBe("Create a new file");
    expect(spawnCalledWith!.description).toBe("Create file");
    expect(spawnCalledWith!.parentThreadId).toBe("parent-thread");
    expect(result.status).toBe("done");
    expect(result.content).toBe("Done! Created the file.");
  });

  test("execute returns error status on spawn failure", async () => {
    const mockManager = {
      spawn: async () => ({
        threadId: "child-2",
        response: "",
        status: "error" as const,
        error: "Out of tokens",
      }),
    } as unknown as SubAgentManager;

    const tool = createTaskTool(mockManager);
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

  test("execute returns timeout status", async () => {
    const mockManager = {
      spawn: async () => ({
        threadId: "child-3",
        response: "partial work done",
        status: "timeout" as const,
      }),
    } as unknown as SubAgentManager;

    const tool = createTaskTool(mockManager);
    const context = {
      workingDirectory: "/tmp/test",
      signal: AbortSignal.timeout(5000),
      threadId: "parent-thread",
      config: {} as unknown as Config,
    };

    const result = await tool.execute({ prompt: "Long task", description: "Long" }, context);

    expect(result.status).toBe("error");
    expect(result.error).toContain("timeout");
    expect(result.content).toBe("partial work done");
  });
});
