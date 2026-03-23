// Table widget — two-column data table
// Amp ref: jA class in widgets-catalog.md
// Renders items as rows with left/right column pairs

import { Widget, StatelessWidget, type BuildContext } from '../framework/widget';
import { Key } from '../core/key';
import { Column, Row } from './flex';
import { Expanded } from './flexible';
import { Divider } from './divider';

// ---------------------------------------------------------------------------
// Table (Amp: jA)
// ---------------------------------------------------------------------------

/**
 * A two-column data table widget.
 *
 * Takes an array of items and a renderRow function that produces a
 * [left, right] widget pair for each item. Each row is rendered as
 * a Row with two Expanded children.
 *
 * Usage:
 *   new Table({
 *     items: data,
 *     renderRow: (item) => [new Text(item.name), new Text(item.value)],
 *   })
 */
export class Table<T = unknown> extends StatelessWidget {
  readonly items: T[];
  readonly renderRow: (item: T) => [Widget, Widget];
  readonly showDividers: boolean;

  constructor(opts: {
    key?: Key;
    items: T[];
    renderRow: (item: T) => [Widget, Widget];
    showDividers?: boolean;
  }) {
    super(opts.key !== undefined ? { key: opts.key } : undefined);
    this.items = opts.items;
    this.renderRow = opts.renderRow;
    this.showDividers = opts.showDividers ?? false;
  }

  build(_context: BuildContext): Widget {
    const children: Widget[] = [];

    for (let i = 0; i < this.items.length; i++) {
      const [left, right] = this.renderRow(this.items[i]!);
      children.push(
        new Row({
          children: [
            new Expanded({ child: left }),
            new Expanded({ child: right }),
          ],
        }),
      );
      if (this.showDividers && i < this.items.length - 1) {
        children.push(new Divider());
      }
    }

    return new Column({
      mainAxisSize: 'min',
      children,
    });
  }
}
