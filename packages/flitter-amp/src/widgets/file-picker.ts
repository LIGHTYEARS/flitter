// FilePicker — overlay widget for @file mention selection
// Displays a SelectionList of files from the working directory

import { StatelessWidget, Widget } from 'flitter-core/src/framework/widget';
import { Column } from 'flitter-core/src/widgets/flex';
import { Container } from 'flitter-core/src/widgets/container';
import { Text } from 'flitter-core/src/widgets/text';
import { TextSpan } from 'flitter-core/src/core/text-span';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { Color } from 'flitter-core/src/core/color';
import { SelectionList } from 'flitter-core/src/widgets/selection-list';
import type { SelectionItem } from 'flitter-core/src/widgets/selection-list';
import { FocusScope } from 'flitter-core/src/widgets/focus-scope';
import { BoxDecoration, Border, BorderSide } from 'flitter-core/src/layout/render-decorated';
import { EdgeInsets } from 'flitter-core/src/layout/edge-insets';
import { SizedBox } from 'flitter-core/src/widgets/sized-box';
import { BoxConstraints } from 'flitter-core/src/core/box-constraints';

interface FilePickerProps {
  files: string[];
  onSelect: (filePath: string) => void;
  onDismiss: () => void;
}

export class FilePicker extends StatelessWidget {
  private readonly files: string[];
  private readonly onSelect: (filePath: string) => void;
  private readonly onDismiss: () => void;

  constructor(props: FilePickerProps) {
    super({});
    this.files = props.files;
    this.onSelect = props.onSelect;
    this.onDismiss = props.onDismiss;
  }

  build(): Widget {
    const items: SelectionItem[] = this.files.map((f) => ({
      label: f,
      value: f,
    }));

    const side = new BorderSide({
      color: Color.green,
      width: 1,
      style: 'rounded' as any,
    });

    return new FocusScope({
      autofocus: true,
      child: new Column({
        mainAxisAlignment: 'end',
        crossAxisAlignment: 'start',
        children: [
          new Container({
            decoration: new BoxDecoration({ border: Border.all(side) }),
            padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
            constraints: new BoxConstraints({ maxWidth: 60, maxHeight: 15 }),
            child: new Column({
              mainAxisSize: 'min',
              crossAxisAlignment: 'start',
              children: [
                new Text({
                  text: new TextSpan({
                    text: 'Select file',
                    style: new TextStyle({
                      foreground: Color.green,
                      bold: true,
                    }),
                  }),
                }),
                new SizedBox({ height: 1 }),
                new SelectionList({
                  items,
                  onSelect: this.onSelect,
                  onCancel: this.onDismiss,
                }),
              ],
            }),
          }),
        ],
      }),
    });
  }
}
