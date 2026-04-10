// ThreadList — overlay widget for browsing and switching conversation threads
//
// Wired to ThreadPool state via mapThreadHandleToEntry(). Each entry shows
// a summary (title / first user message / threadID prefix), relative timestamp,
// message count, cwd, visibility, and agentMode. The current thread is
// highlighted with a "●" prefix and disabled.
//
// ThreadPreview — read-only split-view of a thread's conversation items
// matching AMP's thread picker preview (SECTION 6, 20_thread_management.js).
//
// Colors use hardcoded defaults (cyan info, brightBlack muted) rather
// than AmpThemeProvider. Follows the same pattern as command-palette.ts.

import { StatelessWidget, Widget, type BuildContext } from '../../../flitter-core/src/framework/widget';
import type { KeyEvent, KeyEventResult } from '../../../flitter-core/src/input/events';
import { Column } from '../../../flitter-core/src/widgets/flex';
import { Container } from '../../../flitter-core/src/widgets/container';
import { SizedBox } from '../../../flitter-core/src/widgets/sized-box';
import { FocusScope } from '../../../flitter-core/src/widgets/focus-scope';
import { Text } from '../../../flitter-core/src/widgets/text';
import { SelectionList, type SelectionItem } from '../../../flitter-core/src/widgets/selection-list';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { Color } from '../../../flitter-core/src/core/color';
import { EdgeInsets } from '../../../flitter-core/src/layout/edge-insets';
import { BoxDecoration, Border, BorderSide } from '../../../flitter-core/src/layout/render-decorated';
import { BoxConstraints } from '../../../flitter-core/src/core/box-constraints';
import type { ThreadHandle, ConversationItem } from '../state/types';

// ---------------------------------------------------------------------------
// Hardcoded colors (matches command-palette.ts convention)
// ---------------------------------------------------------------------------

const INFO_COLOR = Color.cyan;
const MUTED_COLOR = Color.brightBlack;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A single thread entry for display in the thread list.
 * Derived from ThreadHandle via mapThreadHandleToEntry().
 */
export interface ThreadEntry {
  /** Thread ID in "T-{uuid}" format. */
  threadID: string;
  /** Display summary (title or truncated first message). */
  summary: string;
  /** Epoch ms when last updated. */
  updatedAt: number;
  /** Number of user messages in the thread. */
  messageCount: number;
  /** Working directory for the thread. */
  cwd: string;
  /** Thread visibility mode. */
  visibility: string;
  /** Agent mode label. */
  agentMode: string | null;
}

/**
 * Map a ThreadHandle to a ThreadEntry for display.
 * Extracts title/summary, message count, and metadata from the handle.
 */
export function mapThreadHandleToEntry(handle: ThreadHandle): ThreadEntry {
  const items = handle.session.items;
  const userMsgCount = items.filter(i => i.type === 'user_message').length;

  // Summary: use title if set, otherwise first user message, otherwise thread ID prefix
  let summary = handle.title ?? '';
  if (!summary) {
    const firstUserMsg = items.find(i => i.type === 'user_message');
    if (firstUserMsg && firstUserMsg.type === 'user_message') {
      summary = firstUserMsg.text?.slice(0, 80) ?? '';
    }
  }
  if (!summary) {
    summary = handle.threadID.slice(0, 10);
  }

  return {
    threadID: handle.threadID,
    summary,
    updatedAt: handle.session.metadata.startTime,
    messageCount: userMsgCount,
    cwd: handle.session.metadata.cwd,
    visibility: handle.visibility,
    agentMode: handle.agentMode,
  };
}

/** Props for the ThreadList widget. */
interface ThreadListProps {
  /** Thread entries to display, pre-sorted (most recent first). */
  readonly threads: ThreadEntry[];
  /** The currently active thread ID, or null. */
  readonly currentThreadID: string | null;
  /** Called when a thread is selected for switching. */
  readonly onSelect: (threadID: string) => void;
  /** Called when the thread list is dismissed (Escape). */
  readonly onDismiss: () => void;
  /** Optional: callback to get thread items for preview. */
  readonly getThreadItems?: (threadID: string) => ReadonlyArray<ConversationItem>;
  /** Optional: callback to get thread title for preview. */
  readonly getThreadTitle?: (threadID: string) => string | null;
  /**
   * Optional: called when the highlighted thread changes (keyboard navigation).
   * Used to update the preview panel in the app shell.
   * Matches AMP's thread picker preview on highlight (F8).
   */
  readonly onPreviewThread?: (threadID: string) => void;
}

// ---------------------------------------------------------------------------
// ThreadPreview
// ---------------------------------------------------------------------------

/**
 * ThreadPreview — shows a read-only view of a thread's conversation items.
 * Rendered next to the thread list in a split-view layout.
 * Matches AMP's thread preview with independent scroll controller.
 */
