// BuildOwner — manages dirty element set and build scopes
// Amp ref: NB0, amp-strings.txt:530126
// Reference: .reference/element-tree.md, .reference/widget-tree.md
//
// CRITICAL Amp fidelity notes:
// - Uses Set (not List) for dirty elements — auto-dedup
// - Rebuild loop uses while loop for cascading dirtying (not for loop)
// - buildScopes() sorts by depth (parents before children)
// - performRebuild() is called, then _dirty is cleared (even on error)

import { Element } from './element';
import { GlobalKey } from '../core/key';
import { FrameScheduler } from '../scheduler/frame-scheduler';
import { debugFlags } from '../diagnostics/debug-flags';
import { pipelineLog } from '../diagnostics/pipeline-debug';

// ---------------------------------------------------------------------------
// GlobalKeyRegistry — tracks GlobalKey -> Element associations
// Amp ref: Zs (GlobalKey) static _registry, _setElement, _clearElement
// ---------------------------------------------------------------------------

export class GlobalKeyRegistry {
  private _registry: Map<string, Element> = new Map();

  register(key: GlobalKey, element: Element): void {
    const keyStr = key.toString();
    if (this._registry.has(keyStr)) {
      throw new Error(
        `GlobalKey ${keyStr} is already associated with an element. ` +
          `Each GlobalKey can only be used once in the widget tree.`,
      );
    }
    this._registry.set(keyStr, element);
  }

  unregister(key: GlobalKey, element: Element): void {
    const keyStr = key.toString();
    const current = this._registry.get(keyStr);
    if (current === element) {
      this._registry.delete(keyStr);
    }
  }

  getElement(key: GlobalKey): Element | undefined {
    return this._registry.get(key.toString());
  }

  clear(): void {
    this._registry.clear();
  }

  get size(): number {
    return this._registry.size;
  }
}

// ---------------------------------------------------------------------------
// BuildOwner (Amp: NB0)
//
// Manages the build phase of the frame pipeline:
//   1. scheduleBuildFor(element) — adds to dirty set
//   2. buildScopes() — processes all dirty elements depth-sorted
//
// The while loop in buildScopes() handles cascading dirtying:
// rebuilding element A may mark element B dirty, which gets picked up
// in the next iteration of the while loop.
// ---------------------------------------------------------------------------

export class BuildOwner {
  // Amp ref: NB0._dirtyElements = new Set()
  private _dirtyElements: Set<Element> = new Set();
  private _building: boolean = false;

  // Inactive elements set — holds deactivated elements until end of frame.
  // Elements in this set will be permanently unmounted by finalizeTree()
  // unless they are reactivated via GlobalKey reparenting.
  // NOTE: Not present in Amp binary. Extension for GlobalKey reparenting.
  // Amp ref deviation: See .gap/02-deactivate-lifecycle.md
  _inactiveElements: Set<Element> = new Set();

  // Build stats (Amp ref: NB0._stats, NB0._buildTimes, NB0._elementsPerFrame)
  private _stats = {
    totalRebuilds: 0,
    elementsRebuiltThisFrame: 0,
    maxElementsPerFrame: 0,
    averageElementsPerFrame: 0,
    lastBuildTime: 0,
    averageBuildTime: 0,
    maxBuildTime: 0,
  };
  private _buildTimes: number[] = [];
  private _elementsPerFrame: number[] = [];

  // GlobalKey registry
  readonly globalKeyRegistry: GlobalKeyRegistry = new GlobalKeyRegistry();

  /**
   * Schedule an element for rebuild in the next build scope.
   * Deduplicates via Set.
   *
   * Amp ref: NB0.scheduleBuildFor(g) — adds to set, requests frame
   */
  scheduleBuildFor(element: Element): void {
    if (this._dirtyElements.has(element)) return;
    this._dirtyElements.add(element);
    // Amp ref: NB0.scheduleBuildFor calls c9.instance.requestFrame() directly
    FrameScheduler.instance.requestFrame();
  }

