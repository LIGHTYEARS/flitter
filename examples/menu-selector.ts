// menu-selector.ts — Keyboard-navigable menu.
//
// Run with: bun run examples/menu-selector.ts
//
// Controls:
// - Arrow Up / 'k': Move selection up
// - Arrow Down / 'j': Move selection down
// - Enter: Select item
// - 'q' or Ctrl+C: Quit
//
// This example demonstrates:
// - StatefulWidget with selection state
// - FocusNode for keyboard input handling
// - List of menu items with visual selection indicator
// - Dynamic styling based on selection state
// - Visual indicator (>) for selected item

import { runApp, WidgetsBinding } from '../src/framework/binding';
import {
  StatefulWidget,
  State,
  Widget,
  type BuildContext,
} from '../src/framework/widget';
import { Center } from '../src/widgets/center';
import { Column, Row } from '../src/widgets/flex';
import { Text } from '../src/widgets/text';
import { SizedBox } from '../src/widgets/sized-box';
import { Container } from '../src/widgets/container';
import { Divider } from '../src/widgets/divider';
import { TextSpan } from '../src/core/text-span';
import { TextStyle } from '../src/core/text-style';
import { Color } from '../src/core/color';
import { EdgeInsets } from '../src/layout/edge-insets';
import { BoxDecoration, Border, BorderSide } from '../src/layout/render-decorated';
import { Padding } from '../src/widgets/padding';
import { FocusNode, FocusManager } from '../src/input/focus';
import type { KeyEvent, KeyEventResult } from '../src/input/events';

// ---------------------------------------------------------------------------
// Menu item data
// ---------------------------------------------------------------------------

interface MenuItem {
  label: string;
  description: string;
  icon: string;
}

const MENU_ITEMS: MenuItem[] = [
  { label: 'New Project', description: 'Create a new project from template', icon: '+' },
  { label: 'Open File', description: 'Open an existing file', icon: '>' },
  { label: 'Recent Files', description: 'Browse recently opened files', icon: '#' },
  { label: 'Settings', description: 'Configure application preferences', icon: '*' },
  { label: 'Extensions', description: 'Manage installed extensions', icon: '@' },
  { label: 'Help', description: 'View documentation and support', icon: '?' },
  { label: 'About', description: 'Version and license information', icon: 'i' },
  { label: 'Quit', description: 'Exit the application', icon: 'x' },
];

// ---------------------------------------------------------------------------
// MenuSelectorApp — StatefulWidget with keyboard navigation
// ---------------------------------------------------------------------------

export class MenuSelectorApp extends StatefulWidget {
  createState(): MenuSelectorState {
    return new MenuSelectorState();
  }
}

export class MenuSelectorState extends State<MenuSelectorApp> {
  selectedIndex = 0;
  selectedItem: string | null = null;
  private _focusNode: FocusNode | null = null;

  initState(): void {
    this._focusNode = new FocusNode({
      debugLabel: 'MenuSelectorFocus',
      onKey: (event: KeyEvent): KeyEventResult => {
        return this._handleKey(event);
      },
    });
    FocusManager.instance.registerNode(this._focusNode, null);
    this._focusNode.requestFocus();
  }

  dispose(): void {
    if (this._focusNode) {
      this._focusNode.dispose();
      this._focusNode = null;
    }
    super.dispose();
  }

  private _handleKey(event: KeyEvent): KeyEventResult {
    if (event.key === 'ArrowUp' || event.key === 'k') {
      this.setState(() => {
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      });
      return 'handled';
    }
    if (event.key === 'ArrowDown' || event.key === 'j') {
      this.setState(() => {
        this.selectedIndex = Math.min(MENU_ITEMS.length - 1, this.selectedIndex + 1);
      });
      return 'handled';
    }
    if (event.key === 'Enter') {
      const item = MENU_ITEMS[this.selectedIndex]!;
      if (item.label === 'Quit') {
        process.exit(0);
      }
      this.setState(() => {
        this.selectedItem = item.label;
      });
      return 'handled';
    }
    if (event.key === 'q' || (event.key === 'c' && event.ctrlKey)) {
      process.exit(0);
    }
    return 'ignored';
  }

