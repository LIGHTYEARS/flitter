// MouseManager -- global mouse tracking singleton
// Amp ref: Pg class -- coordinates hover enter/exit events between RenderMouseRegion instances
// Tracks mouse position, hovered regions, and cursor shape

import type { RenderMouseRegion } from '../widgets/mouse-region';
import { RenderBox, type RenderObject } from '../framework/render-object';
import { BoxHitTestResult, BoxHitTestEntry } from '../input/hit-test';
import { Offset } from '../core/types';

/**
 * Global mouse tracking manager.
 * Singleton that coordinates mouse position, hover state, and cursor shape
 * across all RenderMouseRegion instances.
 *
 * Uses RenderBox.hitTest() for unified hit-testing (Gap #13 / #22).
 *
 * Amp ref: Pg class (mouse-manager singleton)
 */
export class MouseManager {
  private static _instance: MouseManager | null = null;

  private _lastPosition: { x: number; y: number } = { x: -1, y: -1 };
  private _currentCursor: string = 'default';
  private _cursorOverride: string | null = null;
  private _hoveredRegions: Set<RenderMouseRegion> = new Set();
  private _rootRenderObject: RenderObject | null = null;
  private _disposed: boolean = false;

  // Lazily cached RenderMouseRegion class to avoid require() per hit-test entry
  private static _RenderMouseRegionClass: any = null;

  private static getRenderMouseRegionClass(): any {
    if (MouseManager._RenderMouseRegionClass === null) {
      const mod = require('../widgets/mouse-region');
      MouseManager._RenderMouseRegionClass = mod.RenderMouseRegion;
    }
    return MouseManager._RenderMouseRegionClass;
  }

  private constructor() {}

  /**
   * Get or create the MouseManager singleton.
   * Amp ref: Pg.instance
   */
  static get instance(): MouseManager {
    if (!MouseManager._instance) {
      MouseManager._instance = new MouseManager();
    }
    return MouseManager._instance;
  }

  /**
   * Reset the singleton (for tests).
   */
  static reset(): void {
    if (MouseManager._instance) {
      MouseManager._instance._hoveredRegions.clear();
      MouseManager._instance._cursorOverride = null;
      MouseManager._instance._rootRenderObject = null;
      MouseManager._instance._disposed = true;
    }
    MouseManager._instance = null;
  }

  /**
   * Last known mouse position (x = column, y = row, both 0-based).
   * Returns { x: -1, y: -1 } if the mouse has never been tracked.
   */
  get lastPosition(): { x: number; y: number } {
    return { ...this._lastPosition };
  }

  /**
   * Current cursor shape string.
   * Determined by cursor override (if set), or the topmost hovered RenderMouseRegion with a cursor set.
   */
  get currentCursor(): string {
    return this._cursorOverride ?? this._currentCursor;
  }

  /**
   * The set of currently hovered RenderMouseRegion instances.
   * Exposed as readonly for inspection (e.g., testing).
   */
  get hoveredRegions(): ReadonlySet<RenderMouseRegion> {
    return this._hoveredRegions;
  }

  /**
   * The root render object used for hit-testing.
   * Amp ref: Pg.setRootRenderObject(obj)
   */
  get rootRenderObject(): RenderObject | null {
    return this._rootRenderObject;
  }

  /**
   * Set the root render object for autonomous hit-testing.
   * Called by WidgetsBinding.runApp() after mounting.
   * Amp ref: J3.runApp calls this.mouseManager.setRootRenderObject(...)
   */
  setRootRenderObject(obj: RenderObject | null): void {
    if (this._disposed) return;
    this._rootRenderObject = obj;
  }

  /**
   * Called by the input system when the mouse moves.
   * Updates the stored position.
   *
   * @param x Column (0-based)
   * @param y Row (0-based)
   */
  updatePosition(x: number, y: number): void {
    if (this._disposed) return;
    this._lastPosition = { x, y };
  }

  /**
   * Called by RenderMouseRegion to register a hover (mouse entered its bounds).
   * Triggers an 'enter' event on the region and updates the cursor.
   */
  registerHover(region: RenderMouseRegion): void {
    if (this._disposed) return;
    if (this._hoveredRegions.has(region)) return;
    this._hoveredRegions.add(region);
    region.handleMouseEvent('enter', {
      x: this._lastPosition.x,
      y: this._lastPosition.y,
    });
    this.updateCursor();
  }

  /**
   * Called by RenderMouseRegion to unregister a hover (mouse exited its bounds).
   * Triggers an 'exit' event on the region and updates the cursor.
   */
  unregisterHover(region: RenderMouseRegion): void {
    if (this._disposed) return;
    if (!this._hoveredRegions.has(region)) return;
    this._hoveredRegions.delete(region);
    region.handleMouseEvent('exit', {
      x: this._lastPosition.x,
      y: this._lastPosition.y,
    });
    this.updateCursor();
  }

  /**
   * Set a cursor override from non-MouseRegion render objects (e.g., RenderText hyperlinks).
   * Pass 'default' to clear the override.
   *
   * @param cursor Cursor shape string, or 'default' to clear
   */
  updateCursorOverride(cursor: string): void {
    if (this._disposed) return;
    if (cursor === 'default') {
      this._cursorOverride = null;
    } else {
      this._cursorOverride = cursor;
    }
  }

  /**
   * Update the current cursor shape based on hovered regions.
   * The last-added region with a cursor property wins (deepest in z-order,
   * since reestablishHoverState adds regions sorted by DFS depth).
   */
  updateCursor(): void {
    if (this._disposed) return;
    let cursor = 'default';
    for (const region of this._hoveredRegions) {
      if (region.cursor) {
        cursor = region.cursor;
      }
    }
    this._currentCursor = cursor;
  }

