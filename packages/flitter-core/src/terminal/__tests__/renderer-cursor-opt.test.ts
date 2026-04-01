// Renderer 光标移动优化与控制字符过滤的 failing tests。
// 测试目标：验证 renderer 在输出时能够：
// 1. 对连续位置的 cell 跳过不必要的 CUP（光标位置移动）序列
// 2. 对不连续位置的 cell 正确输出 CUP 序列
// 3. 跨行时正确输出 CUP 序列
// 4. 过滤控制字符（U+0000–U+001F，排除常规可打印字符），将其替换为空格

import { describe, it, expect } from 'bun:test';
import type { RowPatch, Cell } from '../cell.js';
import { createCell } from '../cell.js';
import {
  Renderer,
  BSU,
  ESU,
  SGR_RESET,
  CURSOR_HIDE,
  CURSOR_MOVE,
} from '../renderer.js';

// ── 辅助函数 ──────────────────────────────────────────────────────

/** 快速创建 Cell 用于测试 */
function cell(char: string, width: number = 1): Cell {
  return createCell(char, {}, width);
}

/** 创建单行单 patch 的 RowPatch */
function rowPatch(row: number, col: number, cells: Cell[]): RowPatch {
  return { row, patches: [{ col, cells }] };
}

/**
 * 从 render 输出中提取信封之间（BSU+CURSOR_HIDE 之后、ESU 之前）的核心内容，
 * 即去掉固定包装的部分，只保留 cell 渲染相关的输出。
 */
function extractRenderBody(output: string): string {
  const prefix = BSU + CURSOR_HIDE;
  const suffixStart = output.lastIndexOf(ESU);
  if (suffixStart === -1) return output;
  return output.substring(prefix.length, suffixStart);
}

/** 统计字符串中 CUP 序列（\x1b[数字;数字H）的出现次数 */
function countCursorMoves(str: string): number {
  const matches = str.match(/\x1b\[\d+;\d+H/g);
  return matches ? matches.length : 0;
}

// ── 连续 cell 跳过 CUP ─────────────────────────────────────────

describe('Renderer 光标移动优化', () => {
  it('连续位置的 cell 应跳过第二个 CUP 移动序列', () => {
    // 场景：两个 cell 分别在 (0,0) 和 (0,1)，作为两个独立的 CellPatch
    // 期望：第一个 cell 输出 CUP 到 (0,0)，写入字符后光标自动前进到 (0,1)，
    //        因此第二个 cell 不需要额外的 CUP 序列
    const renderer = new Renderer();
    const patches: RowPatch[] = [{
      row: 0,
      patches: [
        { col: 0, cells: [cell('A')] },
        { col: 1, cells: [cell('B')] },
      ],
    }];
    const result = renderer.render(patches);
    const body = extractRenderBody(result);

    // 核心内容中应只有 1 个 CUP（移动到起始位置 (0,0)）
    // 不应包含移动到 (0,1) 的 CUP 序列
    const cupCount = countCursorMoves(body);
    expect(cupCount).toBe(1);
    expect(body).toContain(CURSOR_MOVE(0, 0));
    expect(body).not.toContain(CURSOR_MOVE(1, 0));
  });

  // ── 不连续 cell 仍输出 CUP ───────────────────────────────────

  it('混合连续与不连续的 CellPatch 时，仅对不连续位置输出 CUP', () => {
    // 场景：三个 CellPatch，col=0, col=1（连续，应跳过 CUP）, col=5（不连续，需要 CUP）
    // 期望：只有 2 个 CUP —— 一个到 (0,0)，一个到 (5,0)
    //        col=1 紧接 col=0 后光标已自动前进，不需要额外 CUP
    const renderer = new Renderer();
    const patches: RowPatch[] = [{
      row: 0,
      patches: [
        { col: 0, cells: [cell('A')] },
        { col: 1, cells: [cell('B')] },
        { col: 5, cells: [cell('C')] },
      ],
    }];
    const result = renderer.render(patches);
    const body = extractRenderBody(result);

    // 核心内容中应恰好有 2 个 CUP：(0,0) 和 (5,0)
    const cupCount = countCursorMoves(body);
    expect(cupCount).toBe(2);
    expect(body).toContain(CURSOR_MOVE(0, 0));
    expect(body).not.toContain(CURSOR_MOVE(1, 0));
    expect(body).toContain(CURSOR_MOVE(5, 0));
  });

  // ── 跨行输出 CUP ────────────────────────────────────────────

  it('跨行时即使前一行末尾连续也必须输出新行的 CUP', () => {
    // 场景：第 0 行有两个连续 CellPatch col=3 和 col=4，第 1 行有 col=0
    // 期望：第 0 行连续部分只需 1 个 CUP（col=3），col=4 跳过；
    //        跨行到第 1 行必须输出新 CUP（col=0）
    //        因此总共 2 个 CUP
    const renderer = new Renderer();
    const patches: RowPatch[] = [{
      row: 0,
      patches: [
        { col: 3, cells: [cell('X')] },
        { col: 4, cells: [cell('Z')] },
      ],
    }, {
      row: 1,
      patches: [
        { col: 0, cells: [cell('Y')] },
      ],
    }];
    const result = renderer.render(patches);
    const body = extractRenderBody(result);

    // 核心内容中应恰好有 2 个 CUP：(3,0) 和 (0,1)
    // col=4 连续于 col=3 之后，不需要额外 CUP
    const cupCount = countCursorMoves(body);
    expect(cupCount).toBe(2);
    expect(body).toContain(CURSOR_MOVE(3, 0));
    expect(body).not.toContain(CURSOR_MOVE(4, 0));
    expect(body).toContain(CURSOR_MOVE(0, 1));
  });
});

// ── 控制字符过滤 ────────────────────────────────────────────────

describe('Renderer 控制字符过滤', () => {
  it('cell 字符为 U+0001 时应被替换为空格', () => {
    // 场景：cell 包含控制字符 U+0001 (SOH)
    // 期望：renderer 输出中该字符被替换为空格 ' '，而不是原始的 \x01
    const renderer = new Renderer();
    const patches: RowPatch[] = [
      rowPatch(0, 0, [cell('\x01')]),
    ];
    const result = renderer.render(patches);

    // 输出中不应包含原始控制字符 \x01
    expect(result).not.toContain('\x01');

    // 在 CUP 序列之后，应输出空格而不是控制字符
    const body = extractRenderBody(result);
    const afterCup = body.substring(body.indexOf(CURSOR_MOVE(0, 0)) + CURSOR_MOVE(0, 0).length);
    expect(afterCup).toContain(' ');
  });
});
