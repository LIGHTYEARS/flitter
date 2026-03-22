// MouseManager — global mouse tracking singleton
// Amp ref: Pg class — coordinates hover enter/exit events between RenderMouseRegion instances
// Tracks mouse position, hovered regions, and cursor shape

import type { RenderMouseRegion } from '../widgets/mouse-region';

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
  private _hoveredRegions: Set<RenderMouseRegion> = new Set();

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
   * Determined by the topmost hovered RenderMouseRegion with a cursor set.
   */
  get currentCursor(): string {
    return this._currentCursor;
  }

  /**
   * The set of currently hovered RenderMouseRegion instances.
   * Exposed as readonly for inspection (e.g., testing).
   */
  get hoveredRegions(): ReadonlySet<RenderMouseRegion> {
    return this._hoveredRegions;
  }

  /**
   * Called by the input system when the mouse moves.
   * Updates the stored position.
   *
   * @param x Column (0-based)
   * @param y Row (0-based)
   */
  updatePosition(x: number, y: number): void {
    this._lastPosition = { x, y };
  }

  /**
   * Called by RenderMouseRegion to register a hover (mouse entered its bounds).
   * Triggers an 'enter' event on the region and updates the cursor.
   */
  registerHover(region: RenderMouseRegion): void {
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
    if (!this._hoveredRegions.has(region)) return;
    this._hoveredRegions.delete(region);
    region.handleMouseEvent('exit', {
      x: this._lastPosition.x,
      y: this._lastPosition.y,
    });
    this.updateCursor();
  }

  /**
   * Update the current cursor shape based on hovered regions.
   * The last registered region with a cursor property wins (topmost).
   * If no region specifies a cursor, defaults to 'default'.
   */
  updateCursor(): void {
    let cursor = 'default';
    for (const region of this._hoveredRegions) {
      if (region.cursor) {
        cursor = region.cursor;
      }
    }
    this._currentCursor = cursor;
  }
}
