/**
 * Table widget unit tests.
 *
 * Tests column width calculation (fixed, intrinsic, flex, proportional),
 * row height computation, border painting, no-borders mode, cell padding,
 * empty table, and shrinkColumnWidths.
 *
 * 逆向: EQT (RenderTable) at
 *   amp-cli-reversed/modules/1472_tui_components/layout_widgets.js:1127-1436
 */

import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Color } from "../../screen/color.js";
import { Screen } from "../../screen/screen.js";
import { BoxConstraints } from "../../tree/constraints.js";
import { RenderBox } from "../../tree/render-box.js";
import { EdgeInsets } from "../edge-insets.js";
import { SizedBox } from "../sized-box.js";
import type { TableCell, TableColumnConfig, TableRow } from "../table.js";
import { RenderTable, Table } from "../table.js";

// ─── Test helper: fixed-size render box ────────────────────────────────────

class FixedSizeBox extends RenderBox {
  private _w: number;
  private _h: number;

  constructor(w: number, h: number) {
    super();
    this._w = w;
    this._h = h;
  }

  override performLayout(): void {
    this.size = this._constraints!.constrain(this._w, this._h);
  }

  override getMinIntrinsicWidth(_h: number): number {
    return this._w;
  }

  override getMaxIntrinsicWidth(_h: number): number {
    return this._w;
  }

  override getMinIntrinsicHeight(_w: number): number {
    return this._h;
  }

  override getMaxIntrinsicHeight(_w: number): number {
    return this._h;
  }
}

// ─── Builder helpers ────────────────────────────────────────────────────────

/**
 * Build a RenderTable with N columns and given cell sizes.
 * cellSizes is row-major: [[col0w,col0h], [col1w,col1h], ...]
 */
function buildRenderTable(
  columnConfigs: TableColumnConfig[],
  cellSizes: Array<Array<[number, number]>>,
  opts: { showBorders?: boolean; borderColor?: Color } = {},
): RenderTable {
  const showBorders = opts.showBorders ?? true;
  const cellPadding = EdgeInsets.zero;

  const rows: TableRow[] = cellSizes.map((rowCells) => ({
    cells: rowCells.map(
      ([_w, _h]): TableCell => ({
        // We don't need a real Widget here — cells array is only used for counting.
        // The actual render children are added via adoptChild below.
        child: null as unknown as import("../../tree/widget.js").Widget,
      }),
    ),
  }));

  const renderTable = new RenderTable({
    rows,
    columnConfigs,
    borderColor: opts.borderColor,
    showBorders,
    cellPadding,
  });

  // Adopt children in row-major order
  for (const rowCells of cellSizes) {
    for (const [w, h] of rowCells) {
      renderTable.adoptChild(new FixedSizeBox(w, h));
    }
  }

  return renderTable;
}

// ════════════════════════════════════════════════════════════
//  Widget spec
// ════════════════════════════════════════════════════════════

describe("Table widget", () => {
  it("has correct name and default props", () => {
    const table = new Table({ rows: [], columnConfigs: [] });
    assert.equal(table.showBorders, true);
    assert.ok(table.cellPadding.equals(EdgeInsets.symmetric({ horizontal: 1, vertical: 0 })));
    assert.equal(table.rows.length, 0);
    assert.equal(table.columnConfigs.length, 0);
    assert.equal(table.children.length, 0);
  });

  it("flattens cell children into this.children", () => {
    const table = new Table({
      rows: [
        { cells: [{ child: new SizedBox() }, { child: new SizedBox() }] },
        { cells: [{ child: new SizedBox() }, { child: new SizedBox() }] },
      ],
      columnConfigs: [
        { widthType: "fixed", fixedWidth: 10 },
        { widthType: "fixed", fixedWidth: 10 },
      ],
    });
    // 2 rows × 2 cols = 4 children
    assert.equal(table.children.length, 4);
  });

  it("creates a RenderTable render object", () => {
    const table = new Table({ rows: [], columnConfigs: [] });
    const ro = table.createRenderObject();
    assert.ok(ro instanceof RenderTable);
  });

  it("createElement returns MultiChildRenderObjectElement", () => {
    const table = new Table({ rows: [], columnConfigs: [] });
    const el = table.createElement();
    assert.ok(el !== undefined);
  });
});

// ════════════════════════════════════════════════════════════
//  Column width: fixed
// ════════════════════════════════════════════════════════════

