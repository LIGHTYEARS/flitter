// InputArea — bordered multi-line input field matching Amp's design
// Amp ref: Container with rounded border + ContainerWithOverlays + TextField

import { StatefulWidget, State, Widget } from 'flitter-core/src/framework/widget';
import { EdgeInsets } from 'flitter-core/src/layout/edge-insets';
import { Text } from 'flitter-core/src/widgets/text';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { TextSpan } from 'flitter-core/src/core/text-span';
import { Color } from 'flitter-core/src/core/color';
import { TextField, TextEditingController } from 'flitter-core/src/widgets/text-field';
import { ContainerWithOverlays } from 'flitter-core/src/widgets/container-with-overlays';
import type { OverlaySpec } from 'flitter-core/src/widgets/container-with-overlays';
import { BoxDecoration, Border, BorderSide } from 'flitter-core/src/layout/render-decorated';

interface InputAreaProps {
  onSubmit: (text: string) => void;
  isProcessing: boolean;
}

export class InputArea extends StatefulWidget {
  readonly onSubmit: (text: string) => void;
  readonly isProcessing: boolean;

  constructor(props: InputAreaProps) {
    super({});
    this.onSubmit = props.onSubmit;
    this.isProcessing = props.isProcessing;
  }

  createState(): InputAreaState {
    return new InputAreaState();
  }
}

class InputAreaState extends State<InputArea> {
  private controller = new TextEditingController();

  build(): Widget {
    const isProcessing = this.widget.isProcessing;
    const borderColor = isProcessing ? Color.yellow : Color.brightBlack;
    const placeholder = isProcessing ? 'Agent is working...' : 'Type a message (Ctrl+Enter to send)';

    // Mode indicator overlay on the border (Amp style)
    const overlays: OverlaySpec[] = [];
    if (isProcessing) {
      overlays.push({
        child: new Text({
          text: new TextSpan({
            text: ' ⏳ working ',
            style: new TextStyle({ foreground: Color.yellow, bold: true }),
          }),
        }),
        position: 'top',
        alignment: 'left',
      });
    }

    const side = new BorderSide({ color: borderColor, width: 1, style: 'rounded' });

    return new ContainerWithOverlays({
      decoration: new BoxDecoration({
        border: Border.all(side),
      }),
      padding: EdgeInsets.symmetric({ horizontal: 2 }),
      overlays,
      child: new TextField({
        controller: this.controller,
        placeholder,
        onSubmitted: (text: string) => {
          if (text.trim().length > 0 && !isProcessing) {
            this.widget.onSubmit(text.trim());
            this.controller.clear();
          }
        },
      }),
    });
  }
}
