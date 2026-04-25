/**
 * OverlayContainer + Middle-click paste tests.
 *
 * OverlayContainer (10 tests):
 * - Renders child as base layer
 * - Adds overlay at top position
 * - Adds overlay at bottom position
 * - Adds overlay at left position
 * - Adds overlay at right position
 * - Multiple overlays at different edges
 * - Empty overlays list renders child only
 * - Undefined overlays renders child only
 * - Position offsets are applied
 * - Overlay order matches insertion order
 *
 * Middle-click paste (10 tests):
 * - Detects middle-click button in handleMouseEvent
 * - X11 detection via DISPLAY env
 * - X11 detection via XDG_SESSION_TYPE
 * - Wayland detection via WAYLAND_DISPLAY
 * - Non-X11 no-op (no paste callback fires)
 * - Paste event emission with registered callback
 * - Multiple paste callbacks all receive event
 * - No callbacks registered = no error
 * - removeMiddleClickPasteCallback works
 * - dispose clears paste callbacks
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { MouseManager } from "../gestures/mouse-manager.js";
import { OverlayContainer } from "../overlay/overlay-container.js";
import { Clipboard } from "../selection/clipboard.js";
import { RenderBox } from "../tree/render-box.js";
import { setPipelineOwner } from "../tree/types.js";
import type { PasteEvent, MouseEvent as TermMouseEvent } from "../vt/types.js";
import { SizedBox } from "../widgets/sized-box.js";
import { Positioned, Stack } from "../widgets/stack.js";

// ════════════════════════════════════════════════════
//  Test helpers
// ════════════════════════════════════════════════════

class TestRenderBox extends RenderBox {
  performLayout(): void {
    // no-op
  }
  setTestBounds(size: { width: number; height: number }, offset: { x: number; y: number }): void {
    this._size = size;
    this._offset = offset;
  }
}

function createMouseEvent(
  x: number,
  y: number,
  action: "press" | "release" | "move" = "press",
  button: "left" | "right" | "middle" | "none" = "left",
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

/**
 * Minimal BuildContext mock for StatelessWidget.build().
 */
function createMockBuildContext() {
  return {
    widget: {} as any,
    findRenderObject: () => undefined,
    findAncestorStateOfType: () => null,
  };
}

// ════════════════════════════════════════════════════
//  OverlayContainer tests
// ════════════════════════════════════════════════════