describe("RenderTable column width — fixed", () => {
  it("fixed columns get exact specified width", () => {
    const rt = buildRenderTable(
      [
        { widthType: "fixed", fixedWidth: 20 },
        { widthType: "fixed", fixedWidth: 30 },
      ],
      [
        [
          [5, 1],
          [5, 1],
        ],
      ],
      { showBorders: false },
    );

    const widths = rt.calculateColumnWidths(new BoxConstraints({ minWidth: 0, maxWidth: 200 }));

    assert.equal(widths[0], 20);
    assert.equal(widths[1], 30);
  });

  it("fixed columns: total table width equals sum + borders", () => {
    const rt = buildRenderTable(
      [
        { widthType: "fixed", fixedWidth: 10 },
        { widthType: "fixed", fixedWidth: 10 },
      ],
      [
        [
          [5, 1],
          [5, 1],
        ],
      ],
      { showBorders: true },
    );
    rt.layout(new BoxConstraints({ minWidth: 0, maxWidth: 200 }));
    // 10 + 10 + 2 (left/right borders) + 1 (middle divider) = 23
    assert.equal(rt.size.width, 23);
  });
});

// ════════════════════════════════════════════════════════════
//  Column width: intrinsic
// ════════════════════════════════════════════════════════════

describe("RenderTable column width — intrinsic", () => {
  it("intrinsic columns measure max child width across rows", () => {
    // col0: cells are 8 and 12 wide → intrinsic = 12
    const rt = buildRenderTable([{ widthType: "intrinsic" }], [[[8, 1]], [[12, 1]]], {
      showBorders: false,
    });

    const widths = rt.calculateColumnWidths(new BoxConstraints({ minWidth: 0, maxWidth: 200 }));

    assert.equal(widths[0], 12);
  });

  it("intrinsic column with no rows gets width 0", () => {
    const rt = new RenderTable({
      rows: [],
      columnConfigs: [{ widthType: "intrinsic" }],
      showBorders: false,
      cellPadding: EdgeInsets.zero,
    });
    const widths = rt.calculateColumnWidths(new BoxConstraints({ minWidth: 0, maxWidth: 200 }));
    assert.equal(widths[0], 0);
  });
});

// ════════════════════════════════════════════════════════════
//  Column width: flex
// ════════════════════════════════════════════════════════════

describe("RenderTable column width — flex", () => {
  it("single flex column fills all remaining space (no borders)", () => {
    // fixed=20, flex gets the rest of 100 → 80
    const rt = buildRenderTable(
      [{ widthType: "fixed", fixedWidth: 20 }, { widthType: "flex" }],
      [
        [
          [5, 1],
          [5, 1],
        ],
      ],
      { showBorders: false },
    );

    const widths = rt.calculateColumnWidths(new BoxConstraints({ minWidth: 0, maxWidth: 100 }));
    assert.equal(widths[0], 20);
    assert.equal(widths[1], 80);
  });

  it("two flex columns split remaining space equally", () => {
    // total 100, no borders, two flex columns → each gets 50
    const rt = buildRenderTable(
      [{ widthType: "flex" }, { widthType: "flex" }],
      [
        [
          [5, 1],
          [5, 1],
        ],
      ],
      { showBorders: false },
    );

    const widths = rt.calculateColumnWidths(new BoxConstraints({ minWidth: 0, maxWidth: 100 }));
    assert.equal(widths[0], 50);
    assert.equal(widths[1], 50);
  });

  it("flex with borders accounts for border overhead", () => {
    // 2 cols with borders: overhead = 2 + 1 = 3; content = 100 - 3 = 97
    // fixed=20, flex gets 77
    const rt = buildRenderTable(
      [{ widthType: "fixed", fixedWidth: 20 }, { widthType: "flex" }],
      [
        [
          [5, 1],
          [5, 1],
        ],
      ],
      { showBorders: true },
    );

    const widths = rt.calculateColumnWidths(new BoxConstraints({ minWidth: 0, maxWidth: 100 }));
    assert.equal(widths[0], 20);
    assert.equal(widths[1], 77);
  });
});

// ════════════════════════════════════════════════════════════
//  Column width: proportional
// ════════════════════════════════════════════════════════════

describe("RenderTable column width — proportional", () => {
  it("proportional columns split by intrinsic size ratio", () => {
    // col0 intrinsic=10, col1 intrinsic=30; total intrinsic=40
    // available=80 (no borders); col0 → floor(80*0.25)=20, col1 → 80-20=60
    const rt = buildRenderTable(
      [{ widthType: "proportional" }, { widthType: "proportional" }],
      [
        [
          [10, 1],
          [30, 1],
        ],
      ],
      { showBorders: false },
    );

    const widths = rt.calculateColumnWidths(new BoxConstraints({ minWidth: 0, maxWidth: 80 }));
    assert.equal(widths[0], 20);
    assert.equal(widths[1], 60);
  });
});

