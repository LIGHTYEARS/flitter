// tabs-demo.ts — Tab navigation with keyboard controls.
//
// Run with: bun run examples/tabs-demo.ts
//
// Controls:
// - Left/Right arrow keys: Switch tabs
// - 1/2/3: Jump to specific tab
// - q or Ctrl+C: Quit
//
// This example demonstrates:
// - StatefulWidget with tab selection state
// - FocusNode for keyboard input handling
// - Tab bar with active tab highlighting
// - Dynamic content switching based on selected tab
// - Container decorations for tab styling
// - Column/Row layout composition

import { runApp, WidgetsBinding } from '../src/framework/binding';
import {
  StatefulWidget,
  State,
  Widget,
  type BuildContext,
} from '../src/framework/widget';
import { Center } from '../src/widgets/center';
import { Column, Row } from '../src/widgets/flex';
import { Expanded } from '../src/widgets/flexible';
import { Text } from '../src/widgets/text';
import { SizedBox } from '../src/widgets/sized-box';
import { Padding } from '../src/widgets/padding';
import { Container } from '../src/widgets/container';
import { Divider } from '../src/widgets/divider';
import { TextSpan } from '../src/core/text-span';
import { TextStyle } from '../src/core/text-style';
import { Color } from '../src/core/color';
import { EdgeInsets } from '../src/layout/edge-insets';
import { BoxDecoration, Border, BorderSide } from '../src/layout/render-decorated';
import { FocusNode, FocusManager } from '../src/input/focus';
import type { KeyEvent, KeyEventResult } from '../src/input/events';

// ---------------------------------------------------------------------------
// Tab data
// ---------------------------------------------------------------------------

interface TabData {
  title: string;
  color: Color;
  content: { label: string; value: string }[];
}

