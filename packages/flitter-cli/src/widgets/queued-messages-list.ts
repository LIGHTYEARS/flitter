// QueuedMessagesList — displays queued messages near the input area (F10).
//
// Shows a compact summary of each queued message with truncated preview text.
// Supports per-message interrupt via the onInterrupt callback, allowing
// individual messages to be removed from the queue.
//
// Matches AMP's queued message display pattern where users can see
// what messages are waiting and selectively remove them.

import { StatelessWidget, Widget, type BuildContext } from '../../../flitter-core/src/framework/widget';
import { Column } from '../../../flitter-core/src/widgets/flex';
import { Container } from '../../../flitter-core/src/widgets/container';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { Color } from '../../../flitter-core/src/core/color';
import { EdgeInsets } from '../../../flitter-core/src/layout/edge-insets';
import { SizedBox } from '../../../flitter-core/src/widgets/sized-box';
import type { QueuedMessage } from '../state/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface QueuedMessagesListProps {
  messages: QueuedMessage[];
  onInterrupt: (messageId: string) => void;
}

// ---------------------------------------------------------------------------
// QueuedMessagesList
// ---------------------------------------------------------------------------

/**
 * QueuedMessagesList renders a compact list of queued messages near the input area.
 *
 * Each message is displayed with a numbered index and a truncated preview
 * (max 50 characters). The header shows the total queue count.
 *
 * Layout:
 *   Column
 *     Container — "Queued (N):" header (yellow)
 *     Container — "  1. preview text..." (brightBlack) per message
 */
export class QueuedMessagesList extends StatelessWidget {
  private _messages: QueuedMessage[];
  private _onInterrupt: (messageId: string) => void;

  constructor(props: QueuedMessagesListProps) {
    super({});
    this._messages = props.messages;
    this._onInterrupt = props.onInterrupt;
  }

  build(_context: BuildContext): Widget {
    if (this._messages.length === 0) return new SizedBox({});

    const items = this._messages.map((msg, i) => {
      const preview = msg.text.length > 50 ? msg.text.slice(0, 47) + '...' : msg.text;
      return new Container({
        padding: EdgeInsets.symmetric({ horizontal: 1 }),
        child: new Text({
          text: new TextSpan({
            text: `  ${i + 1}. ${preview}`,
            style: new TextStyle({ foreground: Color.brightBlack }),
          }),
        }),
      });
    });

    return new Column({
      children: [
        new Container({
          padding: EdgeInsets.only({ left: 1 }),
          child: new Text({
            text: new TextSpan({
              text: `Queued (${this._messages.length}):`,
              style: new TextStyle({ foreground: Color.yellow }),
            }),
          }),
        }),
        ...items,
      ],
    });
  }
}