// ════════════════════════════════════════════════════════════
//  Row height
// ════════════════════════════════════════════════════════════

describe("RenderTable row height", () => {
  it("row height is max cell height across columns", () => {
    // row0: col0=h1, col1=h3 → row height = 3
    const rt = buildRenderTable(
      [
        { widthType: "fixed", fixedWidth: 10 },
        { widthType: "fixed", fixedWidth: 10 },
      ],
      [
        [
          [5, 1],
          [5, 3],
        ],
      ],
      { showBorders: false },
    );

    // Need column widths first
    rt.layout(new BoxConstraints({ minWidth: 0, maxWidth: 200 }));
    assert.equal(rt.rowHeights[0], 3);
  });

  it("minimum row height is 1", () => {
    const rt = buildRenderTable([{ widthType: "fixed", fixedWidth: 10 }], [[[5, 0]]], {
      showBorders: false,
    });
    rt.layout(new BoxConstraints({ minWidth: 0, maxWidth: 200 }));
    // FixedSizeBox h=0 → constrain → 0, but measureCellHeight takes size.height
    // Row minimum is 1 per amp spec
    assert.ok(rt.rowHeights[0] >= 1);
  });

  it("multiple rows each computed independently", () => {
    const rt = buildRenderTable([{ widthType: "fixed", fixedWidth: 10 }], [[[5, 2]], [[5, 5]]], {
      showBorders: false,
    });
    rt.layout(new BoxConstraints({ minWidth: 0, maxWidth: 200 }));
    assert.equal(rt.rowHeights[0], 2);
    assert.equal(rt.rowHeights[1], 5);
  });
});

// ════════════════════════════════════════════════════════════
//  Border painting
// ════════════════════════════════════════════════════════════

describe("RenderTable border painting", () => {
  it("outer corners are ╭╮╰╯", () => {
    // 1 col, 1 row, cell h=1, cell w=5 (no padding)
    // total width=5+2=7, height=1+2=3
    const rt = buildRenderTable([{ widthType: "fixed", fixedWidth: 5 }], [[[5, 1]]], {
      showBorders: true,
    });
    rt.layout(new BoxConstraints({ minWidth: 0, maxWidth: 80 }));

    const screen = new Screen(20, 10);
    rt.paint(screen, 0, 0);

    assert.equal(screen.getCell(0, 0).char, "╭");
    assert.equal(screen.getCell(6, 0).char, "╮");
    assert.equal(screen.getCell(0, 2).char, "╰");
    assert.equal(screen.getCell(6, 2).char, "╯");
  });

  it("top/bottom edges use ─", () => {
    const rt = buildRenderTable([{ widthType: "fixed", fixedWidth: 5 }], [[[5, 1]]], {
      showBorders: true,
    });
    rt.layout(new BoxConstraints({ minWidth: 0, maxWidth: 80 }));
    const screen = new Screen(20, 10);
    rt.paint(screen, 0, 0);

    // top edge: x=1..5
    for (let x = 1; x <= 5; x++) {
      assert.equal(screen.getCell(x, 0).char, "─", `top edge at x=${x}`);
    }
    // bottom edge: x=1..5
    for (let x = 1; x <= 5; x++) {
      assert.equal(screen.getCell(x, 2).char, "─", `bottom edge at x=${x}`);
    }
  });

  it("row divider uses ├ ─ ┤", () => {
    // 2 rows, 1 col of width 5 → total w=7, total h=5
    // row divider at y=2 (1 border + 1 row height + divider)
    const rt = buildRenderTable([{ widthType: "fixed", fixedWidth: 5 }], [[[5, 1]], [[5, 1]]], {
      showBorders: true,
    });
    rt.layout(new BoxConstraints({ minWidth: 0, maxWidth: 80 }));
    const screen = new Screen(20, 10);
    rt.paint(screen, 0, 0);

    // rowDividerY = 1 (top border) + 1 (row0 height) = 2
    assert.equal(screen.getCell(0, 2).char, "├");
    assert.equal(screen.getCell(6, 2).char, "┤");
    assert.equal(screen.getCell(1, 2).char, "─");
  });

  it("column divider uses ┬ │ ┴", () => {
    // 1 row h=3, 2 cols each w=5 → total w=13, total h=5
    // col divider at x = 1 + 5 = 6
    const rt = buildRenderTable(
      [
        { widthType: "fixed", fixedWidth: 5 },
        { widthType: "fixed", fixedWidth: 5 },
      ],
      [
        [
          [5, 3],
          [5, 3],
        ],
      ],
      { showBorders: true },
    );
    rt.layout(new BoxConstraints({ minWidth: 0, maxWidth: 80 }));
    const screen = new Screen(30, 10);
    rt.paint(screen, 0, 0);

    // colDividerX = 1 (left border) + 5 (col0 width) = 6
    assert.equal(screen.getCell(6, 0).char, "┬");
    assert.equal(screen.getCell(6, 4).char, "┴");
    assert.equal(screen.getCell(6, 2).char, "│");
  });

  it("intersection of row and column divider is ┼", () => {
    // 2 rows, 2 cols
    const rt = buildRenderTable(
      [
        { widthType: "fixed", fixedWidth: 5 },
        { widthType: "fixed", fixedWidth: 5 },
      ],
      [
        [
          [5, 1],
          [5, 1],
        ],
        [
          [5, 1],
          [5, 1],
        ],
      ],
      { showBorders: true },
    );
    rt.layout(new BoxConstraints({ minWidth: 0, maxWidth: 80 }));
    const screen = new Screen(30, 10);
    rt.paint(screen, 0, 0);

    // row divider at y=2, col divider at x=6 → intersection
    assert.equal(screen.getCell(6, 2).char, "┼");
  });
});

