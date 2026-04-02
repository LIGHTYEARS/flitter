// Command palette -- Ctrl+O overlay with searchable action list
// Gap 28: Converted from StatelessWidget to StatefulWidget with TextField + fuzzy filter
// Amp ref: command palette with SelectionList

import { StatefulWidget, State, Widget, type BuildContext } from 'flitter-core/src/framework/widget';
import { Column } from 'flitter-core/src/widgets/flex';
import { Container } from 'flitter-core/src/widgets/container';
import { Text } from 'flitter-core/src/widgets/text';
import { TextSpan } from 'flitter-core/src/core/text-span';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { Color } from 'flitter-core/src/core/color';
import { SelectionList } from 'flitter-core/src/widgets/selection-list';
import type { SelectionItem } from 'flitter-core/src/widgets/selection-list';
import { TextField, TextEditingController } from 'flitter-core/src/widgets/text-field';
import { FocusScope } from 'flitter-core/src/widgets/focus-scope';
import { BoxDecoration, Border, BorderSide } from 'flitter-core/src/layout/render-decorated';
import { EdgeInsets } from 'flitter-core/src/layout/edge-insets';
import { SizedBox } from 'flitter-core/src/widgets/sized-box';
import { BoxConstraints } from 'flitter-core/src/core/box-constraints';
import { AmpThemeProvider } from '../themes';
import { scoreCommand } from '../utils/fuzzy-match';
import type { KeyEvent, KeyEventResult } from 'flitter-core/src/input/events';

/**
 * Default commands shown when no registry is provided.
 * Maintained for backward compatibility.
 */
const COMMANDS: SelectionItem[] = [
  { label: 'Clear conversation', value: 'clear', description: 'Remove all messages (Ctrl+L)' },
  { label: 'Toggle tool calls', value: 'toggle-tools', description: 'Expand/collapse all tool blocks (Alt+T)' },
  { label: 'Toggle thinking', value: 'toggle-thinking', description: 'Expand/collapse all thinking blocks' },
  { label: 'New thread', value: 'new-thread', description: 'Start a fresh conversation' },
  { label: 'Switch model', value: 'switch-model', description: 'Open model selection' },
  { label: 'Copy last response', value: 'copy-last-response', description: 'Copy last assistant message to clipboard' },
  { label: 'Toggle dense view', value: 'toggle-dense-view', description: 'Toggle compact display mode' },
  { label: 'View usage', value: 'view-usage', description: 'Show token/cost summary' },
  { label: 'Show shortcuts help', value: 'show-shortcuts-help', description: 'Open shortcut reference overlay' },
];

interface CommandPaletteProps {
  onExecute: (command: string) => void;
  onDismiss: () => void;
  commands?: SelectionItem[];
}

export class CommandPalette extends StatefulWidget {
  readonly onExecute: (command: string) => void;
  readonly onDismiss: () => void;
  readonly commands: readonly SelectionItem[];

  constructor(props: CommandPaletteProps) {
    super({});
    this.onExecute = props.onExecute;
    this.onDismiss = props.onDismiss;
    this.commands = props.commands ?? COMMANDS;
  }

  createState(): State<CommandPalette> {
    return new CommandPaletteState();
  }
}

class CommandPaletteState extends State<CommandPalette> {
  private searchController = new TextEditingController();
  private filteredItems: SelectionItem[] = [];
  private currentQuery = '';

  initState(): void {
    super.initState();
    // Initially show all commands
    this.filteredItems = [...this.widget.commands];
    this.searchController.addListener(this._onSearchChanged);
  }

  dispose(): void {
    this.searchController.removeListener(this._onSearchChanged);
    this.searchController.dispose();
    super.dispose();
  }

  didUpdateWidget(_oldWidget: CommandPalette): void {
    // If commands changed, re-filter
    this._refilter();
  }

