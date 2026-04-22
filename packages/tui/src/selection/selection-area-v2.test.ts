/**
 * SelectionArea 双击/三击/自动滚动 — 单元测试
 *
 * 覆盖：点击计数、词选、行选、词边界检测、词级拖选、自动滚动。
 *
 * 逆向: modules/1472_tui_components/actions_intents.js class b1T
 *       modules/2152_unknown_wc.js selectWordAt / getWordBoundariesAt / selectLineAt
 *       modules/1472_tui_components/text_rendering.js wordBoundary / lineBoundary
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { Clipboard } from "./clipboard.js";
import {
  getLineBoundariesAt,
  getWordBoundariesAt,
  isWordBoundaryChar,
  type Selectable,
  SelectionArea,
} from "./selection-area.js";

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

function createMockSelectable(
  id: string,
  text: string,
  bounds: { top: number; left: number; width: number; height: number } = {
    top: 0,
    left: 0,
    width: 80,
    height: 1,
  },
): Selectable & { _getHighlight: () => { start: number; end: number } } {
  let highlightStart = -1;
  let highlightEnd = -1;
  return {
    id,
    getText: () => text,
    getGlobalBounds: () => bounds,
    setHighlightRange: (start: number, end: number) => {
      highlightStart = start;
      highlightEnd = end;
    },
    clearHighlight: () => {
      highlightStart = -1;
      highlightEnd = -1;
    },
    _getHighlight: () => ({ start: highlightStart, end: highlightEnd }),
  };
}

// ────────────────────────────────────────────────────────────────
// isWordBoundaryChar
// ────────────────────────────────────────────────────────────────

describe("isWordBoundaryChar", () => {
  it("should return true for space", () => {
    expect(isWordBoundaryChar(" ")).toBe(true);
  });

  it("should return true for tab", () => {
    expect(isWordBoundaryChar("\t")).toBe(true);
  });

  it("should return true for newline", () => {
    expect(isWordBoundaryChar("\n")).toBe(true);
  });

  it("should return true for common punctuation", () => {
    expect(isWordBoundaryChar(".")).toBe(true);
    expect(isWordBoundaryChar(",")).toBe(true);
    expect(isWordBoundaryChar(";")).toBe(true);
    expect(isWordBoundaryChar("(")).toBe(true);
    expect(isWordBoundaryChar(")")).toBe(true);
    expect(isWordBoundaryChar("{")).toBe(true);
    expect(isWordBoundaryChar("}")).toBe(true);
    expect(isWordBoundaryChar("/")).toBe(true);
    expect(isWordBoundaryChar("\\")).toBe(true);
    expect(isWordBoundaryChar("_")).toBe(true);
  });

  it("should return false for alphanumeric characters", () => {
    expect(isWordBoundaryChar("a")).toBe(false);
    expect(isWordBoundaryChar("Z")).toBe(false);
    expect(isWordBoundaryChar("5")).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────
// getWordBoundariesAt
// ────────────────────────────────────────────────────────────────

describe("getWordBoundariesAt", () => {
  it("should select word when cursor is inside a word", () => {
    const result = getWordBoundariesAt("hello world", 3); // inside "hello"
    expect(result).toEqual({ start: 0, end: 5 });
  });

  it("should return collapsed when cursor is on whitespace", () => {
    const result = getWordBoundariesAt("hello world", 5); // on space
    expect(result).toEqual({ start: 5, end: 5 });
  });

  it("should select word at start of text", () => {
    const result = getWordBoundariesAt("hello world", 0);
    expect(result).toEqual({ start: 0, end: 5 });
  });

  it("should select word at end of text", () => {
    const result = getWordBoundariesAt("hello world", 11); // offset = length
    expect(result).toEqual({ start: 6, end: 11 });
  });

  it("should handle single-character word", () => {
    const result = getWordBoundariesAt("a b", 0);
    expect(result).toEqual({ start: 0, end: 1 });
  });

  it("should return collapsed on punctuation (amp behavior: boundary char → no selection)", () => {
    const result = getWordBoundariesAt("foo.bar", 3); // on "."
    expect(result).toEqual({ start: 3, end: 3 });
  });

  it("should select entire text when single word with no boundaries", () => {
    const result = getWordBoundariesAt("hello", 2);
    expect(result).toEqual({ start: 0, end: 5 });
  });

  it("should handle empty string", () => {
    const result = getWordBoundariesAt("", 0);
    expect(result).toEqual({ start: 0, end: 0 });
  });

  it("should clamp offset to valid range", () => {
    const result = getWordBoundariesAt("hello", 100);
    // Clamped to 5 (length), which is not a boundary char position, expand backwards
    expect(result.start).toBeGreaterThanOrEqual(0);
    expect(result.end).toBeLessThanOrEqual(5);
  });
});

// ────────────────────────────────────────────────────────────────
// getLineBoundariesAt
// ────────────────────────────────────────────────────────────────

describe("getLineBoundariesAt", () => {
  it("should select entire text when single line", () => {
    const result = getLineBoundariesAt("hello world", 5);
    expect(result).toEqual({ start: 0, end: 11 });
  });

  it("should select first line when cursor is at start", () => {
    const result = getLineBoundariesAt("first\nsecond\nthird", 2);
    expect(result).toEqual({ start: 0, end: 5 });
  });

  it("should select middle line", () => {
    const result = getLineBoundariesAt("first\nsecond\nthird", 8); // inside "second"
    expect(result).toEqual({ start: 6, end: 12 });
  });

  it("should select last line", () => {
    const result = getLineBoundariesAt("first\nsecond\nthird", 16); // inside "third"
    expect(result).toEqual({ start: 13, end: 18 });
  });

  it("should handle cursor at newline", () => {
    const result = getLineBoundariesAt("first\nsecond", 5); // ON the \n
    // Should be treated as end of first line
    expect(result.start).toBe(0);
    expect(result.end).toBe(5);
  });

  it("should handle empty string", () => {
    const result = getLineBoundariesAt("", 0);
    expect(result).toEqual({ start: 0, end: 0 });
  });

  it("should handle offset at start of text", () => {
    const result = getLineBoundariesAt("hello\nworld", 0);
    expect(result).toEqual({ start: 0, end: 5 });
  });

  it("should handle offset at end of text", () => {
    const result = getLineBoundariesAt("hello\nworld", 11);
    expect(result).toEqual({ start: 6, end: 11 });
  });
});

// ────────────────────────────────────────────────────────────────
// SelectionArea — recordClick (click count)
// ────────────────────────────────────────────────────────────────

describe("SelectionArea.recordClick", () => {
  let area: SelectionArea;

  beforeEach(() => {
    area = new SelectionArea(new Clipboard());
  });

  afterEach(() => {
    area.dispose();
  });

  it("should return 1 on first click", () => {
    expect(area.recordClick(10, 5, 1000)).toBe(1);
  });

  it("should return 2 on second rapid click at same position", () => {
    area.recordClick(10, 5, 1000);
    expect(area.recordClick(10, 5, 1200)).toBe(2);
  });

  it("should return 3 on third rapid click at same position", () => {
    area.recordClick(10, 5, 1000);
    area.recordClick(10, 5, 1200);
    expect(area.recordClick(10, 5, 1400)).toBe(3);
  });

  it("should cap at 3 (no quadruple-click)", () => {
    area.recordClick(10, 5, 1000);
    area.recordClick(10, 5, 1100);
    area.recordClick(10, 5, 1200);
    // Fourth rapid click → still 3
    expect(area.recordClick(10, 5, 1300)).toBe(3);
  });

  it("should reset to 1 after 500ms timeout", () => {
    area.recordClick(10, 5, 1000);
    area.recordClick(10, 5, 1200);
    // More than 500ms later
    expect(area.recordClick(10, 5, 2000)).toBe(1);
  });

  it("should reset to 1 when position changes", () => {
    area.recordClick(10, 5, 1000);
    area.recordClick(10, 5, 1200);
    // Different position
    expect(area.recordClick(20, 5, 1300)).toBe(1);
  });

  it("should reset to 1 when y position changes", () => {
    area.recordClick(10, 5, 1000);
    expect(area.recordClick(10, 6, 1100)).toBe(1);
  });

  it("getClickCount should return current count", () => {
    area.recordClick(10, 5, 1000);
    area.recordClick(10, 5, 1100);
    expect(area.getClickCount()).toBe(2);
  });

  it("resetClickCount should reset to 0", () => {
    area.recordClick(10, 5, 1000);
    area.recordClick(10, 5, 1100);
    area.resetClickCount();
    expect(area.getClickCount()).toBe(0);
  });
});

// ────────────────────────────────────────────────────────────────
// SelectionArea — selectWordAt
// ────────────────────────────────────────────────────────────────

describe("SelectionArea.selectWordAt", () => {
  let area: SelectionArea;
  let clipboard: Clipboard;

  beforeEach(() => {
    clipboard = new Clipboard();
    // @ts-expect-error override for testing
    clipboard.writeText = mock(async () => true);
    area = new SelectionArea(clipboard);
  });

  afterEach(() => {
    area.dispose();
  });

  it("should select word at offset inside word", () => {
    const s = createMockSelectable("s1", "hello world");
    area.register(s);

    area.selectWordAt("s1", 3); // inside "hello"

    const sel = area.getSelection();
    expect(sel).not.toBeNull();
    expect(sel!.anchor.offset).toBe(0);
    expect(sel!.extent.offset).toBe(5);
  });

  it("should select second word", () => {
    const s = createMockSelectable("s1", "hello world");
    area.register(s);

    area.selectWordAt("s1", 7); // inside "world"

    const sel = area.getSelection();
    expect(sel).not.toBeNull();
    expect(sel!.anchor.offset).toBe(6);
    expect(sel!.extent.offset).toBe(11);
  });

  it("should collapse selection when clicking on boundary char (whitespace)", () => {
    const s = createMockSelectable("s1", "hello world");
    area.register(s);

    area.selectWordAt("s1", 5); // on space

    const sel = area.getSelection();
    expect(sel).not.toBeNull();
    expect(sel!.anchor.offset).toBe(sel!.extent.offset); // collapsed
  });

  it("should handle selectWordAt at start of text", () => {
    const s = createMockSelectable("s1", "hello");
    area.register(s);

    area.selectWordAt("s1", 0);

    const sel = area.getSelection();
    expect(sel!.anchor.offset).toBe(0);
    expect(sel!.extent.offset).toBe(5);
  });

  it("should handle selectWordAt at end of text", () => {
    const s = createMockSelectable("s1", "hello");
    area.register(s);

    area.selectWordAt("s1", 5); // offset == length

    // At end of text, "hello" ends at 5, clamped position not a boundary, expand left
    const sel = area.getSelection();
    expect(sel).not.toBeNull();
  });

  it("should do nothing for unregistered selectableId", () => {
    area.selectWordAt("nonexistent", 3);
    expect(area.getSelection()).toBeNull();
  });

  it("should use selectable's own wordBoundary if provided", () => {
    const custom: Selectable = {
      id: "custom",
      getText: () => "foo bar",
      getGlobalBounds: () => ({ top: 0, left: 0, width: 80, height: 1 }),
      setHighlightRange: mock(() => {}),
      clearHighlight: mock(() => {}),
      wordBoundary: (_offset: number) => ({ start: 1, end: 3 }), // always return [1,3]
    };
    area.register(custom);

    area.selectWordAt("custom", 0);

    const sel = area.getSelection();
    expect(sel!.anchor.offset).toBe(1);
    expect(sel!.extent.offset).toBe(3);
  });
});

// ────────────────────────────────────────────────────────────────
// SelectionArea — getWordBoundariesAt
// ────────────────────────────────────────────────────────────────

describe("SelectionArea.getWordBoundariesAt", () => {
  let area: SelectionArea;

  beforeEach(() => {
    area = new SelectionArea(new Clipboard());
  });

  afterEach(() => {
    area.dispose();
  });

  it("should return word boundaries without modifying selection", () => {
    const s = createMockSelectable("s1", "hello world");
    area.register(s);

    const bounds = area.getWordBoundariesAt("s1", 3);
    expect(bounds).toEqual({ start: 0, end: 5 });
    // Selection not modified
    expect(area.getSelection()).toBeNull();
  });

  it("should return collapsed range for boundary char", () => {
    const s = createMockSelectable("s1", "hello world");
    area.register(s);

    const bounds = area.getWordBoundariesAt("s1", 5); // space
    expect(bounds.start).toBe(bounds.end);
  });

  it("should return {offset, offset} for unregistered id", () => {
    const bounds = area.getWordBoundariesAt("nonexistent", 5);
    expect(bounds).toEqual({ start: 5, end: 5 });
  });
});

// ────────────────────────────────────────────────────────────────
// SelectionArea — selectLineAt
// ────────────────────────────────────────────────────────────────

describe("SelectionArea.selectLineAt", () => {
  let area: SelectionArea;

  beforeEach(() => {
    area = new SelectionArea(new Clipboard());
  });

  afterEach(() => {
    area.dispose();
  });

  it("should select entire line in single-line text", () => {
    const s = createMockSelectable("s1", "hello world");
    area.register(s);

    area.selectLineAt("s1", 5);

    const sel = area.getSelection();
    expect(sel!.anchor.offset).toBe(0);
    expect(sel!.extent.offset).toBe(11);
  });

  it("should select first line in multiline text", () => {
    const s = createMockSelectable("s1", "first\nsecond\nthird");
    area.register(s);

    area.selectLineAt("s1", 2);

    const sel = area.getSelection();
    expect(sel!.anchor.offset).toBe(0);
    expect(sel!.extent.offset).toBe(5);
  });

  it("should select middle line", () => {
    const s = createMockSelectable("s1", "first\nsecond\nthird");
    area.register(s);

    area.selectLineAt("s1", 8);

    const sel = area.getSelection();
    expect(sel!.anchor.offset).toBe(6);
    expect(sel!.extent.offset).toBe(12);
  });

  it("should select last line", () => {
    const s = createMockSelectable("s1", "first\nsecond\nthird");
    area.register(s);

    area.selectLineAt("s1", 16);

    const sel = area.getSelection();
    expect(sel!.anchor.offset).toBe(13);
    expect(sel!.extent.offset).toBe(18);
  });

  it("should do nothing for unregistered selectableId", () => {
    area.selectLineAt("nonexistent", 0);
    expect(area.getSelection()).toBeNull();
  });

  it("should use selectable's own lineBoundary if provided", () => {
    const custom: Selectable = {
      id: "custom",
      getText: () => "line one\nline two",
      getGlobalBounds: () => ({ top: 0, left: 0, width: 80, height: 2 }),
      setHighlightRange: mock(() => {}),
      clearHighlight: mock(() => {}),
      lineBoundary: (_offset: number) => ({ start: 0, end: 8 }), // always first line
    };
    area.register(custom);

    area.selectLineAt("custom", 12);

    const sel = area.getSelection();
    expect(sel!.anchor.offset).toBe(0);
    expect(sel!.extent.offset).toBe(8);
  });
});

// ────────────────────────────────────────────────────────────────
// SelectionArea — beginWordDrag / updateWordDrag / endWordDrag
// ────────────────────────────────────────────────────────────────

describe("SelectionArea word drag", () => {
  let area: SelectionArea;
  let clipboard: Clipboard;

  beforeEach(() => {
    clipboard = new Clipboard();
    // @ts-expect-error override for testing
    clipboard.writeText = mock(async () => true);
    area = new SelectionArea(clipboard);
  });

  afterEach(() => {
    area.dispose();
  });

  it("beginWordDrag should select initial word", () => {
    const s = createMockSelectable("s1", "hello world");
    area.register(s);

    area.beginWordDrag("s1", 3); // inside "hello"

    expect(area.isWordDragging()).toBe(true);
    const sel = area.getSelection();
    expect(sel!.anchor.offset).toBe(0);
    expect(sel!.extent.offset).toBe(5);
  });

  it("beginWordDrag on boundary should not enter word drag mode", () => {
    const s = createMockSelectable("s1", "hello world");
    area.register(s);

    area.beginWordDrag("s1", 5); // on space — boundary → collapsed

    expect(area.isWordDragging()).toBe(false);
  });

  it("updateWordDrag extending right should expand selection", () => {
    const s = createMockSelectable("s1", "hello world");
    area.register(s);

    area.beginWordDrag("s1", 3); // "hello"
    area.updateWordDrag("s1", 8); // "world"

    const sel = area.getSelection();
    expect(sel!.anchor.offset).toBe(0); // start of "hello"
    expect(sel!.extent.offset).toBe(11); // end of "world"
  });

  it("updateWordDrag extending left should expand selection", () => {
    const s = createMockSelectable("s1", "foo bar baz");
    area.register(s);

    area.beginWordDrag("s1", 5); // "bar"
    area.updateWordDrag("s1", 1); // "foo"

    const sel = area.getSelection();
    expect(sel!.anchor.offset).toBe(0); // start of "foo"
    expect(sel!.extent.offset).toBe(7); // end of "bar"
  });

  it("endWordDrag after move should auto-copy", async () => {
    const s = createMockSelectable("s1", "hello world");
    area.register(s);

    area.beginWordDrag("s1", 3);
    area.updateWordDrag("s1", 8);
    await area.endWordDrag();

    // @ts-expect-error mock
    expect(clipboard.writeText).toHaveBeenCalled();
    expect(area.isWordDragging()).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────
// SelectionArea — autoCopySelection
// ────────────────────────────────────────────────────────────────

describe("SelectionArea.autoCopySelection", () => {
  it("should copy selected text to clipboard", async () => {
    const clipboard = new Clipboard();
    // @ts-expect-error override for testing
    clipboard.writeText = mock(async () => true);
    const area = new SelectionArea(clipboard);

    const s = createMockSelectable("s1", "hello world");
    area.register(s);
    area.setSelection({ selectableId: "s1", offset: 0 }, { selectableId: "s1", offset: 5 });

    await area.autoCopySelection();

    // @ts-expect-error mock
    expect(clipboard.writeText).toHaveBeenCalledWith("hello");
    area.dispose();
  });

  it("should not throw when no selection", async () => {
    const area = new SelectionArea(new Clipboard());
    await expect(area.autoCopySelection()).resolves.toBeUndefined();
    area.dispose();
  });
});

// ────────────────────────────────────────────────────────────────
// SelectionArea — updateAutoScroll / stopAutoScroll
// ────────────────────────────────────────────────────────────────

describe("SelectionArea auto-scroll", () => {
  it("should trigger scroll up when mouseY <= top + threshold", () => {
    const scrollUp = mock((_step: number) => {});
    const scrollDown = mock((_step: number) => {});

    const area = new SelectionArea(new Clipboard());
    area.setAutoScrollConfig({
      threshold: 1,
      step: 1,
      intervalMs: 10,
      getScrollBounds: () => ({ top: 0, bottom: 24 }),
      scrollUp,
      scrollDown,
    });

    // Mouse at y=0, which is <= top(0) + threshold(1)
    area.updateAutoScroll(0);

    // Let the interval fire at least once
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(scrollUp).toHaveBeenCalled();
        expect(scrollDown).not.toHaveBeenCalled();
        area.stopAutoScroll();
        area.dispose();
        resolve();
      }, 50);
    });
  });

  it("should trigger scroll down when mouseY >= bottom - threshold", () => {
    const scrollUp = mock((_step: number) => {});
    const scrollDown = mock((_step: number) => {});

    const area = new SelectionArea(new Clipboard());
    area.setAutoScrollConfig({
      threshold: 1,
      step: 1,
      intervalMs: 10,
      getScrollBounds: () => ({ top: 0, bottom: 24 }),
      scrollUp,
      scrollDown,
    });

    // Mouse at y=24, which is >= bottom(24) - threshold(1)
    area.updateAutoScroll(24);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(scrollDown).toHaveBeenCalled();
        expect(scrollUp).not.toHaveBeenCalled();
        area.stopAutoScroll();
        area.dispose();
        resolve();
      }, 50);
    });
  });

  it("should not scroll when mouseY is in the middle", () => {
    const scrollUp = mock((_step: number) => {});
    const scrollDown = mock((_step: number) => {});

    const area = new SelectionArea(new Clipboard());
    area.setAutoScrollConfig({
      threshold: 1,
      step: 1,
      intervalMs: 10,
      getScrollBounds: () => ({ top: 0, bottom: 24 }),
      scrollUp,
      scrollDown,
    });

    area.updateAutoScroll(12); // middle of viewport

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(scrollUp).not.toHaveBeenCalled();
        expect(scrollDown).not.toHaveBeenCalled();
        area.stopAutoScroll();
        area.dispose();
        resolve();
      }, 50);
    });
  });

  it("should stop auto-scroll when config is cleared", () => {
    const scrollDown = mock((_step: number) => {});

    const area = new SelectionArea(new Clipboard());
    area.setAutoScrollConfig({
      threshold: 1,
      step: 1,
      intervalMs: 10,
      getScrollBounds: () => ({ top: 0, bottom: 24 }),
      scrollUp: () => {},
      scrollDown,
    });

    area.updateAutoScroll(24); // start scrolling down
    area.setAutoScrollConfig(null); // disable → should stop

    return new Promise<void>((resolve) => {
      // Record call count after a short time with no config
      setTimeout(() => {
        const callCount = (scrollDown as ReturnType<typeof mock>).mock.calls.length;
        // Should have stopped: count should not increase further
        setTimeout(() => {
          const newCount = (scrollDown as ReturnType<typeof mock>).mock.calls.length;
          expect(newCount).toBe(callCount);
          area.dispose();
          resolve();
        }, 30);
      }, 15);
    });
  });
});

// ────────────────────────────────────────────────────────────────
// SelectionArea — dispose
// ────────────────────────────────────────────────────────────────

describe("SelectionArea.dispose", () => {
  it("should not throw when disposed multiple times", () => {
    const area = new SelectionArea(new Clipboard());
    expect(() => {
      area.dispose();
      area.dispose();
    }).not.toThrow();
  });

  it("should clear timers on dispose", () => {
    const area = new SelectionArea(new Clipboard());
    const s = createMockSelectable("s1", "hello world");
    area.register(s);

    // Start a word drag (which sets doubleClickTimer)
    area.beginWordDrag("s1", 3);

    // Should not throw even with active timer
    expect(() => area.dispose()).not.toThrow();
  });
});