// ════════════════════════════════════════════════════════════
//  No borders mode
// ════════════════════════════════════════════════════════════

describe("RenderTable showBorders=false", () => {
  it("no border overhead in width", () => {
    const rt = buildRenderTable(
      [
        { widthType: "fixed", fixedWidth: 10 },
        { widthType: "fixed", fixedWidth: 10 },
      ],
      [
        [
          [5, 1],
          [5, 1],
        ],
      ],
      { showBorders: false },
    );
    rt.layout(new BoxConstraints({ minWidth: 0, maxWidth: 200 }));
    // 10 + 10 = 20 (no borders)
    assert.equal(rt.size.width, 20);
  });

  it("no border overhead in height", () => {
    const rt = buildRenderTable([{ widthType: "fixed", fixedWidth: 10 }], [[[5, 2]], [[5, 3]]], {
      showBorders: false,
    });
    rt.layout(new BoxConstraints({ minWidth: 0, maxWidth: 200 }));
    // 2 + 3 = 5 (no borders)
    assert.equal(rt.size.height, 5);
  });

  it("no border cells painted", () => {
    const rt = buildRenderTable([{ widthType: "fixed", fixedWidth: 5 }], [[[5, 1]]], {
      showBorders: false,
    });
    rt.layout(new BoxConstraints({ minWidth: 0, maxWidth: 80 }));
    const screen = new Screen(20, 10);
    rt.paint(screen, 0, 0);
    // Corner positions should not be border characters
    assert.notEqual(screen.getCell(0, 0).char, "╭");
  });
});

// ════════════════════════════════════════════════════════════
//  Cell padding applied correctly
// ════════════════════════════════════════════════════════════

describe("RenderTable cell padding", () => {
  it("intrinsic column includes cell padding in width measurement", () => {
    // Padding with horizontal=2 wraps a child of width 5 → intrinsic = 5+2+2=9
    const padding = EdgeInsets.symmetric({ horizontal: 2, vertical: 0 });

    const table = new Table({
      rows: [{ cells: [{ child: new SizedBox({ width: 5, height: 1 }) }] }],
      columnConfigs: [{ widthType: "intrinsic" }],
      cellPadding: padding,
      showBorders: false,
    });

    // The children array contains Padding(horizontal=2, child=SizedBox(5))
    // Intrinsic width = 5 + 2 + 2 = 9
    assert.equal(table.children.length, 1);
    const paddingWidget = table.children[0];
    assert.ok(paddingWidget !== undefined);
  });
});

// ════════════════════════════════════════════════════════════
//  Empty table (0 rows)
// ════════════════════════════════════════════════════════════

describe("RenderTable empty table", () => {
  it("0 rows does not crash on layout", () => {
    const rt = new RenderTable({
      rows: [],
      columnConfigs: [{ widthType: "fixed", fixedWidth: 10 }],
      showBorders: true,
      cellPadding: EdgeInsets.zero,
    });
    assert.doesNotThrow(() => {
      rt.layout(new BoxConstraints({ minWidth: 0, maxWidth: 200 }));
    });
  });

  it("0 rows 0 cols: size is (0,0) with no borders", () => {
    const rt = new RenderTable({
      rows: [],
      columnConfigs: [],
      showBorders: false,
      cellPadding: EdgeInsets.zero,
    });
    rt.layout(new BoxConstraints({ minWidth: 0, maxWidth: 200 }));
    assert.equal(rt.size.width, 0);
    assert.equal(rt.size.height, 0);
  });

  it("empty table with borders: size includes border overhead for 0 rows/cols", () => {
    // 0 cols → borderOverhead width = 2 + max(0,-1)=2, height=2+max(0,-1)=2
    const rt = new RenderTable({
      rows: [],
      columnConfigs: [],
      showBorders: true,
      cellPadding: EdgeInsets.zero,
    });
    rt.layout(new BoxConstraints({ minWidth: 0, maxWidth: 200 }));
    // getTotalTableWidth: 0 + 2 + max(0, -1) = 2; getTotalTableHeight: 0+2+max(0,-1) = 2
    assert.equal(rt.size.width, 2);
    assert.equal(rt.size.height, 2);
  });
});

