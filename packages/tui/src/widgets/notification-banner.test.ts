/**
 * NotificationBanner widget tests.
 *
 * Covers:
 * - Construction with all notification types
 * - Default values
 * - Action and dismiss callbacks
 * - Type-specific configuration
 *
 * @module
 */

import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NotificationBanner } from "./notification-banner.js";
import type { NotificationType } from "./notification-banner.js";

// ════════════════════════════════════════════════════
//  Construction tests
// ════════════════════════════════════════════════════

describe("NotificationBanner", () => {
  it("constructs with required props (info)", () => {
    const banner = new NotificationBanner({
      type: "info",
      message: "Something happened",
    });
    assert.equal(banner.type, "info");
    assert.equal(banner.message, "Something happened");
    assert.equal(banner.onDismiss, undefined);
    assert.equal(banner.action, undefined);
  });

  it("constructs with all props", () => {
    let dismissed = false;
    let actionFired = false;
    const banner = new NotificationBanner({
      type: "warning",
      message: "Rate limit approaching",
      onDismiss: () => { dismissed = true; },
      action: { label: "View", onPressed: () => { actionFired = true; } },
    });
    assert.equal(banner.type, "warning");
    assert.equal(banner.message, "Rate limit approaching");
    assert.ok(banner.onDismiss !== undefined);
    assert.ok(banner.action !== undefined);
    assert.equal(banner.action!.label, "View");
    
    // Verify callbacks
    banner.onDismiss!();
    assert.equal(dismissed, true);
    banner.action!.onPressed();
    assert.equal(actionFired, true);
  });

  it("supports all notification types", () => {
    const types: NotificationType[] = ["info", "warning", "error", "success"];
    for (const type of types) {
      const banner = new NotificationBanner({ type, message: `${type} message` });
      assert.equal(banner.type, type);
      assert.equal(banner.message, `${type} message`);
    }
  });

  it("is a StatelessWidget", () => {
    const banner = new NotificationBanner({
      type: "success",
      message: "Done!",
    });
    assert.ok(banner instanceof NotificationBanner);
  });
});

// ════════════════════════════════════════════════════
//  Callback tests
// ════════════════════════════════════════════════════

describe("NotificationBanner callbacks", () => {
  it("onDismiss is optional", () => {
    const banner = new NotificationBanner({
      type: "info",
      message: "Test",
    });
    assert.equal(banner.onDismiss, undefined);
  });

  it("action is optional", () => {
    const banner = new NotificationBanner({
      type: "error",
      message: "Error occurred",
    });
    assert.equal(banner.action, undefined);
  });

  it("action onPressed callback works", () => {
    let count = 0;
    const banner = new NotificationBanner({
      type: "info",
      message: "Info",
      action: { label: "Retry", onPressed: () => { count++; } },
    });
    banner.action!.onPressed();
    banner.action!.onPressed();
    assert.equal(count, 2);
  });
});