  /**
   * Process all dirty elements in depth-first order.
   *
   * From Amp: sorts by depth, uses while loop for cascading dirtying.
   * - Snapshot the dirty set, clear it, sort by depth
   * - Rebuild each element (performRebuild + clear dirty flag)
   * - If rebuilds added new dirty elements, loop again
   *
   * Amp ref: NB0.buildScopes()
   */
  buildScope(callback?: () => void): void {
    callback?.();
    this._building = true;

    const startTime = performance.now();
    let rebuiltCount = 0;

    try {
      // Amp: while (this._dirtyElements.size > 0)
      const dirtyCount = this._dirtyElements.size;
      while (this._dirtyElements.size > 0) {
        const elements = Array.from(this._dirtyElements);
        this._dirtyElements.clear();

        // Sort by depth — parents (shallowest) rebuild before children
        // Amp ref: b.sort((s, a) => s.depth - a.depth)
        elements.sort((a, b) => a.depth - b.depth);

        for (const element of elements) {
          if (element.dirty) {
            try {
              element.performRebuild();
              element._dirty = false;
              rebuiltCount++;
            } catch (error) {
              // Amp ref: catch (a) { V.error(...); s._dirty = !1; }
              // Last-resort safety net — most build errors are caught inside
              // StatelessElement/StatefulElement.rebuild() and substituted with ErrorWidget.
              // This catch handles errors in the child diffing logic itself.
              // Gap ref: .gap/05-error-widget.md
              console.error('Element rebuild error:', {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                elementType: element.widget?.constructor?.name,
              });
              // Clear dirty even on error to prevent infinite loops
              element._dirty = false;
            }
          }
        }
        // If rebuild() called setState() or markNeedsBuild() on other elements,
        // _dirtyElements may have new entries — while loop handles this
      }

      if (debugFlags.debugPrintBuilds) {
        pipelineLog('BUILD', `dirty=${dirtyCount} rebuilt=${rebuiltCount}`);
      }
    } finally {
      this._recordBuildStats(performance.now() - startTime, rebuiltCount);
      this._building = false;
    }
  }

  /**
   * Convenience alias matching Amp's buildScopes() (no callback variant).
   * Amp ref: NB0.buildScopes()
   */
  buildScopes(): void {
    this.buildScope();
  }

  get isBuilding(): boolean {
    return this._building;
  }

  get dirtyElementCount(): number {
    return this._dirtyElements.size;
  }

  /** Amp ref: NB0.hasDirtyElements */
  get hasDirtyElements(): boolean {
    return this._dirtyElements.size > 0;
  }

  /** Amp ref: NB0.buildStats */
  get buildStats(): Readonly<typeof this._stats> {
    return { ...this._stats };
  }

  /**
   * Record build stats with rolling 60-frame window.
   * Amp ref: NB0.recordBuildStats(time, count)
   */
  private _recordBuildStats(duration: number, count: number): void {
    this._stats.totalRebuilds += count;
    this._stats.elementsRebuiltThisFrame = count;
    this._stats.lastBuildTime = duration;
    this._stats.maxElementsPerFrame = Math.max(
      this._stats.maxElementsPerFrame,
      count,
    );
    this._stats.maxBuildTime = Math.max(this._stats.maxBuildTime, duration);

    this._buildTimes.push(duration);
    this._elementsPerFrame.push(count);

    // Rolling window of 60 samples (matches 60fps target)
    if (this._buildTimes.length > 60) {
      this._buildTimes.shift();
      this._elementsPerFrame.shift();
    }

    this._stats.averageBuildTime =
      this._buildTimes.reduce((sum, t) => sum + t, 0) /
      this._buildTimes.length;
    this._stats.averageElementsPerFrame =
      this._elementsPerFrame.reduce((sum, c) => sum + c, 0) /
      this._elementsPerFrame.length;
  }

  /** Amp ref: NB0.dispose() */
  dispose(): void {
    // Unmount any remaining inactive elements
    for (const element of this._inactiveElements) {
      element.unmount();
    }
    this._inactiveElements.clear();
    this._dirtyElements.clear();
    this.globalKeyRegistry.clear();
    GlobalKey._clearRegistry();
  }

  // --- Inactive elements management ---
  // NOTE: Not present in Amp binary. Extension for GlobalKey reparenting.
  // Amp ref deviation: See .gap/02-deactivate-lifecycle.md

  /**
   * Add an element to the inactive set.
   * Called by deactivateChild() when an element is removed from the tree.
   * The element will be permanently unmounted at the end of the frame
   * unless it is reactivated via GlobalKey reparenting.
   */
  _addToInactiveElements(element: Element): void {
    this._inactiveElements.add(element);
  }

  /**
   * Remove an element from the inactive set (e.g., when reactivated).
   */
  _removeFromInactiveElements(element: Element): void {
    this._inactiveElements.delete(element);
  }

  /**
   * Finalize the tree at the end of the frame.
   * Permanently unmounts all elements that remain in the inactive set
   * (i.e., were not reactivated via GlobalKey reparenting during this frame).
   *
   * This must be called at the end of every frame, after buildScopes().
   * Flutter equivalent: BuildOwner.finalizeTree()
   */
  finalizeTree(): void {
    for (const element of this._inactiveElements) {
      element.unmount();
    }
    this._inactiveElements.clear();
  }
}
