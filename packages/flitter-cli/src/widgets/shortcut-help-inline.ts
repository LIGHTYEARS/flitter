// ShortcutHelpInline — AMP v9T equivalent.
//
// Dual-column shortcut help rendered inside InputArea as a topWidget.
// NOT a standalone overlay — it is embedded above the text field within
// the InputArea border, matching AMP's exact layout.
//
// AMP ref: tmux-capture/amp-source/04_shortcut_help_v9T.js
//
// Layout:
//   Column (crossAxisAlignment: 'start', mainAxisSize: 'min')
//     [6 Text rows, each with left+right shortcut pair]
//     [optional: SizedBox(1) + tmux hint row when in tmux without extended-keys]
//     Expanded(Divider) — horizontal separator

import {
  StatelessWidget,
  Widget,
  type BuildContext,
} from '../../../flitter-core/src/framework/widget';
import { Column } from '../../../flitter-core/src/widgets/flex';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { SizedBox } from '../../../flitter-core/src/widgets/sized-box';
import { Divider } from '../../../flitter-core/src/widgets/divider';
import { Expanded } from '../../../flitter-core/src/widgets/flexible';
import { CliThemeProvider } from '../themes';
import {
  SHORTCUT_HELP_DATA,
  SHORTCUT_LEFT_COL_WIDTH,
  type ShortcutHelpPair,
} from './shortcut-help-data';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Detect whether we are running inside tmux.
 * AMP ref: Fb() function in 04_shortcut_help_v9T.js
 */
function isTmux(): boolean {
  return Boolean(process.env.TMUX);
}

// ---------------------------------------------------------------------------
// ShortcutHelpInline props
// ---------------------------------------------------------------------------

interface ShortcutHelpInlineProps {
  /** Whether Enter submits (true) or needs Shift+Enter (false). */
  submitOnEnter?: boolean;
}

// ---------------------------------------------------------------------------
// ShortcutHelpInline widget
// ---------------------------------------------------------------------------

/**
 * Dual-column shortcut help widget matching AMP's v9T.
 *
 * Renders 6 rows of shortcut pairs with proper column alignment,
 * tmux-aware key display, and a trailing divider.
 */
export class ShortcutHelpInline extends StatelessWidget {
  private readonly submitOnEnter: boolean;

  constructor(props: ShortcutHelpInlineProps = {}) {
    super({});
    this.submitOnEnter = props.submitOnEnter ?? true;
  }

  build(context: BuildContext): Widget {
    const theme = CliThemeProvider.maybeOf(context);
    // Colors: use theme if available, fall back to defaults
    const keybindStyle = new TextStyle({
      foreground: theme?.app.keybind,
      bold: false,
    });
    const descStyle = new TextStyle({
      foreground: theme?.base.foreground,
      dim: true,
    });
    const borderColor = theme?.base.border;

    const inTmux = isTmux();

    // Build data: apply submitOnEnter and tmux transforms
    let data: ShortcutHelpPair[] = SHORTCUT_HELP_DATA;

    // When submitOnEnter is false, replace row 3 left with "Ctrl/Cmd+Enter submit"
    if (!this.submitOnEnter) {
      data = data.map((pair) =>
        pair.left.keys === 'Shift+Enter'
          ? {
              left: { keys: 'Ctrl/Cmd+Enter', description: 'submit' },
              right: pair.right,
            }
          : pair,
      );
    }

    // Build Text rows
    const rows: Widget[] = data.map((pair) => {
      // In tmux: replace "Shift+Enter" with "Alt+Enter"
      const leftKeys =
        pair.left.keys === 'Shift+Enter' && inTmux
          ? 'Alt+Enter'
          : pair.left.keys;
      const leftDesc = pair.left.description;

      // Compute left column text width and padding
      const leftTextWidth = leftKeys.length + 1 + leftDesc.length;
      const padding = ' '.repeat(
        Math.max(0, SHORTCUT_LEFT_COL_WIDTH - leftTextWidth),
      );

      const rightKeys = pair.right.keys;
      const rightDesc = pair.right.description;

      return new Text({
        text: new TextSpan({
          children: [
            new TextSpan({ text: leftKeys, style: keybindStyle }),
            new TextSpan({ text: ' ', style: descStyle }),
            new TextSpan({ text: leftDesc, style: descStyle }),
            new TextSpan({ text: padding + '  ', style: descStyle }),
            new TextSpan({ text: rightKeys, style: keybindStyle }),
            new TextSpan({ text: ' ', style: descStyle }),
            new TextSpan({ text: rightDesc, style: descStyle }),
          ],
        }),
      });
    });

    // Tmux hint: when in tmux, show extended-keys notice
    if (inTmux) {
      const commandStyle = new TextStyle({
        foreground: theme?.app.command,
      });
      const linkStyle = new TextStyle({
        foreground: theme?.app.link,
        underline: true,
      });

      rows.push(new SizedBox({ height: 1 }));
      rows.push(
        new Text({
          text: new TextSpan({
            children: [
              new TextSpan({ text: 'Enable ', style: descStyle }),
              new TextSpan({ text: 'extended-keys', style: commandStyle }),
              new TextSpan({ text: ' in tmux to use ', style: descStyle }),
              new TextSpan({ text: 'Shift+Enter', style: keybindStyle }),
              new TextSpan({ text: '. See ', style: descStyle }),
              new TextSpan({
                text: 'https://ampcode.com/manual/appendix#amp-cli-tmux',
                style: linkStyle,
              }),
            ],
          }),
        }),
      );
    }

    // Trailing divider (AMP uses Expanded > Divider with border color)
    const divider = new Expanded({
      child: new Divider({ color: borderColor }),
    });

    return new Column({
      crossAxisAlignment: 'start',
      mainAxisSize: 'min',
      children: [...rows, divider],
    });
  }
}