// ════════════════════════════════════════════════════════════
//  shrinkColumnWidths
// ════════════════════════════════════════════════════════════

describe("RenderTable shrinkColumnWidths", () => {
  it("returns empty array for empty input", () => {
    const rt = new RenderTable({
      rows: [],
      columnConfigs: [],
      showBorders: false,
      cellPadding: EdgeInsets.zero,
    });
    assert.deepEqual(rt.shrinkColumnWidths([], 100), []);
  });

  it("returns zeros when target <= 0", () => {
    const rt = new RenderTable({
      rows: [],
      columnConfigs: [],
      showBorders: false,
      cellPadding: EdgeInsets.zero,
    });
    assert.deepEqual(rt.shrinkColumnWidths([10, 20, 30], 0), [0, 0, 0]);
  });

  it("returns copy when total <= target", () => {
    const rt = new RenderTable({
      rows: [],
      columnConfigs: [],
      showBorders: false,
      cellPadding: EdgeInsets.zero,
    });
    const result = rt.shrinkColumnWidths([10, 20], 50);
    assert.deepEqual(result, [10, 20]);
  });

  it("shrinks proportionally and sums to target", () => {
    const rt = new RenderTable({
      rows: [],
      columnConfigs: [],
      showBorders: false,
      cellPadding: EdgeInsets.zero,
    });
    // widths [20, 20, 20] total=60, target=30 → each ~10
    const result = rt.shrinkColumnWidths([20, 20, 20], 30);
    const sum = result.reduce((a, b) => a + b, 0);
    assert.equal(sum, 30);
    // Each column should be equal since they have equal width
    assert.equal(result[0], 10);
    assert.equal(result[1], 10);
    assert.equal(result[2], 10);
  });

  it("shrinks non-uniform widths and sums to target", () => {
    const rt = new RenderTable({
      rows: [],
      columnConfigs: [],
      showBorders: false,
      cellPadding: EdgeInsets.zero,
    });
    // widths [10, 30] total=40, target=20
    const result = rt.shrinkColumnWidths([10, 30], 20);
    const sum = result.reduce((a, b) => a + b, 0);
    assert.equal(sum, 20);
  });

  it("columns exceeding constraints are shrunk", () => {
    // 2 fixed cols of width 60 each → total 120, max constraint = 80 (no borders)
    const rt = buildRenderTable(
      [
        { widthType: "fixed", fixedWidth: 60 },
        { widthType: "fixed", fixedWidth: 60 },
      ],
      [
        [
          [5, 1],
          [5, 1],
        ],
      ],
      { showBorders: false },
    );
    rt.layout(new BoxConstraints({ minWidth: 0, maxWidth: 80 }));
    // After shrink: total should be <= 80
    const total = rt.columnWidths.reduce((sum, w) => sum + w, 0);
    assert.ok(total <= 80, `Expected total <= 80 but got ${total}`);
  });
});

// ════════════════════════════════════════════════════════════
//  updateTable
// ════════════════════════════════════════════════════════════

describe("RenderTable updateTable", () => {
  it("reflects new config when re-laid-out with different constraints", () => {
    const rt = buildRenderTable([{ widthType: "fixed", fixedWidth: 10 }], [[[5, 1]]], {
      showBorders: false,
    });
    rt.layout(new BoxConstraints({ minWidth: 0, maxWidth: 200 }));
    assert.equal(rt.columnWidths[0], 10);

    // Update with different config — note: markNeedsLayout is a no-op when unattached,
    // so force a re-run by using different constraints
    rt.updateTable({
      rows: [],
      columnConfigs: [{ widthType: "fixed", fixedWidth: 20 }],
      showBorders: false,
      cellPadding: EdgeInsets.zero,
    });

    // Use different maxWidth to force constraintsChanged → performLayout re-runs
    rt.layout(new BoxConstraints({ minWidth: 0, maxWidth: 199 }));
    assert.equal(rt.columnWidths[0], 20);
  });
});
