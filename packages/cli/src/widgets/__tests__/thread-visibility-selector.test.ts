/**
 * Tests for ThreadVisibilitySelector, VISIBILITY_OPTIONS, and related types.
 *
 * 逆向: JRR/T0R — interactive_widgets.js:1081-1152
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type ThreadVisibilityConfig,
  ThreadVisibilitySelector,
  VISIBILITY_OPTIONS,
  type VisibilityOption,
} from "../thread-visibility-selector.js";

// ─── VISIBILITY_OPTIONS constant ──────────────────────────

describe("VISIBILITY_OPTIONS", () => {
  it("has exactly 5 options", () => {
    assert.equal(VISIBILITY_OPTIONS.length, 5);
  });

  it("each option has key, label, and description", () => {
    for (const option of VISIBILITY_OPTIONS) {
      assert.equal(typeof option.key, "string");
      assert.equal(typeof option.label, "string");
      assert.equal(typeof option.description, "string");
    }
  });

  it("keys are in the expected order", () => {
    const keys = VISIBILITY_OPTIONS.map((o) => o.key);
    assert.deepEqual(keys, ["private", "workspace", "group", "unlisted", "public"]);
  });

  it("no option has an empty label", () => {
    for (const option of VISIBILITY_OPTIONS) {
      assert.ok(option.label.length > 0, `option "${option.key}" has empty label`);
    }
  });

  it("no option has an empty description", () => {
    for (const option of VISIBILITY_OPTIONS) {
      assert.ok(option.description.length > 0, `option "${option.key}" has empty description`);
    }
  });

  it("all keys are unique", () => {
    const keys = VISIBILITY_OPTIONS.map((o) => o.key);
    const unique = new Set(keys);
    assert.equal(unique.size, keys.length);
  });

  it("contains the group option", () => {
    const group = VISIBILITY_OPTIONS.find((o) => o.key === "group");
    assert.ok(group);
    assert.equal(group.label, "Group");
  });
});

// ─── VisibilityOption type ────────────────────────────────

describe("VisibilityOption type", () => {
  it("accepts all five valid values", () => {
    const values: VisibilityOption[] = ["private", "workspace", "group", "unlisted", "public"];
    assert.equal(values.length, 5);
    // Ensure each value round-trips through the type without error
    for (const v of values) {
      const item: VisibilityOption = v;
      assert.equal(item, v);
    }
  });
});

// ─── ThreadVisibilitySelector construction ────────────────

describe("ThreadVisibilitySelector", () => {
  it("constructs with config", () => {
    const widget = new ThreadVisibilitySelector({
      currentVisibility: "private",
      onSelect: () => {},
      onDismiss: () => {},
    });
    assert.ok(widget.config);
    assert.equal(widget.config.currentVisibility, "private");
  });

  it("stores onSelect callback", () => {
    let called = false;
    const widget = new ThreadVisibilitySelector({
      currentVisibility: "private",
      onSelect: () => {
        called = true;
      },
      onDismiss: () => {},
    });
    assert.equal(typeof widget.config.onSelect, "function");
    widget.config.onSelect("workspace");
    assert.equal(called, true);
  });

  it("stores onDismiss callback", () => {
    let called = false;
    const widget = new ThreadVisibilitySelector({
      currentVisibility: "private",
      onSelect: () => {},
      onDismiss: () => {
        called = true;
      },
    });
    assert.equal(typeof widget.config.onDismiss, "function");
    widget.config.onDismiss();
    assert.equal(called, true);
  });

  it("defaults hasGroups to undefined", () => {
    const widget = new ThreadVisibilitySelector({
      currentVisibility: "private",
      onSelect: () => {},
      onDismiss: () => {},
    });
    assert.equal(widget.config.hasGroups, undefined);
  });

  it("stores hasGroups when true", () => {
    const widget = new ThreadVisibilitySelector({
      currentVisibility: "workspace",
      hasGroups: true,
      onSelect: () => {},
      onDismiss: () => {},
    });
    assert.equal(widget.config.hasGroups, true);
  });

  it("stores hasGroups when false", () => {
    const widget = new ThreadVisibilitySelector({
      currentVisibility: "workspace",
      hasGroups: false,
      onSelect: () => {},
      onDismiss: () => {},
    });
    assert.equal(widget.config.hasGroups, false);
  });

  it("accepts each visibility option as currentVisibility", () => {
    const options: VisibilityOption[] = ["private", "workspace", "group", "unlisted", "public"];
    for (const opt of options) {
      const widget = new ThreadVisibilitySelector({
        currentVisibility: opt,
        onSelect: () => {},
        onDismiss: () => {},
      });
      assert.equal(widget.config.currentVisibility, opt);
    }
  });

  it("onSelect receives the selected visibility", () => {
    let received: VisibilityOption | null = null;
    const widget = new ThreadVisibilitySelector({
      currentVisibility: "private",
      onSelect: (v) => {
        received = v;
      },
      onDismiss: () => {},
    });
    widget.config.onSelect("public");
    assert.equal(received, "public");
  });

  it("is a StatelessWidget with a build method", () => {
    const widget = new ThreadVisibilitySelector({
      currentVisibility: "private",
      onSelect: () => {},
      onDismiss: () => {},
    });
    assert.equal(typeof widget.build, "function");
  });

  it("callbacks can be invoked multiple times", () => {
    let selectCount = 0;
    let dismissCount = 0;
    const widget = new ThreadVisibilitySelector({
      currentVisibility: "unlisted",
      onSelect: () => {
        selectCount++;
      },
      onDismiss: () => {
        dismissCount++;
      },
    });
    widget.config.onSelect("private");
    widget.config.onSelect("workspace");
    widget.config.onDismiss();
    assert.equal(selectCount, 2);
    assert.equal(dismissCount, 1);
  });

  it("config is readonly after construction", () => {
    const config: ThreadVisibilityConfig = {
      currentVisibility: "public",
      onSelect: () => {},
      onDismiss: () => {},
    };
    const widget = new ThreadVisibilitySelector(config);
    // Verify the config reference is the same object passed in
    assert.equal(widget.config.currentVisibility, "public");
    assert.equal(widget.config.onSelect, config.onSelect);
    assert.equal(widget.config.onDismiss, config.onDismiss);
  });
});