  /**
   * Recompute filtered items whenever the search text changes.
   * Uses fuzzy scoring to rank results, then sorts by score descending.
   */
  private _onSearchChanged = (): void => {
    const query = this.searchController.text.trim();
    if (query === this.currentQuery) return;

    this.currentQuery = query;
    this._refilter();
  };

  private _refilter(): void {
    const query = this.currentQuery;
    this.setState(() => {
      if (query.length === 0) {
        // No query: show all commands in original order
        this.filteredItems = [...this.widget.commands];
      } else {
        // Score and filter
        const scored: Array<{ item: SelectionItem; score: number }> = [];
        for (const item of this.widget.commands) {
          const score = scoreCommand(query, item);
          if (score !== null) {
            scored.push({ item, score });
          }
        }
        // Sort by score descending (best matches first)
        scored.sort((a, b) => b.score - a.score);
        this.filteredItems = scored.map((s) => s.item);
      }
    });
  }

  build(context: BuildContext): Widget {
    const theme = AmpThemeProvider.maybeOf(context);
    const infoColor = theme?.base.info ?? Color.cyan;
    const mutedColor = theme?.base.mutedForeground ?? Color.brightBlack;
    const side = new BorderSide({
      color: infoColor,
      width: 1,
      style: 'rounded',
    });

    // Search input field
    const searchField = new TextField({
      controller: this.searchController,
      autofocus: true,
      placeholder: 'Type to search...',
      maxLines: 1,
      style: new TextStyle({ foreground: theme?.base.foreground }),
      cursorChar: '\u2588',
    });

    // Search input with underline decoration
    const searchContainer = new Container({
      decoration: new BoxDecoration({
        border: new Border({
          bottom: new BorderSide({ color: mutedColor, width: 1 }),
        }),
      }),
      padding: EdgeInsets.symmetric({ horizontal: 0, vertical: 0 }),
      child: searchField,
    });

    // Result count hint
    const total = this.widget.commands.length;
    const shown = this.filteredItems.length;
    const countText = this.currentQuery.length > 0
      ? `${shown}/${total} commands`
      : `${total} commands`;
    const countWidget = new Text({
      text: new TextSpan({
        text: countText,
        style: new TextStyle({ foreground: mutedColor, dim: true }),
      }),
    });

    // Build the list or "no results" message
    let listArea: Widget;
    if (this.filteredItems.length > 0) {
      listArea = new SelectionList({
        items: this.filteredItems,
        onSelect: this.widget.onExecute,
        onCancel: this.widget.onDismiss,
        showDescription: true,
      });
    } else {
      listArea = new Text({
        text: new TextSpan({
          text: 'No matching commands',
          style: new TextStyle({ foreground: mutedColor, italic: true }),
        }),
      });
    }

    return new FocusScope({
      autofocus: true,
      onKey: (event: KeyEvent): KeyEventResult => {
        // Escape always dismisses at the palette level
        if (event.key === 'Escape') {
          this.widget.onDismiss();
          return 'handled';
        }
        // Let other keys propagate to TextField and SelectionList
        return 'ignored';
      },
      child: new Column({
        mainAxisAlignment: 'start',
        crossAxisAlignment: 'center',
        children: [
          new SizedBox({ height: 2 }),
          new Container({
            decoration: new BoxDecoration({ border: Border.all(side) }),
            padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
            constraints: new BoxConstraints({ maxWidth: 60 }),
            child: new Column({
              mainAxisSize: 'min',
              crossAxisAlignment: 'start',
              children: [
                new Text({
                  text: new TextSpan({
                    text: 'Command Palette',
                    style: new TextStyle({
                      foreground: infoColor,
                      bold: true,
                    }),
                  }),
                }),
                new SizedBox({ height: 1 }),
                searchContainer,
                new SizedBox({ height: 1 }),
                countWidget,
                new SizedBox({ height: 0 }),
                listArea,
              ],
            }),
          }),
        ],
      }),
    });
  }
}
