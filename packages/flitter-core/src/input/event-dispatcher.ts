// EventDispatcher (Amp: Pg) -- Singleton event dispatch pipeline
// Routes parsed InputEvents to appropriate handlers (key, mouse, resize, paste, focus)
// Amp ref: input-system.md Section 9, amp-strings.txt Pg class
//
// Key dispatch flow:
//   1. Key interceptors (global shortcuts like Ctrl+C)
//   2. FocusManager dispatch (if available)
//   3. Registered key handlers
// Mouse dispatch flow:
//   1. If release -> fire global release callbacks
//   2. Registered mouse handlers

import type {
  InputEvent,
  KeyEvent,
  MouseEvent,
  ResizeEvent,
  PasteEvent,
  FocusEvent,
  KeyEventResult,
} from './events';
import { FocusManager } from './focus';

// Handler type aliases
export type KeyHandler = (event: KeyEvent) => KeyEventResult;
export type MouseHandler = (event: MouseEvent) => void;
export type ResizeHandler = (width: number, height: number) => void;

/**
 * EventDispatcher singleton -- routes InputEvents to registered handlers.
 *
 * Amp ref: class Pg, amp-strings.txt
 * Reference: input-system.md Section 9 (Event Dispatch Pipeline)
 */
export class EventDispatcher {
  private static _instance: EventDispatcher | null = null;
  private static _getFrameStats: (() => { recordKeyEvent(ms: number): void; recordMouseEvent(ms: number): void }) | null = null;

  static setFrameStatsGetter(getter: () => { recordKeyEvent(ms: number): void; recordMouseEvent(ms: number): void }): void {
    EventDispatcher._getFrameStats = getter;
  }

  // Event handler registries
  // Amp ref: J3.eventCallbacks
  private _keyHandlers: KeyHandler[] = [];
  private _mouseHandlers: MouseHandler[] = [];
  private _resizeHandlers: ResizeHandler[] = [];

  // Key interceptors run before focus system (for global shortcuts like Ctrl+C)
  private _keyInterceptors: KeyHandler[] = [];

  // Global mouse release callbacks (for drag operations)
  // Amp ref: Pg.instance.addGlobalReleaseCallback
  private _globalReleaseCallbacks: Set<(event: MouseEvent) => void> = new Set();

  // Focus event handlers
  private _focusHandlers: ((event: FocusEvent) => void)[] = [];

  // Paste event handlers (fallback when no FocusManager available)
  private _pasteHandlers: ((event: PasteEvent) => void)[] = [];

  private constructor() {}

  /**
   * Get the singleton instance.
   * Amp ref: Pg.instance
   */
  static get instance(): EventDispatcher {
    if (!EventDispatcher._instance) {
      EventDispatcher._instance = new EventDispatcher();
    }
    return EventDispatcher._instance;
  }

  /**
   * Reset singleton for testing.
   */
  static reset(): void {
    if (EventDispatcher._instance) {
      EventDispatcher._instance._keyHandlers = [];
      EventDispatcher._instance._mouseHandlers = [];
      EventDispatcher._instance._resizeHandlers = [];
      EventDispatcher._instance._keyInterceptors = [];
      EventDispatcher._instance._globalReleaseCallbacks.clear();
      EventDispatcher._instance._focusHandlers = [];
      EventDispatcher._instance._pasteHandlers = [];
    }
    EventDispatcher._instance = null;
    EventDispatcher._getFrameStats = null;
  }

  // --- Key handler registration ---

  addKeyHandler(handler: KeyHandler): void {
    this._keyHandlers.push(handler);
  }

  removeKeyHandler(handler: KeyHandler): void {
    const idx = this._keyHandlers.indexOf(handler);
    if (idx >= 0) this._keyHandlers.splice(idx, 1);
  }

  // --- Key interceptor registration (priority handlers before focus) ---

  addKeyInterceptor(handler: KeyHandler): void {
    this._keyInterceptors.push(handler);
  }

  removeKeyInterceptor(handler: KeyHandler): void {
    const idx = this._keyInterceptors.indexOf(handler);
    if (idx >= 0) this._keyInterceptors.splice(idx, 1);
  }

  // --- Mouse handler registration ---

  addMouseHandler(handler: MouseHandler): void {
    this._mouseHandlers.push(handler);
  }

  removeMouseHandler(handler: MouseHandler): void {
    const idx = this._mouseHandlers.indexOf(handler);
    if (idx >= 0) this._mouseHandlers.splice(idx, 1);
  }

  // --- Resize handler registration ---

  addResizeHandler(handler: ResizeHandler): void {
    this._resizeHandlers.push(handler);
  }

  removeResizeHandler(handler: ResizeHandler): void {
    const idx = this._resizeHandlers.indexOf(handler);
    if (idx >= 0) this._resizeHandlers.splice(idx, 1);
  }

  // --- Global mouse release callbacks (for drag operations) ---
  // Amp ref: Pg.instance.addGlobalReleaseCallback from TextField state

  addGlobalReleaseCallback(callback: (event: MouseEvent) => void): void {
    this._globalReleaseCallbacks.add(callback);
  }

  removeGlobalReleaseCallback(callback: (event: MouseEvent) => void): void {
    this._globalReleaseCallbacks.delete(callback);
  }

  // --- Focus event handler registration ---

