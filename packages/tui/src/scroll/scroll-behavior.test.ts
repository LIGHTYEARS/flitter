/**
 * ScrollBehavior 单元测试。
 *
 * 验证 amp P1T 对齐的键绑定行为：
 * - vertical: ArrowUp/k, ArrowDown/j, PageUp/Ctrl+u, PageDown/Ctrl+d, Home/g, End/G
 * - horizontal: ArrowLeft/h, ArrowRight/l, Home/g, End/G
 * - ArrowUp/ArrowDown 有 maxScrollExtent 守卫，k/j 没有
 *
 * @module
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { KeyEvent } from "../vt/types.js";
import { ScrollBehavior } from "./scroll-behavior.js";
import { ScrollController } from "./scroll-controller.js";

// ════════════════════════════════════════════════════
//  辅助工具
// ════════════════════════════════════════════════════

function makeKeyEvent(key: string, mods: Partial<KeyEvent["modifiers"]> = {}): KeyEvent {
  return {
    type: "key",
    key,
    modifiers: {
      shift: false,
      ctrl: false,
      alt: false,
      meta: false,
      ...mods,
    },
  };
}

// ════════════════════════════════════════════════════
//  Vertical 键绑定 (amp P1T alignment)
// ════════════════════════════════════════════════════

describe("ScrollBehavior — vertical key bindings (amp P1T alignment)", () => {
  let controller: ScrollController;
  let behavior: ScrollBehavior;

  beforeEach(() => {
    controller = new ScrollController();
    controller.disableFollowMode();
    controller.updateMaxScrollExtent(100);
    behavior = new ScrollBehavior(controller, {
      scrollStep: 3,
      pageScrollStep: 10,
    });
  });

  afterEach(() => {
    controller.dispose();
  });

  it("ArrowDown scrolls down by step", () => {
    const result = behavior.handleKeyEvent(makeKeyEvent("ArrowDown"));
    assert.equal(result, "handled");
    assert.equal(controller.offset, 3);
  });

  it("j scrolls down (vim)", () => {
    behavior.handleKeyEvent(makeKeyEvent("j"));
    assert.equal(controller.offset, 3);
  });

  it("ArrowUp scrolls up by step", () => {
    controller.jumpTo(10);
    const result = behavior.handleKeyEvent(makeKeyEvent("ArrowUp"));
    assert.equal(result, "handled");
    assert.equal(controller.offset, 7);
  });

  it("k scrolls up (vim)", () => {
    controller.jumpTo(10);
    behavior.handleKeyEvent(makeKeyEvent("k"));
    assert.equal(controller.offset, 7);
  });

  it("PageDown scrolls down by page step", () => {
    behavior.handleKeyEvent(makeKeyEvent("PageDown"));
    assert.equal(controller.offset, 10);
  });

  it("PageUp scrolls up by page step", () => {
    controller.jumpTo(50);
    behavior.handleKeyEvent(makeKeyEvent("PageUp"));
    assert.equal(controller.offset, 40);
  });

  it("Ctrl+d scrolls down by page step", () => {
    const result = behavior.handleKeyEvent(makeKeyEvent("d", { ctrl: true }));
    assert.equal(result, "handled");
    assert.equal(controller.offset, 10);
  });

  it("Ctrl+u scrolls up by page step", () => {
    controller.jumpTo(50);
    const result = behavior.handleKeyEvent(makeKeyEvent("u", { ctrl: true }));
    assert.equal(result, "handled");
    assert.equal(controller.offset, 40);
  });

  it("Home scrolls to top", () => {
    controller.jumpTo(50);
    const result = behavior.handleKeyEvent(makeKeyEvent("Home"));
    assert.equal(result, "handled");
    assert.equal(controller.offset, 0);
  });

  it("End scrolls to bottom", () => {
    const result = behavior.handleKeyEvent(makeKeyEvent("End"));
    assert.equal(result, "handled");
    assert.equal(controller.offset, 100);
  });

  it("g scrolls to top", () => {
    controller.jumpTo(50);
    behavior.handleKeyEvent(makeKeyEvent("g"));
    assert.equal(controller.offset, 0);
  });

  it("G (shift+g) scrolls to bottom", () => {
    behavior.handleKeyEvent(makeKeyEvent("g", { shift: true }));
    assert.equal(controller.offset, 100);
  });

  it("returns ignored for unrecognized keys", () => {
    const result = behavior.handleKeyEvent(makeKeyEvent("x"));
    assert.equal(result, "ignored");
  });

  // ────────────────────────────────────────────────
  //  amp P1T 细节: ArrowUp/ArrowDown 有 maxScrollExtent 守卫
  // ────────────────────────────────────────────────

  it("ArrowDown is ignored when maxScrollExtent is 0", () => {
    controller.updateMaxScrollExtent(0);
    const result = behavior.handleKeyEvent(makeKeyEvent("ArrowDown"));
    assert.equal(result, "ignored");
  });

  it("ArrowUp is ignored when maxScrollExtent is 0", () => {
    controller.updateMaxScrollExtent(0);
    const result = behavior.handleKeyEvent(makeKeyEvent("ArrowUp"));
    assert.equal(result, "ignored");
  });

  // 逆向: amp P1T — k/j do NOT have the maxScrollExtent guard
  it("j is handled even when maxScrollExtent is 0", () => {
    controller.updateMaxScrollExtent(0);
    const result = behavior.handleKeyEvent(makeKeyEvent("j"));
    assert.equal(result, "handled");
  });

  it("k is handled even when maxScrollExtent is 0", () => {
    controller.updateMaxScrollExtent(0);
    const result = behavior.handleKeyEvent(makeKeyEvent("k"));
    assert.equal(result, "handled");
  });

  // d/u without ctrl should not trigger
  it("d without ctrl returns ignored", () => {
    const result = behavior.handleKeyEvent(makeKeyEvent("d"));
    assert.equal(result, "ignored");
  });

  it("u without ctrl returns ignored", () => {
    const result = behavior.handleKeyEvent(makeKeyEvent("u"));
    assert.equal(result, "ignored");
  });
});

// ════════════════════════════════════════════════════
//  Horizontal 键绑定 (amp P1T alignment)
// ════════════════════════════════════════════════════

describe("ScrollBehavior — horizontal key bindings (amp P1T alignment)", () => {
  let controller: ScrollController;
  let behavior: ScrollBehavior;

  beforeEach(() => {
    controller = new ScrollController();
    controller.disableFollowMode();
    controller.updateMaxScrollExtent(100);
    behavior = new ScrollBehavior(controller, {
      scrollStep: 3,
      pageScrollStep: 10,
      axisDirection: "horizontal",
    });
  });

  afterEach(() => {
    controller.dispose();
  });

  it("ArrowRight scrolls right by step", () => {
    const result = behavior.handleKeyEvent(makeKeyEvent("ArrowRight"));
    assert.equal(result, "handled");
    assert.equal(controller.offset, 3);
  });

  it("ArrowLeft scrolls left by step", () => {
    controller.jumpTo(10);
    const result = behavior.handleKeyEvent(makeKeyEvent("ArrowLeft"));
    assert.equal(result, "handled");
    assert.equal(controller.offset, 7);
  });

  it("l scrolls right (vim)", () => {
    behavior.handleKeyEvent(makeKeyEvent("l"));
    assert.equal(controller.offset, 3);
  });

  it("h scrolls left (vim)", () => {
    controller.jumpTo(10);
    behavior.handleKeyEvent(makeKeyEvent("h"));
    assert.equal(controller.offset, 7);
  });

  it("Home scrolls to left edge", () => {
    controller.jumpTo(50);
    behavior.handleKeyEvent(makeKeyEvent("Home"));
    assert.equal(controller.offset, 0);
  });

  it("End scrolls to right edge", () => {
    behavior.handleKeyEvent(makeKeyEvent("End"));
    assert.equal(controller.offset, 100);
  });

  it("g scrolls to left edge", () => {
    controller.jumpTo(50);
    behavior.handleKeyEvent(makeKeyEvent("g"));
    assert.equal(controller.offset, 0);
  });

  it("G (shift+g) scrolls to right edge", () => {
    behavior.handleKeyEvent(makeKeyEvent("g", { shift: true }));
    assert.equal(controller.offset, 100);
  });

  it("vertical keys are ignored in horizontal mode", () => {
    assert.equal(behavior.handleKeyEvent(makeKeyEvent("ArrowUp")), "ignored");
    assert.equal(behavior.handleKeyEvent(makeKeyEvent("ArrowDown")), "ignored");
    assert.equal(behavior.handleKeyEvent(makeKeyEvent("j")), "ignored");
    assert.equal(behavior.handleKeyEvent(makeKeyEvent("k")), "ignored");
  });
});
