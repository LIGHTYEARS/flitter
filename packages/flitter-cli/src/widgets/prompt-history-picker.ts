// PromptHistoryPicker — searchable overlay for selecting from prompt history
//
// Ported from flitter-amp/src/widgets/prompt-history-picker.ts.
// A StatefulWidget that renders a TextField search input and a SelectionList
// of history entries. Typing filters the list by case-insensitive substring
// match. Entries are shown newest-first (reversed). Long entries are truncated
// to 80 characters for display.
//
// Colors use hardcoded defaults (cyan info, brightBlack muted) rather
// than AmpThemeProvider. Follows the same pattern as command-palette.ts.

import {
  StatefulWidget,
  State,
  Widget,
  type BuildContext,
} from '../../../flitter-core/src/framework/widget';
import type { KeyEvent, KeyEventResult } from '../../../flitter-core/src/input/events';
import { Column } from '../../../flitter-core/src/widgets/flex';
import { Container } from '../../../flitter-core/src/widgets/container';
import { SizedBox } from '../../../flitter-core/src/widgets/sized-box';
import { FocusScope } from '../../../flitter-core/src/widgets/focus-scope';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextField, TextEditingController } from '../../../flitter-core/src/widgets/text-field';
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
// Props
// ---------------------------------------------------------------------------

/** Props for the PromptHistoryPicker widget. */
export interface PromptHistoryPickerProps {
  /** All history entries (oldest-first order from PromptHistory.getEntries()). */
  readonly entries: string[];
  /** Called when the user selects a history entry. */
  readonly onSelect: (entry: string) => void;
  /** Called when the picker is dismissed (Escape). */
  readonly onDismiss: () => void;
}

// ---------------------------------------------------------------------------
// PromptHistoryPicker
// ---------------------------------------------------------------------------

/**
 * PromptHistoryPicker — StatefulWidget overlay for browsing prompt history.
 *
 * Renders a bordered panel with a search TextField, a count indicator,
 * and a SelectionList of filtered entries. Entries are displayed newest-first.
 * Long entries are truncated to 80 characters with "..." suffix.
 *
 * Widget structure:
 *   FocusScope (onKey: Escape -> onDismiss)
 *     Column (start, center)
 *       SizedBox (height: 2)
 *       Container (bordered cyan, padded, maxWidth: 70)
 *         Column (min, start)
 *           Text "Prompt History (Ctrl+R)" (cyan, bold)
 *           SizedBox (height: 1)
 *           Container (bottom border underline)
 *             TextField (search input, maxLines: 1)
 *           SizedBox (height: 1)
 *           Text "{shown}/{total} entries" (dim)
 *           SelectionList (filtered items) OR Text "No matching history entries"
 */
export class PromptHistoryPicker extends StatefulWidget {
  readonly entries: string[];
  readonly onSelect: (entry: string) => void;
  readonly onDismiss: () => void;

  constructor(props: PromptHistoryPickerProps) {
    super();
    this.entries = props.entries;
    this.onSelect = props.onSelect;
    this.onDismiss = props.onDismiss;
  }

  createState(): PromptHistoryPickerState {
    return new PromptHistoryPickerState();
  }
}

// ---------------------------------------------------------------------------
// PromptHistoryPickerState
// ---------------------------------------------------------------------------

/**
 * State for PromptHistoryPicker. Manages search controller, filtered items,
 * and current query. Recomputes filtered items on text change using
 * case-insensitive substring matching.
 */
class PromptHistoryPickerState extends State<PromptHistoryPicker> {
  /** Controller for the search TextField. Owned by this state. */
  private searchController = new TextEditingController();

  /** Current search query — cached to avoid redundant refilter. */
  private currentQuery = '';

  /** Filtered and reversed history items based on current query. */
  private filteredItems: SelectionItem[] = [];

  initState(): void {
    super.initState();
    this.filteredItems = this.buildItems('');
    this.searchController.addListener(this._onSearchChanged);
  }

  dispose(): void {
    this.searchController.removeListener(this._onSearchChanged);
    this.searchController.dispose();
    super.dispose();
  }

  /**
   * Callback invoked when the search controller text changes.
   * Recomputes filtered items using case-insensitive substring match.
   */
  private _onSearchChanged = (): void => {
    const query = this.searchController.text.trim().toLowerCase();
    if (query === this.currentQuery) return;
    this.currentQuery = query;
    this.setState(() => {
      this.filteredItems = this.buildItems(query);
    });
  };

  /**
   * Build SelectionItem[] from entries, newest-first, filtered by query.
   * Entries longer than 80 chars are truncated with "..." suffix.
   */
  private buildItems(query: string): SelectionItem[] {
    const entries = this.widget.entries;
    const items: SelectionItem[] = [];
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      if (query.length > 0 && !entry.toLowerCase().includes(query)) continue;
      const displayText = entry.length > 80 ? entry.slice(0, 77) + '...' : entry;
      items.push({
        label: displayText,
        value: String(i),
        description: undefined,
      });
    }
    return items;
  }

  /**
   * Handle key events at the FocusScope level.
   * Escape dismisses the picker. All other keys propagate to children.
   */
  private _handleKey = (event: KeyEvent): KeyEventResult => {
    if (event.key === 'Escape') {
      this.widget.onDismiss();
      return 'handled';
    }
    return 'ignored';
  };

  build(_context: BuildContext): Widget {
    const totalCount = this.widget.entries.length;
    const shownCount = this.filteredItems.length;
    const side = new BorderSide({ color: INFO_COLOR, width: 1, style: 'rounded' });

    const title = new Text({
      text: new TextSpan({
        text: 'Prompt History (Ctrl+R)',
        style: new TextStyle({ foreground: INFO_COLOR, bold: true }),
      }),
    });

    const searchField = new Container({
      decoration: new BoxDecoration({
        border: new Border({
          bottom: new BorderSide({ color: MUTED_COLOR }),
        }),
      }),
      child: new TextField({
        controller: this.searchController,
        placeholder: 'Search history...',
        maxLines: 1,
        autofocus: true,
        style: new TextStyle(),
      }),
    });

    const countText = new Text({
      text: new TextSpan({
        text: this.currentQuery.length > 0
          ? `${shownCount}/${totalCount} entries`
          : `${totalCount} entries`,
        style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
      }),
    });

    let listContent: Widget;
    if (this.filteredItems.length > 0) {
      listContent = new SelectionList({
        items: this.filteredItems,
        onSelect: (value: string) => {
          const idx = parseInt(value, 10);
          if (idx >= 0 && idx < this.widget.entries.length) {
            this.widget.onSelect(this.widget.entries[idx]);
          }
        },
        onCancel: () => this.widget.onDismiss(),
        showDescription: false,
      });
    } else {
      listContent = new Text({
        text: new TextSpan({
          text: 'No matching history entries',
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
        searchField,
        new SizedBox({ height: 1 }),
        countText,
        listContent,
      ],
    });

    const borderedPanel = new Container({
      constraints: new BoxConstraints({ maxWidth: 70 }),
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
      onKey: this._handleKey,
      child: outerColumn,
    });
  }
}
