// spreadsheet.ts — Editable spreadsheet grid with cell navigation and formulas.
//
// Run with: bun run examples/spreadsheet.ts
//
// Controls:
// - Arrow keys: Navigate between cells
// - Enter: Edit selected cell (press again to confirm)
// - Escape: Cancel editing
// - Tab / Shift+Tab: Move to next / previous cell
// - q: Quit (when not editing)
//
// Formulas: =SUM(A1:A5), =AVG(A1:A5), =A1 (cell reference)
//
// This example demonstrates:
// - StatefulWidget with grid-based cell model (Map<string, CellData>)
// - Dual-mode input: navigation vs cell editing with text cursor
// - Formula parsing, evaluation, and circular reference detection
// - Row/Column layout with fixed-width cell containers and BoxDecoration

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

// --- Constants & types ---
const COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F'];
const NUM_ROWS = 8;
const CELL_WIDTH = 10;
const HEADER_WIDTH = 4;

interface CellData { raw: string; computed: string | number; }

// --- Styles ---
const titleStyle = new TextStyle({ bold: true, foreground: Color.cyan });
const headerStyle = new TextStyle({ bold: true, foreground: Color.yellow });
const rowHeaderStyle = new TextStyle({ bold: true, foreground: Color.yellow, dim: true });
const normalStyle = new TextStyle({ foreground: Color.defaultColor });
const dimStyle = new TextStyle({ dim: true });
const selectedTextStyle = new TextStyle({ bold: true, foreground: Color.black });
const editTextStyle = new TextStyle({ bold: true, foreground: Color.defaultColor });
const formulaStyle = new TextStyle({ foreground: Color.green });
const numberStyle = new TextStyle({ foreground: Color.cyan });
const errorStyle = new TextStyle({ foreground: Color.red, bold: true });
const statusLabelStyle = new TextStyle({ bold: true, foreground: Color.defaultColor });
const statusValueStyle = new TextStyle({ foreground: Color.cyan });

function txt(content: string, style?: TextStyle): Text {
  return new Text({ text: new TextSpan({ text: content, style: style ?? normalStyle }) });
}

// --- Cell reference helpers ---
function cellKey(col: number, row: number): string {
  return `${COLUMNS[col]}${row + 1}`;
}

function parseRef(ref: string): { col: number; row: number } | null {
  const match = ref.match(/^([A-F])(\d+)$/i);
  if (!match) return null;
  const col = match[1]!.toUpperCase().charCodeAt(0) - 65;
  const row = parseInt(match[2]!, 10) - 1;
  if (col < 0 || col >= COLUMNS.length || row < 0 || row >= NUM_ROWS) return null;
  return { col, row };
}

function parseRange(range: string): string[] {
  const parts = range.split(':');
  if (parts.length !== 2) return [];
  const start = parseRef(parts[0]!.trim());
  const end = parseRef(parts[1]!.trim());
  if (!start || !end) return [];
  const keys: string[] = [];
  for (let r = Math.min(start.row, end.row); r <= Math.max(start.row, end.row); r++) {
    for (let c = Math.min(start.col, end.col); c <= Math.max(start.col, end.col); c++) {
      keys.push(cellKey(c, r));
    }
  }
  return keys;
}

// --- Formula evaluation ---
function evaluateCell(raw: string, cells: Map<string, CellData>, visited: Set<string>, key: string): string | number {
  if (!raw.startsWith('=')) {
    const num = Number(raw);
    return raw.length === 0 ? '' : isNaN(num) ? raw : num;
  }
  if (visited.has(key)) return '#CIRC';
  visited.add(key);
  const formula = raw.substring(1).trim().toUpperCase();
  // Match =SUM(range) or =AVG(range)
  const funcMatch = formula.match(/^(SUM|AVG)\(([^)]+)\)$/);
  if (funcMatch) {
    const func = funcMatch[1]!;
    const keys = parseRange(funcMatch[2]!);
    if (keys.length === 0) return '#REF';
    const values: number[] = [];
    for (const k of keys) {
      const cell = cells.get(k);
      if (!cell || cell.raw.length === 0) continue;
      const val = evaluateCell(cell.raw, cells, new Set(visited), k);
      if (typeof val === 'number') values.push(val);
      else if (typeof val === 'string' && val.length > 0 && !val.startsWith('#')) {
        const n = Number(val);
        if (!isNaN(n)) values.push(n);
      }
    }
    if (func === 'SUM') return values.reduce((a, b) => a + b, 0);
    if (func === 'AVG') return values.length === 0 ? 0 : Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
  }
  // Simple cell reference like =A1
  const ref = parseRef(formula);
  if (ref) {
    const refKey = cellKey(ref.col, ref.row);
    const refCell = cells.get(refKey);
    if (!refCell || refCell.raw.length === 0) return 0;
    return evaluateCell(refCell.raw, cells, new Set(visited), refKey);
  }
  return '#ERR';
}

