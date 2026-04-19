/**
 * TUI CommandPalette Demo — interactive command palette showcase.
 *
 * Demonstrates the CommandPalette overlay with fuzzy search, keyboard
 * navigation, category/shortcut columns, and command execution feedback.
 *
 * Run: bun run examples/tui-command-palette-demo.ts
 * Press Ctrl+C to quit.
 *
 * @module
 */

import { runApp } from "../packages/tui/src/binding/run-app.js";
import { WidgetsBinding } from "../packages/tui/src/binding/widgets-binding.js";
import { StatefulWidget } from "../packages/tui/src/tree/stateful-widget.js";
import { State } from "../packages/tui/src/tree/stateful-widget.js";
import type { BuildContext } from "../packages/tui/src/tree/stateless-widget.js";
import type { Widget as WidgetInterface } from "../packages/tui/src/tree/element.js";
import { Widget } from "../packages/tui/src/tree/widget.js";
import { Container } from "../packages/tui/src/widgets/container.js";
import { Column } from "../packages/tui/src/widgets/column.js";
import { SizedBox } from "../packages/tui/src/widgets/sized-box.js";
import { Text } from "../packages/tui/src/widgets/text.js";
import { Expanded } from "../packages/tui/src/widgets/flexible.js";
// Stack/Positioned not used — we swap between main content and palette
// to avoid widget tree structure changes that can confuse the renderer.
import { BoxDecoration } from "../packages/tui/src/widgets/box-decoration.js";
import { Color } from "../packages/tui/src/screen/color.js";
import { TextStyle } from "../packages/tui/src/screen/text-style.js";
import {
  CommandPalette,
  type CommandPaletteCommand,
} from "../packages/tui/src/overlay/command-palette.js";

// ════════════════════════════════════════════════════
//  Root Widget
// ════════════════════════════════════════════════════

class DemoApp extends StatefulWidget {
  createState(): State {
    return new DemoAppState();
  }
}

class DemoAppState extends State<DemoApp> {
  private showPalette = false;
  private lastAction = "Press Ctrl+O to open Command Palette";
  private actionCount = 0;

