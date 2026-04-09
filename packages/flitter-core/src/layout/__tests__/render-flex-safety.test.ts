// RenderFlex 安全性测试
// 覆盖：溢出检测、Infinity 安全、负 flex 值、debug 溢出警告
// GAP-SUM-021: + 4 overflow scenarios (main-axis Row, main-axis Column,
//              flex children with min constraints, nested overflow propagation)

import { describe, it, expect, vi } from 'bun:test';
import { Offset, Size } from '../../core/types';
import { BoxConstraints } from '../../core/box-constraints';
import { RenderBox, PaintContext } from '../../framework/render-object';
import { RenderFlex } from '../render-flex';
import { FlexParentData } from '../parent-data';

// ---------------------------------------------------------------------------
// 测试辅助类
// ---------------------------------------------------------------------------

/**
 * 固定尺寸的 RenderBox，用于模拟非弹性子项。
 */
class FixedSizeBox extends RenderBox {
  private _desiredSize: Size;

  constructor(width: number, height: number) {
    super();
    this._desiredSize = new Size(width, height);
  }

  performLayout(): void {
    this.size = this.constraints!.constrain(this._desiredSize);
  }

  paint(_context: PaintContext, _offset: Offset): void {}
}

/**
 * 贪婪 RenderBox，总是占满约束允许的最大空间。
 * 同时记录收到的约束，便于断言检查。
 */
class ConstraintRecordingBox extends RenderBox {
  receivedConstraints: BoxConstraints | null = null;

  performLayout(): void {
    const c = this.constraints!;
    this.receivedConstraints = c;
    const w = Number.isFinite(c.maxWidth) ? c.maxWidth : c.minWidth;
    const h = Number.isFinite(c.maxHeight) ? c.maxHeight : c.minHeight;
    this.size = new Size(w, h);
  }

  paint(_context: PaintContext, _offset: Offset): void {}
}

/**
 * A RenderBox that enforces a minimum main-axis size regardless of constraints.
 * Simulates widgets with an inherent minimum (e.g., a button that cannot shrink
 * below its text width). The size is clamped to constraints via constrain().
 */
class MinSizeBox extends RenderBox {
  private _minMain: number;
  private _cross: number;

  constructor(minMain: number, cross: number) {
    super();
    this._minMain = minMain;
    this._cross = cross;
  }

  performLayout(): void {
    this.size = this.constraints!.constrain(new Size(this._minMain, this._cross));
  }

  paint(_context: PaintContext, _offset: Offset): void {}
}

/**
 * 辅助函数：向 RenderFlex 添加子项并可选设置 flex 值和 fit。
 */
function addChild(
  flex: RenderFlex,
  child: RenderBox,
  flexValue?: number,
  fit?: 'tight' | 'loose',
): void {
  flex.insert(child);
  const pd = child.parentData as FlexParentData;
  if (flexValue !== undefined) pd.flex = flexValue;
  if (fit !== undefined) pd.fit = fit;
}

// ---------------------------------------------------------------------------
// 溢出检测
// ---------------------------------------------------------------------------

