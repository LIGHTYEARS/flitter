/**
 * Tests for LabelPicker widget and label validation utilities.
 *
 * 逆向: misc_utils.js — URR (StatefulWidget) / NRR (State) / isValidLabelName / getValidationError
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getLabelValidationError,
  isValidLabelName,
  LabelPicker,
  LabelPickerState,
} from "../label-picker.js";

// ─── getLabelValidationError ──────────────────────────

describe("getLabelValidationError", () => {
  it("returns null for empty string", () => {
    assert.equal(getLabelValidationError(""), null);
  });

  it("returns null for whitespace-only string", () => {
    assert.equal(getLabelValidationError("   "), null);
  });

  it("returns null for valid lowercase name", () => {
    assert.equal(getLabelValidationError("my-label"), null);
  });

  it("returns null for valid numeric-start name", () => {
    assert.equal(getLabelValidationError("1st-label"), null);
  });

  it("returns null for single character", () => {
    assert.equal(getLabelValidationError("a"), null);
  });

  it("returns null for single digit", () => {
    assert.equal(getLabelValidationError("7"), null);
  });

  it("returns null for name at exactly 32 characters", () => {
    const name = "a".repeat(32);
    assert.equal(getLabelValidationError(name), null);
  });

  it("returns error for name exceeding 32 characters", () => {
    const name = "a".repeat(33);
    assert.equal(getLabelValidationError(name), "Label name cannot exceed 32 characters");
  });

  it("returns error for name starting with hyphen", () => {
    const result = getLabelValidationError("-my-label");
    assert.equal(
      result,
      "Label must be alphanumeric with hyphens, starting with a letter or number",
    );
  });

  it("returns error for name with uppercase (after normalization still valid)", () => {
    // Input is "MyLabel" -> normalized to "mylabel" which is valid
    assert.equal(getLabelValidationError("MyLabel"), null);
  });

  it("returns error for name with spaces", () => {
    // "my label" trimmed+lowered -> "my label" which has a space
    const result = getLabelValidationError("my label");
    assert.equal(
      result,
      "Label must be alphanumeric with hyphens, starting with a letter or number",
    );
  });

  it("returns error for name with underscores", () => {
    const result = getLabelValidationError("my_label");
    assert.equal(
      result,
      "Label must be alphanumeric with hyphens, starting with a letter or number",
    );
  });

  it("returns error for name with special characters", () => {
    const result = getLabelValidationError("label@name");
    assert.equal(
      result,
      "Label must be alphanumeric with hyphens, starting with a letter or number",
    );
  });

  it("normalizes input by trimming and lowercasing", () => {
    // "  ValidName  " -> "validname" which is valid
    assert.equal(getLabelValidationError("  ValidName  "), null);
  });

  it("returns length error before pattern error for long invalid names", () => {
    // 33 characters of invalid content — length check comes first
    const name = "@".repeat(33);
    assert.equal(getLabelValidationError(name), "Label name cannot exceed 32 characters");
  });
});

// ─── isValidLabelName ─────────────────────────────────

describe("isValidLabelName", () => {
  it("returns false for empty string", () => {
    assert.equal(isValidLabelName(""), false);
  });

  it("returns false for whitespace-only string", () => {
    assert.equal(isValidLabelName("   "), false);
  });

  it("returns true for valid lowercase name", () => {
    assert.equal(isValidLabelName("bugfix"), true);
  });

  it("returns true for name with hyphens", () => {
    assert.equal(isValidLabelName("my-cool-label"), true);
  });

  it("returns true for numeric-start name", () => {
    assert.equal(isValidLabelName("2nd-attempt"), true);
  });

  it("returns false for name starting with hyphen", () => {
    assert.equal(isValidLabelName("-invalid"), false);
  });

  it("returns false for name exceeding 32 characters", () => {
    assert.equal(isValidLabelName("a".repeat(33)), false);
  });

  it("returns true for name at exactly 32 characters", () => {
    assert.equal(isValidLabelName("a".repeat(32)), true);
  });

  it("returns false for name with special characters", () => {
    assert.equal(isValidLabelName("hello!world"), false);
  });

  it("returns true for uppercase input (normalized to lowercase)", () => {
    assert.equal(isValidLabelName("FEATURE"), true);
  });
});

// ─── LabelPicker widget construction ──────────────────

describe("LabelPicker", () => {
  it("constructs with config", () => {
    const widget = new LabelPicker({
      currentLabels: [],
      labels: [],
      onSelect: () => {},
      onDismiss: () => {},
    });
    assert.ok(widget.config);
    assert.deepEqual(widget.config.currentLabels, []);
    assert.deepEqual(widget.config.labels, []);
  });

  it("stores labels in config", () => {
    const labels = [
      { id: "1", name: "bug" },
      { id: "2", name: "feature" },
    ];
    const widget = new LabelPicker({
      currentLabels: [],
      labels,
      onSelect: () => {},
      onDismiss: () => {},
    });
    assert.deepEqual(widget.config.labels, labels);
  });

  it("stores currentLabels in config", () => {
    const widget = new LabelPicker({
      currentLabels: ["bug", "wontfix"],
      labels: [],
      onSelect: () => {},
      onDismiss: () => {},
    });
    assert.deepEqual(widget.config.currentLabels, ["bug", "wontfix"]);
  });

  it("stores isLoading flag", () => {
    const widget = new LabelPicker({
      currentLabels: [],
      labels: [],
      isLoading: true,
      onSelect: () => {},
      onDismiss: () => {},
    });
    assert.equal(widget.config.isLoading, true);
  });

  it("isLoading defaults to undefined when not provided", () => {
    const widget = new LabelPicker({
      currentLabels: [],
      labels: [],
      onSelect: () => {},
      onDismiss: () => {},
    });
    assert.equal(widget.config.isLoading, undefined);
  });

  it("onSelect callback is callable", () => {
    let selected = "";
    const widget = new LabelPicker({
      currentLabels: [],
      labels: [],
      onSelect: (name) => {
        selected = name;
      },
      onDismiss: () => {},
    });
    widget.config.onSelect("my-label");
    assert.equal(selected, "my-label");
  });

  it("onDismiss callback is callable", () => {
    let dismissed = false;
    const widget = new LabelPicker({
      currentLabels: [],
      labels: [],
      onSelect: () => {},
      onDismiss: () => {
        dismissed = true;
      },
    });
    widget.config.onDismiss();
    assert.equal(dismissed, true);
  });

  it("createState returns a LabelPickerState", () => {
    const widget = new LabelPicker({
      currentLabels: [],
      labels: [],
      onSelect: () => {},
      onDismiss: () => {},
    });
    const state = widget.createState();
    assert.ok(state instanceof LabelPickerState);
  });
});

// ─── LabelPickerState export ──────────────────────────

describe("LabelPickerState", () => {
  it("is exported and can be instantiated", () => {
    const state = new LabelPickerState();
    assert.ok(state);
  });

  it("has a build method", () => {
    const state = new LabelPickerState();
    assert.equal(typeof state.build, "function");
  });
});
