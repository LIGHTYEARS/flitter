/**
 * PerformanceTracker 帧性能采样器测试。
 *
 * 覆盖: percentile 函数、RingBuffer 环形缓冲、PerformanceTracker 全部 record/get 方法。
 *
 * @module
 */

import { describe, expect, it } from "vitest";
import type { FramePhase } from "../tree/frame-scheduler.js";
import { PerformanceTracker, percentile, RingBuffer } from "./performance-tracker.js";

// ── percentile 函数 ──────────────────────────────────

describe("percentile", () => {
  it("空数组返回 0", () => {
    expect(percentile([], 0.95)).toBe(0);
  });

  it("单元素数组返回该元素", () => {
    expect(percentile([42], 0.5)).toBe(42);
    expect(percentile([42], 0.95)).toBe(42);
    expect(percentile([42], 0.99)).toBe(42);
  });

  it("五元素数组 P50 = 3", () => {
    expect(percentile([1, 2, 3, 4, 5], 0.5)).toBe(3);
  });

  it("十元素数组 P95 = 10", () => {
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.95)).toBe(10);
  });

  it("十元素数组 P99 = 10", () => {
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.99)).toBe(10);
  });

  it("边界值 p=0 返回最小值", () => {
    expect(percentile([5, 3, 1, 4, 2], 0)).toBe(1);
  });

  it("边界值 p=1 返回最大值", () => {
    expect(percentile([5, 3, 1, 4, 2], 1)).toBe(5);
  });

  it("不修改原始数组", () => {
    const arr = [3, 1, 2];
    percentile(arr, 0.5);
    expect(arr).toEqual([3, 1, 2]);
  });
});

// ── RingBuffer 环形缓冲 ─────────────────────────────

describe("RingBuffer", () => {
  it("初始长度为 0", () => {
    const buf = new RingBuffer(4);
    expect(buf.length).toBe(0);
    expect(buf.toArray()).toEqual([]);
  });

  it("push 后长度递增", () => {
    const buf = new RingBuffer(4);
    buf.push(1);
    buf.push(2);
    expect(buf.length).toBe(2);
    expect(buf.toArray()).toEqual([1, 2]);
  });

  it("toArray 返回按时间顺序排列的数据", () => {
    const buf = new RingBuffer(4);
    buf.push(10);
    buf.push(20);
    buf.push(30);
    expect(buf.toArray()).toEqual([10, 20, 30]);
  });

  it("容量溢出时淘汰最旧样本", () => {
    const buf = new RingBuffer(3);
    buf.push(1);
    buf.push(2);
    buf.push(3);
    buf.push(4); // 淘汰 1
    expect(buf.length).toBe(3);
    expect(buf.toArray()).toEqual([2, 3, 4]);
  });

  it("last 返回最后写入的值", () => {
    const buf = new RingBuffer(4);
    buf.push(10);
    buf.push(20);
    expect(buf.last).toBe(20);
  });

  it("last 在空缓冲区返回 0", () => {
    const buf = new RingBuffer(4);
    expect(buf.last).toBe(0);
  });

  it("reset 清空缓冲区", () => {
    const buf = new RingBuffer(4);
    buf.push(1);
    buf.push(2);
    buf.reset();
    expect(buf.length).toBe(0);
    expect(buf.toArray()).toEqual([]);
  });

  it("capacity 属性返回构造时传入的容量", () => {
    const buf = new RingBuffer(128);
    expect(buf.capacity).toBe(128);
  });

  it("大量写入后仍维持容量上限", () => {
    const buf = new RingBuffer(4);
    for (let i = 0; i < 100; i++) buf.push(i);
    expect(buf.length).toBe(4);
    expect(buf.toArray()).toEqual([96, 97, 98, 99]);
  });
});

// ── PerformanceTracker ──────────────────────────────

