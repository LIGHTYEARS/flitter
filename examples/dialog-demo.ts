// Dialog Demo — Demonstrates modal dialog overlays using Stack + Positioned.
//
// Shows a main content area with a list of items. Press Enter to open a
// confirmation dialog overlay, Escape to close. The dialog demonstrates:
// - Stack widget for layered overlay positioning
// - Positioned widget for centering the dialog
// - Container + BoxDecoration for dialog border/background
// - FocusNode for keyboard interaction
// - Composing widgets to build complex UI patterns
//
// Controls:
// - j/ArrowDown: Move selection down
// - k/ArrowUp: Move selection up
// - Enter: Open dialog for selected item
// - y: Confirm (in dialog)
// - n/Escape: Cancel (in dialog)
// - q: Quit
//
// Run with: bun run examples/dialog-demo.ts

import {
  StatefulWidget,
  State,
  Widget,
  type BuildContext,
} from '../src/framework/widget';
import { runApp } from '../src/framework/binding';
import { Text } from '../src/widgets/text';
import { Column, Row } from '../src/widgets/flex';
import { SizedBox } from '../src/widgets/sized-box';
import { Container } from '../src/widgets/container';
import { Divider } from '../src/widgets/divider';
import { Expanded } from '../src/widgets/flexible';
import { Stack, Positioned } from '../src/widgets/stack';
import { Center } from '../src/widgets/center';
import { TextSpan } from '../src/core/text-span';
import { TextStyle } from '../src/core/text-style';
import { Color } from '../src/core/color';
import { EdgeInsets } from '../src/layout/edge-insets';
import {
  BoxDecoration,
  Border,
  BorderSide,
} from '../src/layout/render-decorated';
import { FocusNode, FocusManager } from '../src/input/focus';
import type { KeyEvent, KeyEventResult } from '../src/input/events';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface Item {
  name: string;
  description: string;
  status: 'active' | 'archived' | 'deleted';
}

const ITEMS: Item[] = [
  { name: 'Project Alpha', description: 'Main product codebase', status: 'active' },
  { name: 'Design Docs', description: 'UI/UX specifications', status: 'active' },
  { name: 'Legacy API', description: 'Deprecated REST endpoints', status: 'archived' },
  { name: 'Test Suite', description: 'Integration test configs', status: 'active' },
  { name: 'Old Database', description: 'PostgreSQL 9.x backup', status: 'archived' },
  { name: 'Temp Files', description: 'Build artifacts and cache', status: 'active' },
];

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const titleStyle = new TextStyle({ bold: true, foreground: Color.cyan });
const normalStyle = new TextStyle();
const dimStyle = new TextStyle({ dim: true });
const selectedStyle = new TextStyle({ bold: true, foreground: Color.brightWhite });
const activeStyle = new TextStyle({ foreground: Color.green });
const archivedStyle = new TextStyle({ foreground: Color.yellow });
const dialogTitleStyle = new TextStyle({ bold: true, foreground: Color.red });
const dialogTextStyle = new TextStyle();
const dialogKeyStyle = new TextStyle({ bold: true, foreground: Color.green });
const selectedBg = Color.blue;

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function txt(content: string, style?: TextStyle): Text {
  return new Text({
    text: new TextSpan({ text: content, style: style ?? normalStyle }),
  });
}

// ---------------------------------------------------------------------------
// DialogDemo Widget
// ---------------------------------------------------------------------------

export class DialogDemo extends StatefulWidget {
  createState(): State<DialogDemo> {
    return new DialogDemoState();
  }
}

export class DialogDemoState extends State<DialogDemo> {
  private _items: Item[] = [];
  private _selectedIndex: number = 0;
  private _dialogOpen: boolean = false;
  private _lastAction: string = '';
  private _focusNode: FocusNode | null = null;

  initState(): void {
    super.initState();
    this._items = ITEMS.map((item) => ({ ...item }));
    this._focusNode = new FocusNode({
      debugLabel: 'DialogDemoFocus',
      onKey: (event: KeyEvent): KeyEventResult => {
        const result = this._handleKey(event.key);
        if (result === 'handled') {
          this.setState(() => {});
        }
        return result;
      },
    });
    FocusManager.instance.registerNode(this._focusNode, null);
    this._focusNode.requestFocus();
  }

  dispose(): void {
    this._focusNode?.dispose();
    this._focusNode = null;
    super.dispose();
  }

  get items(): readonly Item[] { return this._items; }
  get selectedIndex(): number { return this._selectedIndex; }
  get dialogOpen(): boolean { return this._dialogOpen; }
  get lastAction(): string { return this._lastAction; }

  private _handleKey(key: string): 'handled' | 'ignored' {
    if (this._dialogOpen) {
      return this._handleDialogKey(key);
    }
    return this._handleListKey(key);
  }

