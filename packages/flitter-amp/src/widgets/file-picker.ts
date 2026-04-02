// FilePicker — overlay widget for @file mention selection
// StatefulWidget with TextField fuzzy search + SelectionList
// Registered with OverlayManager for proper z-ordering (GAP-SUM-031)

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
import { fuzzyMatch } from '../utils/fuzzy-match';
import type { KeyEvent, KeyEventResult } from 'flitter-core/src/input/events';

interface FilePickerProps {
  files: string[];
  onSelect: (filePath: string) => void;
  onDismiss: () => void;
  /** Optional initial query to pre-populate the search field (e.g. from @ trigger text). */
  initialQuery?: string;
}

/**
 * Overlay widget for @file mention selection.
 * Provides a fuzzy-searchable list of files from the working directory.
 * Designed to be shown via OverlayManager with anchored placement near the input area.
 */
export class FilePicker extends StatefulWidget {
  readonly files: string[];
  readonly onSelect: (filePath: string) => void;
  readonly onDismiss: () => void;
  readonly initialQuery: string;

  constructor(props: FilePickerProps) {
    super({});
    this.files = props.files;
    this.onSelect = props.onSelect;
    this.onDismiss = props.onDismiss;
    this.initialQuery = props.initialQuery ?? '';
  }

  createState(): State<FilePicker> {
    return new FilePickerState();
  }
}

class FilePickerState extends State<FilePicker> {
  private searchController = new TextEditingController();
  private filteredItems: SelectionItem[] = [];
  private currentQuery = '';

  initState(): void {
    super.initState();
    this.filteredItems = this._buildItems(this.widget.files);
    this.searchController.addListener(this._onSearchChanged);
    if (this.widget.initialQuery.length > 0) {
      this.searchController.text = this.widget.initialQuery;
    }
  }

  dispose(): void {
    this.searchController.removeListener(this._onSearchChanged);
    this.searchController.dispose();
    super.dispose();
  }

  didUpdateWidget(_oldWidget: FilePicker): void {
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
        this.filteredItems = this._buildItems(this.widget.files);
      } else {
        const scored: Array<{ file: string; score: number }> = [];
        for (const file of this.widget.files) {
          const score = fuzzyMatch(query, file);
          if (score !== null) {
            scored.push({ file, score });
          }
        }
        scored.sort((a, b) => b.score - a.score);
        this.filteredItems = this._buildItems(scored.map((s) => s.file));
      }
    });
  }

  private _buildItems(files: string[]): SelectionItem[] {
    return files.map((f) => ({ label: f, value: f }));
  }

  build(context: BuildContext): Widget {
    const theme = AmpThemeProvider.maybeOf(context);
    const successColor = theme?.base.success ?? Color.green;
    const mutedColor = theme?.base.mutedForeground ?? Color.brightBlack;
    const side = new BorderSide({
      color: successColor,
      width: 1,
      style: 'rounded',
    });

    const searchField = new TextField({
      controller: this.searchController,
      autofocus: true,
      placeholder: 'Search files...',
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

    const total = this.widget.files.length;
    const shown = this.filteredItems.length;
    const countText = this.currentQuery.length > 0
      ? `${shown}/${total} files`
      : `${total} files`;
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
        onSelect: this.widget.onSelect,
        onCancel: this.widget.onDismiss,
      });
    } else {
      listArea = new Text({
        text: new TextSpan({
          text: 'No matching files',
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
        mainAxisAlignment: 'end',
        crossAxisAlignment: 'start',
        children: [
          new Container({
            decoration: new BoxDecoration({ border: Border.all(side) }),
            padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
            constraints: new BoxConstraints({ maxWidth: 60, maxHeight: 15 }),
            child: new Column({
              mainAxisSize: 'min',
              crossAxisAlignment: 'start',
              children: [
                new Text({
                  text: new TextSpan({
                    text: 'Select file',
                    style: new TextStyle({
                      foreground: successColor,
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
