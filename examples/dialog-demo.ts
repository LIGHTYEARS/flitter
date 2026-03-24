// Dialog Demo — Demonstrates modal dialog overlays using Stack + Positioned.
//
// A project browser where you can navigate a list of projects. Press Enter
// to open a detail popup showing full project information. Press Escape to
// close the popup and return to the list.
//
// This example demonstrates:
// - Stack widget for layered overlay positioning
// - Positioned widget for centering the dialog
// - Container + BoxDecoration for dialog styling (border, background)
// - FocusNode for keyboard interaction
// - State-driven UI: same widget tree switches between list and overlay mode
//
// Controls:
// - j/ArrowDown: Move selection down
// - k/ArrowUp: Move selection up
// - Enter: Open detail popup for selected project
// - Escape: Close popup
// - d: Delete selected project (from list view)
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

export interface Project {
  name: string;
  description: string;
  language: string;
  stars: number;
  status: 'active' | 'archived' | 'beta';
  author: string;
  license: string;
  version: string;
}

const PROJECTS: Project[] = [
  {
    name: 'flutter-tui',
    description: 'A Flutter-inspired terminal UI framework for TypeScript',
    language: 'TypeScript',
    stars: 1200,
    status: 'active',
    author: 'TUI Team',
    license: 'MIT',
    version: '1.3.0',
  },
  {
    name: 'ink-react',
    description: 'React for interactive command-line apps',
    language: 'TypeScript',
    stars: 25000,
    status: 'active',
    author: 'Vadim Demedes',
    license: 'MIT',
    version: '4.4.1',
  },
  {
    name: 'blessed-contrib',
    description: 'Dashboard widgets for blessed terminal library',
    language: 'JavaScript',
    stars: 15000,
    status: 'archived',
    author: 'Yaron Naveh',
    license: 'MIT',
    version: '4.11.0',
  },
  {
    name: 'bubbletea',
    description: 'A powerful TUI framework based on The Elm Architecture',
    language: 'Go',
    stars: 28000,
    status: 'active',
    author: 'Charmbracelet',
    license: 'MIT',
    version: '1.2.4',
  },
  {
    name: 'ratatui',
    description: 'Rust library for building rich terminal user interfaces',
    language: 'Rust',
    stars: 12000,
    status: 'active',
    author: 'ratatui-org',
    license: 'MIT',
    version: '0.29.0',
  },
  {
    name: 'textual',
    description: 'TUI framework for Python using Rich rendering',
    language: 'Python',
    stars: 26000,
    status: 'active',
    author: 'Textualize',
    license: 'MIT',
    version: '0.89.0',
  },
  {
    name: 'tview',
    description: 'Terminal UI framework with rich interactive widgets',
    language: 'Go',
    stars: 10000,
    status: 'archived',
    author: 'rivo',
    license: 'MIT',
    version: '0.64.0',
  },
  {
    name: 'terminal-kit',
    description: 'Full-featured terminal lib for Node.js',
    language: 'JavaScript',
    stars: 3000,
    status: 'beta',
    author: 'cronvel',
    license: 'MIT',
    version: '3.1.1',
  },
];

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const titleStyle = new TextStyle({ bold: true, foreground: Color.cyan });
const normalStyle = new TextStyle();
const dimStyle = new TextStyle({ dim: true });
const selectedStyle = new TextStyle({ bold: true, foreground: Color.defaultColor });
const activeStyle = new TextStyle({ foreground: Color.green });
const archivedStyle = new TextStyle({ foreground: Color.yellow });
const betaStyle = new TextStyle({ foreground: Color.magenta });
const selectedBg = Color.brightBlack;

// Dialog styles
const dialogTitleStyle = new TextStyle({ bold: true, foreground: Color.cyan });
const dialogLabelStyle = new TextStyle({ bold: true, foreground: Color.yellow });
const dialogValueStyle = new TextStyle();
const dialogDescStyle = new TextStyle({ italic: true, dim: true });
const dialogStarsStyle = new TextStyle({ foreground: Color.yellow, bold: true });
const dialogHintStyle = new TextStyle({ dim: true });

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function txt(content: string, style?: TextStyle): Text {
  return new Text({
    text: new TextSpan({ text: content, style: style ?? normalStyle }),
  });
}

