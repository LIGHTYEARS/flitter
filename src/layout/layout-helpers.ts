// Layout helper functions — standalone utilities for widget tree analysis
// Amp ref: fS function — standalone layout width estimator

import { Widget, StatelessWidget, StatefulWidget } from '../framework/widget';
import { SingleChildRenderObjectWidget, MultiChildRenderObjectWidget } from '../framework/render-object';
import { Text } from '../widgets/text';
import { SizedBox } from '../widgets/sized-box';
import { Container } from '../widgets/container';
import { Padding } from '../widgets/padding';
import { Row, Column } from '../widgets/flex';

/**
 * Estimate the intrinsic width of a widget tree.
 * Walks the tree recursively, checking common widget types
 * for their content width (TextSpan width, SizedBox width constraints, etc.).
 *
 * Amp ref: fS function -- standalone layout width estimator
 *
 * @param widget The root widget to estimate width for
 * @returns Estimated minimum intrinsic width in terminal columns
 */
export function estimateIntrinsicWidth(widget: Widget): number {
  // Text widget: compute width from TextSpan
  if (widget instanceof Text) {
    return widget.text.computeWidth();
  }

  // SizedBox: return the width constraint if set
  if (widget instanceof SizedBox) {
    if (widget.width !== undefined && isFinite(widget.width)) {
      return widget.width;
    }
    // If SizedBox has a child but no explicit width, recurse into child
    if (widget.child) {
      return estimateIntrinsicWidth(widget.child);
    }
    return 0;
  }

  // Container: check width constraint, recurse into child
  if (widget instanceof Container) {
    if (widget.width !== undefined && isFinite(widget.width)) {
      // Add padding if present
      const paddingH = widget.padding ? widget.padding.horizontal : 0;
      return widget.width + paddingH;
    }
    // No explicit width -- estimate from child + padding
    const childWidth = widget.containerChild
      ? estimateIntrinsicWidth(widget.containerChild)
      : 0;
    const paddingH = widget.padding ? widget.padding.horizontal : 0;
    return childWidth + paddingH;
  }

  // Padding: add horizontal padding to child width
  if (widget instanceof Padding) {
    const childWidth = widget.child
      ? estimateIntrinsicWidth(widget.child)
      : 0;
    return childWidth + widget.padding.horizontal;
  }

  // Row: sum children widths
  if (widget instanceof Row) {
    let total = 0;
    for (const child of widget.children) {
      total += estimateIntrinsicWidth(child);
    }
    return total;
  }

  // Column: max of children widths
  if (widget instanceof Column) {
    let max = 0;
    for (const child of widget.children) {
      const w = estimateIntrinsicWidth(child);
      if (w > max) max = w;
    }
    return max;
  }

  // StatelessWidget / StatefulWidget: can't inspect build output without BuildContext
  if (widget instanceof StatelessWidget || widget instanceof StatefulWidget) {
    return 0;
  }

  // SingleChildRenderObjectWidget: recurse into child if available
  if (widget instanceof SingleChildRenderObjectWidget) {
    if (widget.child) {
      return estimateIntrinsicWidth(widget.child);
    }
    return 0;
  }

  // MultiChildRenderObjectWidget: return max of children widths as default
  if (widget instanceof MultiChildRenderObjectWidget) {
    let max = 0;
    for (const child of widget.children) {
      const w = estimateIntrinsicWidth(child);
      if (w > max) max = w;
    }
    return max;
  }

  // Default: unknown widget type
  return 0;
}
