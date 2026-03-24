// MouseManager — global mouse tracking singleton
// Amp ref: Pg class — coordinates hover enter/exit events between RenderMouseRegion instances
// Tracks mouse position, hovered regions, and cursor shape

import type { RenderMouseRegion } from '../widgets/mouse-region';
import type { RenderBox, RenderObject } from '../framework/render-object';

// Lazily cached RenderMouseRegion class to avoid require() per DFS node
let _RenderMouseRegionClass: any = null;

function getRenderMouseRegionClass(): any {
  if (_RenderMouseRegionClass === null) {
    const mod = require('../widgets/mouse-region');
    _RenderMouseRegionClass = mod.RenderMouseRegion;
  }
  return _RenderMouseRegionClass;
}

/** Hit-test result entry with DFS depth for z-ordering. */
interface HitTestEntry {
  region: RenderMouseRegion;
  depth: number;
}

/**
 * Global mouse tracking manager.
 * Singleton that coordinates mouse position, hover state, and cursor shape
 * across all RenderMouseRegion instances.
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

  /**
   * Re-evaluate hover state after layout changes.
   * Called as a post-frame callback to ensure that widgets which moved
   * under/out from the cursor are properly updated.
   *
   * Uses accumulated offsets during DFS traversal so nested layouts
   * are correctly positioned. Respects opaque regions to block hit-testing.
   *
   * Amp ref: Pg.reestablishHoverState() — registered as post-frame callback
   */
  reestablishHoverState(): void {
    if (this._disposed) return;
    if (this._lastPosition.x < 0 || this._lastPosition.y < 0) return;
    if (!this._rootRenderObject) return;

    // Collect all hit RenderMouseRegion instances with DFS depth
    const hitEntries: HitTestEntry[] = [];
    this._hitTest(
      this._rootRenderObject,
      this._lastPosition.x,
      this._lastPosition.y,
      0, // parentOffsetX
      0, // parentOffsetY
      0, // DFS depth
      hitEntries,
    );

    // Build a set of hit regions for quick lookup
    const hitRegions = new Set<RenderMouseRegion>();
    for (const entry of hitEntries) {
      hitRegions.add(entry.region);
    }

    // Unregister regions that are no longer hit
    for (const region of [...this._hoveredRegions]) {
      if (!hitRegions.has(region)) {
        this.unregisterHover(region);
      }
    }

    // Register regions that are newly hit (in DFS order — shallowest first)
    // Sort by depth so deepest regions are added last (for cursor z-order,
    // since updateCursor picks the last region with a cursor).
    hitEntries.sort((a, b) => a.depth - b.depth);
    for (const entry of hitEntries) {
      if (!this._hoveredRegions.has(entry.region)) {
        this.registerHover(entry.region);
      }
    }
  }

  /**
   * DFS hit-test traversal of the render tree to find RenderMouseRegion
   * instances that contain the given position.
   *
   * Accumulates global offsets during traversal so nested layouts are
   * correctly positioned.
   *
   * Respects RenderMouseRegion.opaque to block hit-testing of regions
   * behind opaque ones.
   *
   * Returns true if an opaque region was hit (to signal parent to stop).
   */
  private _hitTest(
    node: RenderObject,
    x: number,
    y: number,
    parentOffsetX: number,
    parentOffsetY: number,
    depth: number,
    results: HitTestEntry[],
  ): boolean {
    const RMR = getRenderMouseRegionClass();

    // Calculate this node's global offset by adding parent offset + own offset
    const box = node as unknown as RenderBox;
    let globalX = parentOffsetX;
    let globalY = parentOffsetY;
    if (typeof box.offset !== 'undefined' && box.offset !== null) {
      globalX += box.offset.col;
      globalY += box.offset.row;
    }

    let opaqueHit = false;

    // Check if this node is a RenderMouseRegion
    if (node instanceof RMR) {
      const region = node as unknown as RenderMouseRegion;
      if (typeof box.size !== 'undefined' && box.size !== null) {
        if (
          x >= globalX &&
          x < globalX + box.size.width &&
          y >= globalY &&
          y < globalY + box.size.height
        ) {
          results.push({ region, depth });
          // If this region is opaque, signal that regions behind it are blocked
          if (region.opaque) {
            opaqueHit = true;
          }
        }
      }
    }

    // Visit children in reverse order (last child = topmost = highest z-order)
    // so that if an opaque child is hit, we can stop checking lower siblings
    const children: RenderObject[] = [];
    node.visitChildren((child: RenderObject) => {
      children.push(child);
    });

    // Traverse children back-to-front (topmost first for opaque blocking)
    for (let i = children.length - 1; i >= 0; i--) {
      const childOpaqueHit = this._hitTest(
        children[i],
        x,
        y,
        globalX,
        globalY,
        depth + 1,
        results,
      );
      if (childOpaqueHit) {
        // An opaque region deeper in this subtree was hit.
        // Skip remaining siblings (they are behind the opaque region).
        opaqueHit = true;
        break;
      }
    }

    return opaqueHit;
  }

  /**
   * Dispatch a mouse action (scroll, press, release) to the deepest
   * hit-tested RenderMouseRegion that has a matching handler.
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

    // Hit-test to find all RenderMouseRegion instances at this position
    const hitEntries: HitTestEntry[] = [];
    this._hitTest(
      this._rootRenderObject,
      x,
      y,
      0, // parentOffsetX
      0, // parentOffsetY
      0, // DFS depth
      hitEntries,
    );

    if (hitEntries.length === 0) return;

    // Sort by depth so deepest region is last
    hitEntries.sort((a, b) => a.depth - b.depth);

    // Map action to MouseEventType and the corresponding handler property
    const event = { x, y, button };

    if (action === 'scroll') {
      // Find deepest region with onScroll handler
      for (let i = hitEntries.length - 1; i >= 0; i--) {
        const region = hitEntries[i].region;
        if (region.onScroll) {
          region.handleMouseEvent('scroll', event);
          return;
        }
      }
    } else if (action === 'press') {
      // Find deepest region with onClick handler
      for (let i = hitEntries.length - 1; i >= 0; i--) {
        const region = hitEntries[i].region;
        if (region.onClick) {
          region.handleMouseEvent('click', event);
          return;
        }
      }
    } else if (action === 'release') {
      // Find deepest region with onRelease handler
      for (let i = hitEntries.length - 1; i >= 0; i--) {
        const region = hitEntries[i].region;
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
