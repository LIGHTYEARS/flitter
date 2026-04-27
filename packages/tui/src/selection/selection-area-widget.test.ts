/**
 * SelectionArea Widget + findSelectableAtPosition 单元测试。
 *
 * 验证:
 * - InheritedSelectionArea.of / maybeOf 查找
 * - findSelectableAtPosition 命中检测
 * - SelectionAreaWidget StatefulWidget 结构
 *
 * @module
 */

import { beforeEach, describe, expect, it, mock } from "bun:test";
import { Clipboard } from "./clipboard.js";
import { type Selectable, SelectionArea } from "./selection-area.js";
import {
  InheritedSelectionArea,
  SelectionAreaWidget,
  SelectionAreaWidgetState,
} from "./selection-area-widget.js";

/** 创建一个 mock Selectable，支持 getOffsetForPosition */
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
    getOffsetForPosition: (localX: number, _localY: number) => {
      return Math.min(Math.floor(localX), text.length);
    },
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

// ════════════════════════════════════════════════════
//  findSelectableAtPosition
// ════════════════════════════════════════════════════

describe("SelectionArea.findSelectableAtPosition", () => {
  let area: SelectionArea;
  let clipboard: Clipboard;

  beforeEach(() => {
    clipboard = new Clipboard();
    // @ts-expect-error override for testing
    clipboard.writeText = mock(async () => true);
    area = new SelectionArea(clipboard);
  });

  it("returns null when no selectables registered", () => {
    const result = area.findSelectableAtPosition(5, 0);
    expect(result).toBeNull();
  });

  it("finds selectable at position within bounds", () => {
    const s = createMockSelectable("s1", "Hello World", { top: 0, left: 0, width: 80, height: 1 });
    area.register(s);

    const result = area.findSelectableAtPosition(5, 0);
    expect(result).not.toBeNull();
    expect(result!.selectableId).toBe("s1");
    expect(result!.offset).toBe(5);
  });

  it("uses getOffsetForPosition when available", () => {
    const s = createMockSelectable("s1", "Hello", { top: 2, left: 10, width: 20, height: 1 });
    area.register(s);

    // Position at global (13, 2) → local (3, 0)
    const result = area.findSelectableAtPosition(13, 2);
    expect(result).not.toBeNull();
    expect(result!.selectableId).toBe("s1");
    expect(result!.offset).toBe(3); // localX = 13 - 10 = 3
  });

  it("returns first selectable for out-of-bounds above", () => {
    const s = createMockSelectable("s1", "Hello", { top: 5, left: 0, width: 80, height: 1 });
    area.register(s);

    // Position above all selectables
    const result = area.findSelectableAtPosition(5, 0);
    expect(result).not.toBeNull();
    expect(result!.selectableId).toBe("s1");
    expect(result!.offset).toBe(0);
  });

  it("returns last selectable for out-of-bounds below", () => {
    const s = createMockSelectable("s1", "Hello", { top: 0, left: 0, width: 80, height: 1 });
    area.register(s);

    // Position below all selectables
    const result = area.findSelectableAtPosition(5, 99);
    expect(result).not.toBeNull();
    expect(result!.selectableId).toBe("s1");
    expect(result!.offset).toBe(5); // text.length
  });

  it("hits correct selectable among multiple", () => {
    const s1 = createMockSelectable("s1", "Line 1", { top: 0, left: 0, width: 80, height: 1 });
    const s2 = createMockSelectable("s2", "Line 2", { top: 1, left: 0, width: 80, height: 1 });
    const s3 = createMockSelectable("s3", "Line 3", { top: 2, left: 0, width: 80, height: 1 });
    area.register(s1);
    area.register(s2);
    area.register(s3);

    const result = area.findSelectableAtPosition(3, 1);
    expect(result).not.toBeNull();
    expect(result!.selectableId).toBe("s2");
    expect(result!.offset).toBe(3);
  });

  it("fallback offset estimation when getOffsetForPosition not available", () => {
    let _highlightStart = -1;
    let _highlightEnd = -1;
    const s: Selectable = {
      id: "s1",
      getText: () => "Hello World",
      getGlobalBounds: () => ({ top: 0, left: 0, width: 80, height: 1 }),
      // No getOffsetForPosition
      setHighlightRange: (start: number, end: number) => {
        _highlightStart = start;
        _highlightEnd = end;
      },
      clearHighlight: () => {
        _highlightStart = -1;
        _highlightEnd = -1;
      },
    };
    area.register(s);

    const result = area.findSelectableAtPosition(5, 0);
    expect(result).not.toBeNull();
    expect(result!.selectableId).toBe("s1");
    // Fallback: row * lineWidth + col, clamped to text.length
    expect(result!.offset).toBe(5);
  });
});

// ════════════════════════════════════════════════════
//  InheritedSelectionArea
// ════════════════════════════════════════════════════

