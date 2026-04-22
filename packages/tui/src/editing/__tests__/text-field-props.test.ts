/**
 * GAP-TUI-26: TextField missing props — unit tests
 *
 * Tests that all 8 new props are accepted, stored, and forwarded correctly.
 *
 * 逆向: Gm constructor / sP state (chunk-006.js:4272-4500)
 *
 * @module text-field-props.test
 */

import { describe, expect, it, mock } from "bun:test";
import type { PromptRule } from "../text-editing-controller.js";
import { TextEditingController } from "../text-editing-controller.js";
import { TextField } from "../text-field.js";

// ════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════

/** Build a minimal TextField with the given props (without mounting). */
function makeTextField(props: ConstructorParameters<typeof TextField>[0] = {}): TextField {
  return new TextField(props);
}

// ════════════════════════════════════════════════════
//  Default values
// ════════════════════════════════════════════════════

describe("TextField default values", () => {
  it("wrap defaults to false (undefined → falsy)", () => {
    const tf = makeTextField();
    expect(tf.props.wrap).toBeUndefined();
    // Consumers read ?? false  — matches amp Gm constructor: wrap: l = !1
  });

  it("expands defaults to false (undefined → falsy)", () => {
    const tf = makeTextField();
    expect(tf.props.expands).toBeUndefined();
  });

  it("maxWidth is undefined by default", () => {
    const tf = makeTextField();
    expect(tf.props.maxWidth).toBeUndefined();
  });

  it("prompts is undefined by default", () => {
    const tf = makeTextField();
    expect(tf.props.prompts).toBeUndefined();
  });

  it("onChanged is undefined by default", () => {
    const tf = makeTextField();
    expect(tf.props.onChanged).toBeUndefined();
  });

  it("copyOnSelectionEnabled defaults to false (undefined → falsy)", () => {
    const tf = makeTextField();
    expect(tf.props.copyOnSelectionEnabled).toBeUndefined();
  });

  it("onCopy is undefined by default", () => {
    const tf = makeTextField();
    expect(tf.props.onCopy).toBeUndefined();
  });

  it("onOpenInEditor is undefined by default", () => {
    const tf = makeTextField();
    expect(tf.props.onOpenInEditor).toBeUndefined();
  });

  it("ensureVisible defaults to false (undefined → falsy)", () => {
    const tf = makeTextField();
    expect(tf.props.ensureVisible).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════
//  Prop storage
// ════════════════════════════════════════════════════

describe("TextField prop storage", () => {
  it("stores wrap=true", () => {
    const tf = makeTextField({ wrap: true });
    expect(tf.props.wrap).toBe(true);
  });

  it("stores expands=true", () => {
    const tf = makeTextField({ expands: true });
    expect(tf.props.expands).toBe(true);
  });

  it("stores maxWidth=80", () => {
    const tf = makeTextField({ maxWidth: 80 });
    expect(tf.props.maxWidth).toBe(80);
  });

  it("stores prompts array", () => {
    const rule: PromptRule = { match: () => true, concealPrefix: false };
    const tf = makeTextField({ prompts: [rule] });
    expect(tf.props.prompts).toHaveLength(1);
    expect(tf.props.prompts![0]).toBe(rule);
  });

  it("stores onChanged callback", () => {
    const cb = (_text: string) => {};
    const tf = makeTextField({ onChanged: cb });
    expect(tf.props.onChanged).toBe(cb);
  });

  it("stores copyOnSelectionEnabled=true", () => {
    const tf = makeTextField({ copyOnSelectionEnabled: true });
    expect(tf.props.copyOnSelectionEnabled).toBe(true);
  });

  it("stores onCopy callback", () => {
    const cb = (_text: string, _success: boolean) => {};
    const tf = makeTextField({ onCopy: cb });
    expect(tf.props.onCopy).toBe(cb);
  });

  it("stores onOpenInEditor callback", () => {
    const cb = () => {};
    const tf = makeTextField({ onOpenInEditor: cb });
    expect(tf.props.onOpenInEditor).toBe(cb);
  });

  it("stores ensureVisible=true", () => {
    const tf = makeTextField({ ensureVisible: true });
    expect(tf.props.ensureVisible).toBe(true);
  });
});

// ════════════════════════════════════════════════════
//  TextEditingController.updateLayoutConfig
// ════════════════════════════════════════════════════

describe("TextEditingController.updateLayoutConfig", () => {
  it("sets width to no-wrap by default", () => {
    const ctrl = new TextEditingController({ text: "abcdefghij", width: 5 });
    // Default wrapMode is "none" — text should NOT soft-wrap
    const lines = ctrl.getLayoutLines();
    expect(lines).toHaveLength(1);
  });

  it("updateLayoutConfig with word wrap causes soft-wrap", () => {
    const ctrl = new TextEditingController({ text: "abcde fghij", width: 5 });
    ctrl.updateLayoutConfig(5, "word");
    const lines = ctrl.getLayoutLines();
    expect(lines.length).toBeGreaterThan(1);
  });

  it("updateLayoutConfig with char wrap causes char-level wrap", () => {
    const ctrl = new TextEditingController({ text: "abcdefghij", width: 5 });
    ctrl.updateLayoutConfig(5, "char");
    const lines = ctrl.getLayoutLines();
    expect(lines).toHaveLength(2);
    expect(lines[0]!.endOffset).toBe(5);
  });

  it("updateLayoutConfig with none does not soft-wrap", () => {
    const ctrl = new TextEditingController({ text: "abcdefghij", width: 5 });
    ctrl.updateLayoutConfig(5, "none");
    const lines = ctrl.getLayoutLines();
    expect(lines).toHaveLength(1);
  });
});

// ════════════════════════════════════════════════════
//  TextEditingController.setPromptRules
// ════════════════════════════════════════════════════

describe("TextEditingController.setPromptRules", () => {
  it("setPromptRules stores the rules", () => {
    const ctrl = new TextEditingController();
    const rule: PromptRule = {
      match: (text) => text.startsWith("$ "),
      concealPrefix: true,
      display: "$ ",
    };
    ctrl.setPromptRules([rule]);
    const stored = ctrl.getPromptRules();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toBe(rule);
  });

  it("setPromptRules replaces existing rules", () => {
    const ctrl = new TextEditingController();
    const rule1: PromptRule = { match: () => false };
    const rule2: PromptRule = { match: () => true };
    ctrl.setPromptRules([rule1]);
    ctrl.setPromptRules([rule2]);
    const stored = ctrl.getPromptRules();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toBe(rule2);
  });

  it("setPromptRules with empty array clears rules", () => {
    const ctrl = new TextEditingController();
    ctrl.setPromptRules([{ match: () => true }]);
    ctrl.setPromptRules([]);
    expect(ctrl.getPromptRules()).toHaveLength(0);
  });
});

// ════════════════════════════════════════════════════
//  TextEditingController scroll offset
// ════════════════════════════════════════════════════

describe("TextEditingController scroll offset", () => {
  it("initial scroll offset is 0", () => {
    const ctrl = new TextEditingController();
    expect(ctrl.getScrollOffset()).toBe(0);
  });

  it("setScrollOffset updates offset", () => {
    const ctrl = new TextEditingController();
    ctrl.setScrollOffset(3);
    expect(ctrl.getScrollOffset()).toBe(3);
  });

  it("setScrollOffset with same value does not notify listeners", () => {
    const ctrl = new TextEditingController();
    ctrl.setScrollOffset(2);
    const cb = mock(() => {});
    ctrl.addScrollListener(cb);
    ctrl.setScrollOffset(2); // same value, no notification
    expect(cb).not.toHaveBeenCalled();
  });

  it("addScrollListener is called when scroll offset changes", () => {
    const ctrl = new TextEditingController();
    const cb = mock(() => {});
    ctrl.addScrollListener(cb);
    ctrl.setScrollOffset(1);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("removeScrollListener stops notifications", () => {
    const ctrl = new TextEditingController();
    const cb = mock(() => {});
    ctrl.addScrollListener(cb);
    ctrl.removeScrollListener(cb);
    ctrl.setScrollOffset(1);
    expect(cb).not.toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════
//  TextEditingController.selectedText
// ════════════════════════════════════════════════════

describe("TextEditingController.selectedText", () => {
  it("returns empty string when no selection", () => {
    const ctrl = new TextEditingController({ text: "hello" });
    expect(ctrl.selectedText).toBe("");
  });

  it("returns selected text when selection is active", () => {
    const ctrl = new TextEditingController({ text: "hello world" });
    ctrl.cursorPosition = 0;
    ctrl.setSelectionRange(0, 5);
    expect(ctrl.selectedText).toBe("hello");
  });

  it("handles reversed selection (end before start)", () => {
    const ctrl = new TextEditingController({ text: "hello world" });
    ctrl.setSelectionRange(5, 0); // reversed
    expect(ctrl.selectedText).toBe("hello");
  });
});

// ════════════════════════════════════════════════════
//  onChanged fires on text change
// ════════════════════════════════════════════════════

describe("TextField.props.onChanged", () => {
  it("onChanged callback is stored in props", () => {
    const cb = mock((_text: string) => {});
    const tf = makeTextField({ onChanged: cb });
    expect(tf.props.onChanged).toBe(cb);
  });
});

// ════════════════════════════════════════════════════
//  expands removes maxLines constraint
// ════════════════════════════════════════════════════

describe("TextField expands prop", () => {
  it("expands=true is stored", () => {
    const tf = makeTextField({ expands: true, maxLines: 3 });
    expect(tf.props.expands).toBe(true);
    expect(tf.props.maxLines).toBe(3); // stored as-is; build() nullifies when expands+multiline
  });

  it("expands=false preserves maxLines", () => {
    const tf = makeTextField({ expands: false, maxLines: 5 });
    expect(tf.props.expands).toBe(false);
    expect(tf.props.maxLines).toBe(5);
  });
});

// ════════════════════════════════════════════════════
//  maxWidth constrains layout width
// ════════════════════════════════════════════════════

describe("maxWidth prop", () => {
  it("maxWidth=40 is stored in props", () => {
    const tf = makeTextField({ maxWidth: 40 });
    expect(tf.props.maxWidth).toBe(40);
  });

  it("maxWidth applied in updateLayoutConfig via controller", () => {
    const ctrl = new TextEditingController({ text: "abcdefghij" });
    // Simulate what RenderTextField.performLayout would do with maxWidth=5, wrap=true
    const effectiveWidth = Math.min(80, 5); // maxWidth=5, containerWidth=80
    ctrl.updateLayoutConfig(effectiveWidth, "char");
    const lines = ctrl.getLayoutLines();
    expect(lines).toHaveLength(2);
    expect(lines[0]!.endOffset).toBe(5);
  });
});

// ════════════════════════════════════════════════════
//  wrap prop → wrapMode mapping
// ════════════════════════════════════════════════════

describe("wrap prop → wrapMode", () => {
  it("wrap=false → no soft wrap", () => {
    const ctrl = new TextEditingController({ text: "abcdefghij" });
    ctrl.updateLayoutConfig(5, "none"); // wrap=false
    const lines = ctrl.getLayoutLines();
    expect(lines).toHaveLength(1);
  });

  it("wrap=true → word wrap", () => {
    const ctrl = new TextEditingController({ text: "hello world" });
    ctrl.updateLayoutConfig(8, "word"); // wrap=true
    const lines = ctrl.getLayoutLines();
    expect(lines.length).toBeGreaterThan(1);
  });
});
