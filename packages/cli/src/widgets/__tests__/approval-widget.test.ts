// packages/cli/src/widgets/__tests__/approval-widget.test.ts
import { describe, expect, it } from "bun:test";
import {
  type ApprovalRequest,
  type ApprovalResponse,
  type ApprovalScope,
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

// ════════════════════════════════════════════════════
//  ApprovalResponse type tests
// ════════════════════════════════════════════════════

describe("ApprovalResponse type", () => {
  it("supports scope-based approval (once)", () => {
    const r: ApprovalResponse = { approved: true, scope: "once" };
    expect(r.scope).toBe("once");
  });
  it("supports session scope", () => {
    const r: ApprovalResponse = { approved: true, scope: "session" };
    expect(r.scope).toBe("session");
  });
  it("supports always scope", () => {
    const r: ApprovalResponse = { approved: true, scope: "always" };
    expect(r.scope).toBe("always");
  });
  it("supports always-guarded scope", () => {
    const r: ApprovalResponse = { approved: true, scope: "always-guarded" };
    expect(r.scope).toBe("always-guarded");
  });
  it("supports deny with feedback", () => {
    const r: ApprovalResponse = { approved: false, feedback: "use grep" };
    expect(r.approved).toBe(false);
    expect(r.feedback).toBe("use grep");
  });
  it("supports simple deny (no feedback)", () => {
    const r: ApprovalResponse = { approved: false };
    expect(r.approved).toBe(false);
    expect(r.feedback).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════
//  ApprovalScope type guard
// ════════════════════════════════════════════════════

describe("ApprovalScope values", () => {
  it("covers all 4 valid scope values", () => {
    const scopes: ApprovalScope[] = ["once", "session", "always", "always-guarded"];
    expect(scopes).toHaveLength(4);
  });
});

// ════════════════════════════════════════════════════
//  ApprovalWidget scope selection
// ════════════════════════════════════════════════════

// ════════════════════════════════════════════════════
//  Test helper
// ════════════════════════════════════════════════════

/**
 * Internal shape of ApprovalWidgetState fields and methods we need for testing.
 * This mirrors the private interface without using `any`.
 */
interface ApprovalStateTestProxy {
  _widget: ApprovalWidget;
  _feedbackActive: boolean;
  _feedbackText: string;
  setState: (fn: () => void) => void;
  _selectOption: (value: string) => void;
  _submitFeedback: () => void;
}

/**
 * Create a bare ApprovalWidgetState bound to a widget, with setState patched
 * to execute directly (no framework element needed).
 */
function createBoundState(onRespond: (id: string, r: ApprovalResponse) => void): {
  state: ApprovalWidgetState;
  s: ApprovalStateTestProxy;
} {
  const w = new ApprovalWidget({
    request: { toolUseId: "tu_test", toolName: "Bash", args: {}, reason: "test" },
    onRespond,
  });
  const state = w.createState();
  // Bind widget using internal _widget field (same pattern as other widget tests)
  const s = state as unknown as ApprovalStateTestProxy;
  s._widget = w;
  // Patch setState to run the mutator synchronously (no framework rebuild needed)
  s.setState = (fn: () => void) => fn();
  return { state, s };
}

describe("ApprovalWidget scope", () => {
  it("selectOption yes → scope once", () => {
    let response: ApprovalResponse | null = null;
    const { s } = createBoundState((_id, r) => {
      response = r;
    });
    s._selectOption("yes");
    expect(response!.approved).toBe(true);
    expect(response!.scope).toBe("once");
  });

  it("selectOption allow-all-session → scope session", () => {
    let response: ApprovalResponse | null = null;
    const { s } = createBoundState((_id, r) => {
      response = r;
    });
    s._selectOption("allow-all-session");
    expect(response!.approved).toBe(true);
    expect(response!.scope).toBe("session");
  });

  it("selectOption allow-all-persistent → scope always", () => {
    let response: ApprovalResponse | null = null;
    const { s } = createBoundState((_id, r) => {
      response = r;
    });
    s._selectOption("allow-all-persistent");
    expect(response!.approved).toBe(true);
    expect(response!.scope).toBe("always");
  });

  it("selectOption no-with-feedback enters feedback mode", () => {
    const { s } = createBoundState(() => {});
    s._selectOption("no-with-feedback");
    expect(s._feedbackActive).toBe(true);
  });

  it("submitFeedback with text emits deny with feedback", () => {
    let response: ApprovalResponse | null = null;
    const { s } = createBoundState((_id, r) => {
      response = r;
    });
    s._feedbackText = "use grep instead";
    s._submitFeedback();
    expect(response!.approved).toBe(false);
    expect(response!.feedback).toBe("use grep instead");
  });

  it("submitFeedback with empty text emits simple deny (no feedback)", () => {
    let response: ApprovalResponse | null = null;
    const { s } = createBoundState((_id, r) => {
      response = r;
    });
    s._feedbackText = "   ";
    s._submitFeedback();
    expect(response!.approved).toBe(false);
    expect(response!.feedback).toBeUndefined();
  });
});