function recomputeAll(cells: Map<string, CellData>): void {
  for (const [key, cell] of cells) {
    cell.computed = evaluateCell(cell.raw, cells, new Set(), key);
  }
}

// --- SpreadsheetApp widget ---
export class SpreadsheetApp extends StatefulWidget {
  createState(): SpreadsheetState { return new SpreadsheetState(); }
}

export class SpreadsheetState extends State<SpreadsheetApp> {
  private _cells: Map<string, CellData> = new Map();
  private _cursorCol = 0;
  private _cursorRow = 0;
  private _editing = false;
  private _editBuffer = '';
  private _editCursorPos = 0;
  private _focusNode: FocusNode | null = null;

  initState(): void {
    super.initState();
    for (let r = 0; r < NUM_ROWS; r++)
      for (let c = 0; c < COLUMNS.length; c++)
        this._cells.set(cellKey(c, r), { raw: '', computed: '' });
    // Seed sample data
    this._setCell('A', 1, '100');  this._setCell('A', 2, '200');
    this._setCell('A', 3, '350');  this._setCell('A', 4, '150');
    this._setCell('A', 5, '=SUM(A1:A4)');
    this._setCell('B', 1, 'Sales'); this._setCell('B', 2, 'Costs');
    this._setCell('B', 3, 'Profit');
    this._setCell('C', 1, '42');   this._setCell('C', 2, '58');
    this._setCell('C', 3, '=AVG(C1:C2)');
    this._setCell('D', 1, 'Hello');
    recomputeAll(this._cells);

    this._focusNode = new FocusNode({
      debugLabel: 'SpreadsheetFocus',
      onKey: (event: KeyEvent): KeyEventResult => this._handleKey(event),
    });
    FocusManager.instance.registerNode(this._focusNode, null);
    this._focusNode.requestFocus();
  }

  dispose(): void {
    if (this._focusNode) { this._focusNode.dispose(); this._focusNode = null; }
    super.dispose();
  }

  private _setCell(col: string, row: number, val: string): void {
    const cell = this._cells.get(`${col}${row}`);
    if (cell) cell.raw = val;
  }

  // Public accessors for testing
  get cells(): Map<string, CellData> { return this._cells; }
  get cursorCol(): number { return this._cursorCol; }
  get cursorRow(): number { return this._cursorRow; }
  get editing(): boolean { return this._editing; }
  get editBuffer(): string { return this._editBuffer; }
  get currentCellKey(): string { return cellKey(this._cursorCol, this._cursorRow); }
  get currentCell(): CellData { return this._cells.get(this.currentCellKey) ?? { raw: '', computed: '' }; }

  private _moveToNextCell(): void {
    this._cursorCol++;
    if (this._cursorCol >= COLUMNS.length) {
      this._cursorCol = 0;
      this._cursorRow = Math.min(this._cursorRow + 1, NUM_ROWS - 1);
    }
  }

  private _moveToPrevCell(): void {
    this._cursorCol--;
    if (this._cursorCol < 0) {
      this._cursorCol = COLUMNS.length - 1;
      this._cursorRow = Math.max(this._cursorRow - 1, 0);
    }
  }

  // --- Key handling ---
  private _handleKey(event: KeyEvent): KeyEventResult {
    return this._editing ? this._handleEditKey(event) : this._handleNavKey(event);
  }

