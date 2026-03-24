// json-tree.ts — Collapsible/expandable JSON tree viewer with keyboard navigation.
//
// Run with: bun run examples/json-tree.ts
//
// Controls: j/k or arrows to navigate, Enter/Space to expand/collapse, q to quit
//
// Demonstrates: StatefulWidget, FocusNode, tree model, color-coded JSON values,
// tree connector lines, status bar with node path, collapsed item counts.

import { StatefulWidget, State, Widget, type BuildContext } from '../src/framework/widget';
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

type JsonValueType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

interface TreeNode {
  key: string;
  value: unknown;
  type: JsonValueType;
  expanded: boolean;
  children: TreeNode[];
  depth: number;
  path: string[];
}

// ---------------------------------------------------------------------------
// Sample JSON
// ---------------------------------------------------------------------------

const SAMPLE_JSON = {
  name: "flutter-tui",
  version: "1.0.0",
  active: true,
  downloads: 48210,
  license: null,
  repository: { type: "git", url: "https://github.com/example/flutter-tui", private: false },
  users: [
    { id: 1, name: "Alice Chen", roles: ["admin", "editor"],
      settings: { theme: "dark", notifications: true, fontSize: 14 } },
    { id: 2, name: "Bob Smith", roles: ["viewer"],
      settings: { theme: "light", notifications: false, fontSize: 16 } },
  ],
  tags: ["typescript", "terminal", "ui", "framework"],
  config: {
    debug: false, logLevel: "info", maxRetries: 3, timeout: null,
    features: { darkMode: true, animations: false, experimentalApi: null },
  },
};

// ---------------------------------------------------------------------------
// Tree helpers
// ---------------------------------------------------------------------------

function getValueType(v: unknown): JsonValueType {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  const t = typeof v;
  if (t === 'string') return 'string';
  if (t === 'number') return 'number';
  if (t === 'boolean') return 'boolean';
  return t === 'object' ? 'object' : 'string';
}

function buildTree(key: string, value: unknown, depth: number, parentPath: string[]): TreeNode {
  const type = getValueType(value);
  const path = [...parentPath, key];
  const children: TreeNode[] = [];
  if (type === 'object' && value !== null) {
    for (const [k, v] of Object.entries(value as Record<string, unknown>))
      children.push(buildTree(k, v, depth + 1, path));
  } else if (type === 'array') {
    (value as unknown[]).forEach((v, i) => children.push(buildTree(String(i), v, depth + 1, path)));
  }
  return { key, value, type, expanded: depth < 2, children, depth, path };
}

interface FlatRow { node: TreeNode; isLast: boolean; prefixParts: boolean[]; }

function flattenTree(node: TreeNode, isLast: boolean, parts: boolean[], out: FlatRow[]): void {
  out.push({ node, isLast, prefixParts: [...parts] });
  if (node.expanded && node.children.length > 0) {
    const next = [...parts, !isLast];
    node.children.forEach((ch, i) => flattenTree(ch, i === node.children.length - 1, next, out));
  }
}

function hasChildren(n: TreeNode): boolean { return n.type === 'object' || n.type === 'array'; }

