// ThreadList — overlay widget for browsing and switching conversation threads
//
// Wired to ThreadPool state via mapThreadHandleToEntry(). Each entry shows
// a summary (title / first user message / threadID prefix), relative timestamp,
// message count, cwd, visibility, and agentMode. The current thread is
// highlighted with a "●" prefix and disabled.
//
// Split-view: when previewThreadID is set (defaults to the first thread),
// renders a Row layout: [ThreadList panel | ThreadPreview panel].
// ThreadPreview is imported from ./thread-preview.ts.
//
// Colors use hardcoded defaults (cyan info, brightBlack muted) rather
// than AmpThemeProvider. Follows the same pattern as command-palette.ts.

import { StatefulWidget, State, Widget, type BuildContext } from '../../../flitter-core/src/framework/widget';
import type { KeyEvent, KeyEventResult } from '../../../flitter-core/src/input/events';
import { Column, Row } from '../../../flitter-core/src/widgets/flex';
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
import { ThreadPreview } from './thread-preview';

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
}

// ---------------------------------------------------------------------------
// ThreadPreview (re-exported from ./thread-preview.ts)
// ---------------------------------------------------------------------------

// ThreadPreview is now a standalone module. Re-export for backward compatibility.
export { ThreadPreview } from './thread-preview';

// ---------------------------------------------------------------------------
// ThreadList (StatefulWidget with split-view preview support)
// ---------------------------------------------------------------------------

/**
 * ThreadList — StatefulWidget overlay for browsing conversation threads.
 *
 * Manages a previewThreadID state that tracks the currently previewed thread.
 * When getThreadItems callback is provided and previewThreadID is set,
 * renders a split-view Row layout: [ThreadList panel | ThreadPreview panel].
 *
 * Wired to ThreadPool state. Renders a bordered panel with a title showing
 * thread count and a SelectionList of threads. Each item shows: summary
 * (title / first user message / threadID prefix), relative time, message
 * count. The current thread is prefixed with "●" and disabled.
 *
 * Widget structure (without preview):
 *   FocusScope (onKey: Escape -> onDismiss)
 *     Column (start, center)
 *       SizedBox (height: 2)
 *       Container (bordered cyan, padded, maxWidth: 60)
 *         Column (min, start)
 *           Text "Threads (N)" (cyan, bold)
 *           SizedBox (height: 1)
 *           SelectionList (thread items) OR Text "No threads available"
 *
 * Widget structure (with preview):
 *   FocusScope (onKey: Escape -> onDismiss)
 *     Column (start, center)
 *       SizedBox (height: 2)
 *       Row [borderedPanel, SizedBox(width:1), ThreadPreview]
 */
export class ThreadList extends StatefulWidget {
  readonly threads: ThreadEntry[];
  readonly currentThreadID: string | null;
  readonly onSelect: (threadID: string) => void;
  readonly onDismiss: () => void;
  readonly getThreadItems?: (threadID: string) => ReadonlyArray<ConversationItem>;
  readonly getThreadTitle?: (threadID: string) => string | null;

  constructor(props: ThreadListProps) {
    super({});
    this.threads = props.threads;
    this.currentThreadID = props.currentThreadID;
    this.onSelect = props.onSelect;
    this.onDismiss = props.onDismiss;
    this.getThreadItems = props.getThreadItems;
    this.getThreadTitle = props.getThreadTitle;
  }

  /** Create the mutable state for ThreadList. */
  createState(): State<ThreadList> {
    return new ThreadListState();
  }
}

/**
 * Mutable state for the ThreadList widget.
 * Tracks previewThreadID — the ID of the thread currently being previewed
 * in the split-view panel. Defaults to the first thread in the list.
 */
class ThreadListState extends State<ThreadList> {
  /**
   * The thread ID currently being previewed in the split-view panel.
   * Null when no preview is active (e.g., empty thread list or no getThreadItems).
   */
  private _previewThreadID: string | null = null;

  /** Accessor for the current preview thread ID. */
  get previewThreadID(): string | null {
    return this._previewThreadID;
  }

  /** Initialize previewThreadID to the first thread in the list. */
  initState(): void {
    super.initState();
    this._initializePreviewThread();
  }

  /** Update previewThreadID if the thread list changed. */
  didUpdateWidget(_oldWidget: ThreadList): void {
    // If current preview thread is no longer in the list, reset
    if (this._previewThreadID) {
      const stillExists = this.widget.threads.some(t => t.threadID === this._previewThreadID);
      if (!stillExists) {
        this._initializePreviewThread();
      }
    } else {
      this._initializePreviewThread();
    }
  }

  /**
   * Set previewThreadID to the first thread in the list.
   * Picks the first non-current thread if available, otherwise the first thread.
   */
  private _initializePreviewThread(): void {
    const threads = this.widget.threads;
    if (threads.length === 0) {
      this._previewThreadID = null;
      return;
    }
    // Prefer first non-current thread for preview; fall back to first thread
    const nonCurrent = threads.find(t => t.threadID !== this.widget.currentThreadID);
    this._previewThreadID = nonCurrent?.threadID ?? threads[0]!.threadID;
  }

  /**
   * Handle thread selection: update previewThreadID and forward to onSelect.
   * The preview updates immediately on selection.
   */
  private _handleSelect = (threadID: string): void => {
    this.widget.onSelect(threadID);
  };

  build(_context: BuildContext): Widget {
    const side = new BorderSide({ color: INFO_COLOR, width: 1, style: 'rounded' });

    const title = new Text({
      text: new TextSpan({
        text: `Threads (${this.widget.threads.length})`,
        style: new TextStyle({ foreground: INFO_COLOR, bold: true }),
      }),
    });

    const items: SelectionItem[] = this.widget.threads.map(t => {
      const age = formatAge(t.updatedAt);
      const isCurrent = t.threadID === this.widget.currentThreadID;
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
        onSelect: this._handleSelect,
        onCancel: this.widget.onDismiss,
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

    // Build the main content: optionally with split-view preview
    let mainContent: Widget;
    const canShowPreview = this._previewThreadID !== null && this.widget.getThreadItems;

    if (canShowPreview) {
      const previewItems = this.widget.getThreadItems!(this._previewThreadID!);
      const previewTitle = this.widget.getThreadTitle?.(this._previewThreadID!) ?? null;

      mainContent = new Row({
        mainAxisSize: 'min',
        crossAxisAlignment: 'start',
        children: [
          borderedPanel,
          new SizedBox({ width: 1 }),
          new ThreadPreview({
            items: previewItems,
            title: previewTitle,
          }),
        ],
      });
    } else {
      mainContent = borderedPanel;
    }

    const outerColumn = new Column({
      mainAxisAlignment: 'start',
      crossAxisAlignment: 'center',
      children: [
        new SizedBox({ height: 2 }),
        mainContent,
      ],
    });

    return new FocusScope({
      autofocus: true,
      onKey: (event: KeyEvent): KeyEventResult => {
        if (event.key === 'Escape') {
          this.widget.onDismiss();
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
