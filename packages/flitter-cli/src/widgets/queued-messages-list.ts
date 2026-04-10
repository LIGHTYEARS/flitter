// QueuedMessagesList — Widget displaying queued messages waiting for submission.
//
// Matches AMP's s9T widget that renders a list of queued messages above the
// input area when the user is in queue mode. Each row shows:
//   - 1-based ordinal number
//   - Text summary (truncated to a single line)
//   - Optional interrupt button (when onInterrupt callback is provided)
//
// Layout:
//   Column (mainAxisSize: 'min', crossAxisAlignment: 'stretch')
//     Row per message:
//       Text (ordinal, dim)
//       Text (summary, truncated with ellipsis)
//       Text (interrupt button, if callback provided)
//
// AMP ref: s9T from input-area-top-left-builder.js

import { StatelessWidget, Widget, type BuildContext } from '../../../flitter-core/src/framework/widget';
import { Column, Row } from '../../../flitter-core/src/widgets/flex';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { Color } from '../../../flitter-core/src/core/color';
import { SizedBox } from '../../../flitter-core/src/widgets/sized-box';
import { Expanded } from '../../../flitter-core/src/widgets/flexible';
import { MouseRegion } from '../../../flitter-core/src/widgets/mouse-region';
import type { QueuedMessage } from '../state/types';
import { log } from '../utils/logger';

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const ORDINAL_COLOR = Color.brightBlack;
const TEXT_COLOR = Color.white;
const INTERRUPT_COLOR = Color.red;
const MUTED_COLOR = Color.brightBlack;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/** Props for the QueuedMessagesList widget. */
interface QueuedMessagesListProps {
  /** Array of queued messages to display. */
  readonly queuedMessages: ReadonlyArray<QueuedMessage>;
  /** Optional callback to interrupt (remove) a specific queued message by ID. */
  readonly onInterrupt?: (messageID: string) => void;
}

// ---------------------------------------------------------------------------
// QueuedMessagesList
// ---------------------------------------------------------------------------

/**
 * QueuedMessagesList — renders a vertical list of queued messages.
 *
 * Matches AMP's s9T widget. Each queued message is rendered as a single
 * Row containing the ordinal number, a one-line text summary, and an
 * optional interrupt button.
 *
 * Placed above the text field inside InputArea when queuedMessages.length > 0.
 */
export class QueuedMessagesList extends StatelessWidget {
  private readonly queuedMessages: ReadonlyArray<QueuedMessage>;
  private readonly onInterrupt?: (messageID: string) => void;

  constructor(props: QueuedMessagesListProps) {
    super({});
    this.queuedMessages = props.queuedMessages;
    this.onInterrupt = props.onInterrupt;
    log.debug('QueuedMessagesList: rendering', { count: props.queuedMessages.length });
  }

  build(_context: BuildContext): Widget {
    const rows: Widget[] = [];

    for (let i = 0; i < this.queuedMessages.length; i++) {
      const msg = this.queuedMessages[i];
      const ordinal = i + 1;

      // Truncate text to a reasonable summary length (single line)
      const summary = msg.text.replace(/\n/g, ' ').slice(0, 60);
      const isTruncated = msg.text.length > 60 || msg.text.includes('\n');

      const rowChildren: Widget[] = [
        // Ordinal number
        new Text({
          text: new TextSpan({
            text: `${ordinal}. `,
            style: new TextStyle({ foreground: ORDINAL_COLOR }),
          }),
        }),
        // Text summary (expanded to fill available space)
        new Expanded({
          child: new Text({
            text: new TextSpan({
              text: isTruncated ? summary + '...' : summary,
              style: new TextStyle({ foreground: TEXT_COLOR }),
            }),
            maxLines: 1,
            overflow: 'ellipsis',
          }),
        }),
      ];

      // Interrupt button (only when callback is provided)
      if (this.onInterrupt) {
        const messageID = msg.id;
        rowChildren.push(
          new SizedBox({ width: 1 }),
          new MouseRegion({
            cursor: 'pointer',
            onClick: () => {
              log.info('QueuedMessagesList: interrupt clicked', { messageID });
              this.onInterrupt!(messageID);
            },
            child: new Text({
              text: new TextSpan({
                text: '[x]',
                style: new TextStyle({ foreground: INTERRUPT_COLOR, bold: true }),
              }),
            }),
          }),
        );
      }

      rows.push(
        new Row({
          children: rowChildren,
        }),
      );
    }

    // Header label
    const header = new Text({
      text: new TextSpan({
        text: `Queued (${this.queuedMessages.length}):`,
        style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
      }),
    });

    return new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'stretch',
      children: [header, ...rows, new SizedBox({ height: 1 })],
    });
  }
}
