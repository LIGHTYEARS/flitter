/**
 * ConfirmDialog widget tests.
 *
 * Covers:
 * - Construction with required and optional props
 * - Default values for title, labels, width
 * - Callback wiring
 *
 * @module
 */

import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ConfirmDialog } from "./confirm-dialog.js";

// ════════════════════════════════════════════════════
//  Construction tests
// ════════════════════════════════════════════════════

describe("ConfirmDialog", () => {
  it("constructs with required props", () => {
    const dialog = new ConfirmDialog({
      message: "Are you sure?",
      onConfirm: () => {},
      onCancel: () => {},
    });
    assert.equal(dialog.message, "Are you sure?");
    assert.equal(dialog.title, "Confirm");         // default
    assert.equal(dialog.confirmLabel, "Yes");       // default
    assert.equal(dialog.cancelLabel, "No");         // default
    assert.equal(dialog.dialogWidth, 40);           // default
  });

  it("constructs with all props", () => {
    const dialog = new ConfirmDialog({
      message: "Delete file?",
      title: "Delete",
      confirmLabel: "Delete",
      cancelLabel: "Keep",
      onConfirm: () => {},
      onCancel: () => {},
      width: 60,
    });
    assert.equal(dialog.message, "Delete file?");
    assert.equal(dialog.title, "Delete");
    assert.equal(dialog.confirmLabel, "Delete");
    assert.equal(dialog.cancelLabel, "Keep");
    assert.equal(dialog.dialogWidth, 60);
  });

  it("onConfirm callback fires", () => {
    let confirmed = false;
    const dialog = new ConfirmDialog({
      message: "Confirm?",
      onConfirm: () => { confirmed = true; },
      onCancel: () => {},
    });
    dialog.onConfirm();
    assert.equal(confirmed, true);
  });

  it("onCancel callback fires", () => {
    let cancelled = false;
    const dialog = new ConfirmDialog({
      message: "Confirm?",
      onConfirm: () => {},
      onCancel: () => { cancelled = true; },
    });
    dialog.onCancel();
    assert.equal(cancelled, true);
  });
});
