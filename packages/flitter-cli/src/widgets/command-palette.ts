// widgets/command-palette.ts -- Command palette overlay for flitter-cli
//
// Redesigned to match AMP's observed behavior (Phase 31):
// - Centered box with single-line border
// - ">" search prefix, no placeholder, no count indicator
// - Category+label dual-column format with right-aligned shortcut hints
// - Yellow title, dim categories, bold labels
// - Yellow background + black text for selected item

import {
  StatefulWidget,
  State,
  Widget,
  type BuildContext,
} from '../../../flitter-core/src/framework/widget';
import type { KeyEvent, KeyEventResult } from '../../../flitter-core/src/input/events';
import { Column, Row } from '../../../flitter-core/src/widgets/flex';
import { Expanded } from '../../../flitter-core/src/widgets/flexible';
import { Container } from '../../../flitter-core/src/widgets/container';
import { Center } from '../../../flitter-core/src/widgets/center';
import { SizedBox } from '../../../flitter-core/src/widgets/sized-box';
import { FocusScope } from '../../../flitter-core/src/widgets/focus-scope';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextField, TextEditingController } from '../../../flitter-core/src/widgets/text-field';
import { SingleChildScrollView } from '../../../flitter-core/src/widgets/scroll-view';
import { ScrollController } from '../../../flitter-core/src/widgets/scroll-controller';
import { Scrollbar } from '../../../flitter-core/src/widgets/scrollbar';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { Color } from '../../../flitter-core/src/core/color';
import { EdgeInsets } from '../../../flitter-core/src/layout/edge-insets';
import { BoxDecoration, Border, BorderSide } from '../../../flitter-core/src/layout/render-decorated';
import { BoxConstraints } from '../../../flitter-core/src/core/box-constraints';
import { MediaQuery } from '../../../flitter-core/src/widgets/media-query';
import { scoreCommand } from '../utils/fuzzy-match';

// ---------------------------------------------------------------------------
// CommandPaletteItem — internal item type matching AMP's category+label format
// ---------------------------------------------------------------------------

/**
 * An item displayed in the command palette.
 * AMP renders: `  category  label              Ctrl x`
 */
export interface CommandPaletteItem {
  /** Unique identifier for the command. */
  readonly id: string;
  /** Category displayed dim and right-aligned (e.g., "amp", "mode", "thread"). */
  readonly category: string;
  /** Label displayed bold after the category. */
  readonly label: string;
  /** Description used for fuzzy search scoring (not displayed in AMP layout). */
  readonly description: string;
  /** Optional shortcut hint shown right-aligned (e.g., "Ctrl+S"). */
  readonly shortcutHint?: string;
}

// ---------------------------------------------------------------------------
// CommandPalette Props
// ---------------------------------------------------------------------------

/** Props for the CommandPalette widget. */
export interface CommandPaletteProps {
  /** All available commands. */
  readonly commands: readonly CommandPaletteItem[];
  /** Called when a command is selected. Receives the command id. */
  readonly onExecute: (commandId: string) => void;
  /** Called when the palette is dismissed (Escape or external dismiss). */
  readonly onDismiss: () => void;
}

// ---------------------------------------------------------------------------
// CommandPalette
// ---------------------------------------------------------------------------

/**
 * Command palette overlay widget matching AMP's observed layout.
 *
 * Widget structure (AMP golden screenshot):
 *   FocusScope (onKey: Escape/ArrowUp/ArrowDown/Enter)
 *     Column (start, center)
 *       SizedBox (height: 2)  -- top margin for vertical centering
 *       Container (bordered, constrained maxWidth: 80, padded)
 *         Column (min, start)
 *           Text "Command Palette" (yellow, bold, centered)
 *           Row "> " prefix + TextField (no placeholder)
 *           SizedBox (height: 1)  -- gap between search and list
 *           ScrollView (command list rows)
 *             For each item:
 *               Row: [category(dim,right-aligned)] [label(bold)] [shortcut(right)]
 */
export class CommandPalette extends StatefulWidget {
  readonly commands: readonly CommandPaletteItem[];
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
 * State for CommandPalette. Manages search, filtering, keyboard navigation,
 * and scroll to keep selected item visible.
 */
class CommandPaletteState extends State<CommandPalette> {
  /** Controller for the search TextField. Owned by this state. */
  private searchController = new TextEditingController();

