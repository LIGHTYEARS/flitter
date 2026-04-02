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
import { Column, Row } from './flex';
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
import { Theme } from './theme';

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

  build(context: BuildContext): Widget {
    const { dialog, style } = this;

    const themeData = Theme.maybeOf(context);
    const themeBackground = themeData?.background ?? Color.defaultColor;

    const borderColor = style.borderColor ?? Color.cyan;
    const maskColor = style.maskColor ?? themeBackground;
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

    // Button footer
    if (dialog.footerStyle === 'buttons' && dialog.buttons && dialog.buttons.length > 0) {
      contentChildren.push(new SizedBox({ height: 1 }));
      const buttonWidgets: Widget[] = [];
      for (let i = 0; i < dialog.buttons.length; i++) {
        const btn = dialog.buttons[i]!;
        if (i > 0) {
          buttonWidgets.push(new SizedBox({ width: 1 }));
        }
        const btnStyle = btn.disabled
          ? new TextStyle({ dim: true })
          : new TextStyle({ inverse: true });
        buttonWidgets.push(new Container({
          padding: EdgeInsets.symmetric({ horizontal: 1 }),
          child: new Text({
            text: new TextSpan({ text: ` ${btn.label} `, style: btnStyle }),
          }),
        }));
      }
      contentChildren.push(new Row({
        mainAxisAlignment: 'end',
        mainAxisSize: 'min',
        children: buttonWidgets,
      }));
    }

    // Build the bordered container
    const side = new BorderSide({ color: borderColor, width: 1, style: 'rounded' });
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
          child: new Container({ decoration: new BoxDecoration({ color: maskColor }) }),
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