  build(_context: BuildContext): WidgetInterface {
    // ── Sample commands ──
    const commands: CommandPaletteCommand[] = [
      {
        id: "file.new",
        label: "New File",
        category: "File",
        shortcut: "Ctrl+N",
        priority: 10,
        action: () =>
          this.setState(() => {
            this.actionCount++;
            this.lastAction = `[${this.actionCount}] Created new file`;
          }),
      },
      {
        id: "file.open",
        label: "Open File",
        category: "File",
        shortcut: "Ctrl+O",
        priority: 9,
        action: () =>
          this.setState(() => {
            this.actionCount++;
            this.lastAction = `[${this.actionCount}] Opened file dialog`;
          }),
      },
      {
        id: "file.save",
        label: "Save File",
        category: "File",
        shortcut: "Ctrl+S",
        priority: 8,
        action: () =>
          this.setState(() => {
            this.actionCount++;
            this.lastAction = `[${this.actionCount}] File saved`;
          }),
      },
      {
        id: "edit.undo",
        label: "Undo",
        category: "Edit",
        shortcut: "Ctrl+Z",
        priority: 7,
        action: () =>
          this.setState(() => {
            this.actionCount++;
            this.lastAction = `[${this.actionCount}] Undo performed`;
          }),
      },
      {
        id: "edit.redo",
        label: "Redo",
        category: "Edit",
        shortcut: "Ctrl+Y",
        priority: 6,
        action: () =>
          this.setState(() => {
            this.actionCount++;
            this.lastAction = `[${this.actionCount}] Redo performed`;
          }),
      },
      {
        id: "edit.find",
        label: "Find & Replace",
        category: "Edit",
        shortcut: "Ctrl+H",
        priority: 5,
        action: () =>
          this.setState(() => {
            this.actionCount++;
            this.lastAction = `[${this.actionCount}] Find & Replace opened`;
          }),
      },
      {
        id: "git.commit",
        label: "Commit",
        category: "Git",
        priority: 4,
        action: () =>
          this.setState(() => {
            this.actionCount++;
            this.lastAction = `[${this.actionCount}] Git commit created`;
          }),
      },
      {
        id: "git.push",
        label: "Push",
        category: "Git",
        priority: 3,
        action: () =>
          this.setState(() => {
            this.actionCount++;
            this.lastAction = `[${this.actionCount}] Git push completed`;
          }),
      },
      {
        id: "git.pull",
        label: "Pull",
        category: "Git",
        priority: 2,
        action: () =>
          this.setState(() => {
            this.actionCount++;
            this.lastAction = `[${this.actionCount}] Git pull completed`;
          }),
      },
      {
        id: "view.terminal",
        label: "Toggle Terminal",
        category: "View",
        shortcut: "Ctrl+`",
        priority: 1,
        action: () =>
          this.setState(() => {
            this.actionCount++;
            this.lastAction = `[${this.actionCount}] Terminal toggled`;
          }),
      },
    ];

    // ── Main content ──
    // Use flat widgets in a single Column — nested Column-inside-Padding
    // can confuse the layout engine in the current TUI framework.

    const mainContent = new Column({
      children: [
        // Title bar
        new Container({
          width: 240,
          height: 1,
          decoration: new BoxDecoration({ color: Color.rgb(30, 60, 100) }),
          child: new Text({
            data: " Flitter CommandPalette Demo",
            style: new TextStyle({ foreground: Color.cyan(), bold: true }),
          }),
        }) as unknown as Widget,

        new SizedBox({ height: 1 }) as unknown as Widget,

        new Text({
          data: "  Interactive Command Palette Showcase",
          style: new TextStyle({ foreground: Color.yellow(), bold: true }),
        }) as unknown as Widget,

        new SizedBox({ height: 1 }) as unknown as Widget,

        new Text({
          data: "  Ctrl+O  Open/close palette  |  Up/Down  Navigate",
          style: new TextStyle({ foreground: Color.green() }),
        }) as unknown as Widget,
        new Text({
          data: "  Enter   Execute command      |  Escape   Close palette",
          style: new TextStyle({ foreground: Color.green() }),
        }) as unknown as Widget,
        new Text({
          data: "  Type    Fuzzy filter         |  q        Quit",
          style: new TextStyle({ foreground: Color.green() }),
        }) as unknown as Widget,

        new SizedBox({ height: 1 }) as unknown as Widget,

        new Text({
          data: "  Last Action:",
          style: new TextStyle({ foreground: Color.white(), bold: true }),
        }) as unknown as Widget,
        new Text({
          data: `  ${this.lastAction}`,
          style: new TextStyle({ foreground: Color.brightCyan() }),
        }) as unknown as Widget,

        new SizedBox({ height: 1 }) as unknown as Widget,

        new Text({
          data: "  Available Commands (10):",
          style: new TextStyle({ foreground: Color.white(), bold: true }),
        }) as unknown as Widget,
        ...commands.map(
          (cmd) =>
            new Text({
              data: `    ${(cmd.category ?? "").padEnd(6)} ${cmd.label.padEnd(18)} ${cmd.shortcut ?? ""}`,
              style: new TextStyle({ foreground: Color.rgb(140, 140, 160) }),
            }) as unknown as Widget,
        ),

        // Fill remaining space
        new Expanded({
          child: new SizedBox() as unknown as Widget,
        }) as unknown as Widget,

        // Footer
        new Container({
          width: 240,
          height: 1,
          decoration: new BoxDecoration({ color: Color.rgb(40, 40, 40) }),
          child: new Text({
            data: " Ctrl+O: Command Palette | q: Quit",
            style: new TextStyle({ dim: true }),
          }),
        }) as unknown as Widget,
      ],
    });

    // ── With or without palette overlay ──

    if (!this.showPalette) {
      return mainContent as unknown as WidgetInterface;
    }

    // Show CommandPalette fullscreen (replaces main content to avoid
    // widget tree shape changes that can trip up the renderer).
    return new Column({
      children: [
        // Title bar (always visible)
        new Container({
          width: 240,
          height: 1,
          decoration: new BoxDecoration({ color: Color.rgb(30, 60, 100) }),
          child: new Text({
            data: " Flitter CommandPalette Demo  [PALETTE OPEN]",
            style: new TextStyle({ foreground: Color.cyan(), bold: true }),
          }),
        }) as unknown as Widget,

        // CommandPalette takes the rest of the space
        new Expanded({
          child: new CommandPalette({
            commands,
            onDismiss: () => {
              this.setState(() => {
                this.showPalette = false;
              });
            },
          }) as unknown as Widget,
        }) as unknown as Widget,
      ],
    }) as unknown as WidgetInterface;
  }

  /** Toggle the palette on/off. Called from key interceptor. */
  togglePalette(): void {
    this.setState(() => {
      this.showPalette = !this.showPalette;
    });
  }
}

// ════════════════════════════════════════════════════
//  Launch
// ════════════════════════════════════════════════════

let demoState: DemoAppState | null = null;

// Stash the state reference so the key interceptor can toggle the palette.
// This is a pragmatic approach for a demo — production apps would use
// InheritedWidget or an action dispatcher.
const originalCreateState = DemoApp.prototype.createState;
DemoApp.prototype.createState = function () {
  const state = originalCreateState.call(this) as DemoAppState;
  demoState = state;
  return state;
};

await runApp(new DemoApp() as unknown as WidgetInterface, {
  onRootElementMounted: () => {
    const binding = WidgetsBinding.instance;

    // Ctrl+O toggles the command palette
    binding.addKeyInterceptor((event) => {
      if (event.key === "o" && event.modifiers.ctrl) {
        demoState?.togglePalette();
        return true;
      }
      // 'q' quits (only when palette is NOT open — otherwise q goes to search)
      if (event.key === "q" && !event.modifiers.ctrl && !event.modifiers.alt) {
        // Only quit if the palette is not showing
        if (demoState && !(demoState as unknown as { showPalette: boolean }).showPalette) {
          binding.stop();
          return true;
        }
      }
      return false;
    });
  },
});