describe("InheritedSelectionArea", () => {
  it("exposes selectionArea from constructor", () => {
    const area = new SelectionArea();
    // Can't fully test of/maybeOf without element tree,
    // but verify the widget stores the controller
    const fakeChild = { key: undefined, canUpdate: () => false, createElement: () => null } as any;
    const widget = new InheritedSelectionArea({ selectionArea: area, child: fakeChild });
    expect(widget.selectionArea).toBe(area);
  });

  it("updateShouldNotify returns true when selectionArea changes", () => {
    const area1 = new SelectionArea();
    const area2 = new SelectionArea();
    const fakeChild = { key: undefined, canUpdate: () => false, createElement: () => null } as any;
    const widget1 = new InheritedSelectionArea({ selectionArea: area1, child: fakeChild });
    const widget2 = new InheritedSelectionArea({ selectionArea: area2, child: fakeChild });
    expect(widget1.updateShouldNotify(widget2)).toBe(true);
  });

  it("updateShouldNotify returns false when same selectionArea", () => {
    const area = new SelectionArea();
    const fakeChild = { key: undefined, canUpdate: () => false, createElement: () => null } as any;
    const widget1 = new InheritedSelectionArea({ selectionArea: area, child: fakeChild });
    const widget2 = new InheritedSelectionArea({ selectionArea: area, child: fakeChild });
    expect(widget1.updateShouldNotify(widget2)).toBe(false);
  });
});

// ════════════════════════════════════════════════════
//  SelectionAreaWidget
// ════════════════════════════════════════════════════

describe("SelectionAreaWidget", () => {
  it("creates a StatefulWidget with correct child", () => {
    const fakeChild = { key: undefined, canUpdate: () => false, createElement: () => null } as any;
    const widget = new SelectionAreaWidget({ child: fakeChild });
    expect(widget.child).toBe(fakeChild);
    expect(widget.enabled).toBe(true);
  });

  it("respects enabled=false", () => {
    const fakeChild = { key: undefined, canUpdate: () => false, createElement: () => null } as any;
    const widget = new SelectionAreaWidget({ child: fakeChild, enabled: false });
    expect(widget.enabled).toBe(false);
  });

  it("createState returns SelectionAreaWidgetState", () => {
    const fakeChild = { key: undefined, canUpdate: () => false, createElement: () => null } as any;
    const widget = new SelectionAreaWidget({ child: fakeChild });
    const state = widget.createState();
    expect(state).toBeInstanceOf(SelectionAreaWidgetState);
  });
});

// ════════════════════════════════════════════════════
//  RenderParagraph — SelectionArea registration
// ════════════════════════════════════════════════════

describe("RenderParagraph — SelectionArea registration (Gap 1)", () => {
  it("_registerWithSelectionArea adds to area", () => {
    const { RenderParagraph } = require("../widgets/rich-text.js");
    const { TextSpan } = require("../widgets/text-span.js");
    const { BoxConstraints } = require("../tree/constraints.js");

    const span = new TextSpan({ text: "Hello World" });
    const rp = new RenderParagraph(span);
    rp.selectable = true;
    rp.layout(BoxConstraints.tight(20, 1));

    const area = new SelectionArea();
    rp._registerWithSelectionArea(area);

    expect(area.getSelectableCount()).toBe(1);
  });

  it("_unregisterFromSelectionArea removes from area", () => {
    const { RenderParagraph } = require("../widgets/rich-text.js");
    const { TextSpan } = require("../widgets/text-span.js");
    const { BoxConstraints } = require("../tree/constraints.js");

    const span = new TextSpan({ text: "Hello World" });
    const rp = new RenderParagraph(span);
    rp.selectable = true;
    rp.layout(BoxConstraints.tight(20, 1));

    const area = new SelectionArea();
    rp._registerWithSelectionArea(area);
    expect(area.getSelectableCount()).toBe(1);

    rp._unregisterFromSelectionArea();
    expect(area.getSelectableCount()).toBe(0);
  });

  it("_asSelectable returns correct text", () => {
    const { RenderParagraph } = require("../widgets/rich-text.js");
    const { TextSpan } = require("../widgets/text-span.js");

    const span = new TextSpan({ text: "Hello World" });
    const rp = new RenderParagraph(span);
    const selectable = rp._asSelectable();

    expect(selectable.getText()).toBe("Hello World");
  });

  it("_asSelectable.getOffsetForPosition delegates to getOffsetAtPosition", () => {
    const { RenderParagraph } = require("../widgets/rich-text.js");
    const { TextSpan } = require("../widgets/text-span.js");
    const { BoxConstraints } = require("../tree/constraints.js");

    const span = new TextSpan({ text: "Hello World" });
    const rp = new RenderParagraph(span);
    rp.layout(BoxConstraints.tight(20, 1));
    const selectable = rp._asSelectable();

    expect(selectable.getOffsetForPosition).toBeDefined();
    const offset = selectable.getOffsetForPosition!(5, 0);
    expect(offset).toBe(5);
  });

  it("setting selectable=false unregisters", () => {
    const { RenderParagraph } = require("../widgets/rich-text.js");
    const { TextSpan } = require("../widgets/text-span.js");
    const { BoxConstraints } = require("../tree/constraints.js");

    const span = new TextSpan({ text: "Hello World" });
    const rp = new RenderParagraph(span);
    rp.selectable = true;
    rp.layout(BoxConstraints.tight(20, 1));

    const area = new SelectionArea();
    rp._registerWithSelectionArea(area);
    expect(area.getSelectableCount()).toBe(1);

    rp.selectable = false;
    expect(area.getSelectableCount()).toBe(0);
  });
});
