// RenderFlex 安全性测试
// 覆盖：溢出检测、Infinity 安全、负 flex 值、debug 溢出警告
// 这些测试预期全部 FAIL（功能尚未实现）

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
    // 构建一个 Row 含两个固定宽 60 的子项（总宽 120），
    // 在宽 100 的约束下布局 → 溢出 20px
    const row = new RenderFlex({ direction: 'horizontal' });
    const c1 = new FixedSizeBox(60, 10);
    const c2 = new FixedSizeBox(60, 10);

    addChild(row, c1);
    addChild(row, c2);

    row.layout(BoxConstraints.tight(new Size(100, 20)));

    // 期望 RenderFlex 在溢出时设置 hasOverflow 标记
    expect((row as any).hasOverflow).toBe(true);
  });

  it('当子项总宽未超过约束时 hasOverflow 应为 false', () => {
    // 构建一个 Row 含两个固定宽 30 的子项（总宽 60），
    // 在宽 100 的约束下布局 → 无溢出
    const row = new RenderFlex({ direction: 'horizontal' });
    const c1 = new FixedSizeBox(30, 10);
    const c2 = new FixedSizeBox(30, 10);

    addChild(row, c1);
    addChild(row, c2);

    row.layout(BoxConstraints.tight(new Size(100, 20)));

    // 期望无溢出时 hasOverflow 为 false
    expect((row as any).hasOverflow).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Infinity 安全
// ---------------------------------------------------------------------------

describe('RenderFlex Infinity 安全', () => {
  it('Column 在 unbounded 主轴下含 Expanded 子项时子项不应收到 Infinity 约束', () => {
    // Column（垂直方向）在 maxHeight=Infinity 的约束下，
    // 包含一个 flex=1（tight fit，相当于 Expanded）的子项
    const column = new RenderFlex({ direction: 'vertical' });
    const expanded = new ConstraintRecordingBox();

    addChild(column, expanded, 1, 'tight');

    // maxHeight = Infinity 模拟了无限滚动容器中的 Column
    column.layout(
      new BoxConstraints({
        minWidth: 0,
        maxWidth: 80,
        minHeight: 0,
        maxHeight: Infinity,
      }),
    );

    // flex 子项收到的约束中不应包含 Infinity
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

    // 期望：要么在 layout 时抛出包含 "flex" 的错误信息，
    // 要么负值被视为 0（子项以非弹性方式布局，收到无限主轴约束）
    let threw = false;
    try {
      row.layout(BoxConstraints.tight(new Size(100, 20)));
    } catch (e: any) {
      threw = true;
      expect(e.message).toMatch(/flex/i);
    }

    if (!threw) {
      // 如果没有抛错，负 flex 应被回退为 0，
      // 此时子项应以非弹性方式布局（收到 unbounded 主轴约束），
      // 并且不应参与弹性空间分配
      const pd = child.parentData as FlexParentData;
      expect(pd.flex).toBeGreaterThanOrEqual(0);
    }
  });
});

// ---------------------------------------------------------------------------
// debug 溢出警告
// ---------------------------------------------------------------------------

describe('RenderFlex debug 溢出警告', () => {
  it('溢出时应输出含 "overflowed" 的诊断信息', () => {
    // 监听 console.error 来捕获诊断输出
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const row = new RenderFlex({ direction: 'horizontal' });
      const c1 = new FixedSizeBox(60, 10);
      const c2 = new FixedSizeBox(60, 10);

      addChild(row, c1);
      addChild(row, c2);

      // 总宽 120 超过约束宽 100 → 溢出
      row.layout(BoxConstraints.tight(new Size(100, 20)));

      // 期望至少有一条包含 "overflowed" 的诊断信息被输出
      const allCalls = errorSpy.mock.calls.map((args) => args.join(' '));
      const hasOverflowMsg = allCalls.some((msg) => /overflowed/i.test(msg));
      expect(hasOverflowMsg).toBe(true);
    } finally {
      errorSpy.mockRestore();
    }
  });
});
