/**
 * Tests for EditConfirmationWidget and RestoreConfirmationWidget.
 *
 * 逆向: interactive_widgets.js — handleEditConfirmationRequest / handleRestoreConfirmation
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EditConfirmationWidget, RestoreConfirmationWidget } from "../edit-restore-confirmation.js";

// ─── EditConfirmationWidget ─────────────────────────────

describe("EditConfirmationWidget", () => {
  it("constructs with config", () => {
    const widget = new EditConfirmationWidget({
      onConfirm: () => {},
      onCancel: () => {},
    });
    assert.ok(widget.config);
    assert.equal(typeof widget.config.onConfirm, "function");
    assert.equal(typeof widget.config.onCancel, "function");
  });

  it("stores affected files in config", () => {
    const files = ["src/index.ts", "src/app.ts"];
    const widget = new EditConfirmationWidget({
      affectedFiles: files,
      onConfirm: () => {},
      onCancel: () => {},
    });
    assert.deepEqual(widget.config.affectedFiles, files);
  });

  it("handles undefined affectedFiles", () => {
    const widget = new EditConfirmationWidget({
      onConfirm: () => {},
      onCancel: () => {},
    });
    assert.equal(widget.config.affectedFiles, undefined);
  });

  it("handles empty affectedFiles array", () => {
    const widget = new EditConfirmationWidget({
      affectedFiles: [],
      onConfirm: () => {},
      onCancel: () => {},
    });
    assert.deepEqual(widget.config.affectedFiles, []);
  });

  it("onConfirm callback is callable", () => {
    let called = false;
    const widget = new EditConfirmationWidget({
      onConfirm: () => {
        called = true;
      },
      onCancel: () => {},
    });
    widget.config.onConfirm();
    assert.equal(called, true);
  });

  it("onCancel callback is callable", () => {
    let called = false;
    const widget = new EditConfirmationWidget({
      onConfirm: () => {},
      onCancel: () => {
        called = true;
      },
    });
    widget.config.onCancel();
    assert.equal(called, true);
  });

  it("stores many affected files", () => {
    const files = Array.from({ length: 20 }, (_, i) => `file-${i}.ts`);
    const widget = new EditConfirmationWidget({
      affectedFiles: files,
      onConfirm: () => {},
      onCancel: () => {},
    });
    assert.equal(widget.config.affectedFiles!.length, 20);
  });

  it("is a StatelessWidget", () => {
    const widget = new EditConfirmationWidget({
      onConfirm: () => {},
      onCancel: () => {},
    });
    // StatelessWidget has a build method
    assert.equal(typeof widget.build, "function");
  });
});

// ─── RestoreConfirmationWidget ──────────────────────────

describe("RestoreConfirmationWidget", () => {
  it("constructs with config", () => {
    const widget = new RestoreConfirmationWidget({
      onConfirm: () => {},
      onCancel: () => {},
    });
    assert.ok(widget.config);
    assert.equal(typeof widget.config.onConfirm, "function");
    assert.equal(typeof widget.config.onCancel, "function");
  });

  it("stores affected files in config", () => {
    const files = ["src/main.ts"];
    const widget = new RestoreConfirmationWidget({
      affectedFiles: files,
      onConfirm: () => {},
      onCancel: () => {},
    });
    assert.deepEqual(widget.config.affectedFiles, files);
  });

  it("handles undefined affectedFiles", () => {
    const widget = new RestoreConfirmationWidget({
      onConfirm: () => {},
      onCancel: () => {},
    });
    assert.equal(widget.config.affectedFiles, undefined);
  });

  it("handles empty affectedFiles array", () => {
    const widget = new RestoreConfirmationWidget({
      affectedFiles: [],
      onConfirm: () => {},
      onCancel: () => {},
    });
    assert.deepEqual(widget.config.affectedFiles, []);
  });

  it("onConfirm callback is callable", () => {
    let called = false;
    const widget = new RestoreConfirmationWidget({
      onConfirm: () => {
        called = true;
      },
      onCancel: () => {},
    });
    widget.config.onConfirm();
    assert.equal(called, true);
  });

  it("onCancel callback is callable", () => {
    let called = false;
    const widget = new RestoreConfirmationWidget({
      onConfirm: () => {},
      onCancel: () => {
        called = true;
      },
    });
    widget.config.onCancel();
    assert.equal(called, true);
  });

  it("is a StatelessWidget", () => {
    const widget = new RestoreConfirmationWidget({
      onConfirm: () => {},
      onCancel: () => {},
    });
    assert.equal(typeof widget.build, "function");
  });

  it("stores files with special characters", () => {
    const files = ["path/to/my file.ts", "src/日本語.ts"];
    const widget = new RestoreConfirmationWidget({
      affectedFiles: files,
      onConfirm: () => {},
      onCancel: () => {},
    });
    assert.deepEqual(widget.config.affectedFiles, files);
  });

  it("callbacks can receive different instances", () => {
    let confirmCount = 0;
    let cancelCount = 0;
    const widget = new RestoreConfirmationWidget({
      onConfirm: () => {
        confirmCount++;
      },
      onCancel: () => {
        cancelCount++;
      },
    });
    widget.config.onConfirm();
    widget.config.onConfirm();
    widget.config.onCancel();
    assert.equal(confirmCount, 2);
    assert.equal(cancelCount, 1);
  });
});
