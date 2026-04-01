/**
 * WaveSpinner 组件测试
 *
 * 验证 WaveSpinner 的帧动画循环行为：
 * - 初始帧渲染空格字符
 * - 200ms 后渲染 "∼"
 * - 完整 6 帧循环 (1200ms) 后回到空格
 *
 * WaveSpinner 尚未实现，这些测试预期 FAIL。
 */

import { describe, it, expect, beforeEach, afterEach, jest } from 'bun:test';
import { WaveSpinner } from '../../widgets/wave-spinner';
import { createTestBinding } from '../../test-utils/pipeline-helpers';

describe('WaveSpinner', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('初始帧渲染空格字符', () => {
    const { binding, drawFrame, readRow, cleanup } = createTestBinding(10, 1);

    binding.attachRootWidget(new WaveSpinner());
    drawFrame();

    const row = readRow(0, 1);
    expect(row).toBe(' ');

    cleanup();
  });

  it('200ms 后渲染 "∼"', () => {
    const { binding, drawFrame, readRow, cleanup } = createTestBinding(10, 1);

    binding.attachRootWidget(new WaveSpinner());
    drawFrame();

    jest.advanceTimersByTime(200);
    drawFrame();

    const row = readRow(0, 1);
    expect(row).toBe('∼');

    cleanup();
  });

  it('6 帧循环 (1200ms) 后回到空格', () => {
    const { binding, drawFrame, readRow, cleanup } = createTestBinding(10, 1);

    binding.attachRootWidget(new WaveSpinner());
    drawFrame();

    // 推进完整的 6 帧循环：每帧 200ms，共 1200ms
    jest.advanceTimersByTime(1200);
    drawFrame();

    const row = readRow(0, 1);
    expect(row).toBe(' ');

    cleanup();
  });
});
