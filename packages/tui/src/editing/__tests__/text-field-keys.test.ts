import { describe, expect, it, mock } from "bun:test";
import type { KeyEvent } from "../../vt/types.js";
import { TextEditingController } from "../text-editing-controller.js";

// We test the key dispatch logic in isolation by recreating it
// (same logic as TextFieldState._handleKey)

const MODS_NONE = { shift: false, alt: false, ctrl: false, meta: false };
const MODS_CTRL = { shift: false, alt: false, ctrl: true, meta: false };
const MODS_ALT = { shift: false, alt: true, ctrl: false, meta: false };
const MODS_SHIFT = { shift: true, alt: false, ctrl: false, meta: false };

function makeKey(key: string, modifiers = MODS_NONE): KeyEvent {
  return { type: "key", key, modifiers };
}

describe("TextField key dispatch logic", () => {
  it("inserts printable character", () => {
    const ctrl = new TextEditingController();
    _simulateKey(ctrl, makeKey("a"));
    expect(ctrl.text).toBe("a");
  });

  it("Backspace deletes one grapheme", () => {
    const ctrl = new TextEditingController({ text: "ab" });
    _simulateKey(ctrl, makeKey("Backspace"));
    expect(ctrl.text).toBe("a");
    expect(ctrl.cursorPosition).toBe(1);
  });

  it("Ctrl+A moves to line start", () => {
    const ctrl = new TextEditingController({ text: "hello" });
    _simulateKey(ctrl, makeKey("a", MODS_CTRL));
    expect(ctrl.cursorPosition).toBe(0);
  });

  it("Ctrl+E moves to line end", () => {
    const ctrl = new TextEditingController({ text: "hello" });
    ctrl.moveCursorToStart();
    _simulateKey(ctrl, makeKey("e", MODS_CTRL));
    expect(ctrl.cursorPosition).toBe(5);
  });

  it("Ctrl+K kills to line end", () => {
    const ctrl = new TextEditingController({ text: "hello world" });
    ctrl.moveCursorToStart();
    _simulateKey(ctrl, makeKey("k", MODS_CTRL));
    expect(ctrl.text).toBe("");
    expect(ctrl.killBuffer).toBe("hello world");
  });

  it("Ctrl+Y yanks kill buffer", () => {
    const ctrl = new TextEditingController({ text: "hello" });
    ctrl.moveCursorToStart();
    _simulateKey(ctrl, makeKey("k", MODS_CTRL)); // kill "hello"
    _simulateKey(ctrl, makeKey("y", MODS_CTRL)); // yank
    expect(ctrl.text).toBe("hello");
  });

  it("Alt+Left moves word left", () => {
    const ctrl = new TextEditingController({ text: "hello world" });
    // cursor is at end (11)
    _simulateKey(ctrl, makeKey("ArrowLeft", MODS_ALT));
    expect(ctrl.cursorPosition).toBe(6); // before "world"
  });

  it("Alt+Backspace deletes word left", () => {
    const ctrl = new TextEditingController({ text: "hello world" });
    _simulateKey(ctrl, makeKey("Backspace", MODS_ALT));
    expect(ctrl.text).toBe("hello ");
  });

  it("Enter calls onSubmitted when submitKey matches", () => {
    const ctrl = new TextEditingController({ text: "hello" });
    const onSubmitted = mock((_text: string) => {});
    _simulateKey(ctrl, makeKey("Enter"), { onSubmitted });
    expect(onSubmitted).toHaveBeenCalledWith("hello");
  });

  it("does not mutate text when readOnly=true", () => {
    const ctrl = new TextEditingController({ text: "hello" });
    _simulateKey(ctrl, makeKey("a"), { readOnly: true });
    expect(ctrl.text).toBe("hello");
  });

  it("Shift+ArrowRight extends selection", () => {
    const ctrl = new TextEditingController({ text: "hello" });
    ctrl.moveCursorToStart();
    _simulateKey(ctrl, makeKey("ArrowRight", MODS_SHIFT));
    expect(ctrl.selectionRange).toEqual({ start: 0, end: 1 });
  });
});

// ─── Minimal key dispatch replica for testing ───────────────────────────────
// This mirrors the exact logic in TextFieldState._handleKey
interface KeyDispatchOptions {
  readOnly?: boolean;
  maxLines?: number | null;
  onSubmitted?: (text: string) => void;
  submitKey?: { key: string; ctrl?: boolean; alt?: boolean; meta?: boolean; shift?: boolean };
  onBackspaceWhenEmpty?: () => void;
}

