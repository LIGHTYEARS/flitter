// InputArea — prompt bar matching Amp's F0H widget
// Amp ref: F0H with rounded border, borderColor: focused ? A.border : void 0
// Contains text field with autocomplete, mode label in footer

import { StatefulWidget, State, Widget } from 'flitter-core/src/framework/widget';
import { EdgeInsets } from 'flitter-core/src/layout/edge-insets';
import { Row } from 'flitter-core/src/widgets/flex';
import { Expanded } from 'flitter-core/src/widgets/flexible';
import { Text } from 'flitter-core/src/widgets/text';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { TextSpan } from 'flitter-core/src/core/text-span';
import { Color } from 'flitter-core/src/core/color';
import { TextField, TextEditingController } from 'flitter-core/src/widgets/text-field';
import { Container } from 'flitter-core/src/widgets/container';
import { Border, BorderSide, BoxDecoration } from 'flitter-core/src/layout/render-decorated';

interface InputAreaProps {
  onSubmit: (text: string) => void;
  isProcessing: boolean;
  mode: string | null;
}

export class InputArea extends StatefulWidget {
  readonly onSubmit: (text: string) => void;
  readonly isProcessing: boolean;
  readonly mode: string | null;

  constructor(props: InputAreaProps) {
    super({});
    this.onSubmit = props.onSubmit;
    this.isProcessing = props.isProcessing;
    this.mode = props.mode;
  }

  createState(): InputAreaState {
    return new InputAreaState();
  }
}

class InputAreaState extends State<InputArea> {
  private controller = new TextEditingController();

  build(): Widget {
    const isProcessing = this.widget.isProcessing;

    // Amp ref: F0H — rounded border, borderColor: focused ? A.border : void 0
    // We always show the border since the input is always the focused element
    // Amp uses colors.border = rgb(135,139,134) ≈ brightBlack in ANSI
    const border = Border.all(
      new BorderSide({ color: Color.brightBlack, width: 1, style: 'rounded' }),
    );

    // Amp ref: mode label inside the input container at bottom-right
    // e.g. "smart" in green, "⚠ 6 skills" in yellow
    const mode = this.widget.mode;
    const modeWidget = mode ? new Text({
      text: new TextSpan({
        text: isProcessing ? `⏳ ${mode}` : mode,
        style: new TextStyle({
          foreground: isProcessing ? Color.yellow : Color.green,
          dim: isProcessing,
        }),
      }),
    }) : null;

    // Build the input container with bordered text field
    // If mode label exists, use a Row with TextField expanded + mode label right-aligned
    const textField = new TextField({
      controller: this.controller,
      autofocus: true,
      onSubmitted: (text: string) => {
        if (text.trim().length > 0 && !isProcessing) {
          this.widget.onSubmit(text.trim());
          this.controller.clear();
        }
      },
    });

    let innerChild: Widget;
    if (modeWidget) {
      // Row: [Expanded(TextField), mode label with right padding]
      innerChild = new Row({
        crossAxisAlignment: 'end',
        children: [
          new Expanded({ child: textField }),
          modeWidget,
        ],
      });
    } else {
      innerChild = textField;
    }

    return new Container({
      decoration: new BoxDecoration({ border }),
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: innerChild,
    });
  }
}
