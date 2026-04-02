// OverlayManager — centralized overlay lifecycle and rendering
//
// Manages a priority-ordered stack of overlay entries. Replaces the ad-hoc
// if/else-if chain in app.ts with a declarative, priority-sorted system.
//
// Key behaviors:
// - Entries are maintained in priority-sorted order (ascending: lowest first)
// - show() adds or replaces an entry by id (idempotent)
// - dismiss() removes an entry by id
// - dismissTop() pops the highest-priority entry (for Escape handling)
// - buildOverlays() produces a Stack widget layering all active entries
//   on top of the base content

import type { Widget } from 'flitter-core/src/framework/widget';
import { Stack, Positioned } from 'flitter-core/src/widgets/stack';
import { Container } from 'flitter-core/src/widgets/container';
import { BoxDecoration } from 'flitter-core/src/layout/render-decorated';
import { Color } from 'flitter-core/src/core/color';
import type { StateListener } from './app-state';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Describes how an overlay is positioned within the viewport.
 *
 * - 'fullscreen': Positioned with top:0, left:0, right:0, bottom:0
 * - 'anchored': Positioned with specific edges
 */
export type OverlayPlacement =
  | { type: 'fullscreen' }
  | { type: 'anchored'; left?: number; top?: number; right?: number; bottom?: number };

/**
 * Configuration for a single overlay layer.
 */
export interface OverlayEntry {
  /** Unique identifier for this overlay (e.g., 'permission', 'commandPalette'). */
  readonly id: string;

  /**
   * Numeric priority. Higher values render on top and receive
   * Escape dismissal first.
   */
  readonly priority: number;

  /**
   * Whether this overlay is modal. A modal overlay:
   * - Renders a semi-transparent background mask behind it
   * - Consumes all keyboard input not handled by its own FocusScope
   */
  readonly modal: boolean;

  /** How the overlay is positioned within the Stack. */
  readonly placement: OverlayPlacement;

  /**
   * Builder function that returns the overlay widget.
   * Called during each build cycle while the entry is active.
   * Receives an onDismiss callback that removes this entry.
   */
  readonly builder: (onDismiss: () => void) => Widget;
}

// ---------------------------------------------------------------------------
// OverlayManager
// ---------------------------------------------------------------------------

/**
 * Manages a priority-ordered stack of overlay entries.
 *
 * The manager is a standalone observable (listener pattern matching AppState)
 * that holds the source of truth for which overlays are visible and their
 * ordering.
 */
export class OverlayManager {
  private entries: OverlayEntry[] = [];
  private listeners: Set<StateListener> = new Set();

  // --- Listener Management ---

  addListener(listener: StateListener): void {
    this.listeners.add(listener);
  }

  removeListener(listener: StateListener): void {
    this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  // --- Entry Management ---

  /**
   * Show an overlay. If an entry with the same id already exists,
   * it is replaced (updated). Entries are kept sorted by priority
   * ascending (lowest priority first = painted first = behind higher ones).
   */
  show(entry: OverlayEntry): void {
    this.entries = this.entries.filter((e) => e.id !== entry.id);
    let insertIndex = this.entries.length;
    for (let i = 0; i < this.entries.length; i++) {
      if (this.entries[i].priority > entry.priority) {
        insertIndex = i;
        break;
      }
    }
    this.entries.splice(insertIndex, 0, entry);
    this.notifyListeners();
  }

  /**
   * Dismiss (remove) an overlay by id.
   * No-op if the id is not found.
   */
  dismiss(id: string): void {
    const prevLength = this.entries.length;
    this.entries = this.entries.filter((e) => e.id !== id);
    if (this.entries.length !== prevLength) {
      this.notifyListeners();
    }
  }

  /**
   * Dismiss the highest-priority overlay. Used by the Escape key handler.
   * Returns the id of the dismissed entry, or null if no overlays are active.
   */
  dismissTop(): string | null {
    if (this.entries.length === 0) return null;
    const top = this.entries[this.entries.length - 1];
    this.entries = this.entries.slice(0, -1);
    this.notifyListeners();
    return top.id;
  }

  /**
   * Dismiss all overlays at once.
   */
  dismissAll(): void {
    if (this.entries.length === 0) return;
    this.entries = [];
    this.notifyListeners();
  }

  /**
   * Whether any overlays are currently active.
   */
  get hasOverlays(): boolean {
    return this.entries.length > 0;
  }

  /**
   * The number of active overlays.
   */
  get count(): number {
    return this.entries.length;
  }

  /**
   * The highest-priority active entry, or null.
   */
  get topEntry(): OverlayEntry | null {
    return this.entries.length > 0
      ? this.entries[this.entries.length - 1]
      : null;
  }

  /**
   * Check whether a specific overlay is currently active.
   */
  has(id: string): boolean {
    return this.entries.some((e) => e.id === id);
  }

  /**
   * All active entries in priority order (ascending).
   * Returns a defensive copy.
   */
  get activeEntries(): readonly OverlayEntry[] {
    return [...this.entries];
  }

  // --- Widget Building ---

  /**
   * Build the final widget tree by layering all active overlays
   * on top of the base content widget.
   *
   * If no overlays are active, returns baseContent directly
   * (no unnecessary Stack wrapper).
   *
   * For each entry:
   * - If modal, a semi-transparent mask is inserted before the overlay widget
   * - The overlay widget is wrapped in a Positioned according to its placement
   *
   * Children order: [base, mask1?, overlay1, mask2?, overlay2, ...]
   * Lower-priority entries are first (painted behind higher ones).
   */
  buildOverlays(baseContent: Widget): Widget {
    if (this.entries.length === 0) {
      return baseContent;
    }

    const stackChildren: Widget[] = [baseContent];

    for (const entry of this.entries) {
      // Modal mask
      if (entry.modal) {
        stackChildren.push(
          new Positioned({
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            child: new Container({
              decoration: new BoxDecoration({ color: Color.rgb(0, 0, 0).withAlpha(0.6) }),
            }),
          }),
        );
      }

      // Overlay widget
      const overlayWidget = entry.builder(() => this.dismiss(entry.id));

      if (entry.placement.type === 'fullscreen') {
        stackChildren.push(
          new Positioned({
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            child: overlayWidget,
          }),
        );
      } else {
        const { left, top, right, bottom } = entry.placement;
        stackChildren.push(
          new Positioned({
            left,
            top,
            right,
            bottom,
            child: overlayWidget,
          }),
        );
      }
    }

    return new Stack({
      fit: 'expand',
      children: stackChildren,
    });
  }
}
