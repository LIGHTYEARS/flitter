/**
 * Mouse event factory functions.
 *
 * 逆向: Ol (0543_unknown_Ol.js), wy0 (0544_unknown_wy0.js), yF (0545_unknown_yF.js)
 *
 * Creates typed widget-level mouse events from raw terminal mouse events.
 * These match the event shape expected by RenderMouseRegion.handleMouseEvent().
 *
 * NOTE: amp's yF dispatches on T.button for scroll direction (button=="wheel_up"/
 * "wheel_down"). Flitter's MouseAction uses T.action for the same values. This
 * implementation switches on T.action to match Flitter's type definitions.
 *
 * @module
 */

import type { MouseEvent as TermMouseEvent } from "../vt/types.js";
import type { MouseEvent as WidgetMouseEvent } from "../widgets/mouse-region.js";

/** Base fields shared by all typed mouse events. */
export interface MouseEventBase {
  position: { x: number; y: number };
  localPosition: { x: number; y: number };
  modifiers: { shift: boolean; alt: boolean; ctrl: boolean; meta: boolean };
  timestamp: number;
}

/**
 * Create base event fields.
 *
 * 逆向: Ol(T, R, a) in 0543_unknown_Ol.js
 * Returns { position: R, localPosition: a, modifiers: {...}, timestamp: Date.now() }
 */
export function createBaseEvent(
  raw: TermMouseEvent,
  position: { x: number; y: number },
  localPosition: { x: number; y: number },
): MouseEventBase {
  return {
    position,
    localPosition,
    modifiers: {
      shift: raw.modifiers.shift,
      ctrl: raw.modifiers.ctrl,
      alt: raw.modifiers.alt,
      meta: raw.modifiers.meta,
    },
    timestamp: Date.now(),
  };
}

/** Click event shape. */
export interface ClickEvent extends MouseEventBase {
  type: "click";
  button: "left" | "middle" | "right";
  clickCount: number;
}

/**
 * Create a click event.
 *
 * 逆向: wy0(T, R, a, e=1) in 0544_unknown_wy0.js
 * Returns { type:"click", button:..., clickCount:e, ...Ol(T,R,a) }
 */
export function createClickEvent(
  raw: TermMouseEvent,
  position: { x: number; y: number },
  localPosition: { x: number; y: number },
  clickCount = 1,
): ClickEvent {
  return {
    type: "click",
    button:
      raw.button === "left"
        ? "left"
        : raw.button === "middle"
          ? "middle"
          : raw.button === "right"
            ? "right"
            : "left",
    clickCount,
    ...createBaseEvent(raw, position, localPosition),
  };
}

/** Scroll event shape. */
export interface ScrollEvent extends MouseEventBase {
  type: "scroll";
  direction: "up" | "down" | "left" | "right";
}

/**
 * Create a scroll event.
 *
 * 逆向: yF(T, R, a) in 0545_unknown_yF.js
 * Amp switches on T.button for direction; Flitter encodes scroll in T.action
 * ("wheel_up" / "wheel_down"), so we switch on T.action here instead.
 */
export function createScrollEvent(
  raw: TermMouseEvent,
  position: { x: number; y: number },
  localPosition: { x: number; y: number },
): ScrollEvent {
  let direction: "up" | "down" | "left" | "right";
  switch (raw.action) {
    case "wheel_up":
      direction = "up";
      break;
    case "wheel_down":
      direction = "down";
      break;
    default:
      direction = "down";
  }
  return {
    type: "scroll",
    direction,
    ...createBaseEvent(raw, position, localPosition),
  };
}

/** Drag event shape. */
export interface DragEvent extends MouseEventBase {
  type: "drag";
  button: "left" | "middle" | "right";
  deltaX: number;
  deltaY: number;
}

/**
 * Create a drag event.
 *
 * 逆向: _handleDrag dispatch in ha class (2026_tail_anonymous.js:158320-158341)
 */
export function createDragEvent(
  raw: TermMouseEvent,
  position: { x: number; y: number },
  localPosition: { x: number; y: number },
  deltaX: number,
  deltaY: number,
): DragEvent {
  return {
    type: "drag",
    button:
      raw.button === "left"
        ? "left"
        : raw.button === "middle"
          ? "middle"
          : raw.button === "right"
            ? "right"
            : "left",
    deltaX,
    deltaY,
    ...createBaseEvent(raw, position, localPosition),
  };
}

/** Release event shape. */
export interface ReleaseEvent extends MouseEventBase {
  type: "release";
  button: "left" | "middle" | "right";
}

/**
 * Create a release event.
 *
 * 逆向: _handleRelease dispatch in ha class (2026_tail_anonymous.js:158291-158318)
 */
export function createReleaseEvent(
  raw: TermMouseEvent,
  position: { x: number; y: number },
  localPosition: { x: number; y: number },
): ReleaseEvent {
  return {
    type: "release",
    button:
      raw.button === "left"
        ? "left"
        : raw.button === "middle"
          ? "middle"
          : raw.button === "right"
            ? "right"
            : "left",
    ...createBaseEvent(raw, position, localPosition),
  };
}

/** Union of all typed mouse events produced by this module. */
export type TypedMouseEvent = ClickEvent | ScrollEvent | DragEvent | ReleaseEvent;

/** Type alias for compatibility with WidgetMouseEvent callbacks. */
export type { WidgetMouseEvent };
