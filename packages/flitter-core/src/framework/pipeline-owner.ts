// PipelineOwner -- manages layout and paint scheduling
// Amp ref: UB0, amp-strings.txt:530127
// Reference: .reference/render-tree.md, .reference/frame-scheduler.md
//
// CRITICAL Amp fidelity notes:
// - Original Amp PipelineOwner has NO _nodesNeedingLayout list
// - This implementation adds _nodesNeedingLayout as infrastructure for
//   RelayoutBoundary (Gap R01). Without boundaries, behavior is identical
//   to Amp's root-only approach (list always contains only the root).
// - flushPaint() clears dirty paint flags (actual painting done by WidgetsBinding)
// - requestLayout() and requestPaint() only request a frame if not mid-frame

import { RenderBox, type RenderObject, type PipelineOwner as PipelineOwnerInterface } from './render-object';
import { BoxConstraints } from '../core/box-constraints';
import { Size } from '../core/types';

// ---------------------------------------------------------------------------
// PipelineOwner (Amp: UB0)
//
// Manages the layout/paint pipeline. Owns the root render object and
// root constraints (based on terminal size).
//
// Enhancement beyond Amp: _nodesNeedingLayout array replaces boolean flag.
// Without RelayoutBoundary, list always contains only root -- identical
// behavior to Amp's root-only approach.
// ---------------------------------------------------------------------------

export class PipelineOwner implements PipelineOwnerInterface {
  // Amp ref: UB0._rootRenderObject = null
  private _rootRenderObject: RenderBox | null = null;
  // Amp ref: UB0._rootConstraints = null
  private _rootConstraints: BoxConstraints | null = null;
  // Amp ref: UB0._nodesNeedingPaint = new Set()
  private _nodesNeedingPaint: Set<RenderObject> = new Set();

  // NEW: Replaces boolean _needsLayout flag.
  // Tracks relayout boundary nodes (or root) that need layout.
  // Processed in depth-ascending order by flushLayout().
  // Amp ref: Not present in UB0.
  // Flutter ref: PipelineOwner._nodesNeedingLayout
  private _nodesNeedingLayout: RenderObject[] = [];

  /** Amp ref: UB0._rootRenderObject getter/setter */
  get rootNode(): RenderBox | null {
    return this._rootRenderObject;
  }

  /**
   * Set the root render object.
   * Amp ref: UB0.setRootRenderObject(g)
   */
  setRootRenderObject(node: RenderBox | null): void {
    this._rootRenderObject = node;
    if (node) {
      node.attach(this);
      // Root starts dirty from construction (_needsLayout = true).
      // Ensure it's registered for layout immediately.
      if (node.needsLayout) {
        this.addNodeNeedingLayout(node);
      }
    }
  }

  /**
   * Register a node for layout in the next flushLayout() pass.
   * Called by markNeedsLayout() when propagation reaches a boundary.
   *
   * Duplicates are prevented by the _needsLayout guard in
   * markNeedsLayout() -- a node that is already dirty will not
   * call this method twice.
   */
  addNodeNeedingLayout(node: RenderObject): void {
    this._nodesNeedingLayout.push(node);
  }

  /**
   * Backward-compatible entry point: adds root to layout list.
   * Called by root RenderObject's markNeedsLayout().
   *
   * Amp ref: UB0.requestLayout(g) -- just triggers frame request
   */
  requestLayout(): void {
    if (this._rootRenderObject) {
      this.addNodeNeedingLayout(this._rootRenderObject);
    }
    // In full implementation, calls c9.instance.requestFrame()
    // That wiring happens in WidgetsBinding
  }

  /**
   * Register a specific node for layout.
   * Used when RelayoutBoundary stops propagation at a non-root node.
   */
  requestLayoutFor(node: RenderObject): void {
    this.addNodeNeedingLayout(node);
  }

  /**
   * Called by RenderObject.markNeedsPaint() to register a node for paint.
   * Amp ref: UB0.requestPaint(g) -- adds to _nodesNeedingPaint set
   */
  requestPaint(node?: RenderObject): void {
    if (node) {
      if (this._nodesNeedingPaint.has(node)) return;
      this._nodesNeedingPaint.add(node);
    }
    // In full implementation, calls c9.instance.requestFrame()
  }

