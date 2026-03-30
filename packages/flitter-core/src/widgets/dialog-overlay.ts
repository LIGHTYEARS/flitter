// DialogOverlay — renders a Dialog data class as a full-screen modal overlay
//
// Bridges the Dialog data class (flitter-core/src/widgets/dialog.ts) to
// the actual widget tree. Produces the standard Amp overlay pattern:
//   Stack(fit: expand)
//     Positioned(all:0) -> Container(semi-transparent mask)
//     FocusScope(autofocus) -> Column(center) -> Container(bordered) -> content
//
// Amp ref: application shell consumption of ab data class

import { StatelessWidget, Widget, type BuildContext } from '../framework/widget';
import { Dialog } from './dialog';
import { Stack, Positioned } from './stack';
import { Column } from './flex';
import { Container } from './container';
import { Text } from './text';
import { FocusScope } from './focus-scope';
import { SizedBox } from './sized-box';
import { TextSpan } from '../core/text-span';
import { TextStyle } from '../core/text-style';
import { Color } from '../core/color';
import { BoxDecoration, Border, BorderSide } from '../layout/render-decorated';
import { EdgeInsets } from '../layout/edge-insets';
import { BoxConstraints } from '../core/box-constraints';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Configuration for DialogOverlay appearance.
 * Allows the application shell to customize border color,
 * background mask opacity, max width, etc.
 */
export interface DialogOverlayStyle {
  readonly borderColor?: Color;
  readonly maskColor?: Color;
  readonly titleStyle?: TextStyle;
  readonly subtitleStyle?: TextStyle;
  readonly maxWidth?: number;
  readonly padding?: EdgeInsets;
}

// ---------------------------------------------------------------------------
// DialogOverlay Widget
// ---------------------------------------------------------------------------

/**
 * A widget that renders a Dialog data class as a full-screen modal overlay.
 *
 * Produces the standard Amp overlay pattern used by PermissionDialog,
 * CommandPalette, and other modal overlays. Consumes a `Dialog` data class
 * to avoid duplicating overlay construction across multiple widgets.
 *
 * The Dialog's body widget is rendered inside the bordered container,
 * along with the title, optional subtitle, and optional button footer.
 */
export class DialogOverlay extends StatelessWidget {
  readonly dialog: Dialog;
  readonly style: DialogOverlayStyle;

  constructor(opts: {
    dialog: Dialog;
    style?: DialogOverlayStyle;
  }) {
    super();
    this.dialog = opts.dialog;
    this.style = opts.style ?? {};
  }

  build(_context: BuildContext): Widget {
    const { dialog, style } = this;

    const borderColor = style.borderColor ?? Color.cyan;
    const maskColor = style.maskColor ?? Color.rgb(0, 0, 0).withAlpha(0.6);
    const maxWidth = dialog.dimensions?.width ?? style.maxWidth ?? 60;
    const padding = style.padding ?? EdgeInsets.symmetric({ horizontal: 2, vertical: 1 });
    const titleTextStyle = style.titleStyle ?? new TextStyle({ bold: true, foreground: borderColor });
    const subtitleTextStyle = style.subtitleStyle ?? new TextStyle({ dim: true });

    // Build content children: title, optional subtitle, optional body
    const contentChildren: Widget[] = [];

    // Title
    contentChildren.push(new Text({
      text: new TextSpan({ text: dialog.title, style: titleTextStyle }),
    }));

    // Optional subtitle
    if (dialog.subtitle) {
      contentChildren.push(new Text({
        text: new TextSpan({ text: dialog.subtitle, style: subtitleTextStyle }),
      }));
    }

    // Spacer + body
    if (dialog.body) {
      contentChildren.push(new SizedBox({ height: 1 }));
      contentChildren.push(dialog.body);
    }

    // Build the bordered container
    const side = new BorderSide({ color: borderColor, width: 1, style: 'rounded' as any });
    const constraints = dialog.dimensions?.height != null
      ? new BoxConstraints({ maxWidth, maxHeight: dialog.dimensions.height })
      : new BoxConstraints({ maxWidth });

    const borderedContainer = new Container({
      decoration: dialog.border
        ? new BoxDecoration({ border: Border.all(side) })
        : new BoxDecoration(),
      padding,
      constraints,
      child: new Column({
        mainAxisSize: 'min',
        crossAxisAlignment: 'start',
        children: contentChildren,
      }),
    });

    // Assemble the overlay: mask + centered dialog
    return new Stack({
      fit: 'expand',
      children: [
        new Positioned({
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          child: new Container({ color: maskColor }),
        }),
        new FocusScope({
          autofocus: true,
          child: new Column({
            mainAxisAlignment: 'center',
            crossAxisAlignment: 'center',
            children: [borderedContainer],
          }),
        }),
      ],
    });
  }
}
