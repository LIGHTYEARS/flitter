/**
 * ApprovalWidget unit tests.
 *
 * Validates:
 * - Construction and config storage
 * - createState returns ApprovalWidgetState
 * - ApprovalRequest supports commandPreview and permissionRule fields
 * - ApprovalResponse and ApprovalScope types
 * - onRespond callback invocation
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ApprovalWidget,
  ApprovalWidgetState,
  type ApprovalRequest,
  type ApprovalResponse,
  type ApprovalScope,
} from "./approval-widget.js";
import { StatefulWidget } from "@flitter/tui";

// ════════════════════════════════════════════════════
//  ApprovalWidget Tests
// ════════════════════════════════════════════════════

describe("ApprovalWidget", () => {
  const sampleRequest: ApprovalRequest = {
    toolUseId: "tu_123",
    toolName: "Bash",
    args: { command: "sleep 60" },
    reason: "Tool requires approval: Bash",
  };

  it("extends StatefulWidget", () => {
    const widget = new ApprovalWidget({
      request: sampleRequest,
      onRespond: () => {},
    });
    assert.ok(widget instanceof StatefulWidget);
  });

  it("can be constructed with a valid config", () => {
    const widget = new ApprovalWidget({
      request: sampleRequest,
      onRespond: () => {},
    });
    assert.ok(widget);
    assert.equal(widget.config.request.toolName, "Bash");
    assert.equal(widget.config.request.toolUseId, "tu_123");
  });

  it("createState returns ApprovalWidgetState", () => {
    const widget = new ApprovalWidget({
      request: sampleRequest,
      onRespond: () => {},
    });
    const state = widget.createState();
    assert.ok(state instanceof ApprovalWidgetState);
  });

  it("exposes request and onRespond through config", () => {
    let received: { id: string; resp: ApprovalResponse } | null = null;
    const widget = new ApprovalWidget({
      request: sampleRequest,
      onRespond: (id, resp) => {
        received = { id, resp };
      },
    });
    widget.config.onRespond("tu_123", { approved: true });
    assert.deepEqual(received, { id: "tu_123", resp: { approved: true } });
  });

  it("supports commandPreview in ApprovalRequest", () => {
    const request: ApprovalRequest = {
      ...sampleRequest,
      commandPreview: "sleep 60",
    };
    const widget = new ApprovalWidget({
      request,
      onRespond: () => {},
    });
    assert.equal(widget.config.request.commandPreview, "sleep 60");
  });

  it("supports permissionRule in ApprovalRequest", () => {
    const request: ApprovalRequest = {
      ...sampleRequest,
      permissionRule: "built-in permissions rule 25: ask Bash",
    };
    const widget = new ApprovalWidget({
      request,
      onRespond: () => {},
    });
    assert.equal(
      widget.config.request.permissionRule,
      "built-in permissions rule 25: ask Bash",
    );
  });

  it("supports all ApprovalScope values", () => {
    const scopes: ApprovalScope[] = ["once", "session", "always", "always-guarded"];
    for (const scope of scopes) {
      const resp: ApprovalResponse = { approved: true, scope };
      assert.equal(resp.scope, scope);
    }
  });

  it("supports feedback in ApprovalResponse", () => {
    const resp: ApprovalResponse = {
      approved: false,
      feedback: "use grep instead",
    };
    assert.equal(resp.approved, false);
    assert.equal(resp.feedback, "use grep instead");
  });

  it("supports Edit tool request", () => {
    const editRequest: ApprovalRequest = {
      toolUseId: "tu_edit",
      toolName: "Edit",
      args: { file_path: "/src/app.ts" },
      reason: "Tool requires approval: Edit",
    };
    const widget = new ApprovalWidget({
      request: editRequest,
      onRespond: () => {},
    });
    assert.equal(widget.config.request.toolName, "Edit");
  });

  it("supports Write tool request", () => {
    const writeRequest: ApprovalRequest = {
      toolUseId: "tu_write",
      toolName: "Write",
      args: { file_path: "/src/new.ts" },
      reason: "Tool requires approval: Write",
    };
    const widget = new ApprovalWidget({
      request: writeRequest,
      onRespond: () => {},
    });
    assert.equal(widget.config.request.toolName, "Write");
  });
});
