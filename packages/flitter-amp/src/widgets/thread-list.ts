import { StatelessWidget, Widget, type BuildContext } from 'flitter-core/src/framework/widget';
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
import { AmpThemeProvider } from '../themes';
import type { KeyEvent, KeyEventResult } from 'flitter-core/src/input/events';

export interface ThreadEntry {
  sessionId: string;
  summary: string;
  updatedAt: number;
  messageCount: number;
  cwd: string;
}

interface ThreadListProps {
  threads: ThreadEntry[];
  currentSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onDismiss: () => void;
}

export class ThreadList extends StatelessWidget {
  private readonly threads: ThreadEntry[];
  private readonly currentSessionId: string | null;
  private readonly onSelect: (sessionId: string) => void;
  private readonly onDismiss: () => void;

  constructor(props: ThreadListProps) {
    super({});
    this.threads = props.threads;
    this.currentSessionId = props.currentSessionId;
    this.onSelect = props.onSelect;
    this.onDismiss = props.onDismiss;
  }

  build(context: BuildContext): Widget {
    const theme = AmpThemeProvider.maybeOf(context);
    const infoColor = theme?.base.info ?? Color.cyan;
    const mutedColor = theme?.base.mutedForeground ?? Color.brightBlack;
    const side = new BorderSide({ color: infoColor, width: 1, style: 'rounded' });

    const items: SelectionItem[] = this.threads.map(t => {
      const age = this.formatAge(t.updatedAt);
      const isCurrent = t.sessionId === this.currentSessionId;
      const prefix = isCurrent ? '● ' : '';
      return {
        label: `${prefix}${t.summary || t.sessionId.slice(0, 8)}`,
        value: t.sessionId,
        description: `${t.messageCount} msgs · ${age}`,
        disabled: isCurrent,
      };
    });

    let listArea: Widget;
    if (items.length > 0) {
      listArea = new SelectionList({
        items,
        onSelect: this.onSelect,
        onCancel: this.onDismiss,
        showDescription: true,
      });
    } else {
      listArea = new Text({
        text: new TextSpan({
          text: 'No threads available',
          style: new TextStyle({ foreground: mutedColor, italic: true }),
        }),
      });
    }

    return new FocusScope({
      autofocus: true,
      onKey: (event: KeyEvent): KeyEventResult => {
        if (event.key === 'Escape') {
          this.onDismiss();
          return 'handled';
        }
        return 'ignored';
      },
      child: new Column({
        mainAxisAlignment: 'start',
        crossAxisAlignment: 'center',
        children: [
          new SizedBox({ height: 2 }),
          new Container({
            decoration: new BoxDecoration({ border: Border.all(side) }),
            padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
            constraints: new BoxConstraints({ maxWidth: 60 }),
            child: new Column({
              mainAxisSize: 'min',
              crossAxisAlignment: 'start',
              children: [
                new Text({
                  text: new TextSpan({
                    text: 'Threads',
                    style: new TextStyle({ foreground: infoColor, bold: true }),
                  }),
                }),
                new SizedBox({ height: 1 }),
                listArea,
              ],
            }),
          }),
        ],
      }),
    });
  }

  private formatAge(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}
