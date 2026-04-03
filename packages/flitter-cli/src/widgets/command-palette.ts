// widgets/command-palette.ts -- Command palette overlay for flitter-cli
//
// Ported from flitter-amp/src/widgets/command-palette.ts pattern.
// A StatefulWidget that renders a searchable list of commands using
// TextField for fuzzy search input and SelectionList for arrow-key
// navigation. The palette is shown via OverlayManager and dismissed
// on Escape or command selection.
//
// Colors use hardcoded defaults (cyan info, brightBlack muted) rather
// than AmpThemeProvider. Phase 20 will add theme support.

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
import { scoreCommand } from '../utils/fuzzy-match';

// ---------------------------------------------------------------------------
// CommandPalette Props
// ---------------------------------------------------------------------------

/** Props for the CommandPalette widget. */
export interface CommandPaletteProps {
  /** All available commands as SelectionItems (mapped from CommandItem[]). */
  readonly commands: readonly SelectionItem[];
  /** Called when a command is selected. Receives the command id (value). */
  readonly onExecute: (commandId: string) => void;
  /** Called when the palette is dismissed (Escape or external dismiss). */
  readonly onDismiss: () => void;
}

// ---------------------------------------------------------------------------
// CommandPalette
// ---------------------------------------------------------------------------

/**
 * Command palette overlay widget.
 *
 * Renders a bordered panel with a search TextField at the top, a count
 * indicator, and a SelectionList of filtered commands. Typing in the
 * search field fuzzy-filters the command list using scoreCommand().
 * Arrow keys navigate the list; Enter selects; Escape dismisses.
 *
 * Widget structure:
 *   FocusScope (onKey: Escape -> onDismiss)
 *     Column (start, center)
 *       SizedBox (height: 2)  -- top margin
 *       Container (bordered, constrained maxWidth: 60, padded)
 *         Column (min, start)
 *           Text "Command Palette" (cyan, bold)
 *           SizedBox (height: 1)
 *           Container (bottom border underline)
 *             TextField (search input, maxLines: 1)
 *           SizedBox (height: 1)
 *           Text "{shown}/{total} commands" (dim)
 *           SelectionList (filtered items) OR Text "No matching commands"
 */
export class CommandPalette extends StatefulWidget {
  readonly commands: readonly SelectionItem[];
  readonly onExecute: (commandId: string) => void;
  readonly onDismiss: () => void;

  constructor(props: CommandPaletteProps) {
    super();
    this.commands = props.commands;
    this.onExecute = props.onExecute;
    this.onDismiss = props.onDismiss;
  }

  createState(): CommandPaletteState {
    return new CommandPaletteState();
  }
}

// ---------------------------------------------------------------------------
// CommandPaletteState
// ---------------------------------------------------------------------------

/**
 * State for CommandPalette. Manages the search controller, filtered items,
 * and current query string. Recomputes filtered items when the search text
 * changes using scoreCommand() for combined label + description scoring.
 */
class CommandPaletteState extends State<CommandPalette> {
  /** Controller for the search TextField. Owned by this state. */
  private searchController = new TextEditingController();

  /** Current search query -- cached to avoid redundant refilter. */
  private currentQuery = '';

  /** Filtered and scored command items based on current query. */
  private filteredItems: SelectionItem[] = [];

  initState(): void {
    super.initState();
    // Initialize with all commands
    this.filteredItems = [...this.widget.commands];
    // Listen for text changes to refilter
    this.searchController.addListener(this._onSearchChanged);
  }

  dispose(): void {
    this.searchController.removeListener(this._onSearchChanged);
    this.searchController.dispose();
    super.dispose();
  }

  /**
   * Callback invoked when the search controller text changes.
   * Recomputes filtered items using fuzzy scoring.
   */
  private _onSearchChanged = (): void => {
    const query = this.searchController.text.trim();
    if (query === this.currentQuery) return;
    this.currentQuery = query;
    this._refilter();
    this.setState();
  };

  /**
   * Recompute the filtered items list based on the current query.
   * Empty query shows all commands. Non-empty query uses scoreCommand()
   * for fuzzy matching and sorts by descending score.
   */
  private _refilter(): void {
    const query = this.currentQuery;
    if (query.length === 0) {
      this.filteredItems = [...this.widget.commands];
      return;
    }

    const scored: Array<{ item: SelectionItem; score: number }> = [];
    for (const item of this.widget.commands) {
      const s = scoreCommand(query, item);
      if (s !== null) {
        scored.push({ item, score: s });
      }
    }
    // Sort by descending score (best match first)
    scored.sort((a, b) => b.score - a.score);
    this.filteredItems = scored.map(({ item }) => item);
  }

  /**
   * Handle key events at the FocusScope level.
   * Escape dismisses the palette. All other keys propagate to children
   * (TextField and SelectionList handle their own input).
   */
  private _handleKey = (event: KeyEvent): KeyEventResult => {
    if (event.key === 'Escape') {
      this.widget.onDismiss();
      return 'handled';
    }
    return 'ignored';
  };

  build(_context: BuildContext): Widget {
    const totalCount = this.widget.commands.length;
    const shownCount = this.filteredItems.length;

    // --- Title ---
    const title = new Text({
      text: new TextSpan({
        text: 'Command Palette',
        style: new TextStyle({ color: Color.cyan, bold: true }),
      }),
    });

    // --- Search input with underline border ---
    const searchField = new Container({
      decoration: new BoxDecoration({
        border: new Border({
          bottom: new BorderSide({ color: Color.brightBlack }),
        }),
      }),
      child: new TextField({
        controller: this.searchController,
        placeholder: 'Search commands...',
        maxLines: 1,
        autofocus: true,
        style: new TextStyle(),
      }),
    });

    // --- Count indicator ---
    const countText = new Text({
      text: new TextSpan({
        text: `${shownCount}/${totalCount} commands`,
        style: new TextStyle({ color: Color.brightBlack, dim: true }),
      }),
    });

    // --- Command list or "no results" message ---
    let listContent: Widget;
    if (this.filteredItems.length > 0) {
      listContent = new SelectionList({
        items: this.filteredItems,
        onSelect: (value: string) => this.widget.onExecute(value),
        onCancel: () => this.widget.onDismiss(),
        showDescription: true,
        showScrollbar: false,
      });
    } else {
      listContent = new Text({
        text: new TextSpan({
          text: 'No matching commands',
          style: new TextStyle({ color: Color.brightBlack, italic: true }),
        }),
      });
    }

    // --- Inner column: title, search, count, list ---
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

    // --- Bordered container with max width constraint ---
    const borderedPanel = new Container({
      constraints: new BoxConstraints({ maxWidth: 60 }),
      padding: EdgeInsets.all(1),
      decoration: new BoxDecoration({
        border: Border.all(new BorderSide({ color: Color.brightBlack })),
      }),
      child: innerColumn,
    });

    // --- Outer column: top margin + centered panel ---
    const outerColumn = new Column({
      mainAxisAlignment: 'start',
      crossAxisAlignment: 'center',
      children: [
        new SizedBox({ height: 2 }),
        borderedPanel,
      ],
    });

    // --- FocusScope wrapping: catches Escape at the palette level ---
    return new FocusScope({
      autofocus: true,
      onKey: this._handleKey,
      child: outerColumn,
    });
  }
}