  // -------------------------------------------------------------------------
  // Unified hit-testing via RenderBox.hitTest() (Gap #13 / #22)
  // -------------------------------------------------------------------------

  /**
   * Perform a hit-test at the given screen position using the unified
   * RenderBox.hitTest() protocol. Returns all hit BoxHitTestEntry items.
   */
  private _performHitTest(x: number, y: number): BoxHitTestEntry[] {
    if (!this._rootRenderObject) return [];
    if (!(this._rootRenderObject instanceof RenderBox)) return [];

    const result = new BoxHitTestResult();
    (this._rootRenderObject as RenderBox).hitTest(
      result,
      new Offset(x, y),
      0, // parentOffsetX  (root starts at origin)
      0, // parentOffsetY
    );
    return [...result.path];
  }

  /**
   * Filter BoxHitTestEntry entries to find RenderMouseRegion instances.
   *
   * The hit-test path is ordered parent-first (root -> ... -> leaf).
   * We scan from the deepest (end) toward the shallowest (start).
   * All RenderMouseRegion entries in the path are collected.
   *
   * Opaque semantics: when an opaque RenderMouseRegion is encountered
   * during the backward scan, we stop -- regions shallower than the
   * opaque one are excluded because the opaque region "blocks" them.
   * This prevents a parent region from receiving events that should be
   * consumed by a nested opaque child.
   *
   * The returned array is ordered from shallowest to deepest so that
   * the caller can iterate from the end to find the deepest handler.
   */
  private _extractMouseRegions(entries: BoxHitTestEntry[]): RenderMouseRegion[] {
    const RMR = MouseManager.getRenderMouseRegionClass();
    const regions: RenderMouseRegion[] = [];

    // Scan from deepest (last) to shallowest (first)
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i]!;
      if (entry.target instanceof RMR) {
        const region = entry.target as unknown as RenderMouseRegion;
        regions.push(region);
        if (region.opaque) {
          break; // opaque region blocks shallower regions
        }
      }
    }

    // Reverse so the array is shallowest-first (consistent with old behavior)
    regions.reverse();
    return regions;
  }

  /**
   * Re-evaluate hover state after layout changes.
   * Called as a post-frame callback to ensure that widgets which moved
   * under/out from the cursor are properly updated.
   *
   * Uses RenderBox.hitTest() for unified hit-testing (Gap #13 / #22).
   *
   * Amp ref: Pg.reestablishHoverState() -- registered as post-frame callback
   */
  reestablishHoverState(): void {
    if (this._disposed) return;
    if (this._lastPosition.x < 0 || this._lastPosition.y < 0) return;
    if (!this._rootRenderObject) return;

    // Run unified hit-test
    const entries = this._performHitTest(this._lastPosition.x, this._lastPosition.y);
    const hitRegions = this._extractMouseRegions(entries);

    // Build a set for quick lookup
    const hitSet = new Set<RenderMouseRegion>(hitRegions);

    // Unregister regions that are no longer hit
    for (const region of [...this._hoveredRegions]) {
      if (!hitSet.has(region)) {
        this.unregisterHover(region);
      }
    }

    // Register regions that are newly hit
    for (const region of hitRegions) {
      if (!this._hoveredRegions.has(region)) {
        this.registerHover(region);
      }
    }
  }

  /**
   * Dispatch a mouse action (scroll, press, release) to the deepest
   * hit-tested RenderMouseRegion that has a matching handler.
   *
   * Uses RenderBox.hitTest() for unified hit-testing (Gap #13 / #22).
   *
   * Called by WidgetsBinding when the mouse event action is not 'move'.
   * Hit-tests at (x, y), then dispatches to the appropriate callback
   * on the deepest matching region.
   *
   * @param action The mouse action: 'scroll', 'press', or 'release'
   * @param x Column (0-based)
   * @param y Row (0-based)
   * @param button Button code (e.g. 64=scrollUp, 65=scrollDown, 0=left)
   */
  dispatchMouseAction(
    action: 'scroll' | 'press' | 'release',
    x: number,
    y: number,
    button: number,
  ): void {
    if (this._disposed) return;
    if (!this._rootRenderObject) return;

    // Run unified hit-test
    const entries = this._performHitTest(x, y);
    const hitRegions = this._extractMouseRegions(entries);

    if (hitRegions.length === 0) return;

    // Map action to MouseEventType and the corresponding handler property
    const event = { x, y, button };

    if (action === 'scroll') {
      // Find deepest region with onScroll handler
      for (let i = hitRegions.length - 1; i >= 0; i--) {
        const region = hitRegions[i]!;
        if (region.onScroll) {
          region.handleMouseEvent('scroll', event);
          return;
        }
      }
    } else if (action === 'press') {
      // Find deepest region with onClick handler
      for (let i = hitRegions.length - 1; i >= 0; i--) {
        const region = hitRegions[i]!;
        if (region.onClick) {
          region.handleMouseEvent('click', event);
          return;
        }
      }
    } else if (action === 'release') {
      // Find deepest region with onRelease handler
      for (let i = hitRegions.length - 1; i >= 0; i--) {
        const region = hitRegions[i]!;
        if (region.onRelease) {
          region.handleMouseEvent('release', event);
          return;
        }
      }
    }
  }

  /**
   * Dispose the manager (cleanup resources).
   * Amp ref: Pg.dispose() called during J3.cleanup()
   */
  dispose(): void {
    this._hoveredRegions.clear();
    this._cursorOverride = null;
    this._rootRenderObject = null;
    this._disposed = true;
  }
}
