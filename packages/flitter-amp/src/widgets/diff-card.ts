// DiffCard — file diff display using flitter-core's DiffView
// Shows a bordered diff with file path header

import { StatelessWidget, Widget } from 'flitter-core/src/framework/widget';
import { Column } from 'flitter-core/src/widgets/flex';
import { Text } from 'flitter-core/src/widgets/text';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { TextSpan } from 'flitter-core/src/core/text-span';
import { Color } from 'flitter-core/src/core/color';
import { Padding } from 'flitter-core/src/widgets/padding';
import { EdgeInsets } from 'flitter-core/src/layout/edge-insets';
import { DiffView } from 'flitter-core/src/widgets/diff-view';
import { Container } from 'flitter-core/src/widgets/container';
import { BoxDecoration, Border, BorderSide } from 'flitter-core/src/layout/render-decorated';

interface DiffCardProps {
  filePath: string;
  diff: string;
}

export class DiffCard extends StatelessWidget {
  private readonly filePath: string;
  private readonly diff: string;

  constructor(props: DiffCardProps) {
    super({});
    this.filePath = props.filePath;
    this.diff = props.diff;
  }

  build(): Widget {
    const borderSide = new BorderSide({ color: Color.brightBlack, width: 1, style: 'rounded' });

    return new Padding({
      padding: EdgeInsets.only({ left: 4, right: 2, top: 0, bottom: 1 }),
      child: new Container({
        decoration: new BoxDecoration({
          border: Border.all(borderSide),
        }),
        padding: EdgeInsets.symmetric({ horizontal: 1 }),
        child: new Column({
          mainAxisSize: 'min',
          crossAxisAlignment: 'start',
          children: [
            // File path header
            new Text({
              text: new TextSpan({
                text: ` ${this.filePath}`,
                style: new TextStyle({
                  foreground: Color.brightBlack,
                  bold: true,
                }),
              }),
            }),
            // Diff content
            new DiffView({
              diff: this.diff,
              showLineNumbers: true,
            }),
          ],
        }),
      }),
    });
  }
}