const TABS: TabData[] = [
  {
    title: 'Overview',
    color: Color.cyan,
    content: [
      { label: 'Project', value: 'flutter-tui' },
      { label: 'Version', value: '1.0.0' },
      { label: 'Language', value: 'TypeScript' },
      { label: 'Runtime', value: 'Bun' },
      { label: 'License', value: 'MIT' },
      { label: 'Status', value: 'Active Development' },
    ],
  },
  {
    title: 'Statistics',
    color: Color.green,
    content: [
      { label: 'Files', value: '127' },
      { label: 'Lines of Code', value: '14,832' },
      { label: 'Test Coverage', value: '87%' },
      { label: 'Dependencies', value: '0 (zero deps!)' },
      { label: 'Build Time', value: '0.8s' },
      { label: 'Bundle Size', value: '42KB' },
    ],
  },
  {
    title: 'Activity',
    color: Color.magenta,
    content: [
      { label: 'Last Commit', value: '2 hours ago' },
      { label: 'Open Issues', value: '12' },
      { label: 'Pull Requests', value: '3' },
      { label: 'Contributors', value: '5' },
      { label: 'Stars', value: '234' },
      { label: 'Forks', value: '18' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function label(content: string, style?: TextStyle): Text {
  return new Text({
    text: new TextSpan({
      text: content,
      style: style ?? new TextStyle(),
    }),
  });
}

// ---------------------------------------------------------------------------
// TabsDemoApp — StatefulWidget with tab navigation
// ---------------------------------------------------------------------------

export class TabsDemoApp extends StatefulWidget {
  createState(): TabsDemoState {
    return new TabsDemoState();
  }
}

export class TabsDemoState extends State<TabsDemoApp> {
  activeTab = 0;
  private _focusNode: FocusNode | null = null;

  initState(): void {
    this._focusNode = new FocusNode({
      debugLabel: 'TabsFocus',
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
    // Arrow key navigation
    if (event.key === 'ArrowLeft') {
      this.setState(() => {
        this.activeTab = (this.activeTab - 1 + TABS.length) % TABS.length;
      });
      return 'handled';
    }
    if (event.key === 'ArrowRight') {
      this.setState(() => {
        this.activeTab = (this.activeTab + 1) % TABS.length;
      });
      return 'handled';
    }

    // Number key navigation
    if (event.key === '1') {
      this.setState(() => { this.activeTab = 0; });
      return 'handled';
    }
    if (event.key === '2') {
      this.setState(() => { this.activeTab = 1; });
      return 'handled';
    }
    if (event.key === '3') {
      this.setState(() => { this.activeTab = 2; });
      return 'handled';
    }

    // Quit
    if (event.key === 'q' || (event.key === 'c' && event.ctrlKey)) {
      process.exit(0);
    }

    return 'ignored';
  }

  private _buildTabBar(): Widget {
    const tabWidgets: Widget[] = TABS.map((tab, index) => {
      const isActive = index === this.activeTab;

      const tabLabel = ` ${index + 1}. ${tab.title} `;

      if (isActive) {
        // Active tab: colored background, bold text
        return new Container({
          decoration: new BoxDecoration({ color: tab.color }),
          child: label(tabLabel, new TextStyle({ bold: true })),
        });
      } else {
        // Inactive tab: dim text with border bottom
        return new Container({
          decoration: new BoxDecoration({
            border: Border.all(new BorderSide({ color: Color.brightBlack, style: 'solid' })),
          }),
          child: label(tabLabel, new TextStyle({ dim: true })),
        });
      }
    });

    // Add spacing between tabs
    const spacedTabs: Widget[] = [];
    tabWidgets.forEach((tab, i) => {
      spacedTabs.push(tab);
      if (i < tabWidgets.length - 1) {
        spacedTabs.push(new SizedBox({ width: 1 }));
      }
    });

    return new Row({
      mainAxisAlignment: 'center',
      children: spacedTabs,
    });
  }

  private _buildTabContent(): Widget {
    const tab = TABS[this.activeTab]!;

    const contentRows: Widget[] = tab.content.map(item => {
      return new Padding({
        padding: EdgeInsets.symmetric({ horizontal: 2 }),
        child: new Row({
          children: [
            label(`${item.label}:`, new TextStyle({ bold: true, foreground: tab.color })),
            new SizedBox({ width: 2 }),
            label(item.value, new TextStyle({ foreground: Color.defaultColor })),
          ],
        }),
      });
    });

    // Add spacing between rows
    const spacedContent: Widget[] = [];
    contentRows.forEach((row, i) => {
      spacedContent.push(row);
      if (i < contentRows.length - 1) {
        spacedContent.push(new SizedBox({ height: 1 }));
      }
    });

    return new Container({
      decoration: new BoxDecoration({
        border: Border.all(new BorderSide({ color: tab.color, style: 'rounded' })),
      }),
      child: new Padding({
        padding: EdgeInsets.all(1),
        child: new Column({
          mainAxisSize: 'min',
          crossAxisAlignment: 'start',
          children: [
            // Tab content header
            new Center({
              child: label(`-- ${tab.title} --`, new TextStyle({ bold: true, foreground: tab.color })),
            }),
            new Divider({ color: tab.color }),
            ...spacedContent,
          ],
        }),
      }),
    });
  }

  build(_context: BuildContext): Widget {
    return new Center({
      child: new Container({
        width: 50,
        child: new Column({
          mainAxisSize: 'min',
          crossAxisAlignment: 'stretch',
          children: [
            // Title
            new Center({
              child: label('Tabs Demo', new TextStyle({ bold: true, foreground: Color.cyan })),
            }),
            new SizedBox({ height: 1 }),

            // Tab bar
            this._buildTabBar(),
            new SizedBox({ height: 1 }),

            // Tab content
            this._buildTabContent(),
            new SizedBox({ height: 1 }),

            // Help text
            new Center({
              child: label('Left/Right: switch tabs  1/2/3: jump to tab  q: quit', new TextStyle({ dim: true })),
            }),
          ],
        }),
      }),
    });
  }
}

// Export for testing
export const createTabsDemoApp = (): TabsDemoApp => new TabsDemoApp();
export { TABS };

// Only run the app when executed directly
if (import.meta.main) {
  runApp(new TabsDemoApp(), { output: process.stdout });
}
