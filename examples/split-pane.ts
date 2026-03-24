// split-pane.ts — Dual-pane file manager with directory tree and file preview.
//
// Run with: bun run examples/split-pane.ts
//
// Controls:
// - j/k or ArrowDown/ArrowUp: Navigate items
// - Tab: Switch active pane focus (left <-> right)
// - Enter: Open folder (left pane)
// - Backspace: Go up one directory (left pane)
// - q: Quit

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
import { Expanded } from '../src/widgets/flexible';
import { Divider } from '../src/widgets/divider';
import { TextSpan } from '../src/core/text-span';
import { TextStyle } from '../src/core/text-style';
import { Color } from '../src/core/color';
import { EdgeInsets } from '../src/layout/edge-insets';
import { BoxDecoration, Border, BorderSide } from '../src/layout/render-decorated';
import { FocusNode, FocusManager } from '../src/input/focus';
import type { KeyEvent, KeyEventResult } from '../src/input/events';

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

interface FsEntry {
  name: string;
  type: 'dir' | 'file';
  children?: FsEntry[];
  content?: string;
}

const FILESYSTEM: FsEntry = {
  name: 'home', type: 'dir', children: [
    { name: 'projects', type: 'dir', children: [
      { name: 'flutter-tui', type: 'dir', children: [
        { name: 'package.json', type: 'file', content: '{\n  "name": "flutter-tui",\n  "version": "1.0.0",\n  "scripts": {\n    "build": "bun build",\n    "test": "bun test"\n  }\n}' },
        { name: 'README.md', type: 'file', content: '# Flutter TUI\n\nA terminal UI framework inspired\nby Flutter widget architecture.\n\n## Features\n- Declarative widget tree\n- Constraint-based layout\n- ANSI rendering engine' },
        { name: 'src', type: 'dir', children: [
          { name: 'index.ts', type: 'file', content: 'export * from "./framework";\nexport * from "./widgets";\nexport * from "./core";' },
          { name: 'widgets.ts', type: 'file', content: '// Built-in widget catalog\n// Text, Column, Row,\n// Container, SizedBox,\n// Padding, Expanded.' },
        ]},
      ]},
      { name: 'website', type: 'dir', children: [
        { name: 'index.html', type: 'file', content: '<!DOCTYPE html>\n<html>\n<head><title>Site</title></head>\n<body><h1>Welcome</h1></body>\n</html>' },
        { name: 'style.css', type: 'file', content: 'body {\n  font-family: sans-serif;\n  margin: 0;\n  background: #1a1a2e;\n  color: #eee;\n}' },
      ]},
    ]},
    { name: 'documents', type: 'dir', children: [
      { name: 'notes.txt', type: 'file', content: 'Meeting Notes - March 2026\n\n- Reviewed Q1 progress\n- Discussed roadmap\n- Action items assigned' },
      { name: 'todo.md', type: 'file', content: '# TODO\n\n- [x] Setup project\n- [x] Write core modules\n- [ ] Add documentation\n- [ ] Release v1.0' },
    ]},
    { name: '.bashrc', type: 'file', content: '# Bash config\nexport PATH="$HOME/bin:$PATH"\nexport EDITOR=vim\nalias ll="ls -la"' },
    { name: '.gitconfig', type: 'file', content: '[user]\n  name = Developer\n  email = dev@example.com\n[alias]\n  co = checkout\n  br = branch' },
  ],
};

// ---------------------------------------------------------------------------
// Styles & helpers
// ---------------------------------------------------------------------------

const cyanBdr = Border.all(new BorderSide({ color: Color.cyan, style: 'rounded' }));
const dimBdr = Border.all(new BorderSide({ color: Color.brightBlack, style: 'rounded' }));
const dim = new TextStyle({ dim: true });
const boldW = new TextStyle({ bold: true, foreground: Color.defaultColor });
const padH = EdgeInsets.symmetric({ horizontal: 1 });

function txt(text: string, style?: TextStyle): Text {
  return new Text({ text: new TextSpan({ text, style: style ?? new TextStyle() }) });
}

function padded(child: Widget): Widget {
  return new Container({ padding: padH, child });
}

// ---------------------------------------------------------------------------
// SplitPane Widget
// ---------------------------------------------------------------------------

type ActivePane = 'left' | 'right';

export class SplitPane extends StatefulWidget {
  createState(): SplitPaneState { return new SplitPaneState(); }
}

export class SplitPaneState extends State<SplitPane> {
  private _active: ActivePane = 'left';
  private _leftIdx = 0;
  private _scrollOff = 0;
  private _dir: FsEntry = FILESYSTEM;
  private _stack: FsEntry[] = [];
  private _focus: FocusNode | null = null;

  initState(): void {
    super.initState();
    this._focus = new FocusNode({
      debugLabel: 'SplitPaneFocus',
      onKey: (event: KeyEvent): KeyEventResult => this._onKey(event),
    });
    FocusManager.instance.registerNode(this._focus, null);
    this._focus.requestFocus();
  }

