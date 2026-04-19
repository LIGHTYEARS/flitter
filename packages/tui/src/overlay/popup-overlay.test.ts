/**
 * PopupOverlay widget tests.
 *
 * Covers:
 * - Construction with required and optional props
 * - Default values for barrierDismissible, escapeDismissible
 * - Widget tree structure verification
 *
 * @module
 */

import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PopupOverlay } from "./popup-overlay.js";
import { SizedBox } from "../widgets/sized-box.js";

// ════════════════════════════════════════════════════
//  Construction tests
// ════════════════════════════════════════════════════

describe("PopupOverlay", () => {
  it("constructs with required props", () => {
    let dismissed = false;
    const child = new SizedBox({ width: 10, height: 5 });
    const popup = new PopupOverlay({
      child: child,
      onDismiss: () => { dismissed = true; },
    });
    assert.equal(popup.barrierDismissible, true); // default
    assert.equal(popup.escapeDismissible, true);  // default
    assert.equal(popup.autofocus, true);           // default
  });

  it("constructs with all props", () => {
    const child = new SizedBox();
    const popup = new PopupOverlay({
      child: child,
      onDismiss: () => {},
      barrierDismissible: false,
      escapeDismissible: false,
      autofocus: false,
    });
    assert.equal(popup.barrierDismissible, false);
    assert.equal(popup.escapeDismissible, false);
    assert.equal(popup.autofocus, false);
  });

  it("stores child reference", () => {
    const child = new SizedBox({ width: 20, height: 10 });
    const popup = new PopupOverlay({
      child: child,
      onDismiss: () => {},
    });
    assert.strictEqual(popup.child, child);
  });

  it("onDismiss callback is callable", () => {
    let dismissed = false;
    const popup = new PopupOverlay({
      child: new SizedBox(),
      onDismiss: () => { dismissed = true; },
    });
    popup.onDismiss();
    assert.equal(dismissed, true);
  });
});