function _simulateKey(
  ctrl: TextEditingController,
  event: KeyEvent,
  opts: KeyDispatchOptions = {},
): "handled" | "ignored" {
  const {
    readOnly = false,
    maxLines = null,
    onSubmitted,
    submitKey = { key: "Enter" },
    onBackspaceWhenEmpty,
  } = opts;

  const { key, modifiers } = event;
  const { ctrl: isCtrl, alt: isAlt, shift: isShift } = modifiers;
  const isMultiline = maxLines !== 1;

  // Submit key check
  const matchesSubmit =
    key === submitKey.key &&
    !!isCtrl === !!submitKey.ctrl &&
    !!isAlt === !!submitKey.alt &&
    !!isShift === !!submitKey.shift;

  if (!readOnly && matchesSubmit) {
    onSubmitted?.(ctrl.text);
    return "handled";
  }

  // Multiline Enter (Shift+Enter, Alt+Enter, bare Enter when not submit)
  if (isMultiline && !readOnly && key === "Enter" && !matchesSubmit) {
    ctrl.insertText("\n");
    return "handled";
  }

  // Backspace
  if (key === "Backspace") {
    if (!readOnly) {
      if (isAlt) {
        ctrl.deleteWordLeft();
      } else if (ctrl.cursorPosition === 0 && !ctrl.hasSelection) {
        onBackspaceWhenEmpty?.();
      } else {
        ctrl.deleteSelectedOrText(1);
      }
    }
    return "handled";
  }

  // Delete
  if (key === "Delete") {
    if (!readOnly) {
      if (ctrl.hasSelection) ctrl.deleteSelectedText();
      else ctrl.deleteForward(1);
    }
    return "handled";
  }

  // Ctrl bindings
  if (isCtrl && !isAlt) {
    switch (key.toLowerCase()) {
      case "a":
        ctrl.moveCursorToLineStart({ extend: isShift });
        return "handled";
      case "e":
        ctrl.moveCursorToLineEnd({ extend: isShift });
        return "handled";
      case "k":
        if (!readOnly) ctrl.deleteToLineEnd();
        return "handled";
      case "u":
        if (!readOnly) ctrl.deleteToLineStart();
        return "handled";
      case "f":
        ctrl.moveCursorRight({ extend: isShift });
        return "handled";
      case "b":
        ctrl.moveCursorLeft({ extend: isShift });
        return "handled";
      case "n":
        ctrl.moveCursorDown({ extend: isShift });
        return "handled";
      case "p":
        ctrl.moveCursorUp({ extend: isShift });
        return "handled";
      case "d":
        if (!readOnly) ctrl.deleteForward(1);
        return "handled";
      case "h":
        if (!readOnly) ctrl.deleteSelectedOrText(1);
        return "handled";
      case "w":
        if (!readOnly) ctrl.deleteWordLeft();
        return "handled";
      case "y":
        if (!readOnly) ctrl.yankText();
        return "handled";
      case "j":
        if (!readOnly && isMultiline) ctrl.insertText("\n");
        return "handled";
    }
  }

  // Alt bindings
  if (isAlt && !isCtrl) {
    switch (key) {
      case "ArrowLeft":
      case "b":
        ctrl.moveCursorWordBoundary("left", { extend: isShift });
        return "handled";
      case "ArrowRight":
      case "f":
        ctrl.moveCursorWordBoundary("right", { extend: isShift });
        return "handled";
      case "d":
        if (!readOnly) ctrl.deleteWordRight();
        return "handled";
    }
  }

  // Arrow keys
  switch (key) {
    case "ArrowLeft":
      ctrl.moveCursorLeft({ extend: isShift });
      return "handled";
    case "ArrowRight":
      ctrl.moveCursorRight({ extend: isShift });
      return "handled";
    case "ArrowUp":
      ctrl.moveCursorUp({ extend: isShift });
      return "handled";
    case "ArrowDown":
      ctrl.moveCursorDown({ extend: isShift });
      return "handled";
    case "Home":
      ctrl.moveCursorToLineStart({ extend: isShift });
      return "handled";
    case "End":
      ctrl.moveCursorToLineEnd({ extend: isShift });
      return "handled";
  }

  // Printable character insertion
  if (!readOnly && key.length === 1 && !isCtrl) {
    ctrl.insertText(key);
    return "handled";
  }

  return "ignored";
}