  /**
   * Update root constraints based on terminal size.
   * Amp ref: UB0.updateRootConstraints(g) -- creates BoxConstraints(0..width, 0..height)
   */
  updateRootConstraints(size: Size): void {
    const newConstraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: size.width,
      minHeight: 0,
      maxHeight: size.height,
    });

    const changed =
      !this._rootConstraints ||
      this._rootConstraints.maxWidth !== newConstraints.maxWidth ||
      this._rootConstraints.maxHeight !== newConstraints.maxHeight;

    this._rootConstraints = newConstraints;

    if (changed && this._rootRenderObject) {
      this._rootRenderObject.markNeedsLayout();
    }
  }

  /**
   * Set constraints directly (convenience method).
   */
  setConstraints(constraints: BoxConstraints): void {
    const changed =
      !this._rootConstraints ||
      !constraints.equals(this._rootConstraints);

    this._rootConstraints = constraints;

    if (changed) {
      if (this._rootRenderObject) {
        this._rootRenderObject.markNeedsLayout();
      }
    }
  }

  /**
   * Process all dirty layout nodes in depth-ascending order.
   *
   * Depth ordering ensures parents are laid out before children.
   * When a parent's performLayout() calls child.layout(), the child's
   * _needsLayout flag is cleared. If the child was also in the list,
   * it is skipped (the guard `if (!node.needsLayout || !node.attached)`
   * handles this).
   *
   * The while loop handles re-entrant additions: if a node's
   * performLayout() marks another node dirty (e.g., a sibling),
   * that new entry is processed in a subsequent iteration.
   *
   * Amp ref: UB0.flushLayout() -- root-only layout.
   * Flutter ref: PipelineOwner.flushLayout() -- depth-sorted list.
   */
  flushLayout(): boolean {
    if (this._nodesNeedingLayout.length === 0) {
      return false;
    }

    let layoutPerformed = false;

    while (this._nodesNeedingLayout.length > 0) {
      // Sort by depth ascending (parents first).
      // For the common case of 1-3 entries, sort overhead is negligible.
      this._nodesNeedingLayout.sort(
        (a, b) => a.depth - b.depth,
      );

      // Snapshot and clear -- performLayout may add new entries.
      const dirtyNodes = this._nodesNeedingLayout.splice(0);

      for (const node of dirtyNodes) {
        // Skip if already cleaned (a parent's layout handled this child)
        // or if detached from the tree.
        if (!node.needsLayout || !node.attached) {
          continue;
        }

        // Root gets rootConstraints; other nodes use their cached constraints.
        if (node === this._rootRenderObject && this._rootConstraints) {
          (node as RenderBox).layout(this._rootConstraints);
          layoutPerformed = true;
        } else if (node instanceof RenderBox) {
          const cached = node.constraints;
          if (cached) {
            node.layout(cached);
            layoutPerformed = true;
          }
        }
      }
    }

    return layoutPerformed;
  }

  /**
   * Clear paint dirty flags.
   * Actual painting is done by WidgetsBinding.paint() in the PAINT phase.
   *
   * Amp ref: UB0.flushPaint() -- clears _needsPaint on each node, then clears set
   */
  flushPaint(): void {
    if (this._nodesNeedingPaint.size === 0) return;
    try {
      for (const node of this._nodesNeedingPaint) {
        if (node.needsPaint) {
          node.clearNeedsPaint();
        }
      }
    } finally {
      this._nodesNeedingPaint.clear();
    }
  }

  /**
   * Whether any nodes are registered for layout.
   */
  get hasNodesNeedingLayout(): boolean {
    return this._nodesNeedingLayout.length > 0;
  }

  /**
   * Return a snapshot of nodes awaiting layout.
   * Useful for diagnostics and testing.
   */
  get nodesNeedingLayout(): ReadonlyArray<RenderObject> {
    return [...this._nodesNeedingLayout];
  }

  /** Amp ref: UB0.hasNodesNeedingPaint */
  get hasNodesNeedingPaint(): boolean {
    return this._nodesNeedingPaint.size > 0;
  }

  /** Check if paint is needed */
  get needsPaint(): boolean {
    return this._nodesNeedingPaint.size > 0;
  }

  /** Remove a node from all queues (layout and paint) */
  removeFromQueues(node: RenderObject): void {
    this._nodesNeedingPaint.delete(node);
    const layoutIdx = this._nodesNeedingLayout.indexOf(node);
    if (layoutIdx >= 0) {
      this._nodesNeedingLayout.splice(layoutIdx, 1);
    }
  }

  /** Amp ref: UB0.dispose() */
  dispose(): void {
    this._nodesNeedingPaint.clear();
    this._nodesNeedingLayout.length = 0;
    this._rootRenderObject = null;
    this._rootConstraints = null;
  }

}
