// InputArea — prompt bar matching Amp's F0H widget
// Amp ref: F0H with rounded border, borderColor: focused ? A.border : void 0
// Mode label as border overlay at bottom-right (Amp: overlayTexts position "bottom-right")

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
import { BoxConstraints } from 'flitter-core/src/core/box-constraints';
import { Border, BorderSide, BoxDecoration } from 'flitter-core/src/layout/render-decorated';
import { Stack, Positioned } from 'flitter-core/src/widgets/stack';

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
    const border = Border.all(
      new BorderSide({ color: Color.brightBlack, width: 1, style: 'rounded' }),
    );

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

    // Amp ref: F0H uses overlayTexts at "bottom-right" for mode label
    // We approximate with Stack + Positioned
    const mode = this.widget.mode;

    const borderedInput = new Container({
      decoration: new BoxDecoration({ border }),
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      // Amp input box is ~3 rows tall (minHeight includes border)
      constraints: new BoxConstraints({ minHeight: 3 }),
      child: textField,
    });

    if (mode) {
      // Mode label overlaid at bottom-right on the border
      const modeLabel = new Text({
        text: new TextSpan({
          text: isProcessing ? `⏳ ${mode} ` : `${mode} `,
          style: new TextStyle({
            foreground: isProcessing ? Color.yellow : Color.green,
            dim: isProcessing,
          }),
        }),
      });

      return new Stack({
        children: [
          borderedInput,
          new Positioned({
            bottom: 0,
            right: 1,
            child: modeLabel,
          }),
        ],
      });
    }

    return borderedInput;
  }
}
