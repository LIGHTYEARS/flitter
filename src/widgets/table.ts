// Table widget — responsive two-column data table
// Amp ref: jA class in widgets-catalog.md
// Renders items in wide (side-by-side) or narrow (stacked) layout based on breakpoint

import { Widget, StatelessWidget, type BuildContext } from '../framework/widget';
import { Key } from '../core/key';

// ---------------------------------------------------------------------------
// Table (Amp: jA)
// ---------------------------------------------------------------------------

/**
 * A responsive data table widget.
 *
 * Takes an array of items and a renderRow function that produces a
 * [left, right] widget pair for each item.
 *
 * Layout behavior:
 * - Wide mode (width >= breakpoint): Two columns side by side
 * - Narrow mode (width < breakpoint): Stacked vertically with indentation
 *
 * Usage:
 *   new Table({
 *     items: data,
 *     renderRow: (item) => [new Text(item.name), new Text(item.value)],
 *     breakpoint: 60,
 *   })
 */
export class Table<T = unknown> extends StatelessWidget {
  readonly items: T[];
  readonly renderRow: (item: T) => [Widget, Widget];
  readonly breakpoint: number;

  constructor(opts: {
    key?: Key;
    items: T[];
    renderRow: (item: T) => [Widget, Widget];
    breakpoint?: number;
  }) {
    super(opts.key !== undefined ? { key: opts.key } : undefined);
    this.items = opts.items;
    this.renderRow = opts.renderRow;
    this.breakpoint = opts.breakpoint ?? 50;
  }

  build(_context: BuildContext): Widget {
    // Generate row widget pairs
    const rows: Array<[Widget, Widget]> = this.items.map((item) => this.renderRow(item));

    // Return a display widget carrying the row data and breakpoint.
    // Full rendering with Row/Column/Expanded/Padding will be wired
    // when those widgets are available from plans 07-01a/07-01b.
    return new _TableDisplay({
      rows,
      breakpoint: this.breakpoint,
    });
  }
}

/**
 * Internal display widget for Table.
 * Carries the computed rows and layout configuration.
 */
class _TableDisplay extends StatelessWidget {
  readonly rows: Array<[Widget, Widget]>;
  readonly breakpoint: number;

  constructor(opts: { rows: Array<[Widget, Widget]>; breakpoint: number; key?: Key }) {
    super(opts.key !== undefined ? { key: opts.key } : undefined);
    this.rows = opts.rows;
    this.breakpoint = opts.breakpoint;
  }

  build(_context: BuildContext): Widget {
    return this;
  }
}