function statusStyle(status: string): TextStyle {
  switch (status) {
    case 'active': return activeStyle;
    case 'archived': return archivedStyle;
    case 'beta': return betaStyle;
    default: return dimStyle;
  }
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
  private _projects: Project[] = [];
  private _selectedIndex: number = 0;
  private _popupOpen: boolean = false;
  private _statusMessage: string = '';
  private _focusNode: FocusNode | null = null;

  initState(): void {
    super.initState();
    this._projects = PROJECTS.map((p) => ({ ...p }));
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

  get projects(): readonly Project[] { return this._projects; }
  get selectedIndex(): number { return this._selectedIndex; }
  get popupOpen(): boolean { return this._popupOpen; }

  private _handleKey(key: string): 'handled' | 'ignored' {
    if (this._popupOpen) {
      return this._handlePopupKey(key);
    }
    return this._handleListKey(key);
  }

  private _handlePopupKey(key: string): 'handled' | 'ignored' {
    switch (key) {
      case 'Escape':
      case 'Enter':
      case 'q':
        this._popupOpen = false;
        return 'handled';
      default:
        return 'ignored';
    }
  }

  private _handleListKey(key: string): 'handled' | 'ignored' {
    switch (key) {
      case 'j':
      case 'ArrowDown':
        if (this._selectedIndex < this._projects.length - 1) this._selectedIndex++;
        return 'handled';
      case 'k':
      case 'ArrowUp':
        if (this._selectedIndex > 0) this._selectedIndex--;
        return 'handled';
      case 'Enter':
        if (this._projects.length > 0) {
          this._popupOpen = true;
          this._statusMessage = `Viewing: ${this._projects[this._selectedIndex]!.name}`;
        }
        return 'handled';
      case 'd':
        this._deleteSelected();
        return 'handled';
      case 'q':
        process.exit(0);
        return 'handled';
      default:
        return 'ignored';
    }
  }

  private _deleteSelected(): void {
    if (this._projects.length === 0) return;
    const removed = this._projects.splice(this._selectedIndex, 1)[0];
    if (removed) this._statusMessage = `Removed: ${removed.name}`;
    if (this._selectedIndex >= this._projects.length && this._projects.length > 0) {
      this._selectedIndex = this._projects.length - 1;
    }
  }

  build(_context: BuildContext): Widget {
    const mainContent = this._buildMainContent();

    if (!this._popupOpen) {
      return mainContent;
    }

    // Overlay the detail popup on top of the list
    const project = this._projects[this._selectedIndex];
    if (!project) return mainContent;

    return new Stack({
      fit: 'expand',
      children: [
        mainContent,
        new Positioned({
          left: 5,
          top: 2,
          right: 5,
          bottom: 2,
          child: this._buildDetailPopup(project),
        }),
      ],
    });
  }

  private _buildMainContent(): Widget {
    const border = Border.all(
      new BorderSide({ color: Color.cyan, style: 'rounded' }),
    );

    const listItems: Widget[] = this._projects.map((project, i) => {
      const isSelected = i === this._selectedIndex;
      const pointer = isSelected ? '>' : ' ';
      const textSt = isSelected ? selectedStyle : normalStyle;
      const sSt = statusStyle(project.status);
      const starsTxt = `${project.stars >= 1000 ? `${(project.stars / 1000).toFixed(1)}k` : project.stars}`;

      return new Container({
        decoration: isSelected
          ? new BoxDecoration({ color: selectedBg })
          : new BoxDecoration(),
        child: new Row({
          children: [
            txt(` ${pointer} `, isSelected ? selectedStyle : dimStyle),
            new Expanded({
              child: txt(project.name, textSt),
            }),
            txt(project.language, dimStyle),
            txt('  '),
            txt(`★${starsTxt}`, isSelected ? selectedStyle : new TextStyle({ foreground: Color.yellow })),
            txt('  '),
            txt(`[${project.status}]`, isSelected ? selectedStyle : sSt),
            txt(' '),
          ],
        }),
      });
    });

    if (listItems.length === 0) {
      listItems.push(txt('  No projects. All removed.', dimStyle));
    }

    return new Column({
      children: [
        new Container({
          decoration: new BoxDecoration({ border }),
          child: txt(' TUI Frameworks Browser ', titleStyle),
        }),
        new Divider(),
        new Expanded({
          child: new Column({
            mainAxisSize: 'min',
            children: listItems,
          }),
        }),
        new Divider(),
        txt(this._statusMessage.length > 0 ? ` ${this._statusMessage}` : '', dimStyle),
        txt(' j/k:navigate  Enter:details  d:remove  q:quit', dimStyle),
      ],
    });
  }

  private _buildDetailPopup(project: Project): Widget {
    const dialogBorder = Border.all(
      new BorderSide({ color: Color.cyan, style: 'rounded' }),
    );

    const starsText = `★ ${project.stars.toLocaleString()}`;

    return new Container({
      decoration: new BoxDecoration({
        color: Color.black,
        border: dialogBorder,
      }),
      padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
      child: new Column({
        mainAxisSize: 'min',
        children: [
          // Title
          txt(` ${project.name} `, dialogTitleStyle),
          txt(` ${project.description}`, dialogDescStyle),
          new SizedBox({ height: 1 }),
          new Divider(),
          new SizedBox({ height: 1 }),
          // Detail fields
          this._detailRow('Language', project.language),
          this._detailRow('Author', project.author),
          this._detailRow('Version', `v${project.version}`),
          this._detailRow('License', project.license),
          new Row({
            children: [
              txt('  Stars:    ', dialogLabelStyle),
              txt(starsText, dialogStarsStyle),
            ],
          }),
          new Row({
            children: [
              txt('  Status:   ', dialogLabelStyle),
              txt(project.status, statusStyle(project.status)),
            ],
          }),
          new SizedBox({ height: 1 }),
          new Divider(),
          txt('  Press Esc or Enter to close', dialogHintStyle),
        ],
      }),
    });
  }

  private _detailRow(label: string, value: string): Widget {
    const paddedLabel = (label + ':').padEnd(10);
    return new Row({
      children: [
        txt(`  ${paddedLabel} `, dialogLabelStyle),
        txt(value, dialogValueStyle),
      ],
    });
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { txt, PROJECTS };

// Only run the app when executed directly
if (import.meta.main) {
  runApp(new DialogDemo(), { output: process.stdout });
}