  dispose(): void {
    if (this._focus) { this._focus.dispose(); this._focus = null; }
    super.dispose();
  }

  get activePane(): ActivePane { return this._active; }
  get leftIndex(): number { return this._leftIdx; }
  get currentDir(): FsEntry { return this._dir; }

  private get _entries(): FsEntry[] { return this._dir.children ?? []; }
  private get _selected(): FsEntry | null { return this._entries[this._leftIdx] ?? null; }
  private get _path(): string {
    return '/' + [...this._stack.map((d) => d.name), this._dir.name].join('/');
  }

  // --- Key handling ---

  private _onKey(event: KeyEvent): KeyEventResult {
    const k = event.key;
    if (k === 'q') process.exit(0);
    if (k === 'Tab') {
      this.setState(() => { this._active = this._active === 'left' ? 'right' : 'left'; });
      return 'handled';
    }
    return this._active === 'left' ? this._leftKey(k) : this._rightKey(k);
  }

  private _leftKey(k: string): KeyEventResult {
    if (k === 'j' || k === 'ArrowDown') {
      this.setState(() => {
        if (this._leftIdx < this._entries.length - 1) this._leftIdx++;
        this._scrollOff = 0;
      });
      return 'handled';
    }
    if (k === 'k' || k === 'ArrowUp') {
      this.setState(() => { if (this._leftIdx > 0) this._leftIdx--; this._scrollOff = 0; });
      return 'handled';
    }
    if (k === 'Enter') {
      const s = this._selected;
      if (s?.type === 'dir' && s.children) {
        this.setState(() => {
          this._stack.push(this._dir); this._dir = s;
          this._leftIdx = 0; this._scrollOff = 0;
        });
        return 'handled';
      }
      return 'ignored';
    }
    if (k === 'Backspace' && this._stack.length > 0) {
      this.setState(() => {
        this._dir = this._stack.pop()!; this._leftIdx = 0; this._scrollOff = 0;
      });
      return 'handled';
    }
    return 'ignored';
  }

  private _rightKey(k: string): KeyEventResult {
    if (k === 'j' || k === 'ArrowDown') {
      this.setState(() => { this._scrollOff++; });
      return 'handled';
    }
    if (k === 'k' || k === 'ArrowUp') {
      this.setState(() => { if (this._scrollOff > 0) this._scrollOff--; });
      return 'handled';
    }
    return 'ignored';
  }

  // --- Build ---

  build(_context: BuildContext): Widget {
    const lA = this._active === 'left';
    const rA = !lA;

    return new Column({
      mainAxisAlignment: 'start',
      crossAxisAlignment: 'stretch',
      children: [
        this._breadcrumb(),
        new Expanded({
          child: new Row({
            crossAxisAlignment: 'stretch',
            children: [
              new Expanded({ flex: 2, child: this._leftPane(lA) }),
              new SizedBox({ width: 1 }),
              new Expanded({ flex: 3, child: this._rightPane(rA) }),
            ],
          }),
        }),
        this._statusBar(),
      ],
    });
  }

  private _paneTitle(label: string, active: boolean): Widget {
    return new Container({
      decoration: new BoxDecoration({ color: active ? Color.cyan : Color.brightBlack }),
      padding: padH,
      child: txt(` ${label} `, active ? boldW : dim),
    });
  }

  private _leftPane(active: boolean): Widget {
    return new Container({
      decoration: new BoxDecoration({ border: active ? cyanBdr : dimBdr }),
      child: new Column({
        mainAxisAlignment: 'start',
        crossAxisAlignment: 'stretch',
        children: [this._paneTitle('Directory', active), ...this._dirEntries()],
      }),
    });
  }

  private _rightPane(active: boolean): Widget {
    return new Container({
      decoration: new BoxDecoration({ border: active ? cyanBdr : dimBdr }),
      child: new Column({
        mainAxisAlignment: 'start',
        crossAxisAlignment: 'stretch',
        children: [this._paneTitle('Preview', active), ...this._preview()],
      }),
    });
  }

  private _breadcrumb(): Widget {
    const segs = [...this._stack.map((d) => d.name), this._dir.name];
    const spans: TextSpan[] = [new TextSpan({ text: ' Path: ', style: dim })];
    segs.forEach((s, i) => {
      if (i > 0) spans.push(new TextSpan({ text: ' / ', style: dim }));
      const last = i === segs.length - 1;
      spans.push(new TextSpan({
        text: s,
        style: last ? new TextStyle({ foreground: Color.yellow }) : new TextStyle({ foreground: Color.brightBlack }),
      }));
    });
    return new Container({
      decoration: new BoxDecoration({
        color: Color.blue,
        border: Border.all(new BorderSide({ color: Color.brightBlue, style: 'solid' })),
      }),
      padding: padH,
      child: new Text({ text: new TextSpan({ children: spans }) }),
    });
  }