  private _handleDialogKey(key: string): 'handled' | 'ignored' {
    switch (key) {
      case 'y':
        this._confirmDelete();
        return 'handled';
      case 'n':
      case 'Escape':
        this._dialogOpen = false;
        this._lastAction = 'Cancelled';
        return 'handled';
      default:
        return 'ignored';
    }
  }

  private _handleListKey(key: string): 'handled' | 'ignored' {
    switch (key) {
      case 'j':
      case 'ArrowDown':
        if (this._selectedIndex < this._items.length - 1) this._selectedIndex++;
        return 'handled';
      case 'k':
      case 'ArrowUp':
        if (this._selectedIndex > 0) this._selectedIndex--;
        return 'handled';
      case 'Enter':
        if (this._items.length > 0) this._dialogOpen = true;
        return 'handled';
      case 'q':
        process.exit(0);
        return 'handled';
      default:
        return 'ignored';
    }
  }

  private _confirmDelete(): void {
    const item = this._items[this._selectedIndex];
    if (item) {
      this._lastAction = `Deleted: ${item.name}`;
      this._items.splice(this._selectedIndex, 1);
      if (this._selectedIndex >= this._items.length && this._items.length > 0) {
        this._selectedIndex = this._items.length - 1;
      }
    }
    this._dialogOpen = false;
  }

  build(_context: BuildContext): Widget {
    const mainContent = this._buildMainContent();

    if (!this._dialogOpen) {
      return mainContent;
    }

    // Overlay the dialog on top of main content using Stack
    const selectedItem = this._items[this._selectedIndex];
    const dialogWidget = this._buildDialog(selectedItem?.name ?? '');

    return new Stack({
      fit: 'expand',
      children: [
        mainContent,
        // Center the dialog using Positioned with equal offsets
        new Positioned({
          left: 10,
          top: 4,
          right: 10,
          bottom: 4,
          child: dialogWidget,
        }),
      ],
    });
  }

  private _buildMainContent(): Widget {
    const border = Border.all(
      new BorderSide({ color: Color.cyan, style: 'rounded' }),
    );

    const listItems: Widget[] = this._items.map((item, i) => {
      const isSelected = i === this._selectedIndex;
      const statusStyle = item.status === 'active' ? activeStyle : archivedStyle;
      const textSt = isSelected ? selectedStyle : normalStyle;
      const pointer = isSelected ? '>' : ' ';

      return new Container({
        decoration: isSelected
          ? new BoxDecoration({ color: selectedBg })
          : new BoxDecoration(),
        child: new Row({
          children: [
            txt(` ${pointer} `, isSelected ? selectedStyle : dimStyle),
            new Expanded({
              child: txt(item.name, textSt),
            }),
            txt(`[${item.status}]`, statusStyle),
            txt(' '),
          ],
        }),
      });
    });

    if (listItems.length === 0) {
      listItems.push(txt('  No items remaining.', dimStyle));
    }

    return new Column({
      children: [
        new Container({
          decoration: new BoxDecoration({ border }),
          child: txt(' Item Manager ', titleStyle),
        }),
        new Divider(),
        new Expanded({
          child: new Column({
            mainAxisSize: 'min',
            children: listItems,
          }),
        }),
        new Divider(),
        txt(this._lastAction.length > 0 ? ` ${this._lastAction}` : '', dimStyle),
        txt(' j/k:navigate  Enter:delete  q:quit', dimStyle),
      ],
    });
  }

  private _buildDialog(itemName: string): Widget {
    const dialogBorder = Border.all(
      new BorderSide({ color: Color.red, style: 'rounded' }),
    );

    return new Container({
      decoration: new BoxDecoration({
        color: Color.black,
        border: dialogBorder,
      }),
      padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
      child: new Column({
        mainAxisSize: 'min',
        children: [
          txt(' Confirm Delete ', dialogTitleStyle),
          new Divider(),
          new SizedBox({ height: 1 }),
          txt(` Are you sure you want to delete "${itemName}"?`, dialogTextStyle),
          new SizedBox({ height: 1 }),
          txt(' This action cannot be undone.', dimStyle),
          new SizedBox({ height: 1 }),
          new Divider(),
          new Row({
            children: [
              txt('  Press '),
              txt('[y]', dialogKeyStyle),
              txt(' to confirm, '),
              txt('[n]', dialogKeyStyle),
              txt(' or '),
              txt('[Esc]', dialogKeyStyle),
              txt(' to cancel'),
            ],
          }),
        ],
      }),
    });
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { txt, ITEMS };

// Only run the app when executed directly
if (import.meta.main) {
  runApp(new DialogDemo(), { output: process.stdout });
}
