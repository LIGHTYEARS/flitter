import { describe, expect, it } from "bun:test";
import type { SubagentContent } from "../subagent-content.js";
import { SubagentToolWidget } from "../subagent-tool-widget.js";

describe("SubagentToolWidget", () => {
  it("constructs with required params", () => {
    const widget = new SubagentToolWidget({
      toolName: "Subagent",
      status: "done",
    });
    expect(widget.config.toolName).toBe("Subagent");
    expect(widget.config.status).toBe("done");
    expect(widget.config.subagentContent).toBeUndefined();
    expect(widget.config.hideHeader).toBeUndefined();
  });

  it("accepts subagentContent", () => {
    const content: SubagentContent = {
      tools: [
        {
          toolUse: {
            type: "tool_use",
            id: "tu-1",
            name: "Bash",
            input: { command: "ls -la" },
            complete: true,
          },
          toolRun: { status: "done", result: "file1.txt\nfile2.txt" },
        },
      ],
      terminalAssistantMessage: {
        content: [{ type: "text", text: "Done listing files." }],
        state: { type: "complete" },
      },
    };

    const widget = new SubagentToolWidget({
      toolName: "Subagent",
      status: "done",
      subagentContent: content,
    });
    expect(widget.config.subagentContent).toBeDefined();
    expect(widget.config.subagentContent!.tools).toHaveLength(1);
    expect(widget.config.subagentContent!.terminalAssistantMessage).toBeDefined();
  });

  it("createState() returns state without error", () => {
    const widget = new SubagentToolWidget({
      toolName: "Oracle",
      status: "in-progress",
      description: "Research task",
    });
    const state = widget.createState();
    expect(state).toBeDefined();
  });

  it("accepts hideHeader option", () => {
    const widget = new SubagentToolWidget({
      toolName: "Subagent",
      status: "done",
      hideHeader: true,
    });
    expect(widget.config.hideHeader).toBe(true);
  });

  it("accepts description and error fields", () => {
    const widget = new SubagentToolWidget({
      toolName: "Subagent",
      status: "error",
      description: "Do something important",
      error: "timeout exceeded",
    });
    expect(widget.config.description).toBe("Do something important");
    expect(widget.config.error).toBe("timeout exceeded");
  });

  it("accepts outputResult field", () => {
    const widget = new SubagentToolWidget({
      toolName: "Oracle",
      status: "done",
      outputResult: "The answer is 42",
    });
    expect(widget.config.outputResult).toBe("The answer is 42");
  });

  it("handles subagentContent with progressChunks", () => {
    const content: SubagentContent = {
      tools: [],
      progressChunks: [
        { message: "Starting analysis..." },
        { reasoning: "Let me think about this." },
        {
          tool_uses: [
            {
              id: "tu-inner-1",
              tool_name: "Read",
              normalized_name: "Read",
              input: { file_path: "/src/index.ts" },
              status: "done",
            },
          ],
        },
      ],
    };

    const widget = new SubagentToolWidget({
      toolName: "Subagent",
      status: "in-progress",
      subagentContent: content,
    });
    expect(widget.config.subagentContent!.progressChunks).toHaveLength(3);
  });
});