  addFocusHandler(handler: (event: FocusEvent) => void): void {
    this._focusHandlers.push(handler);
  }

  removeFocusHandler(handler: (event: FocusEvent) => void): void {
    const idx = this._focusHandlers.indexOf(handler);
    if (idx >= 0) this._focusHandlers.splice(idx, 1);
  }

  // --- Paste handler registration (fallback) ---

  addPasteHandler(handler: (event: PasteEvent) => void): void {
    this._pasteHandlers.push(handler);
  }

  removePasteHandler(handler: (event: PasteEvent) => void): void {
    const idx = this._pasteHandlers.indexOf(handler);
    if (idx >= 0) this._pasteHandlers.splice(idx, 1);
  }

  // --- Main dispatch method ---

  /**
   * Route an InputEvent to the appropriate handler(s).
   *
   * Amp ref: input-system.md Section 9.2
   *
   * Dispatch flow by event type:
   *   'key':    interceptors -> focus -> key handlers
   *   'mouse':  release callbacks (if release) -> mouse handlers
   *   'resize': resize handlers
   *   'paste':  FocusManager paste -> paste handlers
   *   'focus':  application-level focus tracking
   */
  dispatch(event: InputEvent): void {
    switch (event.type) {
      case 'key':
        this.dispatchKeyEvent(event);
        break;
      case 'mouse':
        this.dispatchMouseEvent(event);
        break;
      case 'resize':
        this.dispatchResizeEvent(event);
        break;
      case 'paste':
        this.dispatchPasteEvent(event);
        break;
      case 'focus':
        this.dispatchFocusEvent(event);
        break;
    }
  }

  /**
   * Dispatch a key event through the full key dispatch pipeline.
   *
   * Flow (from input-system.md Section 9):
   *   1. Run key interceptors (global shortcuts like Ctrl+C)
   *      - If any returns "handled", stop
   *   2. Try FocusManager.instance.dispatchKeyEvent(event) [if available]
   *      - Focus system handles routing + bubbling
   *   3. Run registered key handlers
   */
  dispatchKeyEvent(event: KeyEvent): KeyEventResult {
    const start = performance.now();

    // Step 1: Key interceptors (global shortcuts)
    for (const interceptor of this._keyInterceptors) {
      const result = interceptor(event);
      if (result === 'handled') {
        const elapsed = performance.now() - start;
        if (EventDispatcher._getFrameStats) {
          EventDispatcher._getFrameStats().recordKeyEvent(elapsed);
        }
        return 'handled';
      }
    }

    // Step 2: Try FocusManager dispatch (if available)
    if (FocusManager.instance) {
      const result = FocusManager.instance.dispatchKeyEvent(event);
      if (result === 'handled') {
        const elapsed = performance.now() - start;
        if (EventDispatcher._getFrameStats) {
          EventDispatcher._getFrameStats().recordKeyEvent(elapsed);
        }
        return 'handled';
      }
    }

    // Step 3: Run registered key handlers
    for (const handler of this._keyHandlers) {
      const result = handler(event);
      if (result === 'handled') {
        const elapsed = performance.now() - start;
        if (EventDispatcher._getFrameStats) {
          EventDispatcher._getFrameStats().recordKeyEvent(elapsed);
        }
        return 'handled';
      }
    }

    const elapsed = performance.now() - start;
    if (EventDispatcher._getFrameStats) {
      EventDispatcher._getFrameStats().recordKeyEvent(elapsed);
    }
    return 'ignored';
  }

  /**
   * Dispatch a mouse event.
   *
   * Flow:
   *   1. If release -> fire global release callbacks
   *   2. Run registered mouse handlers
   */
  dispatchMouseEvent(event: MouseEvent): void {
    const start = performance.now();

    // Step 1: Fire global release callbacks for release events
    if (event.action === 'release') {
      for (const callback of this._globalReleaseCallbacks) {
        callback(event);
      }
    }

    // Step 2: Run registered mouse handlers
    for (const handler of this._mouseHandlers) {
      handler(event);
    }

    const elapsed = performance.now() - start;
    if (EventDispatcher._getFrameStats) {
      EventDispatcher._getFrameStats().recordMouseEvent(elapsed);
    }
  }

  /**
   * Dispatch a resize event.
   */
  dispatchResizeEvent(event: ResizeEvent): void {
    for (const handler of this._resizeHandlers) {
      handler(event.width, event.height);
    }
  }

  /**
   * Dispatch a paste event.
   *
   * Flow:
   *   1. Try FocusManager paste dispatch (focused widget's onPaste)
   *   2. Fall back to registered paste handlers
   */
  dispatchPasteEvent(event: PasteEvent): void {
    // Try FocusManager paste dispatch — only if there's a focused node
    // that might handle the paste. Otherwise fall through to registered handlers.
    const fm = FocusManager.instance;
    if (fm && fm.primaryFocus) {
      fm.dispatchPasteEvent(event.text);
      return;
    }

    // Fallback: registered paste handlers
    for (const handler of this._pasteHandlers) {
      handler(event);
    }
  }

  /**
   * Dispatch a focus event (terminal window focus/blur).
   */
  dispatchFocusEvent(event: FocusEvent): void {
    for (const handler of this._focusHandlers) {
      handler(event);
    }
  }
}
