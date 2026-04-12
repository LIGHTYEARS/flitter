/**
 * 帧性能数据采样与百分位计算。
 *
 * {@link PerformanceTracker} 使用 Float64Array 环形缓冲高效采样帧时间、
 * 各阶段时间、键盘/鼠标事件时间、重绘百分比和写入字节数。
 * 最多保留 1024 个样本，超出时淘汰最旧数据。
 *
 * {@link percentile} 函数在排序后的样本上计算任意百分位值 (P50/P95/P99 等)。
 *
 * @example
 * ```ts
 * const tracker = new PerformanceTracker();
 * tracker.recordFrame(12.5);
 * tracker.recordPhase("build", 3.2);
 * console.log(tracker.getFrameP95()); // 12.5
 * ```
 *
 * @module
 */

import type { FramePhase } from "../tree/frame-scheduler.js";

/**
 * 计算排序后的第 p 百分位值。
 *
 * 使用 ceil 索引法: index = ceil(length * p) - 1，然后取排序数组中该位置的值。
 *
 * @param samples - 样本数组
 * @param p - 百分位 (0-1, 如 0.95=P95, 0.99=P99)
 * @returns 百分位值, 空数组返回 0
 *
 * @example
 * ```ts
 * percentile([1, 2, 3, 4, 5], 0.5);  // 3
 * percentile([1, 2, 3, 4, 5], 0.95); // 5
 * percentile([], 0.95);              // 0
 * ```
 */
export function percentile(samples: number[], p: number): number {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const k = Math.max(0, Math.min(p, 1));
  const index = Math.ceil(sorted.length * k) - 1;
  return sorted[Math.max(0, index)] ?? 0;
}

/**
 * 基于 Float64Array 的环形缓冲区。
 *
 * 当写入超过容量时，自动淘汰最旧的数据。
 * 内部使用 Float64Array 保证双精度浮点数的精度。
 *
 * @example
 * ```ts
 * const buf = new RingBuffer(1024);
 * buf.push(12.5);
 * buf.push(13.0);
 * console.log(buf.toArray());  // [12.5, 13.0]
 * console.log(buf.last);       // 13.0
 * ```
 */
export class RingBuffer {
  /** 内部 Float64Array 存储 */
  private _buffer: Float64Array;
  /** 当前有效元素数量 */
  private _size: number = 0;
  /** 下一个写入位置 (环形指针) */
  private _head: number = 0;
  /** 缓冲区容量 */
  readonly capacity: number;

  /**
   * 创建环形缓冲区。
   *
   * @param capacity - 最大容量
   */
  constructor(capacity: number) {
    this.capacity = capacity;
    this._buffer = new Float64Array(capacity);
  }

  /**
   * 写入一个值到缓冲区。
   *
   * 如果已满，覆盖最旧的值。
   *
   * @param value - 要写入的数值
   */
  push(value: number): void {
    this._buffer[this._head] = value;
    this._head = (this._head + 1) % this.capacity;
    if (this._size < this.capacity) {
      this._size++;
    }
  }

  /**
   * 按时间顺序返回所有有效元素。
   *
   * @returns 数值数组，最旧的在前
   */
  toArray(): number[] {
    if (this._size === 0) return [];
    const result: number[] = new Array(this._size);
    if (this._size < this.capacity) {
      // 未满: 数据从索引 0 到 _size-1
      for (let i = 0; i < this._size; i++) {
        result[i] = this._buffer[i]!;
      }
    } else {
      // 已满: 从 _head 开始环绕读取
      for (let i = 0; i < this._size; i++) {
        result[i] = this._buffer[(this._head + i) % this.capacity]!;
      }
    }
    return result;
  }

  /** 当前有效元素数量 */
  get length(): number {
    return this._size;
  }

  /**
   * 最后写入的值。
   *
   * 空缓冲区返回 0。
   */
  get last(): number {
    if (this._size === 0) return 0;
    const idx = (this._head - 1 + this.capacity) % this.capacity;
    return this._buffer[idx]!;
  }

  /** 清空缓冲区 */
  reset(): void {
    this._size = 0;
    this._head = 0;
  }
}

/**
 * 帧性能数据采样器。
 *
 * 使用 {@link RingBuffer} 环形缓冲记录帧时间、各阶段时间、
 * 键盘/鼠标事件时间、重绘百分比和写入字节数。
 * 提供 P95/P99/Last 查询接口。
 *
 * @example
 * ```ts
 * const tracker = new PerformanceTracker();
 * tracker.recordFrame(12.5);
 * tracker.recordPhase("build", 3.2);
 * tracker.recordKeyEvent(0.8);
 * console.log(tracker.getFrameP95());      // 12.5
 * console.log(tracker.getPhaseP95("build")); // 3.2
 * ```
 */
export class PerformanceTracker {
  /** 最大样本数量 */
  readonly MAX_SAMPLES = 1024;

  /** 帧时间采样缓冲 */
  private _frameTimes: RingBuffer;
  /** 各阶段时间采样缓冲 */
  private _phaseTimes: Record<FramePhase, RingBuffer>;
  /** 键盘事件时间采样缓冲 */
  private _keyEventTimes: RingBuffer;
  /** 鼠标事件时间采样缓冲 */
  private _mouseEventTimes: RingBuffer;
  /** 重绘百分比采样缓冲 */
  private _repaintPercents: RingBuffer;
  /** 写入字节数采样缓冲 */
  private _bytesWritten: RingBuffer;