  private _dirEntries(): Widget[] {
    const entries = this._entries;
    if (entries.length === 0) return [padded(txt('  (empty directory)', dim))];

    return entries.map((e, i) => {
      const sel = i === this._leftIdx;
      const icon = e.type === 'dir' ? '\u{1F4C1} ' : '\u{1F4C4} ';
      const nameColor = e.type === 'dir'
        ? new TextStyle({ foreground: Color.brightBlue, bold: true })
        : new TextStyle({ foreground: Color.defaultColor });
      const selStyle = new TextStyle({ bold: true, foreground: Color.defaultColor });
      const dec = sel ? new BoxDecoration({ color: Color.blue }) : new BoxDecoration();
      const ind = sel ? '>' : ' ';

      return new Container({
        decoration: dec, padding: padH,
        child: new Text({
          text: new TextSpan({ children: [
            new TextSpan({ text: ` ${ind} `, style: new TextStyle({ bold: true, foreground: sel ? Color.cyan : Color.brightBlack }) }),
            new TextSpan({ text: icon, style: new TextStyle() }),
            new TextSpan({ text: e.name + (e.type === 'dir' ? '/' : ''), style: sel ? selStyle : nameColor }),
          ]}),
        }),
      });
    });
  }

  private _preview(): Widget[] {
    const s = this._selected;
    if (!s) return [padded(txt('No file selected', dim))];

    if (s.type === 'dir') {
      const ch = s.children ?? [];
      const d = ch.filter((c) => c.type === 'dir').length;
      const f = ch.filter((c) => c.type === 'file').length;
      const items: Widget[] = [
        padded(new Text({ text: new TextSpan({ children: [
          new TextSpan({ text: '\u{1F4C1} ', style: new TextStyle() }),
          new TextSpan({ text: s.name + '/', style: new TextStyle({ bold: true, foreground: Color.magenta }) }),
        ]})})),
        new Divider({ color: Color.brightBlack }),
        padded(txt(`  Type:    Directory`, dim)),
        padded(txt(`  Items:   ${ch.length}  (${d} dirs, ${f} files)`, dim)),
        new Divider({ color: Color.brightBlack }),
        padded(txt('  Press Enter to open', dim)),
      ];
      for (const c of ch) {
        const ci = c.type === 'dir' ? '\u{1F4C1}' : '\u{1F4C4}';
        items.push(padded(txt(`    ${ci} ${c.name}`, dim)));
      }
      return items;
    }

    // File preview with line numbers
    const lines = (s.content ?? '').split('\n');
    const visible = lines.slice(this._scrollOff);
    const items: Widget[] = [
      padded(new Text({ text: new TextSpan({ children: [
        new TextSpan({ text: '\u{1F4C4} ', style: new TextStyle() }),
        new TextSpan({ text: s.name, style: new TextStyle({ bold: true, foreground: Color.magenta }) }),
        new TextSpan({ text: `  (${lines.length} lines)`, style: dim }),
      ]})})),
      new Divider({ color: Color.brightBlack }),
    ];
    for (let i = 0; i < visible.length; i++) {
      const num = String(this._scrollOff + i + 1).padStart(3, ' ');
      items.push(padded(new Text({ text: new TextSpan({ children: [
        new TextSpan({ text: `${num} | `, style: new TextStyle({ foreground: Color.brightBlack }) }),
        new TextSpan({ text: visible[i] ?? '', style: new TextStyle({ foreground: Color.defaultColor }) }),
      ]})})));
    }
    if (this._scrollOff > 0) {
      items.push(padded(txt(`  (scrolled ${this._scrollOff} lines)`, dim)));
    }
    return items;
  }

  private _statusBar(): Widget {
    const e = this._entries;
    const d = e.filter((x) => x.type === 'dir').length;
    const f = e.filter((x) => x.type === 'file').length;
    const s = this._selected;
    const info = s ? `${s.type === 'dir' ? '\u{1F4C1}' : '\u{1F4C4}'} ${s.name}` : 'none';

    return new Container({
      decoration: new BoxDecoration({
        border: Border.all(new BorderSide({ color: Color.brightBlack, style: 'solid' })),
      }),
      padding: padH,
      child: new Text({ text: new TextSpan({ children: [
        new TextSpan({ text: ` ${this._path} `, style: new TextStyle({ foreground: Color.yellow }) }),
        new TextSpan({ text: '| ', style: dim }),
        new TextSpan({ text: `${d} dirs, ${f} files `, style: new TextStyle({ foreground: Color.cyan }) }),
        new TextSpan({ text: '| ', style: dim }),
        new TextSpan({ text: `Selected: ${info} `, style: new TextStyle({ foreground: Color.green }) }),
        new TextSpan({ text: '| ', style: dim }),
        new TextSpan({ text: 'Tab:switch  j/k:nav  Enter:open  Bksp:back  q:quit', style: dim }),
      ]})}),
    });
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { txt, FILESYSTEM };
export type { FsEntry, ActivePane };

if (import.meta.main) {
  runApp(new SplitPane(), { output: process.stdout });
}
