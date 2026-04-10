// ThreadMentionPicker — overlay widget for selecting a thread to insert as @@[title] reference.
//
// Triggered when the user types "@@" in the InputArea. Lists all visible threads
// and inserts a @@[thread-title] mention into the input on selection.
//
// Widget structure:
//   FocusScope (onKey: Escape -> onDismiss, absorbs keys)
//     Column (start, center)
//       SizedBox (height: 2)
//       Container (bordered cyan, padded, maxWidth: 50)
//         Column (min, start)
//           Text "Thread Mention" (cyan, bold)
//           SizedBox (height: 1)
//           SelectionList (thread items) OR Text "No threads"
//           SizedBox (height: 1)
//           Text footer (Esc close)

import {
  StatelessWidget,
  Widget,
  type BuildContext,
} from '../../../flitter-core/src/framework/widget';
import { Column } from '../../../flitter-core/src/widgets/flex';
import { Container } from '../../../flitter-core/src/widgets/container';
import { SizedBox } from '../../../flitter-core/src/widgets/sized-box';
import { FocusScope } from '../../../flitter-core/src/widgets/focus-scope';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { Color } from '../../../flitter-core/src/core/color';
import { EdgeInsets } from '../../../flitter-core/src/layout/edge-insets';
import { BoxDecoration, Border, BorderSide } from '../../../flitter-core/src/layout/render-decorated';
import { BoxConstraints } from '../../../flitter-core/src/core/box-constraints';
import { SelectionList, type SelectionItem } from '../../../flitter-core/src/widgets/selection-list';
import { Center } from '../../../flitter-core/src/widgets/center';
import type { KeyEvent, KeyEventResult } from '../../../flitter-core/src/input/events';

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const INFO_COLOR = Color.cyan;
const MUTED_COLOR = Color.brightBlack;
const KEYBIND_COLOR = Color.blue;

// ---------------------------------------------------------------------------
// ThreadMentionEntry — minimal thread info for the picker
// ---------------------------------------------------------------------------

/** Minimal thread entry for the mention picker display. */
export interface ThreadMentionEntry {
  /** Thread context ID. */
  threadID: string;
  /** Display title (auto-generated or manual). Null means untitled. */
  title: string | null;
  /** Number of messages in the thread. */
  messageCount: number;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/** Props for the ThreadMentionPicker widget. */
interface ThreadMentionPickerProps {
  /** Available threads to pick from (pre-sorted, most recent first). */
  readonly threads: ThreadMentionEntry[];
  /** Called with the selected thread title to insert into the input. */
  readonly onSelect: (threadTitle: string) => void;
  /** Called when the picker is dismissed (Escape). */
  readonly onDismiss: () => void;
}

// ---------------------------------------------------------------------------
// ThreadMentionPicker
// ---------------------------------------------------------------------------

/**
 * Overlay widget for selecting a thread to insert as @@[title] reference.
 *
 * Lists all visible threads with their title and message count.
 * On selection, calls onSelect with the thread title string.
 * The caller is responsible for inserting the @@[title] text into the input.
 *
 * Uses direction keys for navigation and Enter to confirm, matching
 * the same interaction pattern as ThreadList and CommandPalette.
 */
export class ThreadMentionPicker extends StatelessWidget {
  private readonly threads: ThreadMentionEntry[];
  private readonly onSelect: (threadTitle: string) => void;
  private readonly onDismiss: () => void;

  constructor(props: ThreadMentionPickerProps) {
    super({});
    this.threads = props.threads;
    this.onSelect = props.onSelect;
    this.onDismiss = props.onDismiss;
  }

  build(_context: BuildContext): Widget {
    const side = new BorderSide({ color: INFO_COLOR, width: 1, style: 'rounded' });

    const title = new Text({
      text: new TextSpan({
        text: 'Thread Mention',
        style: new TextStyle({ foreground: INFO_COLOR, bold: true }),
      }),
    });

    const items: SelectionItem[] = this.threads.map(t => ({
      label: t.title ?? t.threadID.slice(0, 8),
      value: t.threadID,
      description: `${t.messageCount} msgs`,
    }));

    let listContent: Widget;
    if (items.length > 0) {
      listContent = new SelectionList({
        items,
        onSelect: (threadID: string) => {
          const entry = this.threads.find(t => t.threadID === threadID);
          const insertTitle = entry?.title ?? threadID.slice(0, 8);
          this.onSelect(insertTitle);
        },
        onCancel: this.onDismiss,
        showDescription: true,
      });
    } else {
      listContent = new Text({
        text: new TextSpan({
          text: 'No threads available',
          style: new TextStyle({ foreground: MUTED_COLOR, italic: true }),
        }),
      });
    }

    const footer = new Text({
      text: new TextSpan({
        children: [
          new TextSpan({
            text: '↑↓',
            style: new TextStyle({ foreground: KEYBIND_COLOR }),
          }),
          new TextSpan({
            text: ' navigate  ',
            style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
          }),
          new TextSpan({
            text: 'Enter',
            style: new TextStyle({ foreground: KEYBIND_COLOR }),
          }),
          new TextSpan({
            text: ' select  ',
            style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
          }),
          new TextSpan({
            text: 'Esc',
            style: new TextStyle({ foreground: KEYBIND_COLOR }),
          }),
          new TextSpan({
            text: ' close',
            style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
          }),
        ],
      }),
    });

    const innerColumn = new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'start',
      children: [
        title,
        new SizedBox({ height: 1 }),
        listContent,
        new SizedBox({ height: 1 }),
        footer,
      ],
    });

    const borderedPanel = new Container({
      decoration: new BoxDecoration({ border: Border.all(side) }),
      padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
      constraints: new BoxConstraints({ maxWidth: 50 }),
      child: innerColumn,
    });

    return new FocusScope({
      autofocus: true,
      onKey: (event: KeyEvent): KeyEventResult => {
        if (event.key === 'Escape') {
          this.onDismiss();
          return 'handled';
        }
        // Let SelectionList handle arrow keys and Enter
        return 'ignored';
      },
      child: new Center({
        child: new Column({
          mainAxisSize: 'min',
          crossAxisAlignment: 'center',
          children: [
            new SizedBox({ height: 2 }),
            borderedPanel,
          ],
        }),
      }),
    });
  }
}
