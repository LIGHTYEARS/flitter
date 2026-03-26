// Command palette — Ctrl+O overlay with searchable action list
// Amp ref: command palette with SelectionList

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

const COMMANDS: SelectionItem[] = [
  { label: 'Clear conversation', value: 'clear', description: 'Remove all messages (Ctrl+L)' },
  { label: 'Toggle tool calls', value: 'toggle-tools', description: 'Expand/collapse all tool blocks (Alt+T)' },
  { label: 'Toggle thinking', value: 'toggle-thinking', description: 'Expand/collapse all thinking blocks' },
];

interface CommandPaletteProps {
  onExecute: (command: string) => void;
  onDismiss: () => void;
}

export class CommandPalette extends StatelessWidget {
  private readonly onExecute: (command: string) => void;
  private readonly onDismiss: () => void;

  constructor(props: CommandPaletteProps) {
    super({});
    this.onExecute = props.onExecute;
    this.onDismiss = props.onDismiss;
  }

  build(): Widget {
    const side = new BorderSide({
      color: Color.cyan,
      width: 1,
      style: 'rounded' as any,
    });

    return new FocusScope({
      autofocus: true,
      child: new Column({
        mainAxisAlignment: 'start',
        crossAxisAlignment: 'center',
        children: [
          new SizedBox({ height: 2 }),
          new Container({
            decoration: new BoxDecoration({ border: Border.all(side) }),
            padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
            constraints: new BoxConstraints({ maxWidth: 50 }),
            child: new Column({
              mainAxisSize: 'min',
              crossAxisAlignment: 'start',
              children: [
                // Title
                new Text({
                  text: new TextSpan({
                    text: 'Command Palette',
                    style: new TextStyle({
                      foreground: Color.cyan,
                      bold: true,
                    }),
                  }),
                }),
                new SizedBox({ height: 1 }),
                // Command list
                new SelectionList({
                  items: COMMANDS,
                  onSelect: this.onExecute,
                  onCancel: this.onDismiss,
                  showDescription: true,
                }),
              ],
            }),
          }),
        ],
      }),
    });
  }
}