  private _handleNavKey(event: KeyEvent): KeyEventResult {
    if (event.key === 'q' || (event.key === 'c' && event.ctrlKey)) process.exit(0);
    switch (event.key) {
      case 'ArrowUp':
        this.setState(() => { this._cursorRow = Math.max(0, this._cursorRow - 1); });
        return 'handled';
      case 'ArrowDown':
        this.setState(() => { this._cursorRow = Math.min(NUM_ROWS - 1, this._cursorRow + 1); });
        return 'handled';
      case 'ArrowLeft':
        this.setState(() => { this._cursorCol = Math.max(0, this._cursorCol - 1); });
        return 'handled';
      case 'ArrowRight':
        this.setState(() => { this._cursorCol = Math.min(COLUMNS.length - 1, this._cursorCol + 1); });
        return 'handled';
      case 'Tab':
        this.setState(() => { event.shiftKey ? this._moveToPrevCell() : this._moveToNextCell(); });
        return 'handled';
      case 'Enter':
        this.setState(() => {
          this._editing = true;
          this._editBuffer = this.currentCell.raw;
          this._editCursorPos = this._editBuffer.length;
        });
        return 'handled';
      default: return 'ignored';
    }
  }

  private _handleEditKey(event: KeyEvent): KeyEventResult {
    switch (event.key) {
      case 'Enter':
        this.setState(() => {
          const cell = this._cells.get(this.currentCellKey);
          if (cell) cell.raw = this._editBuffer;
          recomputeAll(this._cells);
          this._editing = false; this._editBuffer = ''; this._editCursorPos = 0;
        });
        return 'handled';
      case 'Escape':
        this.setState(() => { this._editing = false; this._editBuffer = ''; this._editCursorPos = 0; });
        return 'handled';
      case 'Backspace':
        this.setState(() => {
          if (this._editCursorPos > 0) {
            this._editBuffer = this._editBuffer.slice(0, this._editCursorPos - 1) + this._editBuffer.slice(this._editCursorPos);
            this._editCursorPos--;
          }
        });
        return 'handled';
      case 'Delete':
        this.setState(() => {
          if (this._editCursorPos < this._editBuffer.length)
            this._editBuffer = this._editBuffer.slice(0, this._editCursorPos) + this._editBuffer.slice(this._editCursorPos + 1);
        });
        return 'handled';
      case 'ArrowLeft':
        this.setState(() => { this._editCursorPos = Math.max(0, this._editCursorPos - 1); });
        return 'handled';
      case 'ArrowRight':
        this.setState(() => { this._editCursorPos = Math.min(this._editBuffer.length, this._editCursorPos + 1); });
        return 'handled';
      default: {
        const ch = event.key === 'Space' ? ' ' : (event.key.length === 1 ? event.key : null);
        if (ch !== null) {
          this.setState(() => {
            this._editBuffer = this._editBuffer.slice(0, this._editCursorPos) + ch + this._editBuffer.slice(this._editCursorPos);
            this._editCursorPos++;
          });
          return 'handled';
        }
        return 'ignored';
      }
    }
  }

  // --- Helpers for display ---
  private _cellTypeLabel(cell: CellData): string {
    if (cell.raw.startsWith('=')) return 'formula';
    if (cell.raw.length === 0) return 'empty';
    return isNaN(Number(cell.raw)) ? 'text' : 'number';
  }

  private _displayValue(cell: CellData): string {
    return cell.raw.length === 0 ? '' : String(cell.computed);
  }

  private _cellValueStyle(cell: CellData): TextStyle {
    if (cell.raw.length === 0) return dimStyle;
    if (typeof cell.computed === 'string' && cell.computed.startsWith('#')) return errorStyle;
    if (cell.raw.startsWith('=')) return formulaStyle;
    if (typeof cell.computed === 'number') return numberStyle;
    return normalStyle;
  }

  private _buildEditDisplay(): string {
    const before = this._editBuffer.slice(0, this._editCursorPos);
    const cursorCh = this._editCursorPos < this._editBuffer.length ? this._editBuffer[this._editCursorPos] : '_';
    const after = this._editCursorPos < this._editBuffer.length ? this._editBuffer.slice(this._editCursorPos + 1) : '';
    return `${before}${cursorCh}${after}`;
  }