describe("PerformanceTracker", () => {
  it("MAX_SAMPLES 为 1024", () => {
    const tracker = new PerformanceTracker();
    expect(tracker.MAX_SAMPLES).toBe(1024);
  });

  // -- recordFrame / getFrame* --

  it("recordFrame 后 getFrameP95 和 getFrameP99 返回值", () => {
    const tracker = new PerformanceTracker();
    tracker.recordFrame(5.0);
    expect(tracker.getFrameP95()).toBe(5.0);
    expect(tracker.getFrameP99()).toBe(5.0);
  });

  it("getFrameLast 返回最后记录的帧时间", () => {
    const tracker = new PerformanceTracker();
    tracker.recordFrame(3.0);
    tracker.recordFrame(7.0);
    expect(tracker.getFrameLast()).toBe(7.0);
  });

  it("初始 getFrameP95 返回 0", () => {
    const tracker = new PerformanceTracker();
    expect(tracker.getFrameP95()).toBe(0);
  });

  // -- recordPhase / getPhase* --

  it("recordPhase 记录各阶段时间", () => {
    const tracker = new PerformanceTracker();
    const phases: FramePhase[] = ["build", "layout", "paint", "render"];
    for (const phase of phases) {
      tracker.recordPhase(phase, 1.5);
    }
    for (const phase of phases) {
      expect(tracker.getPhaseP95(phase)).toBe(1.5);
      expect(tracker.getPhaseP99(phase)).toBe(1.5);
      expect(tracker.getPhaseLast(phase)).toBe(1.5);
    }
  });

  // -- recordKeyEvent / getKeyEvent* --

  it("recordKeyEvent 记录键盘事件时间", () => {
    const tracker = new PerformanceTracker();
    tracker.recordKeyEvent(0.5);
    tracker.recordKeyEvent(1.0);
    expect(tracker.getKeyEventP95()).toBeGreaterThan(0);
    expect(tracker.getKeyEventP99()).toBeGreaterThan(0);
    expect(tracker.getKeyEventLast()).toBe(1.0);
  });

  // -- recordMouseEvent / getMouseEvent* --

  it("recordMouseEvent 记录鼠标事件时间", () => {
    const tracker = new PerformanceTracker();
    tracker.recordMouseEvent(0.3);
    expect(tracker.getMouseEventP95()).toBe(0.3);
    expect(tracker.getMouseEventP99()).toBe(0.3);
    expect(tracker.getMouseEventLast()).toBe(0.3);
  });

  // -- recordRepaintPercent / getRepaint* --

  it("recordRepaintPercent 记录重绘百分比", () => {
    const tracker = new PerformanceTracker();
    tracker.recordRepaintPercent(5.2);
    expect(tracker.getRepaintP95()).toBe(5.2);
    expect(tracker.getRepaintP99()).toBe(5.2);
    expect(tracker.getRepaintLast()).toBe(5.2);
  });

  // -- recordBytesWritten / getBytes* --

  it("recordBytesWritten 记录写入字节数", () => {
    const tracker = new PerformanceTracker();
    tracker.recordBytesWritten(1200);
    expect(tracker.getBytesP95()).toBe(1200);
    expect(tracker.getBytesP99()).toBe(1200);
    expect(tracker.getBytesLast()).toBe(1200);
  });

  // -- 环形缓冲溢出 --

  it("超过 1024 个样本时淘汰旧数据", () => {
    const tracker = new PerformanceTracker();
    for (let i = 0; i < 2000; i++) {
      tracker.recordFrame(i * 0.01);
    }
    // 内部 RingBuffer 长度不超过 1024
    expect(tracker.getFrameP95()).toBeGreaterThan(0);
    expect(tracker.getFrameP99()).toBeGreaterThan(0);
    expect(tracker.getFrameLast()).toBeCloseTo(19.99, 2);
  });

  // -- Float64Array 精度验证 --

  it("Float64Array 精度: 小数不丢失", () => {
    const tracker = new PerformanceTracker();
    tracker.recordFrame(0.1);
    tracker.recordFrame(0.2);
    // Float64 精度应该比 Float32 好得多
    expect(tracker.getFrameLast()).toBe(0.2);
    expect(tracker.getFrameP95()).toBeCloseTo(0.2, 10);
  });

  // -- reset --

  it("reset 清空所有样本", () => {
    const tracker = new PerformanceTracker();
    tracker.recordFrame(5.0);
    tracker.recordPhase("build", 1.0);
    tracker.recordKeyEvent(0.5);
    tracker.recordMouseEvent(0.3);
    tracker.recordRepaintPercent(10.0);
    tracker.recordBytesWritten(500);

    tracker.reset();

    expect(tracker.getFrameP95()).toBe(0);
    expect(tracker.getFrameP99()).toBe(0);
    expect(tracker.getFrameLast()).toBe(0);
    expect(tracker.getPhaseP95("build")).toBe(0);
    expect(tracker.getKeyEventP95()).toBe(0);
    expect(tracker.getKeyEventLast()).toBe(0);
    expect(tracker.getMouseEventP95()).toBe(0);
    expect(tracker.getMouseEventLast()).toBe(0);
    expect(tracker.getRepaintP95()).toBe(0);
    expect(tracker.getRepaintLast()).toBe(0);
    expect(tracker.getBytesP95()).toBe(0);
    expect(tracker.getBytesLast()).toBe(0);
  });

  // -- 多值统计 --

  it("多值 P95/P99 计算正确", () => {
    const tracker = new PerformanceTracker();
    // 写入 1 到 100
    for (let i = 1; i <= 100; i++) {
      tracker.recordFrame(i);
    }
    expect(tracker.getFrameP95()).toBe(95);
    expect(tracker.getFrameP99()).toBe(99);
  });
});
