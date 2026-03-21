// MouseRegion widget — detects mouse events on its child
// Amp ref: T3, Ba classes in widgets-catalog.md
// SingleChildRenderObjectWidget with RenderMouseRegion

import { Widget } from '../framework/widget';
import { Key } from '../core/key';
import { Offset, Size } from '../core/types';
import { BoxConstraints } from '../core/box-constraints';
import {
  SingleChildRenderObjectWidget,
  RenderBox,
  RenderObject,
  type PaintContext,
} from '../framework/render-object';

// ---------------------------------------------------------------------------
// Mouse event types for MouseRegion
// ---------------------------------------------------------------------------

export interface MouseRegionEvent {
  readonly x: number;
  readonly y: number;
  readonly button?: number;
}

export type MouseEventType = 'click' | 'enter' | 'exit' | 'hover' | 'scroll';

// ---------------------------------------------------------------------------
// RenderMouseRegion
// ---------------------------------------------------------------------------

/**
 * Render object that detects mouse events within its bounds.
 * Delegates layout and painting entirely to its child.
 *
 * Amp ref: Ba RenderObject (mouse hit detection)
 */
export class RenderMouseRegion extends RenderBox {
  private _child: RenderBox | null = null;
  onClick?: (event: MouseRegionEvent) => void;
  onEnter?: (event: MouseRegionEvent) => void;
  onExit?: (event: MouseRegionEvent) => void;
  onHover?: (event: MouseRegionEvent) => void;
  onScroll?: (event: MouseRegionEvent) => void;
  cursor?: string;

  constructor(opts?: {
    onClick?: (event: MouseRegionEvent) => void;
    onEnter?: (event: MouseRegionEvent) => void;
    onExit?: (event: MouseRegionEvent) => void;
    onHover?: (event: MouseRegionEvent) => void;
    onScroll?: (event: MouseRegionEvent) => void;
    cursor?: string;
  }) {
    super();
    this.onClick = opts?.onClick;
    this.onEnter = opts?.onEnter;
    this.onExit = opts?.onExit;
    this.onHover = opts?.onHover;
    this.onScroll = opts?.onScroll;
    this.cursor = opts?.cursor;
  }

  get child(): RenderBox | null {
    return this._child;
  }

  set child(value: RenderBox | null) {
    if (this._child) {
      this.dropChild(this._child);
    }
    this._child = value;
    if (value) {
      this.adoptChild(value);
    }
  }

  /**
   * Whether this region has any mouse listeners registered.
   */
  get hasMouseListeners(): boolean {
    return !!(this.onClick || this.onEnter || this.onExit || this.onHover || this.onScroll);
  }

  /**
   * Dispatch a mouse event to the appropriate callback.
   */
  handleMouseEvent(eventType: MouseEventType, event: MouseRegionEvent): void {
    switch (eventType) {
      case 'click':
        this.onClick?.(event);
        break;
      case 'enter':
        this.onEnter?.(event);
        break;
      case 'exit':
        this.onExit?.(event);
        break;
      case 'hover':
        this.onHover?.(event);
        break;
      case 'scroll':
        this.onScroll?.(event);
        break;
    }
  }

  performLayout(): void {
    const constraints = this.constraints!;
    if (this._child) {
      this._child.layout(constraints);
      this.size = this._child.size;
    } else {
      this.size = constraints.constrain(Size.zero);
    }
  }

  paint(context: PaintContext, offset: Offset): void {
    if (this._child) {
      this._child.paint(context, offset.add(this._child.offset));
    }
  }

  visitChildren(visitor: (child: RenderObject) => void): void {
    if (this._child) {
      visitor(this._child);
    }
  }
}

// ---------------------------------------------------------------------------
// MouseRegion Widget
// ---------------------------------------------------------------------------

/**
 * A widget that detects mouse events within its child's bounds.
 *
 * Usage:
 *   new MouseRegion({
 *     onClick: (e) => console.log('clicked', e.x, e.y),
 *     onEnter: (e) => console.log('entered'),
 *     child: someWidget,
 *   })
 */
export class MouseRegion extends SingleChildRenderObjectWidget {
  readonly onClick?: (event: MouseRegionEvent) => void;
  readonly onEnter?: (event: MouseRegionEvent) => void;
  readonly onExit?: (event: MouseRegionEvent) => void;
  readonly onHover?: (event: MouseRegionEvent) => void;
  readonly onScroll?: (event: MouseRegionEvent) => void;
  readonly cursor?: string;

  constructor(opts?: {
    key?: Key;
    child?: Widget;
    onClick?: (event: MouseRegionEvent) => void;
    onEnter?: (event: MouseRegionEvent) => void;
    onExit?: (event: MouseRegionEvent) => void;
    onHover?: (event: MouseRegionEvent) => void;
    onScroll?: (event: MouseRegionEvent) => void;
    cursor?: string;
  }) {
    super({ key: opts?.key, child: opts?.child });
    this.onClick = opts?.onClick;
    this.onEnter = opts?.onEnter;
    this.onExit = opts?.onExit;
    this.onHover = opts?.onHover;
    this.onScroll = opts?.onScroll;
    this.cursor = opts?.cursor;
  }

  createRenderObject(): RenderMouseRegion {
    return new RenderMouseRegion({
      onClick: this.onClick,
      onEnter: this.onEnter,
      onExit: this.onExit,
      onHover: this.onHover,
      onScroll: this.onScroll,
      cursor: this.cursor,
    });
  }

  updateRenderObject(renderObject: RenderObject): void {
    if (renderObject instanceof RenderMouseRegion) {
      renderObject.onClick = this.onClick;
      renderObject.onEnter = this.onEnter;
      renderObject.onExit = this.onExit;
      renderObject.onHover = this.onHover;
      renderObject.onScroll = this.onScroll;
      renderObject.cursor = this.cursor;
    }
  }
}
