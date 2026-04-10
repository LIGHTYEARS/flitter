// IdePicker — IDE selection overlay widget
//
// Modeled after file-picker.ts pattern. Displays a list of available IDEs
// using SelectionList with keyboard navigation (ArrowUp/ArrowDown, Enter).
// When an IDE is selected, calls the onSelect callback with the IDE identifier.
//
// Key bindings:
//   Escape       -> dismiss overlay
//   ArrowUp / k  -> move selection up
//   ArrowDown / j -> move selection down
//   Enter        -> confirm selection
//
// Modal overlay at IDE_PICKER priority (50).

import {
  StatelessWidget,
  Widget,
  type BuildContext,
} from '../../../flitter-core/src/framework/widget';
import { Column } from '../../../flitter-core/src/widgets/flex';
import { Container } from '../../../flitter-core/src/widgets/container';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { Color } from '../../../flitter-core/src/core/color';
import { FocusScope } from '../../../flitter-core/src/widgets/focus-scope';
import { BoxDecoration, Border, BorderSide } from '../../../flitter-core/src/layout/render-decorated';
import { EdgeInsets } from '../../../flitter-core/src/layout/edge-insets';
import { SizedBox } from '../../../flitter-core/src/widgets/sized-box';
import { Center } from '../../../flitter-core/src/widgets/center';
import { BoxConstraints } from '../../../flitter-core/src/core/box-constraints';
import { SelectionList, type SelectionItem } from '../../../flitter-core/src/widgets/selection-list';
import type { KeyEvent, KeyEventResult } from '../../../flitter-core/src/input/events';
import { log } from '../utils/logger';

// ---------------------------------------------------------------------------
// Predefined IDE list
// ---------------------------------------------------------------------------

/** A predefined IDE entry for the picker. */
export interface IdeEntry {
  /** Unique identifier for this IDE (e.g. 'vscode', 'cursor'). */
  readonly id: string;
  /** Display name shown in the picker list. */
  readonly label: string;
  /** Optional description for additional context. */
  readonly description?: string;
}

/**
 * Default list of supported IDEs.
 * Covers the major code editors and JetBrains family.
 */
