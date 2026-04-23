import type { SubAgentManager } from "../../subagent/subagent";
import { createWalkthroughDiagramTool, createWalkthroughTool } from "./walkthrough";

describe("walkthrough tools", () => {
  test("walkthrough tool has correct schema", () => {
    const mockManager = {} as SubAgentManager;
    const tool = createWalkthroughTool(mockManager);
    expect(tool.name).toBe("walkthrough");
    expect(tool.inputSchema.required).toContain("topic");
  });

  test("walkthrough_diagram tool has correct schema", () => {
    const tool = createWalkthroughDiagramTool();
    expect(tool.name).toBe("walkthrough_diagram");
    expect(tool.inputSchema.required).toContain("code");
    expect(tool.inputSchema.required).toContain("nodes");
  });

  test("walkthrough_diagram is read-only", () => {
    const tool = createWalkthroughDiagramTool();
    expect(tool.isReadOnly).toBe(true);
  });

  test("walkthrough_diagram execute returns mermaid output", async () => {
    const tool = createWalkthroughDiagramTool();
    const result = await tool.execute(
      {
        code: "graph TD; A-->B",
        nodes: { A: { title: "Start", description: "Begin" } },
        summary: "Test",
      },
      { threadId: "test-thread" } as Parameters<typeof tool.execute>[1],
    );
    expect(result.status).toBe("done");
    const parsed = JSON.parse(result.content as string);
    expect(parsed.success).toBe(true);
    expect(parsed.output).toContain("mermaid");
    expect(parsed.output).toContain("graph TD");
  });

  test("walkthrough_diagram returns error for missing code", async () => {
    const tool = createWalkthroughDiagramTool();
    const result = await tool.execute({ nodes: { A: { title: "Start", description: "Begin" } } }, {
      threadId: "test-thread",
    } as Parameters<typeof tool.execute>[1]);
    expect(result.status).toBe("error");
  });

  test("walkthrough_diagram returns error for missing nodes", async () => {
    const tool = createWalkthroughDiagramTool();
    const result = await tool.execute({ code: "graph TD; A-->B" }, {
      threadId: "test-thread",
    } as Parameters<typeof tool.execute>[1]);
    expect(result.status).toBe("error");
  });

  test("walkthrough_diagram parses nodes from JSON string", async () => {
    const tool = createWalkthroughDiagramTool();
    const result = await tool.execute(
      {
        code: "graph TD; A-->B",
        nodes: JSON.stringify({ A: { title: "Start", description: "Begin" } }),
      },
      { threadId: "test-thread" } as Parameters<typeof tool.execute>[1],
    );
    expect(result.status).toBe("done");
  });

  test("walkthrough has disableTimeout in executionProfile", () => {
    const mockManager = {} as SubAgentManager;
    const tool = createWalkthroughTool(mockManager);
    expect(tool.executionProfile?.disableTimeout).toBe(true);
  });

  test("walkthrough returns error for missing topic", async () => {
    const mockManager = {} as SubAgentManager;
    const tool = createWalkthroughTool(mockManager);
    const result = await tool.execute({}, { threadId: "test-thread" } as Parameters<
      typeof tool.execute
    >[1]);
    expect(result.status).toBe("error");
    expect(result.error).toContain("topic");
  });
});