  // --- Build UI ---
  build(_context: BuildContext): Widget {
    const currentKey = this.currentCellKey;
    const currentData = this.currentCell;
    const formulaContent = this._editing ? this._editBuffer : currentData.raw;

    // Formula bar
    const formulaBar = new Container({
      decoration: new BoxDecoration({ color: Color.brightBlack }),
      child: new Row({
        children: [
          txt(' fx ', new TextStyle({ bold: true, foreground: Color.green })),
          new SizedBox({ width: 1 }),
          new Expanded({ child: txt(`${currentKey}: ${formulaContent}`, new TextStyle({ foreground: Color.defaultColor })) }),
        ],
      }),
    });

    // Column headers
    const headerCells: Widget[] = [
      new Container({ width: HEADER_WIDTH, decoration: new BoxDecoration({ color: Color.blue }), child: txt('    ', headerStyle) }),
    ];
    for (let c = 0; c < COLUMNS.length; c++) {
      const label = COLUMNS[c]!.padStart(Math.floor((CELL_WIDTH + 1) / 2)).padEnd(CELL_WIDTH);
      headerCells.push(new Container({ width: CELL_WIDTH, decoration: new BoxDecoration({ color: Color.blue }), child: txt(label, headerStyle) }));
    }

    // Data rows
    const dataRows: Widget[] = [];
    for (let r = 0; r < NUM_ROWS; r++) {
      const rowCells: Widget[] = [
        new Container({
          width: HEADER_WIDTH,
          decoration: new BoxDecoration({ color: Color.brightBlack }),
          child: txt(String(r + 1).padStart(HEADER_WIDTH - 1) + ' ', rowHeaderStyle),
        }),
      ];
      for (let c = 0; c < COLUMNS.length; c++) {
        const key = cellKey(c, r);
        const cell = this._cells.get(key)!;
        const isSelected = c === this._cursorCol && r === this._cursorRow;
        const isEditing = isSelected && this._editing;

        let cellText: string, cellStyle: TextStyle, bgColor: Color | undefined;
        if (isEditing) {
          cellText = this._buildEditDisplay(); cellStyle = editTextStyle; bgColor = Color.magenta;
        } else if (isSelected) {
          cellText = this._displayValue(cell); cellStyle = selectedTextStyle; bgColor = Color.cyan;
        } else {
          cellText = this._displayValue(cell); cellStyle = this._cellValueStyle(cell); bgColor = undefined;
        }

        const padded = cellText.length > CELL_WIDTH - 1 ? cellText.slice(0, CELL_WIDTH - 2) + '~' : cellText.padEnd(CELL_WIDTH - 1);
        const deco = bgColor
          ? new BoxDecoration({ color: bgColor })
          : new BoxDecoration({ border: new Border({ right: new BorderSide({ color: Color.brightBlack, style: 'solid' }) }) });
        rowCells.push(new Container({ width: CELL_WIDTH, decoration: deco, child: txt(` ${padded}`, cellStyle) }));
      }
      dataRows.push(new Row({ children: rowCells }));
    }

    // Status bar
    const cellType = this._cellTypeLabel(currentData);
    const modeLabel = this._editing ? 'EDIT' : 'NAV';
    const modeColor = this._editing
      ? new TextStyle({ bold: true, foreground: Color.magenta })
      : new TextStyle({ bold: true, foreground: Color.green });
    const statusBar = new Container({
      decoration: new BoxDecoration({ color: Color.brightBlack }),
      child: new Row({
        children: [
          txt(` ${currentKey} `, statusLabelStyle), txt('|', dimStyle),
          txt(` ${cellType} `, statusValueStyle), txt('|', dimStyle),
          txt(` ${modeLabel} `, modeColor),
          new Expanded({ child: txt('', dimStyle) }),
          txt(this._editing ? 'Enter:confirm Esc:cancel' : 'Arrows:move Tab:next Enter:edit q:quit', dimStyle),
          txt(' ', dimStyle),
        ],
      }),
    });

    return new Container({
      decoration: new BoxDecoration({ border: Border.all(new BorderSide({ color: Color.blue, style: 'rounded' })) }),
      child: new Column({
        mainAxisSize: 'min',
        crossAxisAlignment: 'stretch',
        children: [
          new Container({ decoration: new BoxDecoration({ color: Color.blue }), child: txt(' Spreadsheet ', titleStyle) }),
          formulaBar,
          new Divider(),
          new Row({ children: headerCells }),
          new Divider(),
          ...dataRows,
          new Divider(),
          statusBar,
        ],
      }),
    });
  }
}

// Exports for testing
export { txt, cellKey, parseRef, parseRange, evaluateCell, recomputeAll };
export { COLUMNS, NUM_ROWS, CELL_WIDTH };
export type { CellData };

if (import.meta.main) {
  runApp(new SpreadsheetApp(), { output: process.stdout });
}
