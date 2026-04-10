// ThreadPreview — read-only split-view widget for previewing a thread's messages
//
// Displays a compact summary of conversation items from a ThreadHandle:
//   - Title header (bold cyan)
//   - Recent N message summaries (user: "> text", assistant: plain text, tool: "[title]")
//   - Overflow indicator when items exceed maxPreviewItems
//   - Empty thread placeholder
//
// Matches AMP's thread picker preview (SECTION 6, 20_thread_management.js).
// Colors use hardcoded defaults (cyan info, brightBlack muted) following
// the same pattern as command-palette.ts and thread-list.ts.

import { StatelessWidget, Widget, type BuildContext } from '../../../flitter-core/src/framework/widget';
import { Column } from '../../../flitter-core/src/widgets/flex';
import { Container } from '../../../flitter-core/src/widgets/container';
import { SizedBox } from '../../../flitter-core/src/widgets/sized-box';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { Color } from '../../../flitter-core/src/core/color';
import { EdgeInsets } from '../../../flitter-core/src/layout/edge-insets';
import { BoxDecoration, Border, BorderSide } from '../../../flitter-core/src/layout/render-decorated';
import { BoxConstraints } from '../../../flitter-core/src/core/box-constraints';
import type { ConversationItem } from '../state/types';

// ---------------------------------------------------------------------------
// Hardcoded colors (matches thread-list.ts / command-palette.ts convention)
// ---------------------------------------------------------------------------

const INFO_COLOR = Color.cyan;
const MUTED_COLOR = Color.brightBlack;

/** Maximum number of conversation items to show in preview. */
const MAX_PREVIEW_ITEMS = 20;

/** Maximum characters to display per message line before truncation. */
const MAX_LINE_LENGTH = 120;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/** Props for the ThreadPreview widget. */
export interface ThreadPreviewProps {
  /** Conversation items to display from the thread's session. */
  readonly items: ReadonlyArray<ConversationItem>;
  /** Thread title (may be null for untitled threads). */
  readonly title: string | null;
}

// ---------------------------------------------------------------------------
// ThreadPreview
// ---------------------------------------------------------------------------

/**
 * ThreadPreview -- shows a read-only preview of a thread's conversation items.
 * Rendered next to the thread list in a split-view layout when a thread is
 * selected/hovered.
 *
 * Matches AMP's thread preview panel with independent scroll controller
 * from 20_thread_management.js SECTION 6.
 *
 * Widget structure:
 *   Container (maxWidth: 60, bordered muted, padded)
 *     Column (min, start)
 *       Text title (cyan, bold) [if title]
 *       SizedBox (height: 1) [if title]
 *       ...message lines
 *       Text overflow indicator [if items > MAX_PREVIEW_ITEMS]
 *       Text "(empty thread)" [if no items]
 */
export class ThreadPreview extends StatelessWidget {
  private readonly items: ReadonlyArray<ConversationItem>;
  private readonly title: string | null;

  constructor(props: ThreadPreviewProps) {
    super({});
    this.items = props.items;
    this.title = props.title;
  }

  /** Build the preview widget tree. */
  build(_context: BuildContext): Widget {
    const previewLines: Widget[] = [];

    // Title header
    if (this.title) {
      previewLines.push(new Text({
        text: new TextSpan({
          text: this.title,
          style: new TextStyle({ foreground: INFO_COLOR, bold: true }),
        }),
      }));
      previewLines.push(new SizedBox({ height: 1 }));
    }

    // Show up to MAX_PREVIEW_ITEMS items as preview
    const displayItems = this.items.slice(0, MAX_PREVIEW_ITEMS);

    for (const item of displayItems) {
      if (item.type === 'user_message') {
        const text = item.text?.slice(0, MAX_LINE_LENGTH) ?? '';
        previewLines.push(new Text({
          text: new TextSpan({
            text: `> ${text}`,
            style: new TextStyle({ foreground: Color.white, bold: true }),
          }),
        }));
      } else if (item.type === 'assistant_message') {
        const text = item.text?.slice(0, MAX_LINE_LENGTH) ?? '';
        previewLines.push(new Text({
          text: new TextSpan({
            text: text,
            style: new TextStyle({ foreground: MUTED_COLOR }),
          }),
        }));
      } else if (item.type === 'tool_call') {
        previewLines.push(new Text({
          text: new TextSpan({
            text: `[${item.title}]`,
            style: new TextStyle({ foreground: MUTED_COLOR, italic: true }),
          }),
        }));
      }
    }

    // Overflow indicator
    if (this.items.length > MAX_PREVIEW_ITEMS) {
      previewLines.push(new Text({
        text: new TextSpan({
          text: `... ${this.items.length - MAX_PREVIEW_ITEMS} more items`,
          style: new TextStyle({ foreground: MUTED_COLOR, italic: true }),
        }),
      }));
    }

    // Empty thread placeholder
    if (previewLines.length === 0) {
      previewLines.push(new Text({
        text: new TextSpan({
          text: '(empty thread)',
          style: new TextStyle({ foreground: MUTED_COLOR, italic: true }),
        }),
      }));
    }

    return new Container({
      constraints: new BoxConstraints({ maxWidth: 60 }),
      padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
      decoration: new BoxDecoration({
        border: Border.all(new BorderSide({ color: MUTED_COLOR, width: 1, style: 'rounded' })),
      }),
      child: new Column({
        mainAxisSize: 'min',
        crossAxisAlignment: 'start',
        children: previewLines,
      }),
    });
  }
}
