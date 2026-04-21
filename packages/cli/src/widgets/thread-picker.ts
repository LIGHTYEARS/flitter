/**
 * ThreadPicker widget — fuzzy-filterable thread list for switching conversations.
 *
 * 逆向: amp-cli-reversed/modules/1472_tui_components/jetbrains_wizard.js:3121-3141
 *   showStandaloneThreadPicker() shows a command palette with commandId "continue".
 *   The palette provides thread list with filtering by workspace, fuzzy search,
 *   and preview via threadPreviewController.
 *
 * 逆向: amp-cli-reversed/modules/1472_tui_components/jetbrains_wizard.js:2504
 *   filterThreadPickerByWorkspace = !0 (default: filter by workspace)
 *
 * 逆向: amp-cli-reversed/modules/1472_tui_components/jetbrains_wizard.js:3399-3406
 *   Palette receives: threads, previewController, isLoadingThreads, threadLoadError,
 *   filterByWorkspace, currentWorkspace, threadViewStates
 *
 * @module
 */

import type { BuildContext, Widget } from "@flitter/tui";
import { Column, Expanded, Row, SizedBox, State, StatefulWidget, Text } from "@flitter/tui";

// ─── Types ───────────────────────────────────────────────

export interface ThreadPickerEntry {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
  workspace?: string;
}

export interface ThreadPickerConfig {
  /** List of threads to display */
  threads: ThreadPickerEntry[];
  /** Whether threads are still loading */
  isLoading: boolean;
  /** Error from thread loading, if any */
  loadError?: string;
  /**
   * 逆向: filterByWorkspace flag controls whether threads are filtered
   * to the current workspace. Default true (matching amp).
   */
  filterByWorkspace: boolean;
  /** Current workspace path (for filtering) */
  currentWorkspace?: string;
  /** Callback when a thread is selected */
  onSelect: (threadId: string) => void;
  /** Callback to cancel / dismiss the picker */
  onCancel: () => void;
  /** Callback to toggle workspace filter */
  onToggleFilter?: () => void;
}

// ─── ThreadPicker ────────────────────────────────────────

/**
 * ThreadPicker — renders a fuzzy-filterable list of threads.
 *
 * 逆向: The picker in amp is part of the command palette system.
 *   When commandId="continue", the palette populates with threads.
 *   Here we implement a standalone widget that composes the thread
 *   list with fuzzy filtering.
 */
export class ThreadPicker extends StatefulWidget {
  readonly config: ThreadPickerConfig;

  constructor(config: ThreadPickerConfig) {
    super();
    this.config = config;
  }

  createState(): ThreadPickerState {
    return new ThreadPickerState();
  }
}

export class ThreadPickerState extends State<ThreadPicker> {
  private _filterText = "";
  private _selectedIndex = 0;

  /** Get threads filtered by workspace and fuzzy text */
  private _getFilteredThreads(): ThreadPickerEntry[] {
    let threads = this.widget.config.threads;

    // 逆向: filterByWorkspace — amp filters threads by current workspace
    if (this.widget.config.filterByWorkspace && this.widget.config.currentWorkspace) {
      const ws = this.widget.config.currentWorkspace;
      threads = threads.filter((t) => !t.workspace || t.workspace === ws);
    }

    // Fuzzy text filter (case-insensitive substring match on title)
    if (this._filterText) {
      const lower = this._filterText.toLowerCase();
      threads = threads.filter(
        (t) => t.title.toLowerCase().includes(lower) || t.id.toLowerCase().includes(lower),
      );
    }

    return threads;
  }

  /**
   * Handle keyboard input for the picker.
   * Called by parent widget's key handler.
   */
  handleKey(key: string): boolean {
    switch (key) {
      case "up": {
        this.setState(() => {
          this._selectedIndex = Math.max(0, this._selectedIndex - 1);
        });
        return true;
      }
      case "down": {
        const max = this._getFilteredThreads().length - 1;
        this.setState(() => {
          this._selectedIndex = Math.min(max, this._selectedIndex + 1);
        });
        return true;
      }
      case "enter": {
        const filtered = this._getFilteredThreads();
        if (filtered.length > 0 && this._selectedIndex < filtered.length) {
          this.widget.config.onSelect(filtered[this._selectedIndex].id);
        }
        return true;
      }
      case "escape": {
        this.widget.config.onCancel();
        return true;
      }
      case "tab": {
        // 逆向: tab toggles workspace filter in amp
        this.widget.config.onToggleFilter?.();
        return true;
      }
      default:
        return false;
    }
  }

  /** Update the filter text (called from parent input handler) */
  setFilter(text: string): void {
    this.setState(() => {
      this._filterText = text;
      this._selectedIndex = 0; // Reset selection on filter change
    });
  }

  build(_context: BuildContext): Widget {
    const { isLoading, loadError, filterByWorkspace, currentWorkspace } = this.widget.config;

    if (loadError) {
      return new Column({
        children: [new Text({ data: "Error loading threads:" }), new Text({ data: loadError })],
      });
    }

    if (isLoading) {
      return new Text({ data: "Loading threads..." });
    }

    const filtered = this._getFilteredThreads();

    // Header with filter info
    const headerParts: Widget[] = [
      new Text({
        data: `Threads${this._filterText ? ` matching "${this._filterText}"` : ""}`,
      }),
    ];

    if (filterByWorkspace && currentWorkspace) {
      headerParts.push(new Text({ data: ` [workspace: ${currentWorkspace}]` }));
    }

    headerParts.push(new Text({ data: ` (${filtered.length} results)` }));

    // Thread list items
    const items: Widget[] = filtered.map((thread, idx) => {
      const isSelected = idx === this._selectedIndex;
      const prefix = isSelected ? "> " : "  ";
      const age = _formatRelativeTime(thread.updatedAt);
      const display = `${prefix}${thread.title || thread.id}  (${thread.messageCount} msgs, ${age})`;
      return new Text({ data: display });
    });

    if (items.length === 0) {
      items.push(new Text({ data: "  No threads found" }));
    }

    return new Column({
      children: [
        new Row({ children: headerParts }),
        new SizedBox({ height: 1 }),
        new Expanded({
          child: new Column({ children: items }),
        }),
        new SizedBox({ height: 1 }),
        new Text({ data: "Enter: select | Esc: cancel | Tab: toggle workspace filter" }),
      ],
    });
  }
}

// ─── Helpers ─────────────────────────────────────────────

function _formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  } catch {
    return dateStr;
  }
}