export const DEFAULT_IDE_LIST: readonly IdeEntry[] = [
  { id: 'vscode',           label: 'VS Code',                 description: 'Visual Studio Code' },
  { id: 'cursor',           label: 'Cursor',                  description: 'AI-first code editor' },
  { id: 'windsurf',         label: 'Windsurf',                description: 'Codeium IDE' },
  { id: 'intellij',         label: 'IntelliJ IDEA',           description: 'JetBrains Java/Kotlin IDE' },
  { id: 'webstorm',         label: 'WebStorm',                description: 'JetBrains JavaScript IDE' },
  { id: 'pycharm',          label: 'PyCharm',                 description: 'JetBrains Python IDE' },
  { id: 'goland',           label: 'GoLand',                  description: 'JetBrains Go IDE' },
  { id: 'clion',            label: 'CLion',                   description: 'JetBrains C/C++ IDE' },
  { id: 'rider',            label: 'Rider',                   description: 'JetBrains .NET IDE' },
  { id: 'rubymine',         label: 'RubyMine',                description: 'JetBrains Ruby IDE' },
  { id: 'phpstorm',         label: 'PhpStorm',                description: 'JetBrains PHP IDE' },
  { id: 'vim',              label: 'Vim',                     description: 'Terminal text editor' },
  { id: 'emacs',            label: 'Emacs',                   description: 'Extensible text editor' },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/** Props for the IdePicker widget. */
export interface IdePickerProps {
  /** Called when an IDE is selected. Receives the IDE id string. */
  readonly onSelect: (ideId: string) => void;
  /** Called when the picker is dismissed (Escape). */
  readonly onDismiss: () => void;
  /** Optional custom IDE list. Defaults to DEFAULT_IDE_LIST. */
  readonly ides?: readonly IdeEntry[];
}

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const BORDER_COLOR = Color.blue;
const TITLE_COLOR = Color.blue;
const MUTED_COLOR = Color.brightBlack;
const KEYBIND_COLOR = Color.blue;

// ---------------------------------------------------------------------------
// IdePicker
// ---------------------------------------------------------------------------

/**
 * IDE selection overlay widget.
 *
 * Displays a navigable list of available IDEs using SelectionList.
 * Follows the same structural pattern as FilePicker (FocusScope wrapping,
 * bordered container with title and SelectionList).
 *
 * Layout:
 *   FocusScope (autofocus, onKey: Escape -> onDismiss)
 *     Center
 *       Container (bordered blue, padded, maxWidth: 50, maxHeight: 20)
 *         Column
 *           "Select IDE" title (bold)
 *           SizedBox spacer
 *           Text "{count} IDEs" (muted, dim)
 *           SelectionList (IDE items, onSelect, onCancel)
 *           SizedBox spacer
 *           Footer hints
 */
export class IdePicker extends StatelessWidget {
  readonly onSelect: (ideId: string) => void;
  readonly onDismiss: () => void;
  readonly ides: readonly IdeEntry[];

  constructor(props: IdePickerProps) {
    super({});
    this.onSelect = props.onSelect;
    this.onDismiss = props.onDismiss;
    this.ides = props.ides ?? DEFAULT_IDE_LIST;
    log.debug('IdePicker: created', { ideCount: this.ides.length });
  }

  build(_context: BuildContext): Widget {
    const side = new BorderSide({
      color: BORDER_COLOR,
      width: 1,
      style: 'rounded',
    });

    // Convert IDE entries to SelectionList items
    const items: SelectionItem[] = this.ides.map((ide) => ({
      label: ide.label,
      value: ide.id,
      description: ide.description,
    }));

    // Title
    const title = new Text({
      text: new TextSpan({
        text: 'Select IDE',
        style: new TextStyle({ foreground: TITLE_COLOR, bold: true }),
      }),
    });

    // Count indicator
    const countWidget = new Text({
      text: new TextSpan({
        text: `${items.length} IDEs`,
        style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
      }),
    });

    // Selection list for IDE choices
    const selectionList = new SelectionList({
      items,
      onSelect: (value: string) => {
        log.info('IdePicker: selected', { ideId: value });
        this.onSelect(value);
      },
      onCancel: this.onDismiss,
      showDescription: true,
    });

    // Footer hints
    const footer = new Text({
      text: new TextSpan({
        children: [
          new TextSpan({
            text: '\u2191\u2193',
            style: new TextStyle({ foreground: KEYBIND_COLOR }),
          }),
          new TextSpan({
            text: ' navigate  ',
            style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
          }),
          new TextSpan({
            text: 'Enter',
            style: new TextStyle({ foreground: KEYBIND_COLOR }),
          }),
          new TextSpan({
            text: ' select  ',
            style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
          }),
          new TextSpan({
            text: 'Esc',
            style: new TextStyle({ foreground: KEYBIND_COLOR }),
          }),
          new TextSpan({
            text: ' close',
            style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
          }),
        ],
      }),
    });

    // Inner column
    const innerColumn = new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'start',
      children: [
        title,
        new SizedBox({ height: 1 }),
        countWidget,
        selectionList,
        new SizedBox({ height: 1 }),
        footer,
      ],
    });

    // Bordered container
    const panel = new Container({
      decoration: new BoxDecoration({ border: Border.all(side) }),
      padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
      constraints: new BoxConstraints({ maxWidth: 50, maxHeight: 20 }),
      child: innerColumn,
    });

    // FocusScope catches Escape at the picker level
    return new FocusScope({
      autofocus: true,
      onKey: (event: KeyEvent): KeyEventResult => {
        if (event.key === 'Escape') {
          log.debug('IdePicker: dismissed via Escape');
          this.onDismiss();
          return 'handled';
        }
        return 'ignored';
      },
      child: new Center({ child: panel }),
    });
  }
}
