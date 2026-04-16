import { describe, expect, test } from "bun:test";
import type { Modifiers, MouseEvent as TermMouseEvent } from "../vt/types.js";
import {
  createBaseEvent,
  createClickEvent,
  createDragEvent,
  createReleaseEvent,
  createScrollEvent,
} from "./mouse-event-helpers.js";

const MODS_NONE: Modifiers = { shift: false, alt: false, ctrl: false, meta: false };

function makeRawEvent(overrides: Partial<TermMouseEvent> = {}): TermMouseEvent {
  return {
    type: "mouse",
    x: 10,
    y: 5,
    button: "left",
    action: "press",
    modifiers: MODS_NONE,
    ...overrides,
  };
}

describe("mouse-event-helpers", () => {
  test("createBaseEvent produces position, localPosition, modifiers, timestamp", () => {
    const raw = makeRawEvent({ modifiers: { shift: true, alt: false, ctrl: false, meta: false } });
    const pos = { x: 10, y: 5 };
    const localPos = { x: 3, y: 2 };
    const result = createBaseEvent(raw, pos, localPos);
    expect(result.position).toEqual(pos);
    expect(result.localPosition).toEqual(localPos);
    expect(result.modifiers.shift).toBe(true);
    expect(typeof result.timestamp).toBe("number");
  });

  test("createClickEvent includes type, button, clickCount", () => {
    const raw = makeRawEvent({ button: "right" });
    const result = createClickEvent(raw, { x: 10, y: 5 }, { x: 3, y: 2 }, 2);
    expect(result.type).toBe("click");
    expect(result.button).toBe("right");
    expect(result.clickCount).toBe(2);
    expect(result.position).toEqual({ x: 10, y: 5 });
  });

  test("createClickEvent defaults clickCount to 1", () => {
    const raw = makeRawEvent();
    const result = createClickEvent(raw, { x: 10, y: 5 }, { x: 3, y: 2 });
    expect(result.clickCount).toBe(1);
  });

  test("createScrollEvent maps wheel_up action to direction up", () => {
    const raw = makeRawEvent({ action: "wheel_up", button: "none" });
    const result = createScrollEvent(raw, { x: 10, y: 5 }, { x: 3, y: 2 });
    expect(result.type).toBe("scroll");
    expect(result.direction).toBe("up");
  });

  test("createScrollEvent maps wheel_down action to direction down", () => {
    const raw = makeRawEvent({ action: "wheel_down", button: "none" });
    const result = createScrollEvent(raw, { x: 10, y: 5 }, { x: 3, y: 2 });
    expect(result.type).toBe("scroll");
    expect(result.direction).toBe("down");
  });

  test("createDragEvent includes deltaX, deltaY, button", () => {
    const raw = makeRawEvent({ action: "move", button: "left" });
    const result = createDragEvent(raw, { x: 12, y: 7 }, { x: 3, y: 2 }, 2, 1);
    expect(result.type).toBe("drag");
    expect(result.button).toBe("left");
    expect(result.deltaX).toBe(2);
    expect(result.deltaY).toBe(1);
  });

  test("createReleaseEvent includes button", () => {
    const raw = makeRawEvent({ action: "release", button: "left" });
    const result = createReleaseEvent(raw, { x: 10, y: 5 }, { x: 3, y: 2 });
    expect(result.type).toBe("release");
    expect(result.button).toBe("left");
  });
});