function formatValue(n: TreeNode): string {
  switch (n.type) {
    case 'string': return `"${n.value as string}"`;
    case 'number': case 'boolean': return String(n.value);
    case 'null': return 'null';
    case 'object': {
      const c = n.children.length;
      return n.expanded ? '' : `{...} (${c} ${c === 1 ? 'key' : 'keys'})`;
    }
    case 'array': {
      const c = n.children.length;
      return n.expanded ? '' : `[...] (${c} ${c === 1 ? 'item' : 'items'})`;
    }
    default: return '';
  }
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const keyStyle     = new TextStyle({ foreground: Color.cyan, bold: true });
const stringStyle  = new TextStyle({ foreground: Color.green });
const numberStyle  = new TextStyle({ foreground: Color.yellow });
const boolStyle    = new TextStyle({ foreground: Color.magenta });
const nullSty      = new TextStyle({ foreground: Color.red });
const treeSty      = new TextStyle({ foreground: Color.brightBlack });
const dimSty       = new TextStyle({ dim: true });
const selStyle     = new TextStyle({ bold: true, foreground: Color.defaultColor });
const bracketSty   = new TextStyle({ foreground: Color.brightBlack });
const pathSty      = new TextStyle({ foreground: Color.cyan, dim: true });
const titleSty     = new TextStyle({ bold: true, foreground: Color.defaultColor });
const normalSty    = new TextStyle();

function txt(s: string, st?: TextStyle): Text {
  return new Text({ text: new TextSpan({ text: s, style: st ?? normalSty }) });
}

function valueStyle(t: JsonValueType): TextStyle {
  if (t === 'string') return stringStyle;
  if (t === 'number') return numberStyle;
  if (t === 'boolean') return boolStyle;
  if (t === 'null') return nullSty;
  return normalSty;
}

// ---------------------------------------------------------------------------
// JsonTree Widget
// ---------------------------------------------------------------------------

export class JsonTree extends StatefulWidget {
  createState(): State<JsonTree> { return new JsonTreeState(); }
}

export class JsonTreeState extends State<JsonTree> {
  private _root: TreeNode = buildTree('root', SAMPLE_JSON, 0, []);
  private _sel: number = 0;
  private _focusNode: FocusNode | null = null;

  initState(): void {
    super.initState();
    this._focusNode = new FocusNode({
      debugLabel: 'JsonTreeFocus',
      onKey: (event: KeyEvent): KeyEventResult => this._handleKey(event),
    });
    FocusManager.instance.registerNode(this._focusNode, null);
    this._focusNode.requestFocus();
  }

  dispose(): void {
    if (this._focusNode) { this._focusNode.dispose(); this._focusNode = null; }
    super.dispose();
  }

  private _rows(): FlatRow[] {
    const r: FlatRow[] = [];
    flattenTree(this._root, true, [], r);
    return r;
  }

  private _handleKey(event: KeyEvent): KeyEventResult {
    const rows = this._rows();
    if (event.key === 'ArrowUp' || event.key === 'k') {
      this.setState(() => { if (this._sel > 0) this._sel--; });
      return 'handled';
    }
    if (event.key === 'ArrowDown' || event.key === 'j') {
      this.setState(() => { if (this._sel < rows.length - 1) this._sel++; });
      return 'handled';
    }
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Space') {
      const row = rows[this._sel];
      if (row && hasChildren(row.node)) {
        this.setState(() => { row.node.expanded = !row.node.expanded; });
      }
      return 'handled';
    }
    if (event.key === 'q') { process.exit(0); }
    return 'ignored';
  }

  private _prefix(row: FlatRow): TextSpan[] {
    const spans: TextSpan[] = [];
    for (let i = 1; i < row.node.depth; i++) {
      spans.push(new TextSpan({
        text: (row.prefixParts[i] ?? false) ? '\u2502   ' : '    ', style: treeSty,
      }));
    }
    if (row.node.depth > 0) {
      spans.push(new TextSpan({
        text: row.isLast ? '\u2514\u2500\u2500 ' : '\u251C\u2500\u2500 ', style: treeSty,
      }));
    }
    return spans;
  }

  private _rowWidget(row: FlatRow, isSel: boolean): Widget {
    const n = row.node;
    const arrow = hasChildren(n) ? (n.expanded ? '\u25BC ' : '\u25B6 ') : '  ';
    const arrowSty = isSel
      ? new TextStyle({ foreground: Color.defaultColor, bold: true })
      : new TextStyle({ foreground: Color.brightBlack });
    const kSty = isSel ? new TextStyle({ foreground: Color.brightCyan, bold: true }) : keyStyle;
    const val = formatValue(n);
    const vSty = isSel ? selStyle : (hasChildren(n) ? bracketSty : valueStyle(n.type));

    const children: TextSpan[] = [
      ...this._prefix(row),
      new TextSpan({ text: arrow, style: arrowSty }),
      new TextSpan({ text: n.key, style: kSty }),
    ];
    if (val) {
      children.push(new TextSpan({ text: ': ', style: isSel ? selStyle : dimSty }));
      children.push(new TextSpan({ text: val, style: vSty }));
    }

    const dec = isSel ? new BoxDecoration({ color: Color.brightBlack }) : new BoxDecoration();
    return new Container({
      decoration: dec,
      child: new Text({ text: new TextSpan({ children }) }),
    });
  }

  build(_context: BuildContext): Widget {
    const rows = this._rows();
    if (this._sel >= rows.length) this._sel = Math.max(0, rows.length - 1);

    const rowWidgets: Widget[] = rows.map((row, i) => this._rowWidget(row, i === this._sel));

    const selectedRow = rows[this._sel];
    const pathStr = selectedRow ? selectedRow.node.path.join(' > ') : 'root';

    const countNodes = (n: TreeNode): number => {
      let c = 1;
      for (const ch of n.children) c += countNodes(ch);
      return c;
    };

    return new Column({
      children: [
        // Header
        new Container({
          padding: EdgeInsets.symmetric({ horizontal: 1 }),
          child: new Row({
            children: [
              txt(' JSON Tree Viewer ', titleSty),
              new Expanded({ child: new SizedBox() }),
              txt(`${countNodes(this._root)} nodes `, dimSty),
            ],
          }),
        }),
        new Divider({ color: Color.brightBlack }),
        // Tree content
        new Expanded({
          child: new Container({
            padding: EdgeInsets.symmetric({ horizontal: 1 }),
            child: new Column({
              mainAxisSize: 'min',
              crossAxisAlignment: 'start',
              children: rowWidgets,
            }),
          }),
        }),
        // Status bar
        new Divider({ color: Color.brightBlack }),
        new Container({
          padding: EdgeInsets.symmetric({ horizontal: 1 }),
          child: new Row({
            children: [
              txt(' Path: ', dimSty),
              new Expanded({ child: txt(pathStr, pathSty) }),
              txt(`${this._sel + 1}/${rows.length} `, dimSty),
            ],
          }),
        }),
        // Help bar
        new Divider({ color: Color.brightBlack }),
        new Container({
          padding: EdgeInsets.symmetric({ horizontal: 1 }),
          child: txt(
            ' j/k:\u2191\u2193  Enter/Space:expand/collapse  q:quit ',
            new TextStyle({ dim: true }),
          ),
        }),
      ],
    });
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { SAMPLE_JSON, buildTree, flattenTree, type TreeNode, type FlatRow };

if (import.meta.main) {
  runApp(new JsonTree(), { output: process.stdout });
}
