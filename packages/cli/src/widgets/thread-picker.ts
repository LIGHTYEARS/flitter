/**
 * ThreadPicker — Thread selection widget using FuzzyPicker.
 *
 * Composes FuzzyPicker from @flitter/tui with thread data to provide
 * a searchable thread selection UI. Used by /switch, /dashboard, and
 * `threads continue` commands.
 *
 * 逆向: amp-cli-reversed/modules/2785_unknown_e0R.js:202-244 — e0R "continue" command
 *   `return new wQ({ threads: i, title: "Select a thread", onSelect: h, onDismiss: t, ... })`
 *   wQ is amp's thread picker widget that wraps FuzzyPicker (we) with thread data.
 *
 * 逆向: amp-cli-reversed/chunk-006.js:35359 — loadThreadsForPicker()
 *   loads thread entries from the store for the picker.
 * 逆向: amp-cli-reversed/chunk-006.js:35126 — unloadThreadsForPicker()
 *   cleans up loaded thread data when picker is dismissed.
 *
 * @module
 */

import { FuzzyPicker, type FuzzyPickerProps } from "@flitter/tui";
import type { Widget as WidgetInterface } from "@flitter/tui";

// ─── Types ──────────────────────────────────────────────

/**
 * Thread entry for the picker.
 * Minimal thread metadata needed for display and selection.
 */
export interface ThreadPickerEntry {
  /** Thread ID */
  id: string;
  /** Thread title (may be auto-generated or user-set) */
  title: string;
  /** ISO date string of last activity */
  date: string;
  /** Number of messages in the thread */
  messageCount: number;
  /** Whether the thread is archived */
  archived?: boolean;
  /** Workspace URI (for filtering) */
  workspaceUri?: string;
}

/**
 * Configuration for the ThreadPicker widget.
 */
export interface ThreadPickerConfig {
  /** Thread entries to display */
  threads: ThreadPickerEntry[];
  /** Callback when a thread is selected */
  onSelect: (threadId: string, info: { hasUserInteracted: boolean }) => void;
  /** Callback when the picker is dismissed without selection */
  onCancel: () => void;
  /** Title displayed at the top of the picker */
  title?: string;
  /** Whether thread data is still loading */
  isLoading?: boolean;
  /** Current thread ID (to highlight) */
  currentThreadId?: string;
}

// ─── ThreadPicker ───────────────────────────────────────

/**
 * Format a thread entry into a display label.
 *
 * 逆向: amp wQ formats each thread as a compound label with
 *   title, ID, date, and message count. Exact format from
 *   e0R:227 where threads are passed to FuzzyPicker.
 *
 * @param entry - Thread entry to format
 * @returns Formatted display string
 */
export function formatThreadLabel(entry: ThreadPickerEntry): string {
  const id = entry.id.slice(0, 8);
  const title = entry.title || "(untitled)";
  const date = entry.date ? formatRelativeDate(entry.date) : "unknown";
  const msgs = `${entry.messageCount} msg${entry.messageCount !== 1 ? "s" : ""}`;

  return `${id} — ${title} — ${date} — ${msgs}`;
}

/**
 * Format a date string as a relative time description.
 */
function formatRelativeDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    const diffHours = Math.floor(diffMs / 3_600_000);
    const diffDays = Math.floor(diffMs / 86_400_000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return isoDate;
  }
}

/**
 * Create a ThreadPicker FuzzyPicker widget.
 *
 * This is a factory function that returns a configured FuzzyPicker<ThreadPickerEntry>.
 * The caller places this widget in the widget tree (e.g., as an overlay or
 * replacement for the main content area).
 *
 * 逆向: amp e0R:227 — `new wQ({ threads: i, title: "Select a thread", ... })`
 *   wQ wraps we (FuzzyPicker) with thread-specific formatting and callbacks.
 *
 * @param config - Thread picker configuration
 * @returns FuzzyPicker widget configured for thread selection
 *
 * @example
 * ```ts
 * const picker = createThreadPicker({
 *   threads: threadEntries,
 *   onSelect: (threadId) => switchToThread(threadId),
 *   onCancel: () => closePicker(),
 * });
 * ```
 */
export function createThreadPicker(
  config: ThreadPickerConfig,
): WidgetInterface {
  const {
    threads,
    onSelect,
    onCancel,
    title = "Select a thread",
    currentThreadId,
  } = config;

  // Filter out archived threads
  const activeThreads = threads.filter((t) => !t.archived);

  // Sort by most recent first
  const sortedThreads = [...activeThreads].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA;
  });

  return new FuzzyPicker<ThreadPickerEntry>({
    items: sortedThreads,
    getLabel: formatThreadLabel,
    onAccept: (item, info) => {
      onSelect(item.id, info);
    },
    onDismiss: () => {
      onCancel();
    },
    // 逆向: amp wQ highlights the current thread as disabled
    isItemDisabled: currentThreadId
      ? (item) => item.id === currentThreadId
      : undefined,
    title,
    maxRenderItems: 20,
  });
}