  /** Current search query — cached to avoid redundant refilter. */
  private currentQuery = '';

  /** Filtered command items based on current query. */
  private filteredItems: CommandPaletteItem[] = [];

  /** Currently selected index in the filtered list. */
  private selectedIndex = 0;

  /** Scroll controller for the command list. */
  private scrollController = new ScrollController();

  initState(): void {
    super.initState();
    this.filteredItems = [...this.widget.commands];
    this.searchController.addListener(this._onSearchChanged);
  }

  /** Re-filter when the commands prop changes across rebuilds. */
  didUpdateWidget(oldWidget: CommandPalette): void {
    if (oldWidget.commands !== this.widget.commands) {
      this._refilter();
    }
  }

  dispose(): void {
    this.searchController.removeListener(this._onSearchChanged);
    this.searchController.dispose();
    super.dispose();
  }

  /**
   * Callback invoked when the search controller text changes.
   * Recomputes filtered items and resets selection to index 0.
   */
  private _onSearchChanged = (): void => {
    const query = this.searchController.text.trim();
    if (query === this.currentQuery) return;
    this.currentQuery = query;
    this._refilter();
    this.selectedIndex = 0;
    this.setState();
  };

  /**
   * Recompute the filtered items list based on the current query.
   * Empty query shows all commands. Non-empty query uses scoreCommand()
   * for fuzzy matching (scores against category+label and description).
   */
  private _refilter(): void {
    const query = this.currentQuery;
    if (query.length === 0) {
      this.filteredItems = [...this.widget.commands];
      return;
    }

    const scored: Array<{ item: CommandPaletteItem; score: number }> = [];
    for (const item of this.widget.commands) {
      // Score against the combined "category label" string and description
      const searchLabel = `${item.category} ${item.label}`;
      const s = scoreCommand(query, { label: searchLabel, description: item.description });
      if (s !== null) {
        scored.push({ item, score: s });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    this.filteredItems = scored.map(({ item }) => item);
  }

  /**
   * Handle key events: Escape, ArrowUp/Down, Enter.
   * TextField handles its own character input; we only intercept navigation.
   */
  private _handleKey = (event: KeyEvent): KeyEventResult => {
    if (event.key === 'Escape') {
      this.widget.onDismiss();
      return 'handled';
    }
    if (event.key === 'ArrowUp' || event.key === 'k' && event.ctrlKey) {
      this._movePrevious();
      return 'handled';
    }
    if (event.key === 'ArrowDown' || event.key === 'j' && event.ctrlKey) {
      this._moveNext();
      return 'handled';
    }
    if (event.key === 'Enter') {
      this._confirmSelection();
      return 'handled';
    }
    return 'ignored';
  };

  /** Move selection up, wrapping around. */
  private _movePrevious(): void {
    if (this.filteredItems.length === 0) return;
    this.setState(() => {
      this.selectedIndex =
        (this.selectedIndex - 1 + this.filteredItems.length) % this.filteredItems.length;
      this._ensureSelectedVisible();
    });
  }

  /** Move selection down, wrapping around. */
  private _moveNext(): void {
    if (this.filteredItems.length === 0) return;
    this.setState(() => {
      this.selectedIndex =
        (this.selectedIndex + 1) % this.filteredItems.length;
      this._ensureSelectedVisible();
    });
  }

  /** Confirm selection: call onExecute with the selected command id. */
  private _confirmSelection(): void {
    if (this.filteredItems.length === 0) return;
    const item = this.filteredItems[this.selectedIndex];
    if (item) {
      this.widget.onExecute(item.id);
    }
  }

  /**
   * Adjust scroll offset so the currently selected item is visible.
   * Each item occupies 1 row.
   */
  private _ensureSelectedVisible(): void {
    const ctrl = this.scrollController;
    const viewportSize = ctrl.viewportSize;
    if (viewportSize <= 0) return;

    const itemTop = this.selectedIndex;
    const itemBottom = this.selectedIndex + 1;
    const currentOffset = ctrl.offset;

    if (itemTop < currentOffset) {
      ctrl.jumpTo(itemTop);
    } else if (itemBottom > currentOffset + viewportSize) {
      ctrl.jumpTo(itemBottom - viewportSize);
    }
  }

  /**
   * Format a shortcut hint string (e.g., "Ctrl+S") into a rich TextSpan
   * matching AMP: bold cyan "Ctrl" + bold white key letter.
   */
  private _buildShortcutSpan(hint: string): TextSpan {
    // Parse "Ctrl+X" or "Ctrl+Shift+X" into modifier + key
    const parts = hint.split('+');
    if (parts.length >= 2) {
      const modifier = parts.slice(0, -1).join('+');
      const key = parts[parts.length - 1]!.toLowerCase();
      return new TextSpan({
        children: [
          new TextSpan({
            text: modifier,
            style: new TextStyle({ foreground: Color.blue, bold: true }),
          }),
          new TextSpan({
            text: ` ${key}`,
            style: new TextStyle({ bold: true }),
          }),
        ],
      });
    }
    // Fallback: just bold
    return new TextSpan({
      text: hint,
      style: new TextStyle({ bold: true }),
    });
  }

  build(context: BuildContext): Widget {
    const mq = MediaQuery.maybeOf(context);
    const screenHeight = mq?.size.height ?? 24;
    const maxHeight = screenHeight - 4;

    const items = this.filteredItems;

    // Compute max category width for right-alignment
    const maxCatWidth = items.reduce(
      (max, item) => Math.max(max, item.category.length),
      0,
    );

    // --- Title: "Command Palette" centered, bold yellow (ANSI color 3) ---
    const title = new Text({
      text: new TextSpan({
        text: 'Command Palette',
        style: new TextStyle({ foreground: Color.yellow, bold: true }),
      }),
      textAlign: 'center',
    });

    // --- Search row: ">" prefix + TextField ---
    const searchRow = new Row({
      children: [
        new Text({
          text: new TextSpan({
            text: '> ',
            style: new TextStyle(),
          }),
        }),
        new Expanded({
          child: new TextField({
            controller: this.searchController,
            placeholder: '',
            maxLines: 1,
            autofocus: true,
            style: new TextStyle(),
          }),
        }),
      ],
    });

    // --- Command list rows ---
    const commandRows: Widget[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const isSelected = i === this.selectedIndex;

      // Pad category to right-align within maxCatWidth
      const paddedCategory = item.category.padStart(maxCatWidth);

      // Build the line text: "  category  label"
      // AMP uses: right-aligned dim category, 2-space gap, bold label
      let lineSpan: TextSpan;

      if (isSelected) {
        // Selected: yellow background (ANSI 3), black foreground (ANSI 0)
        const lineChildren: TextSpan[] = [
          new TextSpan({
            text: ` ${paddedCategory}`,
            style: new TextStyle({ foreground: Color.black, background: Color.yellow }),
          }),
          new TextSpan({
            text: '  ',
            style: new TextStyle({ foreground: Color.black, background: Color.yellow }),
          }),
          new TextSpan({
            text: item.label,
            style: new TextStyle({ foreground: Color.black, background: Color.yellow, bold: true }),
          }),
        ];

        // Pad the rest of the line with yellow background
        // Calculate remaining space for shortcut hint
        const usedWidth = 1 + maxCatWidth + 2 + item.label.length;
        const shortcutText = item.shortcutHint
          ? this._formatShortcutPlain(item.shortcutHint)
          : '';
        const targetWidth = 76; // Inner width of the box (80 - 2 border - 2 padding)
        const remainingSpace = Math.max(1, targetWidth - usedWidth - shortcutText.length);

        lineChildren.push(
          new TextSpan({
            text: ' '.repeat(remainingSpace),
            style: new TextStyle({ background: Color.yellow }),
          }),
        );

        if (item.shortcutHint) {
          lineChildren.push(
            new TextSpan({
              text: shortcutText,
              style: new TextStyle({ foreground: Color.black, background: Color.yellow, bold: true }),
            }),
          );
        }

        // Trailing space for padding
        lineChildren.push(
          new TextSpan({
            text: ' ',
            style: new TextStyle({ background: Color.yellow }),
          }),
        );

        lineSpan = new TextSpan({ children: lineChildren });
      } else {
        // Unselected: dim category, bold label, right-aligned shortcut
        const lineChildren: TextSpan[] = [
          new TextSpan({
            text: ` ${paddedCategory}`,
            style: new TextStyle({ dim: true }),
          }),
          new TextSpan({
            text: '  ',
            style: new TextStyle(),
          }),
          new TextSpan({
            text: item.label,
            style: new TextStyle({ bold: true }),
          }),
        ];

        if (item.shortcutHint) {
          // Calculate spacing to right-align the shortcut
          const usedWidth = 1 + maxCatWidth + 2 + item.label.length;
          const shortcutText = this._formatShortcutPlain(item.shortcutHint);
          const targetWidth = 76;
          const remainingSpace = Math.max(1, targetWidth - usedWidth - shortcutText.length);

          lineChildren.push(
            new TextSpan({
              text: ' '.repeat(remainingSpace),
              style: new TextStyle(),
            }),
          );
          lineChildren.push(this._buildShortcutSpan(item.shortcutHint));
        }

        lineSpan = new TextSpan({ children: lineChildren });
      }

      commandRows.push(new Text({ text: lineSpan }));
    }

    // If no matches, show "No matching commands" dim
    if (commandRows.length === 0) {
      commandRows.push(
        new Text({
          text: new TextSpan({
            text: 'No matching commands',
            style: new TextStyle({ foreground: Color.brightBlack, italic: true }),
          }),
        }),
      );
    }

    // --- Scrollable command list ---
    const listColumn = new Column({
      children: commandRows,
      crossAxisAlignment: 'start',
      mainAxisSize: 'min',
    });

    const scrollView = new SingleChildScrollView({
      controller: this.scrollController,
      child: listColumn,
    });

    // GAP-m6: hide scrollbar when all items fit in viewport (no scroll needed).
    // Title (1) + search (1) + gap (1) + padding (2) + border (2) = 7 overhead rows.
    const listViewportHeight = Math.max(1, maxHeight - 7);
    const needsScrollbar = items.length > listViewportHeight;

    const scrollContent = new Row({
      children: [
        new Expanded({ child: scrollView }),
        ...(needsScrollbar
          ? [new Scrollbar({ controller: this.scrollController })]
          : []),
      ],
    });

    // --- Inner column: title, search row, gap, list ---
    // Use Expanded on the scroll area so it fills remaining space within the
    // bounded Container, preventing RenderFlex overflow with Infinity heights.
    const innerColumn = new Column({
      crossAxisAlignment: 'stretch',
      mainAxisSize: 'max',
      children: [
        title,
        searchRow,
        new SizedBox({ height: 1 }),
        new Expanded({ child: scrollContent }),
      ],
    });

    // --- Bordered container with max width 80 and bounded height ---
    // Opaque black background ensures content underneath does not bleed through
    // (previously the modal mask provided the backdrop, now the panel itself must).
    // Clamp maxHeight to at least 7 (overhead rows) to avoid negative constraints.
    const safeMaxHeight = Math.max(7, maxHeight);
    const borderedPanel = new Container({
      constraints: new BoxConstraints({
        maxWidth: 80,
        minHeight: 0,
        maxHeight: safeMaxHeight,
      }),
      padding: EdgeInsets.all(1),
      decoration: new BoxDecoration({
        color: Color.black,
        border: Border.all(new BorderSide({ color: Color.brightBlack })),
      }),
      child: innerColumn,
    });

    // --- FocusScope: catches Escape, ArrowUp/Down, Enter ---
    return new FocusScope({
      autofocus: true,
      onKey: this._handleKey,
      child: new Center({
        child: borderedPanel,
      }),
    });
  }

  /**
   * Format shortcut hint as plain text for width calculation.
   * E.g., "Ctrl+S" -> "Ctrl s", "Ctrl+V" -> "Ctrl v"
   */
  private _formatShortcutPlain(hint: string): string {
    const parts = hint.split('+');
    if (parts.length >= 2) {
      const modifier = parts.slice(0, -1).join('+');
      const key = parts[parts.length - 1]!.toLowerCase();
      return `${modifier} ${key}`;
    }
    return hint;
  }
}
