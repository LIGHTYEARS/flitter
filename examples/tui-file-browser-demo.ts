/**
 * TUI File Browser Demo — split-pane file explorer showcase.
 *
 * Demonstrates SplitPane, Scrollable, ScrollViewport, Focus-based
 * keyboard navigation, and readdirSync for directory listing.
 *
 * - Left pane: file listing of current directory
 * - Right pane: file preview (first 20 lines) or directory contents
 * - j/k to move up/down, Enter to open directory, Backspace to go up
 * - Status bar with current path and file count
 *
 * Run: bun run examples/tui-file-browser-demo.ts
 * Keys: j/k navigate | Enter open | Backspace up | q quit
 *
 * @module
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { runApp } from "../packages/tui/src/binding/run-app.js";
import { WidgetsBinding } from "../packages/tui/src/binding/widgets-binding.js";
import type { KeyEventResult } from "../packages/tui/src/focus/focus-node.js";
import { Color } from "../packages/tui/src/screen/color.js";
import { TextStyle } from "../packages/tui/src/screen/text-style.js";
import { ScrollController } from "../packages/tui/src/scroll/scroll-controller.js";
import { Scrollable, ScrollViewport } from "../packages/tui/src/scroll/scrollable.js";
import type { Widget as WidgetInterface } from "../packages/tui/src/tree/element.js";
import { State, StatefulWidget } from "../packages/tui/src/tree/stateful-widget.js";
import type { BuildContext } from "../packages/tui/src/tree/stateless-widget.js";
import type { Widget } from "../packages/tui/src/tree/widget.js";
import type { KeyEvent } from "../packages/tui/src/vt/types.js";
import { BoxDecoration } from "../packages/tui/src/widgets/box-decoration.js";
import { Column } from "../packages/tui/src/widgets/column.js";
import { Container } from "../packages/tui/src/widgets/container.js";
import { EdgeInsets } from "../packages/tui/src/widgets/edge-insets.js";
import { Expanded } from "../packages/tui/src/widgets/flexible.js";
import { Focus } from "../packages/tui/src/widgets/focus.js";
import { Padding } from "../packages/tui/src/widgets/padding.js";
import { RichText } from "../packages/tui/src/widgets/rich-text.js";
import { Row } from "../packages/tui/src/widgets/row.js";
import { SizedBox } from "../packages/tui/src/widgets/sized-box.js";
import { SplitPane } from "../packages/tui/src/widgets/split-pane.js";
import { Text } from "../packages/tui/src/widgets/text.js";
import { TextSpan } from "../packages/tui/src/widgets/text-span.js";

// ════════════════════════════════════════════════════
//  File entry type
// ════════════════════════════════════════════════════

interface FileEntry {
  name: string;
  isDir: boolean;
}

function listDirectory(dirPath: string): FileEntry[] {
  try {
    const names = readdirSync(dirPath);
    const entries: FileEntry[] = [];
    for (const name of names) {
      if (name.startsWith(".")) continue; // skip hidden files
      try {
        const st = statSync(join(dirPath, name));
        entries.push({ name, isDir: st.isDirectory() });
      } catch {
        entries.push({ name, isDir: false });
      }
    }
    // Directories first, then files, both sorted alphabetically
    entries.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return entries;
  } catch {
    return [];
  }
}

function readPreview(filePath: string, maxLines: number): string[] {
  try {
    const st = statSync(filePath);
    if (st.isDirectory()) {
      const items = listDirectory(filePath);
      return items.map((e) => `${e.isDir ? "[DIR] " : "      "}${e.name}`);
    }
    // Skip binary-looking files
    if (st.size > 1024 * 512) return ["(file too large to preview)"];
    const content = readFileSync(filePath, "utf-8");
    return content.split("\n").slice(0, maxLines);
  } catch {
    return ["(cannot read file)"];
  }
}

// ════════════════════════════════════════════════════
//  Root Widget
// ════════════════════════════════════════════════════

class FileBrowserDemo extends StatefulWidget {
  createState(): State {
    return new FileBrowserDemoState();
  }
}

class FileBrowserDemoState extends State<FileBrowserDemo> {
  private _currentDir = resolve(".");
  private _entries: FileEntry[] = [];
  private _selectedIndex = 0;
  private _listScrollCtrl!: ScrollController;
  private _previewScrollCtrl!: ScrollController;

  override initState(): void {
    super.initState();
    this._listScrollCtrl = new ScrollController();
    this._previewScrollCtrl = new ScrollController();
    this._entries = listDirectory(this._currentDir);
  }

  override dispose(): void {
    this._listScrollCtrl.dispose();
    this._previewScrollCtrl.dispose();
    super.dispose();
  }

  private _refreshEntries(): void {
    this._entries = listDirectory(this._currentDir);
    this._selectedIndex = Math.min(this._selectedIndex, Math.max(0, this._entries.length - 1));
  }

  // ────────────────────────────────────────────────────
  //  Key handler
  // ────────────────────────────────────────────────────

  private _handleKey = (event: KeyEvent): KeyEventResult => {
    if (event.key === "q" && !event.modifiers.ctrl && !event.modifiers.alt) {
      WidgetsBinding.instance.stop();
      return "handled";
    }
    if (event.key === "j" || event.key === "ArrowDown") {
      this.setState(() => {
        this._selectedIndex = Math.min(this._selectedIndex + 1, this._entries.length - 1);
      });
      return "handled";
    }
    if (event.key === "k" || event.key === "ArrowUp") {
      this.setState(() => {
        this._selectedIndex = Math.max(this._selectedIndex - 1, 0);
      });
      return "handled";
    }
    if (event.key === "Enter") {
      const entry = this._entries[this._selectedIndex];
      if (entry?.isDir) {
        this.setState(() => {
          this._currentDir = join(this._currentDir, entry.name);
          this._selectedIndex = 0;
          this._refreshEntries();
        });
      }
      return "handled";
    }
    if (event.key === "Backspace") {
      const parent = dirname(this._currentDir);
      if (parent !== this._currentDir) {
        const oldName = basename(this._currentDir);
        this.setState(() => {
          this._currentDir = parent;
          this._refreshEntries();
          // Try to select the directory we came from
          const idx = this._entries.findIndex((e) => e.name === oldName);
          this._selectedIndex = idx >= 0 ? idx : 0;
        });
      }
      return "handled";
    }
    return "ignored";
  };

  // ────────────────────────────────────────────────────
  //  File list (left pane)
  // ────────────────────────────────────────────────────

  private _buildFileRow(entry: FileEntry, index: number): Widget {
    const selected = index === this._selectedIndex;
    const bgColor = selected ? Color.rgb(40, 60, 100) : Color.rgb(20, 20, 25);
    const icon = entry.isDir ? "/ " : "  ";
    const nameColor = entry.isDir ? Color.cyan() : Color.white();

    return new Container({
      decoration: new BoxDecoration({ color: bgColor }),
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: new RichText({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: selected ? "> " : "  ",
              style: new TextStyle({ foreground: Color.yellow(), bold: true }),
            }),
            new TextSpan({
              text: icon,
              style: new TextStyle({ foreground: Color.rgb(100, 100, 100) }),
            }),
            new TextSpan({
              text: entry.name,
              style: new TextStyle({ foreground: nameColor, bold: entry.isDir }),
            }),
          ],
        }),
      }),
    }) as unknown as Widget;
  }

  private _buildFileList(): Widget {
    const rows: Widget[] = this._entries.map((entry, i) => this._buildFileRow(entry, i));

    return new Scrollable({
      controller: this._listScrollCtrl,
      viewportBuilder: (_ctx: BuildContext, ctrl: ScrollController) =>
        new ScrollViewport({
          controller: ctrl,
          child: new Column({ children: rows }),
        }),
    }) as unknown as Widget;
  }

  // ────────────────────────────────────────────────────
  //  Preview (right pane)
  // ────────────────────────────────────────────────────

  private _buildPreview(): Widget {
    const entry = this._entries[this._selectedIndex];
    if (!entry) {
      return new Container({
        decoration: new BoxDecoration({ color: Color.rgb(20, 20, 25) }),
        child: new Text({
          data: "  (empty directory)",
          style: new TextStyle({ foreground: Color.rgb(100, 100, 100) }),
        }),
      }) as unknown as Widget;
    }

    const fullPath = join(this._currentDir, entry.name);
    const lines = readPreview(fullPath, 20);

    const lineWidgets: Widget[] = lines.map(
      (line, i) =>
        new Padding({
          padding: EdgeInsets.only({ left: 1 }),
          child: new RichText({
            text: new TextSpan({
              children: [
                new TextSpan({
                  text: `${String(i + 1).padStart(3)} `,
                  style: new TextStyle({ foreground: Color.rgb(80, 80, 80) }),
                }),
                new TextSpan({
                  text: line,
                  style: new TextStyle({ foreground: Color.rgb(200, 200, 200) }),
                }),
              ],
            }),
          }),
        }) as unknown as Widget,
    );

    return new Container({
      decoration: new BoxDecoration({ color: Color.rgb(20, 20, 25) }),
      child: new Scrollable({
        controller: this._previewScrollCtrl,
        viewportBuilder: (_ctx: BuildContext, ctrl: ScrollController) =>
          new ScrollViewport({
            controller: ctrl,
            child: new Column({
              children: [
                // Preview header
                new Container({
                  decoration: new BoxDecoration({ color: Color.rgb(30, 30, 40) }),
                  padding: EdgeInsets.symmetric({ horizontal: 1 }),
                  child: new Text({
                    data: entry.isDir ? `[DIR] ${entry.name}` : entry.name,
                    style: new TextStyle({ foreground: Color.brightCyan(), bold: true }),
                  }),
                }) as unknown as Widget,
                ...lineWidgets,
              ],
            }),
          }),
      }),
    }) as unknown as Widget;
  }

  // ────────────────────────────────────────────────────
  //  Status bar
  // ────────────────────────────────────────────────────

  private _buildStatusBar(): Widget {
    const fileCount = this._entries.length;
    const dirCount = this._entries.filter((e) => e.isDir).length;
    return new Container({
      width: 240,
      height: 1,
      decoration: new BoxDecoration({ color: Color.rgb(40, 40, 40) }),
      child: new RichText({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: ` ${this._currentDir}`,
              style: new TextStyle({ foreground: Color.cyan() }),
            }),
            new TextSpan({
              text: `  ${fileCount} items (${dirCount} dirs)`,
              style: new TextStyle({ foreground: Color.rgb(140, 140, 140) }),
            }),
            new TextSpan({
              text: `  [${this._selectedIndex + 1}/${fileCount}]`,
              style: new TextStyle({ foreground: Color.yellow() }),
            }),
          ],
        }),
      }),
    }) as unknown as Widget;
  }

  // ────────────────────────────────────────────────────
  //  Build
  // ────────────────────────────────────────────────────

  build(_context: BuildContext): WidgetInterface {
    return new Focus({
      autofocus: true,
      onKey: this._handleKey,
      child: new Column({
        children: [
          // Title bar
          new Container({
            width: 240,
            height: 1,
            decoration: new BoxDecoration({ color: Color.rgb(30, 60, 100) }),
            child: new Text({
              data: " Flitter File Browser",
              style: new TextStyle({ foreground: Color.cyan(), bold: true }),
            }),
          }) as unknown as Widget,

          new SizedBox({ height: 1 }) as unknown as Widget,

          // Help line
          new Text({
            data: "  j/k  Navigate  |  Enter  Open dir  |  Backspace  Go up  |  q  Quit",
            style: new TextStyle({ foreground: Color.green() }),
          }) as unknown as Widget,

          new SizedBox({ height: 1 }) as unknown as Widget,

          // Main content — SplitPane with file list + preview
          new Expanded({
            child: new SplitPane({
              direction: "horizontal",
              initialRatio: 0.35,
              children: [
                this._buildFileList() as unknown as WidgetInterface,
                this._buildPreview() as unknown as WidgetInterface,
              ],
            }),
          }) as unknown as Widget,

          // Status bar
          this._buildStatusBar(),
        ],
      }),
    }) as unknown as WidgetInterface;
  }
}

// ════════════════════════════════════════════════════
//  Launch
// ════════════════════════════════════════════════════

await runApp(new FileBrowserDemo() as unknown as WidgetInterface);
