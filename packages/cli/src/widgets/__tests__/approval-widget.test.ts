// packages/cli/src/widgets/__tests__/approval-widget.test.ts
import { describe, expect, it } from "bun:test";
import {
  type ApprovalRequest,
  type ApprovalResponse,
  ApprovalWidget,
  ApprovalWidgetState,
} from "../approval-widget";

describe("ApprovalWidget", () => {
  const sampleRequest: ApprovalRequest = {
    toolUseId: "tu_123",
    toolName: "Bash",
    args: { command: "rm -rf /tmp/test" },
    reason: "Tool requires approval: Bash",
  };

  it("can be constructed with a valid config", () => {
    const widget = new ApprovalWidget({
      request: sampleRequest,
      onRespond: () => {},
    });
    expect(widget).toBeDefined();
    expect(widget.config.request.toolName).toBe("Bash");
    expect(widget.config.request.toolUseId).toBe("tu_123");
  });

  it("createState returns ApprovalWidgetState", () => {
    const widget = new ApprovalWidget({
      request: sampleRequest,
      onRespond: () => {},
    });
    const state = widget.createState();
    expect(state).toBeInstanceOf(ApprovalWidgetState);
  });

  it("exposes request and onRespond through config", () => {
    let received: { id: string; resp: ApprovalResponse } | null = null;
    const widget = new ApprovalWidget({
      request: sampleRequest,
      onRespond: (id, resp) => {
        received = { id, resp };
      },
    });
    // Verify the callback is stored
    widget.config.onRespond("tu_123", { approved: true });
    expect(received).toEqual({ id: "tu_123", resp: { approved: true } });
  });

  it("supports Edit tool request with file_path in args", () => {
    const editRequest: ApprovalRequest = {
      toolUseId: "tu_456",
      toolName: "Edit",
      args: { file_path: "/src/app.ts", old_string: "foo", new_string: "bar" },
      reason: "Tool requires approval: Edit",
    };
    const widget = new ApprovalWidget({
      request: editRequest,
      onRespond: () => {},
    });
    expect(widget.config.request.toolName).toBe("Edit");
    expect(widget.config.request.args.file_path).toBe("/src/app.ts");
  });

  it("supports generic tool request with arbitrary args", () => {
    const genericRequest: ApprovalRequest = {
      toolUseId: "tu_789",
      toolName: "CustomTool",
      args: { key1: "value1", key2: 42 },
      reason: "Needs permission",
    };
    const widget = new ApprovalWidget({
      request: genericRequest,
      onRespond: () => {},
    });
    expect(widget.config.request.toolName).toBe("CustomTool");
    expect(widget.config.request.args).toEqual({ key1: "value1", key2: 42 });
  });
});
