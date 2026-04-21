/**
 * Terminal focus and idle tracking.
 *
 * 逆向: modules/1253_unknown_iUR.js:1-19
 *
 * - `initFocusTracking(tui)` subscribes to terminal focus events (CSI I / CSI O)
 *   and maintains a module-level `focused` boolean. Export: `getTerminalFocused()`.
 *
 * - `initIdleTracking(tui, idleMs)` records last key/mouse activity timestamp.
 *   Export: `getIsIdle()` returns true when no input for `idleMs` (default 5 min).
 *
 * Both are called at startup in `runApp()` before the main loop (chunk-004:5264-5270).
 * Used by notification service (chunk-005:4193-4195): OS notifications only fire
 * when `!getTerminalFocused() || getIsIdle()`.
 *
 * @module
 */

import type { TuiController } from "./tui-controller.js";

// ── Focus tracking ──────────────────────────────

/** 逆向: ZqT in modules/1253_unknown_iUR.js — module-level focus state */
let terminalFocused = true;

/**
 * Subscribe to terminal focus events.
 *
 * 逆向: FNR(T) — modules/1253_unknown_iUR.js:1-6
 *
 * @param tui - The TUI controller instance
 */
export function initFocusTracking(tui: TuiController): void {
  tui.onFocus((event) => {
    terminalFocused = event.focused;
  });
}

/**
 * Whether the terminal window currently has focus.
 *
 * 逆向: dX() — modules/1253_unknown_iUR.js:7-9
 */
export function getTerminalFocused(): boolean {
  return terminalFocused;
}

// ── Idle tracking ───────────────────────────────

/** 逆向: R5T — idle threshold in ms */
let idleThreshold = 300_000; // 5 minutes

/** 逆向: nv — last-active timestamp */
let lastActiveTime = Date.now();

/**
 * Subscribe to key/mouse events to track user activity.
 *
 * 逆向: GNR(T, R=300000) — modules/1253_unknown_iUR.js:10-16
 *
 * @param tui - The TUI controller instance
 * @param idleMs - Idle threshold in milliseconds (default 300000 = 5 min)
 */
export function initIdleTracking(tui: TuiController, idleMs = 300_000): void {
  idleThreshold = idleMs;
  lastActiveTime = Date.now();
  tui.onKey(() => {
    lastActiveTime = Date.now();
  });
  tui.onMouse(() => {
    lastActiveTime = Date.now();
  });
}

/**
 * Whether the user has been idle for longer than the threshold.
 *
 * 逆向: T5T() — modules/1253_unknown_iUR.js:17-19
 */
export function getIsIdle(): boolean {
  return Date.now() - lastActiveTime >= idleThreshold;
}

/**
 * Reset tracking state. Useful for testing.
 * @internal
 */
export function _resetTrackingState(): void {
  terminalFocused = true;
  idleThreshold = 300_000;
  lastActiveTime = Date.now();
}