describe('RenderFlex 溢出检测', () => {
  it('当非弹性子项总宽超过约束时应设置 hasOverflow 为 true', () => {
    const row = new RenderFlex({ direction: 'horizontal' });
    const c1 = new FixedSizeBox(60, 10);
    const c2 = new FixedSizeBox(60, 10);

    addChild(row, c1);
    addChild(row, c2);

    row.layout(BoxConstraints.tight(new Size(100, 20)));

    expect((row as any).hasOverflow).toBe(true);
  });

  it('当子项总宽未超过约束时 hasOverflow 应为 false', () => {
    const row = new RenderFlex({ direction: 'horizontal' });
    const c1 = new FixedSizeBox(30, 10);
    const c2 = new FixedSizeBox(30, 10);

    addChild(row, c1);
    addChild(row, c2);

    row.layout(BoxConstraints.tight(new Size(100, 20)));

    expect((row as any).hasOverflow).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Infinity 安全
// ---------------------------------------------------------------------------

describe('RenderFlex Infinity 安全', () => {
  it('Column 在 unbounded 主轴下含 Expanded 子项时子项不应收到 Infinity 约束', () => {
    const column = new RenderFlex({ direction: 'vertical' });
    const expanded = new ConstraintRecordingBox();

    addChild(column, expanded, 1, 'tight');

    column.layout(
      new BoxConstraints({
        minWidth: 0,
        maxWidth: 80,
        minHeight: 0,
        maxHeight: Infinity,
      }),
    );

    const received = expanded.receivedConstraints!;
    expect(Number.isFinite(received.maxHeight)).toBe(true);
    expect(Number.isFinite(received.minHeight)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 负 flex 值
// ---------------------------------------------------------------------------

describe('RenderFlex 负 flex 值', () => {
  it('flex < 0 时应抛出错误或回退为 0', () => {
    const row = new RenderFlex({ direction: 'horizontal' });
    const child = new ConstraintRecordingBox();

    addChild(row, child, -1, 'tight');

    let threw = false;
    try {
      row.layout(BoxConstraints.tight(new Size(100, 20)));
    } catch (e: any) {
      threw = true;
      expect(e.message).toMatch(/flex/i);
    }

    if (!threw) {
      const pd = child.parentData as FlexParentData;
      expect(pd.flex).toBeGreaterThanOrEqual(0);
    }
  });
});

// ---------------------------------------------------------------------------
// debug 溢出警告
// ---------------------------------------------------------------------------

describe('RenderFlex debug 溢出警告', () => {
  it('溢出时应设置 hasOverflow 标志（不再输出 console.error）', () => {
    const row = new RenderFlex({ direction: 'horizontal' });
    const c1 = new FixedSizeBox(60, 10);
    const c2 = new FixedSizeBox(60, 10);

    addChild(row, c1);
    addChild(row, c2);

    row.layout(BoxConstraints.tight(new Size(100, 20)));

    // _hasOverflow flag is set for programmatic detection
    expect(row.hasOverflow).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// GAP-SUM-021: Overflow test coverage completion — 4 scenarios
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Scenario 1: Children exceed main axis (Row overflow)
// ---------------------------------------------------------------------------

describe('RenderFlex overflow: children exceed main axis (Row)', () => {
  it('three children exceeding Row width set hasOverflow and clamp to container width', () => {
    const row = new RenderFlex({ direction: 'horizontal' });
    const c1 = new FixedSizeBox(50, 10);
    const c2 = new FixedSizeBox(40, 10);
    const c3 = new FixedSizeBox(30, 10);

    addChild(row, c1);
    addChild(row, c2);
    addChild(row, c3);

    // Total child width = 50+40+30 = 120, container width = 80 → overflow 40
    row.layout(BoxConstraints.tight(new Size(80, 20)));

    expect(row.hasOverflow).toBe(true);
    expect(row.size.width).toBe(80);
    expect(row.size.height).toBe(20);

    // Children retain their desired (unconstrained) main-axis sizes
    expect(c1.size.width).toBe(50);
    expect(c2.size.width).toBe(40);
    expect(c3.size.width).toBe(30);
  });

  it('children exactly matching container width do not overflow', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const row = new RenderFlex({ direction: 'horizontal' });
      const c1 = new FixedSizeBox(40, 10);
      const c2 = new FixedSizeBox(40, 10);

      addChild(row, c1);
      addChild(row, c2);

      // Total = 80, container = 80 → exactly fits
      row.layout(BoxConstraints.tight(new Size(80, 20)));

      expect(row.hasOverflow).toBe(false);
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: Children exceed main axis (Column overflow)
// ---------------------------------------------------------------------------

describe('RenderFlex overflow: children exceed main axis (Column)', () => {
  it('Column children exceeding height set hasOverflow', () => {
    const column = new RenderFlex({ direction: 'vertical' });
    const c1 = new FixedSizeBox(20, 30);
    const c2 = new FixedSizeBox(20, 25);
    const c3 = new FixedSizeBox(20, 20);

    addChild(column, c1);
    addChild(column, c2);
    addChild(column, c3);

    // Total child height = 30+25+20 = 75, container height = 50 → overflow 25
    column.layout(BoxConstraints.tight(new Size(40, 50)));

    expect(column.hasOverflow).toBe(true);
    expect(column.size.height).toBe(50);
    expect(column.size.width).toBe(40);

    expect(c1.size.height).toBe(30);
    expect(c2.size.height).toBe(25);
    expect(c3.size.height).toBe(20);
  });

  it('Column children within height do not overflow', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const column = new RenderFlex({ direction: 'vertical' });
      const c1 = new FixedSizeBox(20, 10);
      const c2 = new FixedSizeBox(20, 15);

      addChild(column, c1);
      addChild(column, c2);

      // Total height = 25, container height = 50 → no overflow
      column.layout(BoxConstraints.tight(new Size(40, 50)));

      expect(column.hasOverflow).toBe(false);
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: Flexible children with min constraints exceed space
// ---------------------------------------------------------------------------

describe('RenderFlex overflow: flexible children with min constraints exceed space', () => {
  it('non-flex children consume all space leaving 0 for flex children', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const row = new RenderFlex({ direction: 'horizontal' });
      const fixed1 = new FixedSizeBox(60, 10);
      const fixed2 = new FixedSizeBox(50, 10);
      const flexible = new ConstraintRecordingBox();

      addChild(row, fixed1);
      addChild(row, fixed2);
      addChild(row, flexible, 1, 'tight');

      // Non-flex total = 60+50 = 110 > container 100 → overflow
      // Flex child gets freeSpace = max(0, 100-110) = 0
      row.layout(BoxConstraints.tight(new Size(100, 20)));

      expect(row.hasOverflow).toBe(true);

      const received = flexible.receivedConstraints!;
      expect(received.maxWidth).toBe(0);
      expect(received.minWidth).toBe(0);
      expect(flexible.size.width).toBe(0);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('multiple flex children splitting insufficient remaining space', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const row = new RenderFlex({ direction: 'horizontal' });
      const fixed = new FixedSizeBox(80, 10);
      const flex1 = new MinSizeBox(30, 10);
      const flex2 = new MinSizeBox(30, 10);

      addChild(row, fixed);
      addChild(row, flex1, 1, 'tight');
      addChild(row, flex2, 1, 'tight');

      // Container = 100, non-flex = 80, freeSpace = 20
      // Each flex child gets floor(20/2) = 10 allocation (tight: 10..10)
      // MinSizeBox wants 30 but constrained to 10
      // Total allocated = 80 + 10 + 10 = 100 → no overflow
      row.layout(BoxConstraints.tight(new Size(100, 20)));

      expect(row.hasOverflow).toBe(false);
      expect(flex1.size.width).toBe(10);
      expect(flex2.size.width).toBe(10);
      expect(row.size.width).toBe(100);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('vertical flex children with min constraints that cause overflow', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const column = new RenderFlex({ direction: 'vertical' });
      const fixed = new FixedSizeBox(20, 70);
      const flexible = new ConstraintRecordingBox();

      addChild(column, fixed);
      addChild(column, flexible, 1, 'tight');

      // Container height = 50, non-flex height = 70 → overflow
      // Flex child gets freeSpace = max(0, 50-70) = 0
      column.layout(BoxConstraints.tight(new Size(40, 50)));

      expect(column.hasOverflow).toBe(true);
      expect(flexible.size.height).toBe(0);
    } finally {
      errorSpy.mockRestore();
    }
  });
});

// ---------------------------------------------------------------------------
// Scenario 4: Nested Flex overflow propagation
// ---------------------------------------------------------------------------

describe('RenderFlex overflow: nested Flex overflow propagation', () => {
  it('inner Row overflows while outer Column does not', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const outerColumn = new RenderFlex({ direction: 'vertical' });
      const innerRow = new RenderFlex({ direction: 'horizontal' });
      const rc1 = new FixedSizeBox(60, 10);
      const rc2 = new FixedSizeBox(60, 10);

      addChild(innerRow, rc1);
      addChild(innerRow, rc2);

      addChild(outerColumn, innerRow, 1, 'tight');

      // Outer Column: 80x40, inner Row flex=1 → gets all 40 height
      // Inner Row: children total width=120 > 80 → inner overflows
      outerColumn.layout(BoxConstraints.tight(new Size(80, 40)));

      expect(innerRow.hasOverflow).toBe(true);
      expect(outerColumn.hasOverflow).toBe(false);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('both outer and inner Flex overflow', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const outerRow = new RenderFlex({ direction: 'horizontal' });

      const innerCol1 = new RenderFlex({ direction: 'vertical' });
      const innerCol2 = new RenderFlex({ direction: 'vertical' });

      // innerCol1: children total height = 40, will overflow if constrained to 30
      const c1a = new FixedSizeBox(60, 20);
      const c1b = new FixedSizeBox(60, 20);
      addChild(innerCol1, c1a);
      addChild(innerCol1, c1b);

      // innerCol2: children total height = 55, will overflow if constrained to 30
      const c2a = new FixedSizeBox(60, 30);
      const c2b = new FixedSizeBox(60, 25);
      addChild(innerCol2, c2a);
      addChild(innerCol2, c2b);

      addChild(outerRow, innerCol1);
      addChild(outerRow, innerCol2);

      // Outer Row: 80x30
      // Non-flex children laid out with unbounded width
      // innerCol1 width=60, height capped at 30 → children 40 > 30 → overflow
      // innerCol2 width=60, height capped at 30 → children 55 > 30 → overflow
      // Outer allocated = 60+60 = 120 > 80 → outer overflows
      outerRow.layout(BoxConstraints.tight(new Size(80, 30)));

      expect(outerRow.hasOverflow).toBe(true);
      expect(innerCol1.hasOverflow).toBe(true);
      expect(innerCol2.hasOverflow).toBe(true);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('nested overflow does not corrupt parent sizing', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const outer = new RenderFlex({ direction: 'vertical' });
      const inner = new RenderFlex({ direction: 'horizontal' });
      const c1 = new FixedSizeBox(80, 10);
      const c2 = new FixedSizeBox(80, 10);

      addChild(inner, c1);
      addChild(inner, c2);
      addChild(outer, inner);

      // Outer Column: 100x60, inner Row is non-flex child
      // Inner Row: children total width=160 > cross constraint → overflow
      outer.layout(BoxConstraints.tight(new Size(100, 60)));

      expect(inner.hasOverflow).toBe(true);
      // Outer size must respect tight constraints regardless of inner overflow
      expect(outer.size.width).toBe(100);
      expect(outer.size.height).toBe(60);
      expect(inner.size.height).toBe(10);
    } finally {
      errorSpy.mockRestore();
    }
  });
});
