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
import type { KeyEvent, KeyEventResult } from 'flitter-core/src/input/events';

interface PromptHistoryPickerProps {
  entries: string[];
  onSelect: (entry: string) => void;
  onDismiss: () => void;
}

export class PromptHistoryPicker extends StatefulWidget {
  readonly entries: string[];
  readonly onSelect: (entry: string) => void;
  readonly onDismiss: () => void;

  constructor(props: PromptHistoryPickerProps) {
    super({});
    this.entries = props.entries;
    this.onSelect = props.onSelect;
    this.onDismiss = props.onDismiss;
  }

  createState(): State<PromptHistoryPicker> {
    return new PromptHistoryPickerState();
  }
}

class PromptHistoryPickerState extends State<PromptHistoryPicker> {
  private searchController = new TextEditingController();
  private filteredItems: SelectionItem[] = [];
  private currentQuery = '';

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

  private _onSearchChanged = (): void => {
    const query = this.searchController.text.trim().toLowerCase();
    if (query === this.currentQuery) return;
    this.currentQuery = query;
    this.setState(() => {
      this.filteredItems = this.buildItems(query);
    });
  };

  private buildItems(query: string): SelectionItem[] {
    const entries = this.widget.entries;
    const items: SelectionItem[] = [];
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      const displayText = entry.length > 80 ? entry.slice(0, 77) + '...' : entry;
      if (query.length > 0 && !entry.toLowerCase().includes(query)) continue;
      items.push({
        label: displayText,
        value: String(i),
        description: undefined,
      });
    }
    return items;
  }

  build(context: BuildContext): Widget {
    const theme = AmpThemeProvider.maybeOf(context);
    const infoColor = theme?.base.info ?? Color.cyan;
    const mutedColor = theme?.base.mutedForeground ?? Color.brightBlack;
    const side = new BorderSide({ color: infoColor, width: 1, style: 'rounded' });

    const searchField = new TextField({
      controller: this.searchController,
      autofocus: true,
      placeholder: 'Search history...',
      maxLines: 1,
      style: new TextStyle({ foreground: theme?.base.foreground }),
      cursorChar: '\u2588',
    });

    const searchContainer = new Container({
      decoration: new BoxDecoration({
        border: new Border({
          bottom: new BorderSide({ color: mutedColor, width: 1 }),
        }),
      }),
      padding: EdgeInsets.symmetric({ horizontal: 0, vertical: 0 }),
      child: searchField,
    });

    const total = this.widget.entries.length;
    const shown = this.filteredItems.length;
    const countText = this.currentQuery.length > 0
      ? `${shown}/${total} entries`
      : `${total} entries`;
    const countWidget = new Text({
      text: new TextSpan({
        text: countText,
        style: new TextStyle({ foreground: mutedColor, dim: true }),
      }),
    });

    let listArea: Widget;
    if (this.filteredItems.length > 0) {
      listArea = new SelectionList({
        items: this.filteredItems,
        onSelect: (value: string) => {
          const idx = parseInt(value, 10);
          if (idx >= 0 && idx < this.widget.entries.length) {
            this.widget.onSelect(this.widget.entries[idx]);
          }
        },
        onCancel: this.widget.onDismiss,
        showDescription: false,
      });
    } else {
      listArea = new Text({
        text: new TextSpan({
          text: 'No matching history entries',
          style: new TextStyle({ foreground: mutedColor, italic: true }),
        }),
      });
    }

    return new FocusScope({
      autofocus: true,
      onKey: (event: KeyEvent): KeyEventResult => {
        if (event.key === 'Escape') {
          this.widget.onDismiss();
          return 'handled';
        }
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
            constraints: new BoxConstraints({ maxWidth: 70 }),
            child: new Column({
              mainAxisSize: 'min',
              crossAxisAlignment: 'start',
              children: [
                new Text({
                  text: new TextSpan({
                    text: 'Prompt History (Ctrl+R)',
                    style: new TextStyle({ foreground: infoColor, bold: true }),
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
