/**
 * PromptDialog widget tests.
 *
 * Covers:
 * - Construction with required and optional props
 * - Default values
 * - Callback wiring
 *
 * @module
 */

import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PromptDialog } from "./prompt-dialog.js";

// ════════════════════════════════════════════════════
//  Construction tests
// ════════════════════════════════════════════════════

describe("PromptDialog", () => {
  it("constructs with required props", () => {
    const dialog = new PromptDialog({
      message: "Enter name:",
      onSubmit: () => {},
      onCancel: () => {},
    });
    assert.equal(dialog.message, "Enter name:");
    assert.equal(dialog.title, "Input");        // default
    assert.equal(dialog.placeholder, "");        // default
    assert.equal(dialog.initialValue, "");       // default
    assert.equal(dialog.confirmLabel, "OK");     // default
    assert.equal(dialog.cancelLabel, "Cancel");  // default
    assert.equal(dialog.dialogWidth, 50);        // default
  });

  it("constructs with all props", () => {
    const dialog = new PromptDialog({
      message: "File name:",
      title: "Save As",
      placeholder: "untitled.txt",
      initialValue: "document.txt",
      confirmLabel: "Save",
      cancelLabel: "Discard",
      onSubmit: () => {},
      onCancel: () => {},
      width: 60,
    });
    assert.equal(dialog.message, "File name:");
    assert.equal(dialog.title, "Save As");
    assert.equal(dialog.placeholder, "untitled.txt");
    assert.equal(dialog.initialValue, "document.txt");
    assert.equal(dialog.confirmLabel, "Save");
    assert.equal(dialog.cancelLabel, "Discard");
    assert.equal(dialog.dialogWidth, 60);
  });

  it("onSubmit callback fires with value", () => {
    let received: string | null = null;
    const dialog = new PromptDialog({
      message: "Name:",
      initialValue: "test",
      onSubmit: (v) => { received = v; },
      onCancel: () => {},
    });
    dialog.onSubmit("hello");
    assert.equal(received, "hello");
  });

  it("onCancel callback fires", () => {
    let cancelled = false;
    const dialog = new PromptDialog({
      message: "Name:",
      onSubmit: () => {},
      onCancel: () => { cancelled = true; },
    });
    dialog.onCancel();
    assert.equal(cancelled, true);
  });
});