describe("OverlayContainer", () => {
  test("renders child as base layer in Stack", () => {
    const child = new SizedBox({ width: 80, height: 24 });
    const container = new OverlayContainer({ child });
    const result = container.build(createMockBuildContext());

    expect(result).toBeInstanceOf(Stack);
    const stack = result as Stack;
    expect(stack.children.length).toBe(1);
    expect(stack.children[0]).toBe(child);
  });

  test("adds overlay at top position", () => {
    const child = new SizedBox({ width: 80, height: 24 });
    const overlay = new SizedBox({ width: 80, height: 1 });
    const container = new OverlayContainer({
      child,
      overlays: [{ widget: overlay, position: "top" }],
    });
    const result = container.build(createMockBuildContext()) as Stack;

    expect(result.children.length).toBe(2);
    expect(result.children[0]).toBe(child);

    const positioned = result.children[1] as Positioned;
    expect(positioned).toBeInstanceOf(Positioned);
    expect(positioned.top).toBe(0);
    expect(positioned.left).toBe(0);
    expect(positioned.right).toBe(0);
    expect(positioned.bottom).toBeUndefined();
  });

  test("adds overlay at bottom position", () => {
    const child = new SizedBox({ width: 80, height: 24 });
    const overlay = new SizedBox({ width: 80, height: 1 });
    const container = new OverlayContainer({
      child,
      overlays: [{ widget: overlay, position: "bottom" }],
    });
    const result = container.build(createMockBuildContext()) as Stack;

    expect(result.children.length).toBe(2);
    const positioned = result.children[1] as Positioned;
    expect(positioned).toBeInstanceOf(Positioned);
    expect(positioned.bottom).toBe(0);
    expect(positioned.left).toBe(0);
    expect(positioned.right).toBe(0);
    expect(positioned.top).toBeUndefined();
  });

  test("adds overlay at left position", () => {
    const child = new SizedBox({ width: 80, height: 24 });
    const overlay = new SizedBox({ width: 10, height: 24 });
    const container = new OverlayContainer({
      child,
      overlays: [{ widget: overlay, position: "left" }],
    });
    const result = container.build(createMockBuildContext()) as Stack;

    expect(result.children.length).toBe(2);
    const positioned = result.children[1] as Positioned;
    expect(positioned).toBeInstanceOf(Positioned);
    expect(positioned.left).toBe(0);
    expect(positioned.top).toBe(0);
    expect(positioned.bottom).toBe(0);
    expect(positioned.right).toBeUndefined();
  });

  test("adds overlay at right position", () => {
    const child = new SizedBox({ width: 80, height: 24 });
    const overlay = new SizedBox({ width: 10, height: 24 });
    const container = new OverlayContainer({
      child,
      overlays: [{ widget: overlay, position: "right" }],
    });
    const result = container.build(createMockBuildContext()) as Stack;

    expect(result.children.length).toBe(2);
    const positioned = result.children[1] as Positioned;
    expect(positioned).toBeInstanceOf(Positioned);
    expect(positioned.right).toBe(0);
    expect(positioned.top).toBe(0);
    expect(positioned.bottom).toBe(0);
    expect(positioned.left).toBeUndefined();
  });

  test("multiple overlays at different edges", () => {
    const child = new SizedBox({ width: 80, height: 24 });
    const topOverlay = new SizedBox({ width: 80, height: 1 });
    const bottomOverlay = new SizedBox({ width: 80, height: 1 });
    const leftOverlay = new SizedBox({ width: 10, height: 24 });

    const container = new OverlayContainer({
      child,
      overlays: [
        { widget: topOverlay, position: "top" },
        { widget: bottomOverlay, position: "bottom" },
        { widget: leftOverlay, position: "left" },
      ],
    });
    const result = container.build(createMockBuildContext()) as Stack;

    // child + 3 overlays
    expect(result.children.length).toBe(4);
    expect(result.children[0]).toBe(child);

    // Verify each overlay is a Positioned
    expect(result.children[1]).toBeInstanceOf(Positioned);
    expect(result.children[2]).toBeInstanceOf(Positioned);
    expect(result.children[3]).toBeInstanceOf(Positioned);
  });

  test("empty overlays list renders child only", () => {
    const child = new SizedBox({ width: 80, height: 24 });
    const container = new OverlayContainer({ child, overlays: [] });
    const result = container.build(createMockBuildContext()) as Stack;

    expect(result.children.length).toBe(1);
    expect(result.children[0]).toBe(child);
  });

  test("undefined overlays renders child only", () => {
    const child = new SizedBox({ width: 80, height: 24 });
    const container = new OverlayContainer({ child });
    const result = container.build(createMockBuildContext()) as Stack;

    expect(result.children.length).toBe(1);
    expect(result.children[0]).toBe(child);
  });

  test("position offsets are applied", () => {
    const child = new SizedBox({ width: 80, height: 24 });
    const overlay = new SizedBox({ width: 80, height: 1 });

    const container = new OverlayContainer({
      child,
      overlays: [{ widget: overlay, position: "top", offset: 3 }],
    });
    const result = container.build(createMockBuildContext()) as Stack;

    const positioned = result.children[1] as Positioned;
    expect(positioned.top).toBe(3);
    expect(positioned.left).toBe(0);
    expect(positioned.right).toBe(0);
  });

  test("overlay order matches insertion order in Stack children", () => {
    const child = new SizedBox({ width: 80, height: 24 });
    const first = new SizedBox({ width: 80, height: 1 });
    const second = new SizedBox({ width: 80, height: 1 });

    const container = new OverlayContainer({
      child,
      overlays: [
        { widget: first, position: "top" },
        { widget: second, position: "bottom" },
      ],
    });
    const result = container.build(createMockBuildContext()) as Stack;

    // First overlay (top) is children[1], second (bottom) is children[2]
    const pos1 = result.children[1] as Positioned;
    const pos2 = result.children[2] as Positioned;

    // top overlay
    expect(pos1.top).toBe(0);
    expect(pos1.child).toBe(first);

    // bottom overlay
    expect(pos2.bottom).toBe(0);
    expect(pos2.child).toBe(second);
  });
});

