/**
 * MouseRegion + MouseManager 集成测试。
 *
 * 验证完整的鼠标事件管线:
 * MouseManager.handleMouseEvent → HitTest → RenderMouseRegion.handleMouseEvent → callbacks
 *
 * 覆盖: click/tap 计数、enter/exit 状态变化、drag 事件流
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { MouseManager } from "../gestures/mouse-manager.js";
import { RenderBox } from "../tree/render-box.js";
import type { MouseEvent as TermMouseEvent } from "../vt/types.js";
import type { MouseEvent as WidgetMouseEvent } from "./mouse-region.js";
import { RenderMouseRegion } from "./mouse-region.js";

// ════════════════════════════════════════════════════
//  测试用 RenderBox (容器)
// ════════════════════════════════════════════════════

class TestContainer extends RenderBox {
  performLayout(): void {
    const constraints = this._lastConstraints!;
    for (const child of this._children) {
      if (child instanceof RenderBox) {
        child.layout(constraints);
      }
    }
    this.setSize(constraints.maxWidth, constraints.maxHeight);
  }
}

// ════════════════════════════════════════════════════
//  辅助函数
// ════════════════════════════════════════════════════

function makeMouseEvent(
  x: number,
  y: number,
  action: "press" | "release" | "move" | "wheel_up" | "wheel_down",
  button: "left" | "middle" | "right" | "none" = "left",
): TermMouseEvent {
  return {
    type: "mouse",
    x,
    y,
    button,
    action,
    modifiers: { shift: false, ctrl: false, alt: false, meta: false },
  };
}

describe("MouseRegion integration with MouseManager", () => {
  let mm: MouseManager;

  beforeEach(() => {
    MouseManager.instance.dispose();
    mm = MouseManager.instance;
  });

  afterEach(() => {
    mm.dispose();
  });

  // ════════════════════════════════════════════════════
  //  click 回调触发
  // ════════════════════════════════════════════════════

  test("press 事件触发 RenderMouseRegion.onClick 回调", () => {
    // 构建: root(80x24@0,0) > mouseRegion(20x5@10,5)
    const root = new TestContainer();
    root.setOffset(0, 0);
    root.setSize(80, 24);

    const region = new RenderMouseRegion({
      onClick: null,
      onEnter: null,
      onExit: null,
      onHover: null,
      onScroll: null,
      onRelease: null,
      onDrag: null,
      cursor: null,
      opaque: true,
    });
    root.adoptChild(region);

    // 手动设置布局 (绕过 layout 流程)
    region.setOffset(10, 5);
    region.setSize(20, 5);

    let clickCount = 0;
    let receivedEvent: WidgetMouseEvent | null = null;
    region.onClick = (event) => {
      clickCount++;
      receivedEvent = event;
    };

    mm.setRootRenderObject(root);

    // 在 region 区域内 (15, 7) 按下鼠标
    mm.handleMouseEvent(makeMouseEvent(15, 7, "press"));

    expect(clickCount).toBe(1);
    expect(receivedEvent).not.toBeNull();
    expect(receivedEvent!.type).toBe("click");
  });

  test("连续多次 press 递增 click 计数", () => {
    const root = new TestContainer();
    root.setOffset(0, 0);
    root.setSize(80, 24);

    let clickCount = 0;
    const region = new RenderMouseRegion({
      onClick: () => {
        clickCount++;
      },
      onEnter: null,
      onExit: null,
      onHover: null,
      onScroll: null,
      onRelease: null,
      onDrag: null,
      cursor: null,
      opaque: true,
    });
    root.adoptChild(region);
    region.setOffset(0, 0);
    region.setSize(80, 24);

    mm.setRootRenderObject(root);

    mm.handleMouseEvent(makeMouseEvent(5, 5, "press"));
    mm.handleMouseEvent(makeMouseEvent(5, 5, "release"));
    mm.handleMouseEvent(makeMouseEvent(5, 5, "press"));
    mm.handleMouseEvent(makeMouseEvent(5, 5, "release"));
    mm.handleMouseEvent(makeMouseEvent(5, 5, "press"));

    expect(clickCount).toBe(3);
  });

  // ════════════════════════════════════════════════════
  //  区域外 press 不触发 click
  // ════════════════════════════════════════════════════

  test("区域外 press 不触发 onClick", () => {
    const root = new TestContainer();
    root.setOffset(0, 0);
    root.setSize(80, 24);

    let clickCount = 0;
    const region = new RenderMouseRegion({
      onClick: () => {
        clickCount++;
      },
      onEnter: null,
      onExit: null,
      onHover: null,
      onScroll: null,
      onRelease: null,
      onDrag: null,
      cursor: null,
      opaque: true,
    });
    root.adoptChild(region);
    region.setOffset(10, 5);
    region.setSize(20, 5);

    mm.setRootRenderObject(root);

    // 点击区域外 (5, 3) — 在 root 内但在 region 外
    mm.handleMouseEvent(makeMouseEvent(5, 3, "press"));

    expect(clickCount).toBe(0);
  });

  // ════════════════════════════════════════════════════
  //  hover: enter / exit
  // ════════════════════════════════════════════════════

  test("鼠标移入触发 onEnter，移出触发 onExit", () => {
    const root = new TestContainer();
    root.setOffset(0, 0);
    root.setSize(80, 24);

    const events: string[] = [];
    const region = new RenderMouseRegion({
      onClick: null,
      onEnter: () => {
        events.push("enter");
      },
      onExit: () => {
        events.push("exit");
      },
      onHover: null,
      onScroll: null,
      onRelease: null,
      onDrag: null,
      cursor: null,
      opaque: true,
    });
    root.adoptChild(region);
    region.setOffset(10, 5);
    region.setSize(20, 5);

    mm.setRootRenderObject(root);

    // 移入区域
    mm.handleMouseEvent(makeMouseEvent(15, 7, "move", "none"));
    expect(events).toEqual(["enter"]);

    // 在区域内移动 (不应再触发 enter)
    mm.handleMouseEvent(makeMouseEvent(16, 7, "move", "none"));
    expect(events).toEqual(["enter"]);

    // 移出区域
    mm.handleMouseEvent(makeMouseEvent(5, 3, "move", "none"));
    expect(events).toEqual(["enter", "exit"]);
  });

  // ════════════════════════════════════════════════════
  //  hover 状态变化 (_isHovered)
  // ════════════════════════════════════════════════════

  test("进入区域后 isHovered=true, 离开后 false", () => {
    const root = new TestContainer();
    root.setOffset(0, 0);
    root.setSize(80, 24);

    const region = new RenderMouseRegion({
      onClick: null,
      onEnter: () => {},
      onExit: () => {},
      onHover: null,
      onScroll: null,
      onRelease: null,
      onDrag: null,
      cursor: null,
      opaque: true,
    });
    root.adoptChild(region);
    region.setOffset(10, 5);
    region.setSize(20, 5);

    mm.setRootRenderObject(root);

    expect(region.isHovered).toBe(false);

    mm.handleMouseEvent(makeMouseEvent(15, 7, "move", "none"));
    expect(region.isHovered).toBe(true);

    mm.handleMouseEvent(makeMouseEvent(5, 3, "move", "none"));
    expect(region.isHovered).toBe(false);
  });

  // ════════════════════════════════════════════════════
  //  drag 事件
  // ════════════════════════════════════════════════════

  test("press 后带 button 的 move 触发 onDrag (捕获语义)", () => {
    const root = new TestContainer();
    root.setOffset(0, 0);
    root.setSize(80, 24);

    const dragEvents: WidgetMouseEvent[] = [];
    const region = new RenderMouseRegion({
      onClick: () => {},
      onEnter: null,
      onExit: null,
      onHover: null,
      onScroll: null,
      onRelease: null,
      onDrag: (e) => {
        dragEvents.push(e);
      },
      cursor: null,
      opaque: true,
    });
    root.adoptChild(region);
    region.setOffset(10, 5);
    region.setSize(20, 5);

    mm.setRootRenderObject(root);

    // 在区域内 press
    mm.handleMouseEvent(makeMouseEvent(15, 7, "press"));

    // 拖拽 (move with left button held)
    mm.handleMouseEvent(makeMouseEvent(16, 8, "move", "left"));
    mm.handleMouseEvent(makeMouseEvent(50, 20, "move", "left")); // 拖出区域

    expect(dragEvents.length).toBe(2);
    expect(dragEvents[0]!.type).toBe("drag");
    expect(dragEvents[1]!.type).toBe("drag"); // 捕获语义 — 即使在区域外也触发

    // release 清除拖拽目标
    mm.handleMouseEvent(makeMouseEvent(50, 20, "release"));

    // 之后的 move 不再触发 drag
    mm.handleMouseEvent(makeMouseEvent(51, 20, "move", "left"));
    expect(dragEvents.length).toBe(2);
  });

  // ════════════════════════════════════════════════════
  //  GestureDetector onTap (等价于 onClick)
  // ════════════════════════════════════════════════════

  test("GestureDetector 的 onTap 映射为 onClick 正确触发", () => {
    const root = new TestContainer();
    root.setOffset(0, 0);
    root.setSize(80, 24);

    let tapCount = 0;

    // GestureDetector 内部创建 MouseRegion，onClick = onTap
    // 直接模拟最终的 RenderMouseRegion
    const region = new RenderMouseRegion({
      onClick: () => {
        tapCount++;
      },
      onEnter: null,
      onExit: null,
      onHover: null,
      onScroll: null,
      onRelease: null,
      onDrag: null,
      cursor: null,
      opaque: true,
    });
    root.adoptChild(region);
    region.setOffset(5, 3);
    region.setSize(30, 3);

    mm.setRootRenderObject(root);

    // 模拟多次 tap (press)
    for (let i = 0; i < 5; i++) {
      mm.handleMouseEvent(makeMouseEvent(10, 4, "press"));
      mm.handleMouseEvent(makeMouseEvent(10, 4, "release"));
    }

    expect(tapCount).toBe(5);
  });
});
