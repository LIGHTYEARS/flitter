/**
 * SelectionArea 跨 Widget 文本选区管理 - 单元测试
 *
 * 验证 SelectionArea 的注册/取消、拖选操作、全选、复制等核心功能。
 *
 * @module
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import {
  SelectionArea,
  type Selectable,
  type SelectionPosition,
} from "./selection-area.js";
import { Clipboard } from "./clipboard.js";

/** 创建一个 mock Selectable */
function createMockSelectable(
  id: string,
  text: string,
  bounds: { top: number; left: number; width: number; height: number } = { top: 0, left: 0, width: 80, height: 1 }
): Selectable {
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
  } as Selectable & { _getHighlight: () => { start: number; end: number } };
}

describe("SelectionArea", () => {
  let area: SelectionArea;
  let clipboard: Clipboard;

  beforeEach(() => {
    clipboard = new Clipboard();
    // Mock clipboard to avoid actual system calls
    // @ts-expect-error override for testing
    clipboard.writeText = mock(async () => true);
    area = new SelectionArea(clipboard);
  });

  describe("register / unregister", () => {
    it("should register a selectable", () => {
      const s = createMockSelectable("s1", "hello");
      area.register(s);
      // Registered selectable should be retrievable
      expect(area.getSelectableCount()).toBe(1);
    });

    it("should unregister a selectable", () => {
      const s = createMockSelectable("s1", "hello");
      area.register(s);
      area.unregister("s1");
      expect(area.getSelectableCount()).toBe(0);
    });

    it("should handle unregister of non-existent id gracefully", () => {
      expect(() => area.unregister("nonexistent")).not.toThrow();
    });
  });

  describe("beginDrag → updateDrag → endDrag", () => {
    it("should create a selection via drag", () => {
      const s = createMockSelectable("s1", "hello world");
      area.register(s);

      area.beginDrag({ selectableId: "s1", offset: 0 });
      expect(area.isDragging()).toBe(true);

      area.updateDrag({ selectableId: "s1", offset: 5 });

      const sel = area.getSelection();
      expect(sel).not.toBeNull();
      expect(sel!.anchor.selectableId).toBe("s1");
      expect(sel!.anchor.offset).toBe(0);
      expect(sel!.extent.selectableId).toBe("s1");
      expect(sel!.extent.offset).toBe(5);
    });

    it("should set isDragging to false after endDrag", async () => {
      const s = createMockSelectable("s1", "hello");
      area.register(s);

      area.beginDrag({ selectableId: "s1", offset: 0 });
      area.updateDrag({ selectableId: "s1", offset: 3 });
      await area.endDrag();

      expect(area.isDragging()).toBe(false);
    });

    it("should auto-copy to clipboard on endDrag", async () => {
      const s = createMockSelectable("s1", "hello world");
      area.register(s);

      area.beginDrag({ selectableId: "s1", offset: 0 });
      area.updateDrag({ selectableId: "s1", offset: 5 });
      await area.endDrag();

      // @ts-expect-error mock
      expect(clipboard.writeText).toHaveBeenCalled();
    });

    it("should not update selection if not dragging", () => {
      const s = createMockSelectable("s1", "hello");
      area.register(s);
      // updateDrag without beginDrag should be a no-op
      area.updateDrag({ selectableId: "s1", offset: 3 });
      expect(area.getSelection()).toBeNull();
    });
  });

  describe("selectAll", () => {
    it("should select all content of all selectables", () => {
      const s1 = createMockSelectable("s1", "hello", { top: 0, left: 0, width: 80, height: 1 });
      const s2 = createMockSelectable("s2", "world", { top: 1, left: 0, width: 80, height: 1 });
      area.register(s1);
      area.register(s2);

      area.selectAll();

      const sel = area.getSelection();
      expect(sel).not.toBeNull();
      // Should span from first selectable start to last selectable end
      expect(sel!.anchor.offset).toBe(0);
    });

    it("should do nothing when no selectables registered", () => {
      area.selectAll();
      expect(area.getSelection()).toBeNull();
    });
  });

  describe("copySelection", () => {
    it("should return selected text within single selectable", () => {
      const s = createMockSelectable("s1", "hello world");
      area.register(s);

      area.setSelection(
        { selectableId: "s1", offset: 0 },
        { selectableId: "s1", offset: 5 }
      );

      const text = area.copySelection();
      expect(text).toBe("hello");
    });

    it("should return concatenated text across multiple selectables", () => {
      const s1 = createMockSelectable("s1", "hello", { top: 0, left: 0, width: 80, height: 1 });
      const s2 = createMockSelectable("s2", "world", { top: 1, left: 0, width: 80, height: 1 });
      area.register(s1);
      area.register(s2);

      area.setSelection(
        { selectableId: "s1", offset: 0 },
        { selectableId: "s2", offset: 5 }
      );

      const text = area.copySelection();
      // Cross-selectable: all of s1 + all of s2
      expect(text).toContain("hello");
      expect(text).toContain("world");
    });

    it("should return empty string when no selection", () => {
      const text = area.copySelection();
      expect(text).toBe("");
    });
  });

  describe("clear", () => {
    it("should clear the selection", () => {
      const s = createMockSelectable("s1", "hello");
      area.register(s);

      area.setSelection(
        { selectableId: "s1", offset: 0 },
        { selectableId: "s1", offset: 3 }
      );
      expect(area.getSelection()).not.toBeNull();

      area.clear();
      expect(area.getSelection()).toBeNull();
    });
  });

  describe("copyToClipboard", () => {
    it("should write selected text to clipboard and return true", async () => {
      const s = createMockSelectable("s1", "hello");
      area.register(s);
      area.setSelection(
        { selectableId: "s1", offset: 0 },
        { selectableId: "s1", offset: 5 }
      );

      const result = await area.copyToClipboard();
      expect(result).toBe(true);
    });

    it("should return false when no selection", async () => {
      const result = await area.copyToClipboard();
      expect(result).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle operations safely with empty selectables", () => {
      expect(() => area.clear()).not.toThrow();
      expect(() => area.selectAll()).not.toThrow();
      expect(area.copySelection()).toBe("");
      expect(area.getSelection()).toBeNull();
    });

    it("should handle drag on unregistered selectable gracefully", () => {
      area.beginDrag({ selectableId: "unknown", offset: 0 });
      area.updateDrag({ selectableId: "unknown", offset: 5 });
      // Should still create a selection entry but copySelection may return empty
      expect(area.isDragging()).toBe(true);
    });

    it("should maintain ordered cache by document position", () => {
      const s1 = createMockSelectable("s1", "first", { top: 2, left: 0, width: 80, height: 1 });
      const s2 = createMockSelectable("s2", "second", { top: 0, left: 0, width: 80, height: 1 });
      area.register(s1);
      area.register(s2);

      // selectAll should respect document order (top to bottom)
      area.selectAll();
      const sel = area.getSelection();
      expect(sel).not.toBeNull();
      // anchor should be in the top-most selectable (s2)
      expect(sel!.anchor.selectableId).toBe("s2");
    });
  });
});
