// FilePicker — standalone overlay widget for @file mention selection
//
// Ported from flitter-amp/src/widgets/file-picker.ts with these changes:
// - Replaces AmpThemeProvider color lookups with hardcoded defaults
//   (green for success/border, brightBlack for muted)
// - Uses relative imports matching flitter-cli conventions
// - Designed to be shown via OverlayManager with anchored placement
//   near the input area
//
// Widget structure:
//   FocusScope (autofocus, onKey: Escape -> onDismiss)
//     Column (mainAxisAlignment: 'end', crossAxisAlignment: 'start')
//       Container (bordered, padded, maxWidth: 60, maxHeight: 15)
//         Column (mainAxisSize: 'min', crossAxisAlignment: 'start')
//           Text "Select file" (green, bold)
//           SizedBox (height: 1)
//           Container (bottom border underline)
//             TextField (search input, autofocus, maxLines: 1)
//           SizedBox (height: 1)
//           Text "{shown}/{total} files" (muted, dim)
//           SelectionList (filtered items, onSelect, onCancel)
//           OR Text "No matching files" (muted, italic)
//
// Colors are hardcoded defaults — Phase 20 adds theme support.

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
import { fuzzyMatch } from '../utils/fuzzy-match';

// ---------------------------------------------------------------------------
// FilePicker Props
// ---------------------------------------------------------------------------

/** Props for the FilePicker widget. */
export interface FilePickerProps {
  /** Full list of available file paths (relative to cwd). */
  readonly files: string[];
  /** Called when a file is selected from the list. */
  readonly onSelect: (filePath: string) => void;
  /** Called when the picker is dismissed (Escape or external dismiss). */
  readonly onDismiss: () => void;
  /** Optional initial query to pre-populate the search field. */
  readonly initialQuery?: string;
}

// ---------------------------------------------------------------------------
// FilePicker
// ---------------------------------------------------------------------------

/**
 * Standalone overlay widget for @file mention selection.
 *
 * Provides a fuzzy-searchable list of files from the working directory.
 * Designed to be shown via OverlayManager with anchored placement near
 * the input area. The standalone path provides a richer UI than the
 * inline Autocomplete popup.
 */
export class FilePicker extends StatefulWidget {
  readonly files: string[];
  readonly onSelect: (filePath: string) => void;
  readonly onDismiss: () => void;
  readonly initialQuery: string;

  constructor(props: FilePickerProps) {
    super();
    this.files = props.files;
    this.onSelect = props.onSelect;
    this.onDismiss = props.onDismiss;
    this.initialQuery = props.initialQuery ?? '';
  }

  createState(): State<FilePicker> {
    return new FilePickerState();
  }
}

// ---------------------------------------------------------------------------
// FilePickerState
// ---------------------------------------------------------------------------

/**
 * State for FilePicker. Manages the search controller, filtered items,
 * and current query. Recomputes filtered items using fuzzyMatch() scoring
 * when the search text changes.
 */
class FilePickerState extends State<FilePicker> {
  /** Controller for the search TextField. Owned by this state. */
  private searchController = new TextEditingController();

  /** Current search query — cached to avoid redundant refilter. */
  private currentQuery = '';

  /** Filtered and scored file items based on current query. */
  private filteredItems: SelectionItem[] = [];

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

  /** Refilter file list based on current query using fuzzyMatch scoring. */
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

  /** Convert a file path array to SelectionItem array. */
  private _buildItems(files: string[]): SelectionItem[] {
    return files.map((f) => ({ label: f, value: f }));
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
    // Hardcoded colors — Phase 20 adds theme support
    const successColor = Color.green;
    const mutedColor = Color.brightBlack;

    const borderSide = new BorderSide({
      color: successColor,
      width: 1,
      style: 'rounded',
    });

    // --- Title ---
    const title = new Text({
      text: new TextSpan({
        text: 'Select file',
        style: new TextStyle({ foreground: successColor, bold: true }),
      }),
    });

    // --- Search input with underline border ---
    const searchContainer = new Container({
      decoration: new BoxDecoration({
        border: new Border({
          bottom: new BorderSide({ color: mutedColor, width: 1 }),
        }),
      }),
      child: new TextField({
        controller: this.searchController,
        autofocus: true,
        placeholder: 'Search files...',
        maxLines: 1,
        cursorChar: '\u2588',
      }),
    });

    // --- Count indicator ---
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

    // --- File list or "no results" message ---
    let listArea: Widget;
    if (this.filteredItems.length > 0) {
      listArea = new SelectionList({
        items: this.filteredItems,
        onSelect: this.widget.onSelect,
        onCancel: this.widget.onDismiss,
        showDescription: false,
      });
    } else {
      listArea = new Text({
        text: new TextSpan({
          text: 'No matching files',
          style: new TextStyle({ foreground: mutedColor, italic: true }),
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
        searchContainer,
        new SizedBox({ height: 1 }),
        countWidget,
        listArea,
      ],
    });

    // --- Bordered container with max constraints ---
    const borderedPanel = new Container({
      decoration: new BoxDecoration({ border: Border.all(borderSide) }),
      padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
      constraints: new BoxConstraints({ maxWidth: 60, maxHeight: 15 }),
      child: innerColumn,
    });

    // --- Outer column: bottom-aligned for input-area proximity ---
    const outerColumn = new Column({
      mainAxisAlignment: 'end',
      crossAxisAlignment: 'start',
      children: [borderedPanel],
    });

    // --- FocusScope wrapping: catches Escape at the picker level ---
    return new FocusScope({
      autofocus: true,
      onKey: this._handleKey,
      child: outerColumn,
    });
  }
}
