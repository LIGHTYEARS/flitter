// Spacer widget — creates flexible or fixed-size empty space.
// Amp ref: cg (Spacer)
// Source: .reference/widgets-catalog.md

import { Key } from '../core/key';
import { Widget, StatelessWidget, type BuildContext } from '../framework/widget';
import { Expanded } from './flexible';
import { SizedBox } from './sized-box';

// ---------------------------------------------------------------------------
// Spacer (Amp: cg extends StatelessWidget)
// ---------------------------------------------------------------------------

/**
 * A widget that takes up space using an Expanded widget.
 *
 * When used in a Row or Column, it takes up all remaining space.
 * If width or height is explicitly set, creates a fixed-size SizedBox instead.
 *
 * Amp ref: class cg extends H3 (StatelessWidget)
 */
export class Spacer extends StatelessWidget {
  readonly flex: number;
  readonly width?: number;
  readonly height?: number;

  constructor(opts?: {
    key?: Key;
    flex?: number;
    width?: number;
    height?: number;
  }) {
    super(opts?.key !== undefined ? { key: opts.key } : undefined);
    this.flex = opts?.flex ?? 1;
    this.width = opts?.width;
    this.height = opts?.height;
  }

  // Amp ref: cg.build(context)
  build(_context: BuildContext): Widget {
    // If fixed width or height is set, use a SizedBox
    if (this.width !== undefined || this.height !== undefined) {
      return new SizedBox({ width: this.width, height: this.height });
    }
    // Otherwise, use Expanded + SizedBox.shrink() to take up flex space
    return new Expanded({
      flex: this.flex,
      child: SizedBox.shrink(),
    });
  }

  // --- Static factories ---

  /** Creates a fixed-width horizontal spacer. */
  static horizontal(width: number): Spacer {
    return new Spacer({ width, height: 0 });
  }

  /** Creates a fixed-height vertical spacer. */
  static vertical(height: number): Spacer {
    return new Spacer({ width: 0, height });
  }

  /** Creates a flexible spacer with the given flex factor. */
  static flexible(flex: number = 1): Spacer {
    return new Spacer({ flex });
  }
}