export class ThreadPreview extends StatelessWidget {
  private readonly items: ReadonlyArray<ConversationItem>;
  private readonly title: string | null;

  constructor(props: { items: ReadonlyArray<ConversationItem>; title: string | null }) {
    super({});
    this.items = props.items;
    this.title = props.title;
  }

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

    // Show up to 20 items as preview
    const maxPreviewItems = 20;
    const displayItems = this.items.slice(0, maxPreviewItems);

    for (const item of displayItems) {
      if (item.type === 'user_message') {
        const text = item.text?.slice(0, 120) ?? '';
        previewLines.push(new Text({
          text: new TextSpan({
            text: `> ${text}`,
            style: new TextStyle({ foreground: Color.white, bold: true }),
          }),
        }));
      } else if (item.type === 'assistant_message') {
        const text = item.text?.slice(0, 120) ?? '';
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

    if (this.items.length > maxPreviewItems) {
      previewLines.push(new Text({
        text: new TextSpan({
          text: `... ${this.items.length - maxPreviewItems} more items`,
          style: new TextStyle({ foreground: MUTED_COLOR, italic: true }),
        }),
      }));
    }

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

// ---------------------------------------------------------------------------
// ThreadList
// ---------------------------------------------------------------------------

/**
 * ThreadList — StatelessWidget overlay for browsing conversation threads.
 *
 * Wired to ThreadPool state. Renders a bordered panel with a title showing
 * thread count and a SelectionList of threads. Each item shows: summary
 * (title / first user message / threadID prefix), relative time, message
 * count. The current thread is prefixed with "●" and disabled.
 *
 * Widget structure:
 *   FocusScope (onKey: Escape -> onDismiss)
 *     Column (start, center)
 *       SizedBox (height: 2)
 *       Container (bordered cyan, padded, maxWidth: 60)
 *         Column (min, start)
 *           Text "Threads (N)" (cyan, bold)
 *           SizedBox (height: 1)
 *           SelectionList (thread items) OR Text "No threads available"
 */
export class ThreadList extends StatelessWidget {
  private readonly threads: ThreadEntry[];
  private readonly currentThreadID: string | null;
  private readonly onSelect: (threadID: string) => void;
  private readonly onDismiss: () => void;
  private readonly getThreadItems?: (threadID: string) => ReadonlyArray<ConversationItem>;
  private readonly getThreadTitle?: (threadID: string) => string | null;
  private readonly onPreviewThread?: (threadID: string) => void;

  constructor(props: ThreadListProps) {
    super({});
    this.threads = props.threads;
    this.currentThreadID = props.currentThreadID;
    this.onSelect = props.onSelect;
    this.onDismiss = props.onDismiss;
    this.getThreadItems = props.getThreadItems;
    this.getThreadTitle = props.getThreadTitle;
    this.onPreviewThread = props.onPreviewThread;
  }

  build(_context: BuildContext): Widget {
    const side = new BorderSide({ color: INFO_COLOR, width: 1, style: 'rounded' });

    const title = new Text({
      text: new TextSpan({
        text: `Threads (${this.threads.length})`,
        style: new TextStyle({ foreground: INFO_COLOR, bold: true }),
      }),
    });

    const items: SelectionItem[] = this.threads.map(t => {
      const age = formatAge(t.updatedAt);
      const isCurrent = t.threadID === this.currentThreadID;
      const prefix = isCurrent ? '● ' : '';
      return {
        label: `${prefix}${t.summary || t.threadID.slice(0, 8)}`,
        value: t.threadID,
        description: `${t.messageCount} msgs · ${age}`,
        disabled: isCurrent,
      };
    });

    let listContent: Widget;
    if (items.length > 0) {
      listContent = new SelectionList({
        items,
        onSelect: this.onSelect,
        onCancel: this.onDismiss,
        onHighlightChange: this.onPreviewThread,
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

    const innerColumn = new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'start',
      children: [
        title,
        new SizedBox({ height: 1 }),
        listContent,
      ],
    });

    const borderedPanel = new Container({
      constraints: new BoxConstraints({ maxWidth: 60 }),
      padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
      decoration: new BoxDecoration({
        border: Border.all(side),
      }),
      child: innerColumn,
    });

    const outerColumn = new Column({
      mainAxisAlignment: 'start',
      crossAxisAlignment: 'center',
      children: [
        new SizedBox({ height: 2 }),
        borderedPanel,
      ],
    });

    return new FocusScope({
      autofocus: true,
      onKey: (event: KeyEvent): KeyEventResult => {
        if (event.key === 'Escape') {
          this.onDismiss();
          return 'handled';
        }
        return 'ignored';
      },
      child: outerColumn,
    });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a timestamp as a human-readable relative age string.
 */
function formatAge(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}