  constructor() {
    this._frameTimes = new RingBuffer(this.MAX_SAMPLES);
    this._phaseTimes = {
      build: new RingBuffer(this.MAX_SAMPLES),
      layout: new RingBuffer(this.MAX_SAMPLES),
      paint: new RingBuffer(this.MAX_SAMPLES),
      render: new RingBuffer(this.MAX_SAMPLES),
    };
    this._keyEventTimes = new RingBuffer(this.MAX_SAMPLES);
    this._mouseEventTimes = new RingBuffer(this.MAX_SAMPLES);
    this._repaintPercents = new RingBuffer(this.MAX_SAMPLES);
    this._bytesWritten = new RingBuffer(this.MAX_SAMPLES);
  }

  // ── record 方法 ────────────────────────────────────

  /** 记录一帧的总时间 (ms) */
  recordFrame(timeMs: number): void {
    this._frameTimes.push(timeMs);
  }

  /** 记录某个帧阶段的时间 (ms) */
  recordPhase(phase: FramePhase, timeMs: number): void {
    this._phaseTimes[phase].push(timeMs);
  }

  /** 记录键盘事件处理时间 (ms) */
  recordKeyEvent(timeMs: number): void {
    this._keyEventTimes.push(timeMs);
  }

  /** 记录鼠标事件处理时间 (ms) */
  recordMouseEvent(timeMs: number): void {
    this._mouseEventTimes.push(timeMs);
  }

  /** 记录重绘百分比 (0-100) */
  recordRepaintPercent(percent: number): void {
    this._repaintPercents.push(percent);
  }

  /** 记录写入字节数 */
  recordBytesWritten(bytes: number): void {
    this._bytesWritten.push(bytes);
  }

  // ── Frame 查询 ─────────────────────────────────────

  /** 帧时间 P95 */
  getFrameP95(): number {
    return percentile(this._frameTimes.toArray(), 0.95);
  }

  /** 帧时间 P99 */
  getFrameP99(): number {
    return percentile(this._frameTimes.toArray(), 0.99);
  }

  /** 最后一帧时间 */
  getFrameLast(): number {
    return this._frameTimes.last;
  }

  // ── Phase 查询 ─────────────────────────────────────

  /** 指定阶段时间 P95 */
  getPhaseP95(phase: FramePhase): number {
    return percentile(this._phaseTimes[phase].toArray(), 0.95);
  }

  /** 指定阶段时间 P99 */
  getPhaseP99(phase: FramePhase): number {
    return percentile(this._phaseTimes[phase].toArray(), 0.99);
  }

  /** 指定阶段最后一次时间 */
  getPhaseLast(phase: FramePhase): number {
    return this._phaseTimes[phase].last;
  }

  // ── KeyEvent 查询 ──────────────────────────────────

  /** 键盘事件时间 P95 */
  getKeyEventP95(): number {
    return percentile(this._keyEventTimes.toArray(), 0.95);
  }

  /** 键盘事件时间 P99 */
  getKeyEventP99(): number {
    return percentile(this._keyEventTimes.toArray(), 0.99);
  }

  /** 最后一次键盘事件时间 */
  getKeyEventLast(): number {
    return this._keyEventTimes.last;
  }

  // ── MouseEvent 查询 ────────────────────────────────

  /** 鼠标事件时间 P95 */
  getMouseEventP95(): number {
    return percentile(this._mouseEventTimes.toArray(), 0.95);
  }

  /** 鼠标事件时间 P99 */
  getMouseEventP99(): number {
    return percentile(this._mouseEventTimes.toArray(), 0.99);
  }

  /** 最后一次鼠标事件时间 */
  getMouseEventLast(): number {
    return this._mouseEventTimes.last;
  }

  // ── Repaint 查询 ───────────────────────────────────

  /** 重绘百分比 P95 */
  getRepaintP95(): number {
    return percentile(this._repaintPercents.toArray(), 0.95);
  }

  /** 重绘百分比 P99 */
  getRepaintP99(): number {
    return percentile(this._repaintPercents.toArray(), 0.99);
  }

  /** 最后一次重绘百分比 */
  getRepaintLast(): number {
    return this._repaintPercents.last;
  }

  // ── Bytes 查询 ─────────────────────────────────────

  /** 写入字节数 P95 */
  getBytesP95(): number {
    return percentile(this._bytesWritten.toArray(), 0.95);
  }

  /** 写入字节数 P99 */
  getBytesP99(): number {
    return percentile(this._bytesWritten.toArray(), 0.99);
  }

  /** 最后一次写入字节数 */
  getBytesLast(): number {
    return this._bytesWritten.last;
  }

  // ── reset ──────────────────────────────────────────

  /** 清空所有样本数据 */
  reset(): void {
    this._frameTimes.reset();
    for (const phase of ["build", "layout", "paint", "render"] as FramePhase[]) {
      this._phaseTimes[phase].reset();
    }
    this._keyEventTimes.reset();
    this._mouseEventTimes.reset();
    this._repaintPercents.reset();
    this._bytesWritten.reset();
  }
}