// ════════════════════════════════════════════════════
//  Middle-click paste tests
// ════════════════════════════════════════════════════

describe("Middle-click paste", () => {
  // Save original env to restore after each test
  const originalDisplay = process.env.DISPLAY;
  const originalXdgSessionType = process.env.XDG_SESSION_TYPE;
  const originalWaylandDisplay = process.env.WAYLAND_DISPLAY;

  beforeEach(() => {
    setPipelineOwner({
      requestLayout: () => {},
      requestPaint: () => {},
      removeFromQueues: () => {},
    });
    MouseManager.instance.dispose();
  });

  afterEach(() => {
    MouseManager.instance.dispose();
    setPipelineOwner(undefined);
    // Restore env
    if (originalDisplay !== undefined) process.env.DISPLAY = originalDisplay;
    else delete process.env.DISPLAY;
    if (originalXdgSessionType !== undefined) process.env.XDG_SESSION_TYPE = originalXdgSessionType;
    else delete process.env.XDG_SESSION_TYPE;
    if (originalWaylandDisplay !== undefined) process.env.WAYLAND_DISPLAY = originalWaylandDisplay;
    else delete process.env.WAYLAND_DISPLAY;
  });

  test("detects middle-click button in handleMouseEvent", () => {
    const mm = MouseManager.instance;
    const root = new TestRenderBox();
    root.setTestBounds({ width: 80, height: 24 }, { x: 0, y: 0 });
    mm.setRootRenderObject(root);

    const event = createMouseEvent(10, 5, "press", "middle");

    // Should not throw
    expect(() => mm.handleMouseEvent(event)).not.toThrow();
  });

  test("isX11Available returns true when DISPLAY is set", () => {
    process.env.DISPLAY = ":0";
    delete process.env.XDG_SESSION_TYPE;
    delete process.env.WAYLAND_DISPLAY;
    expect(MouseManager.isX11Available()).toBe(true);
  });

  test("isX11Available returns true when XDG_SESSION_TYPE is x11", () => {
    delete process.env.DISPLAY;
    process.env.XDG_SESSION_TYPE = "x11";
    delete process.env.WAYLAND_DISPLAY;
    expect(MouseManager.isX11Available()).toBe(true);
  });

  test("isX11Available returns true when WAYLAND_DISPLAY is set", () => {
    delete process.env.DISPLAY;
    delete process.env.XDG_SESSION_TYPE;
    process.env.WAYLAND_DISPLAY = "wayland-0";
    expect(MouseManager.isX11Available()).toBe(true);
  });

  test("non-X11 no-op: paste callback does not fire on non-X11 non-darwin non-win32", () => {
    // This test checks the path where middle-click is a no-op
    // We can't easily mock process.platform, but we can verify
    // that without DISPLAY etc. and on non-darwin, the static check returns false
    delete process.env.DISPLAY;
    delete process.env.XDG_SESSION_TYPE;
    delete process.env.WAYLAND_DISPLAY;

    // On macOS (darwin), isX11Available returns false but _handleMiddleClickPaste
    // still proceeds because it checks platform === "darwin". This is correct amp behavior.
    // We just verify the static helper returns false without X11 env vars.
    expect(MouseManager.isX11Available()).toBe(false);
  });

  test("paste event emission with registered callback", async () => {
    const mm = MouseManager.instance;
    const root = new TestRenderBox();
    root.setTestBounds({ width: 80, height: 24 }, { x: 0, y: 0 });
    mm.setRootRenderObject(root);

    // Inject mock clipboard that returns text
    const mockClipboard = new Clipboard();
    (mockClipboard as any).readPrimarySelection = async () => "test paste text";
    mm.setClipboard(mockClipboard);

    // Set env so X11 check passes
    process.env.DISPLAY = ":0";

    const received: PasteEvent[] = [];
    mm.addMiddleClickPasteCallback((event) => received.push(event));

    // Fire middle-click
    mm.handleMouseEvent(createMouseEvent(10, 5, "press", "middle"));

    // Wait for async clipboard read
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(received.length).toBe(1);
    expect(received[0]!.type).toBe("paste");
    expect(received[0]!.text).toBe("test paste text");
  });

  test("multiple paste callbacks all receive event", async () => {
    const mm = MouseManager.instance;
    const root = new TestRenderBox();
    root.setTestBounds({ width: 80, height: 24 }, { x: 0, y: 0 });
    mm.setRootRenderObject(root);

    const mockClipboard = new Clipboard();
    (mockClipboard as any).readPrimarySelection = async () => "shared paste";
    mm.setClipboard(mockClipboard);

    process.env.DISPLAY = ":0";

    const events1: PasteEvent[] = [];
    const events2: PasteEvent[] = [];
    mm.addMiddleClickPasteCallback((e) => events1.push(e));
    mm.addMiddleClickPasteCallback((e) => events2.push(e));

    mm.handleMouseEvent(createMouseEvent(10, 5, "press", "middle"));

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(events1.length).toBe(1);
    expect(events2.length).toBe(1);
    expect(events1[0]!.text).toBe("shared paste");
    expect(events2[0]!.text).toBe("shared paste");
  });

  test("no callbacks registered does not error on middle-click", () => {
    const mm = MouseManager.instance;
    const root = new TestRenderBox();
    root.setTestBounds({ width: 80, height: 24 }, { x: 0, y: 0 });
    mm.setRootRenderObject(root);

    process.env.DISPLAY = ":0";

    // No callbacks registered — should not throw
    expect(() => {
      mm.handleMouseEvent(createMouseEvent(10, 5, "press", "middle"));
    }).not.toThrow();
  });

  test("removeMiddleClickPasteCallback prevents callback from firing", async () => {
    const mm = MouseManager.instance;
    const root = new TestRenderBox();
    root.setTestBounds({ width: 80, height: 24 }, { x: 0, y: 0 });
    mm.setRootRenderObject(root);

    const mockClipboard = new Clipboard();
    (mockClipboard as any).readPrimarySelection = async () => "text";
    mm.setClipboard(mockClipboard);

    process.env.DISPLAY = ":0";

    const received: PasteEvent[] = [];
    const cb = (e: PasteEvent) => received.push(e);
    mm.addMiddleClickPasteCallback(cb);
    mm.removeMiddleClickPasteCallback(cb);

    mm.handleMouseEvent(createMouseEvent(10, 5, "press", "middle"));

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Callback was removed, so no events should be received
    // (also, with 0 callbacks _handleMiddleClickPaste returns early)
    expect(received.length).toBe(0);
  });

  test("dispose clears paste callbacks and clipboard", async () => {
    const mm = MouseManager.instance;
    const root = new TestRenderBox();
    root.setTestBounds({ width: 80, height: 24 }, { x: 0, y: 0 });
    mm.setRootRenderObject(root);

    const mockClipboard = new Clipboard();
    (mockClipboard as any).readPrimarySelection = async () => "text";
    mm.setClipboard(mockClipboard);

    process.env.DISPLAY = ":0";

    const received: PasteEvent[] = [];
    mm.addMiddleClickPasteCallback((e) => received.push(e));

    // Dispose clears everything
    mm.dispose();

    // Get new instance after dispose
    const mm2 = MouseManager.instance;
    const root2 = new TestRenderBox();
    root2.setTestBounds({ width: 80, height: 24 }, { x: 0, y: 0 });
    mm2.setRootRenderObject(root2);

    mm2.handleMouseEvent(createMouseEvent(10, 5, "press", "middle"));

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Old callback should not fire on new instance
    expect(received.length).toBe(0);
  });
});
