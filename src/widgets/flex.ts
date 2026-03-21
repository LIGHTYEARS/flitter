// Flex, Row, Column widgets — widget layer for RenderFlex.
// Amp ref: IJ (Flex), q8 (Row), o8 (Column)
// Source: .reference/widgets-catalog.md

import { Key } from '../core/key';
import { Widget } from '../framework/widget';
import {
  MultiChildRenderObjectWidget,
  RenderObject,
} from '../framework/render-object';
import {
  RenderFlex,
  type Axis,
  type MainAxisAlignment,
  type CrossAxisAlignment,
  type MainAxisSize,
} from '../layout/render-flex';

// ---------------------------------------------------------------------------
// Flex (Amp: IJ extends An)
// ---------------------------------------------------------------------------

/**
 * A widget that displays its children in a one-dimensional array.
 *
 * This is the base class for Row and Column, which set the direction.
 * Creates a RenderFlex render object.
 *
 * Amp ref: class IJ extends An (MultiChildRenderObjectWidget)
 */
export class Flex extends MultiChildRenderObjectWidget {
  readonly direction: Axis;
  readonly mainAxisAlignment: MainAxisAlignment;
  readonly crossAxisAlignment: CrossAxisAlignment;
  readonly mainAxisSize: MainAxisSize;

  constructor(opts: {
    key?: Key;
    direction: Axis;
    children?: Widget[];
    mainAxisAlignment?: MainAxisAlignment;
    crossAxisAlignment?: CrossAxisAlignment;
    mainAxisSize?: MainAxisSize;
  }) {
    super({ key: opts.key, children: opts.children });
    this.direction = opts.direction;
    this.mainAxisAlignment = opts.mainAxisAlignment ?? 'start';
    this.crossAxisAlignment = opts.crossAxisAlignment ?? 'center';
    this.mainAxisSize = opts.mainAxisSize ?? 'max';
  }

  // Amp ref: IJ.createRenderObject() -> new oU0(...)
  createRenderObject(): RenderFlex {
    return new RenderFlex({
      direction: this.direction,
      mainAxisAlignment: this.mainAxisAlignment,
      crossAxisAlignment: this.crossAxisAlignment,
      mainAxisSize: this.mainAxisSize,
    });
  }

  // Amp ref: IJ.updateRenderObject(renderObject)
  updateRenderObject(renderObject: RenderObject): void {
    const flex = renderObject as RenderFlex;
    flex.direction = this.direction;
    flex.mainAxisAlignment = this.mainAxisAlignment;
    flex.crossAxisAlignment = this.crossAxisAlignment;
    flex.mainAxisSize = this.mainAxisSize;
  }
}

// ---------------------------------------------------------------------------
// Row (Amp: q8 extends IJ)
// ---------------------------------------------------------------------------

/**
 * A widget that displays its children in a horizontal array.
 *
 * Amp ref: class q8 extends IJ, direction = 'horizontal'
 */
export class Row extends Flex {
  constructor(opts?: {
    key?: Key;
    children?: Widget[];
    mainAxisAlignment?: MainAxisAlignment;
    crossAxisAlignment?: CrossAxisAlignment;
    mainAxisSize?: MainAxisSize;
  }) {
    super({
      key: opts?.key,
      direction: 'horizontal',
      children: opts?.children,
      mainAxisAlignment: opts?.mainAxisAlignment ?? 'start',
      crossAxisAlignment: opts?.crossAxisAlignment ?? 'center',
      mainAxisSize: opts?.mainAxisSize ?? 'max',
    });
  }

  // --- Static factories for common alignment patterns ---

  static start(children: Widget[]): Row {
    return new Row({ children, mainAxisAlignment: 'start' });
  }

  static center(children: Widget[]): Row {
    return new Row({ children, mainAxisAlignment: 'center' });
  }

  static end(children: Widget[]): Row {
    return new Row({ children, mainAxisAlignment: 'end' });
  }

  static spaceBetween(children: Widget[]): Row {
    return new Row({ children, mainAxisAlignment: 'spaceBetween' });
  }

  static spaceAround(children: Widget[]): Row {
    return new Row({ children, mainAxisAlignment: 'spaceAround' });
  }

  static spaceEvenly(children: Widget[]): Row {
    return new Row({ children, mainAxisAlignment: 'spaceEvenly' });
  }
}

// ---------------------------------------------------------------------------
// Column (Amp: o8 extends IJ)
// ---------------------------------------------------------------------------

/**
 * A widget that displays its children in a vertical array.
 *
 * Amp ref: class o8 extends IJ, direction = 'vertical'
 */
export class Column extends Flex {
  constructor(opts?: {
    key?: Key;
    children?: Widget[];
    mainAxisAlignment?: MainAxisAlignment;
    crossAxisAlignment?: CrossAxisAlignment;
    mainAxisSize?: MainAxisSize;
  }) {
    super({
      key: opts?.key,
      direction: 'vertical',
      children: opts?.children,
      mainAxisAlignment: opts?.mainAxisAlignment ?? 'start',
      crossAxisAlignment: opts?.crossAxisAlignment ?? 'center',
      mainAxisSize: opts?.mainAxisSize ?? 'max',
    });
  }

  // --- Static factories for common alignment patterns ---

  static start(children: Widget[]): Column {
    return new Column({ children, mainAxisAlignment: 'start' });
  }

  static center(children: Widget[]): Column {
    return new Column({ children, mainAxisAlignment: 'center' });
  }

  static end(children: Widget[]): Column {
    return new Column({ children, mainAxisAlignment: 'end' });
  }

  static spaceBetween(children: Widget[]): Column {
    return new Column({ children, mainAxisAlignment: 'spaceBetween' });
  }

  static spaceAround(children: Widget[]): Column {
    return new Column({ children, mainAxisAlignment: 'spaceAround' });
  }

  static spaceEvenly(children: Widget[]): Column {
    return new Column({ children, mainAxisAlignment: 'spaceEvenly' });
  }
}