  build(_context: BuildContext): Widget {
    // Build menu items
    const menuWidgets: Widget[] = MENU_ITEMS.map((item, index) => {
      const isSelected = index === this.selectedIndex;

      // Selection indicator
      const indicator = isSelected ? '>' : ' ';
      const indicatorStyle = new TextStyle({
        bold: true,
        foreground: isSelected ? Color.cyan : Color.defaultColor,
      });

      // Item label style
      const labelStyle = new TextStyle({
        bold: isSelected,
        foreground: isSelected ? Color.cyan : Color.defaultColor,
      });

      // Description style
      const descStyle = new TextStyle({
        dim: true,
        foreground: isSelected ? Color.cyan : Color.brightBlack,
      });

      // Icon style
      const iconStyle = new TextStyle({
        foreground: isSelected ? Color.yellow : Color.brightBlack,
      });

      // Background highlight for selected item
      const decoration = isSelected
        ? new BoxDecoration({ color: Color.brightBlack })
        : new BoxDecoration();

      return new Container({
        decoration,
        child: new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 1 }),
          child: new Row({
            children: [
              new Text({
                text: new TextSpan({ text: ` ${indicator} `, style: indicatorStyle }),
              }),
              new Text({
                text: new TextSpan({ text: `[${item.icon}] `, style: iconStyle }),
              }),
              new Text({
                text: new TextSpan({ text: item.label, style: labelStyle }),
              }),
              new SizedBox({ width: 2 }),
              new Text({
                text: new TextSpan({ text: item.description, style: descStyle }),
              }),
            ],
          }),
        }),
      });
    });

    // Selected item feedback
    const feedbackWidget = this.selectedItem
      ? new Text({
          text: new TextSpan({
            text: `Selected: ${this.selectedItem}`,
            style: new TextStyle({ bold: true, foreground: Color.green }),
          }),
        })
      : new Text({
          text: new TextSpan({
            text: 'Press Enter to select',
            style: new TextStyle({ dim: true }),
          }),
        });

    return new Center({
      child: new Container({
        width: 60,
        decoration: new BoxDecoration({
          border: Border.all(new BorderSide({ color: Color.cyan, style: 'rounded' })),
        }),
        child: new Column({
          mainAxisSize: 'min',
          crossAxisAlignment: 'stretch',
          children: [
            // Title bar
            new Container({
              decoration: new BoxDecoration(),
              child: new Padding({
                padding: EdgeInsets.symmetric({ horizontal: 1 }),
                child: new Text({
                  text: new TextSpan({
                    text: ' Menu Selector ',
                    style: new TextStyle({ bold: true, foreground: Color.cyan }),
                  }),
                }),
              }),
            }),
            new SizedBox({ height: 1 }),

            // Menu items
            ...menuWidgets,

            new SizedBox({ height: 1 }),
            new Divider({ color: Color.cyan }),

            // Feedback area
            new Padding({
              padding: EdgeInsets.symmetric({ horizontal: 2 }),
              child: feedbackWidget,
            }),
            new SizedBox({ height: 1 }),

            // Help text
            new Padding({
              padding: EdgeInsets.symmetric({ horizontal: 2 }),
              child: new Text({
                text: new TextSpan({
                  text: 'Up/k: move up  Down/j: move down  Enter: select  q: quit',
                  style: new TextStyle({ dim: true }),
                }),
              }),
            }),
          ],
        }),
      }),
    });
  }
}

// Export for testing
export const createMenuSelectorApp = (): MenuSelectorApp => new MenuSelectorApp();
export { MENU_ITEMS };

// Only run the app when executed directly
if (import.meta.main) {
  runApp(new MenuSelectorApp(), { output: process.stdout });
}
