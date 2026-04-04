// ThreadList — overlay widget for browsing and switching conversation threads
//
// Ported from flitter-amp/src/widgets/thread-list.ts.
// A StatelessWidget that renders a SelectionList of session threads from
// SessionStore. Each entry shows a summary, relative timestamp, message count,
// and cwd. The current session is highlighted with a "●" prefix and disabled.
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
 * Mapped from SessionIndexEntry by the caller.
 */
export interface ThreadEntry {
  sessionId: string;
  summary: string;
  updatedAt: number;
  messageCount: number;
  cwd: string;
}

/** Props for the ThreadList widget. */
interface ThreadListProps {
  /** Thread entries to display, pre-sorted (most recent first). */
  readonly threads: ThreadEntry[];
  /** The currently active session ID, or null if none. */
  readonly currentSessionId: string | null;
  /** Called when a thread is selected for switching. */
  readonly onSelect: (sessionId: string) => void;
  /** Called when the thread list is dismissed (Escape). */
  readonly onDismiss: () => void;
}

// ---------------------------------------------------------------------------
// ThreadList
// ---------------------------------------------------------------------------

/**
 * ThreadList — StatelessWidget overlay for browsing conversation threads.
 *
 * Renders a bordered panel with a title and a SelectionList of threads.
 * Each item shows: summary (or truncated session ID), relative time,
 * message count. The current session is prefixed with "●" and disabled.
 *
 * Widget structure:
 *   FocusScope (onKey: Escape -> onDismiss)
 *     Column (start, center)
 *       SizedBox (height: 2)
 *       Container (bordered cyan, padded, maxWidth: 60)
 *         Column (min, start)
 *           Text "Threads" (cyan, bold)
 *           SizedBox (height: 1)
 *           SelectionList (thread items) OR Text "No threads available"
 */
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

  build(_context: BuildContext): Widget {
    const side = new BorderSide({ color: INFO_COLOR, width: 1, style: 'rounded' });

    const title = new Text({
      text: new TextSpan({
        text: 'Threads',
        style: new TextStyle({ foreground: INFO_COLOR, bold: true }),
      }),
    });

    const items: SelectionItem[] = this.threads.map(t => {
      const age = formatAge(t.updatedAt);
      const isCurrent = t.sessionId === this.currentSessionId;
      const prefix = isCurrent ? '● ' : '';
      return {
        label: `${prefix}${t.summary || t.sessionId.slice(0, 8)}`,
        value: t.sessionId,
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
