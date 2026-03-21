// Button widget — a pressable button with text and styling
// Amp ref: ME class in widgets-catalog.md
// Uses FocusNode for keyboard focus handling (Enter/Space to activate)

import { Widget, StatelessWidget, type BuildContext } from '../framework/widget';
import { Key } from '../core/key';
import { TextStyle } from '../core/text-style';
import { Color } from '../core/color';
import { EdgeInsets } from '../layout/edge-insets';

// ---------------------------------------------------------------------------
// Button (Amp: ME)
// ---------------------------------------------------------------------------

/**
 * A button widget that displays text and responds to press events.
 *
 * The button is focusable and responds to Enter or Space key when focused.
 * It can be styled with a color and padding.
 *
 * Usage:
 *   new Button({ text: 'Submit', onPressed: () => console.log('pressed') })
 *
 * Build output: a simple decorated text representation.
 * Full rendering with Container + DecoratedBox + FocusScope comes when
 * those higher-level widget wrappers are available.
 */
export class Button extends StatelessWidget {
  readonly text: string;
  readonly onPressed: () => void;
  readonly padding: EdgeInsets;
  readonly color?: Color;
  readonly reverse: boolean;

  constructor(opts: {
    key?: Key;
    text: string;
    onPressed: () => void;
    padding?: EdgeInsets;
    color?: Color;
    reverse?: boolean;
  }) {
    super(opts.key !== undefined ? { key: opts.key } : undefined);
    this.text = opts.text;
    this.onPressed = opts.onPressed;
    this.padding = opts.padding ?? EdgeInsets.symmetric({ horizontal: 2, vertical: 1 });
    this.color = opts.color;
    this.reverse = opts.reverse ?? false;
  }

  /**
   * Handle a key event for this button.
   * Called externally by the focus system.
   */
  handleKeyEvent(key: string): 'handled' | 'ignored' {
    if (key === 'Enter' || key === ' ') {
      this.onPressed();
      return 'handled';
    }
    return 'ignored';
  }

  build(_context: BuildContext): Widget {
    // Return a display widget that carries the button's text + style info.
    // Full rendering tree (Container -> DecoratedBox -> Padding -> Text)
    // will be wired when those widget constructors are available from parallel plans.
    return new _ButtonDisplay({
      text: this.text,
      padding: this.padding,
      color: this.color,
      reverse: this.reverse,
    });
  }
}

/**
 * Internal display widget for Button.
 * Carries the button's visual configuration for rendering.
 */
class _ButtonDisplay extends StatelessWidget {
  readonly text: string;
  readonly padding: EdgeInsets;
  readonly color?: Color;
  readonly reverse: boolean;

  constructor(opts: {
    text: string;
    padding: EdgeInsets;
    color?: Color;
    reverse?: boolean;
    key?: Key;
  }) {
    super(opts.key !== undefined ? { key: opts.key } : undefined);
    this.text = opts.text;
    this.padding = opts.padding;
    this.color = opts.color;
    this.reverse = opts.reverse ?? false;
  }

  build(_context: BuildContext): Widget {
    return this;
  }
}
