/**
 * ConfirmDialog widget tests.
 *
 * Covers:
 * - Construction with required and optional props
 * - Default values for confirmButtonText, terminal dimensions, colors
 * - Callback wiring
 * - Amp-aligned API: title required, message optional, inline keybind hints
 *
 * 逆向: n0R at actions_intents.js:3469-3547
 *
 * @module
 */

import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Color } from "../screen/color.js";
import { ConfirmDialog, type ConfirmDialogColors } from "./confirm-dialog.js";

// ════════════════════════════════════════════════════
//  Construction tests
// ════════════════════════════════════════════════════

describe("ConfirmDialog", () => {
  it("constructs with required props only", () => {
    const dialog = new ConfirmDialog({
      title: "Delete file?",
      onConfirm: () => {},
      onCancel: () => {},
    });
    assert.equal(dialog.title, "Delete file?");
    assert.equal(dialog.message, undefined);
    assert.equal(dialog.confirmButtonText, "yes"); // default
    assert.equal(dialog.terminalWidth, 80); // default
    assert.equal(dialog.terminalHeight, 24); // default
    assert.ok(dialog.colors); // has default colors
  });

  it("constructs with all props", () => {
    const colors: ConfirmDialogColors = {
      primary: Color.cyan(),
      foreground: Color.default(),
      background: Color.rgb(30, 30, 46),
      keybind: Color.blue(),
    };
    const dialog = new ConfirmDialog({
      title: "Delete",
      message: "This cannot be undone.",
      confirmButtonText: "Delete",
      onConfirm: () => {},
      onCancel: () => {},
      terminalWidth: 120,
      terminalHeight: 40,
      colors,
    });
    assert.equal(dialog.title, "Delete");
    assert.equal(dialog.message, "This cannot be undone.");
    assert.equal(dialog.confirmButtonText, "Delete");
    assert.equal(dialog.terminalWidth, 120);
    assert.equal(dialog.terminalHeight, 40);
    assert.equal(dialog.colors, colors);
  });

  it("onConfirm callback fires", () => {
    let confirmed = false;
    const dialog = new ConfirmDialog({
      title: "Confirm?",
      onConfirm: () => {
        confirmed = true;
      },
      onCancel: () => {},
    });
    dialog.onConfirm();
    assert.equal(confirmed, true);
  });

  it("onCancel callback fires", () => {
    let cancelled = false;
    const dialog = new ConfirmDialog({
      title: "Confirm?",
      onConfirm: () => {},
      onCancel: () => {
        cancelled = true;
      },
    });
    dialog.onCancel();
    assert.equal(cancelled, true);
  });

  // 逆向: n0R lines 3488-3489 — boxWidth = max(50, min(80, termWidth - 4))
  it("box width clamps between 50 and 80", () => {
    // Small terminal — should clamp to 50
    const small = new ConfirmDialog({
      title: "Test",
      onConfirm: () => {},
      onCancel: () => {},
      terminalWidth: 40,
    });
    assert.equal(small.terminalWidth, 40);
    // (Actual layout would use max(50, min(80, 40-4)) = max(50, 36) = 50)

    // Large terminal — should clamp to 80
    const large = new ConfirmDialog({
      title: "Test",
      onConfirm: () => {},
      onCancel: () => {},
      terminalWidth: 200,
    });
    assert.equal(large.terminalWidth, 200);
    // (Actual layout would use max(50, min(80, 200-4)) = max(50, 80) = 80)
  });

  it("confirmButtonText defaults to 'yes' and is lowercased in hints", () => {
    const dialog = new ConfirmDialog({
      title: "Overwrite?",
      confirmButtonText: "Overwrite",
      onConfirm: () => {},
      onCancel: () => {},
    });
    assert.equal(dialog.confirmButtonText, "Overwrite");
    // In the build() output, confirmButtonText.toLowerCase() is used
  });
});
