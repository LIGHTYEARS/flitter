/**
 * JetBrains 终端滚轮事件过滤器。
 *
 * 逆向: VXT in 2111_unknown_VXT.js
 *
 * JetBrains 终端（JediTerm）在边界处会发送高频、交替的 wheel_up/wheel_down
 * 信号。此过滤器通过 50ms 缓冲 + 200ms 方向锁定来抑制这种噪声。
 *
 * 工作原理:
 * 1. 缓冲阶段（50ms）：收集短时间内的所有滚轮事件
 * 2. 决策阶段：统计缓冲期内的事件，确定主导方向
 * 3. 锁定阶段（200ms）：只放行同方向事件，反向直接丢弃
 *
 * @example
 * ```ts
 * const filter = new JetBrainsWheelFilter((event) => {
 *   for (const handler of this.mouseHandlers) handler(event);
 * });
 *
 * // 在鼠标事件分发时调用
 * if (isJetBrainsTerminal() && !filter.handleWheelEvent(event)) return;
 * for (const handler of this.mouseHandlers) handler(event);
 * ```
 *
 * @module
 */

import type { MouseEvent } from "./types.js";

/** 缓冲时间（毫秒）—— 收集短时间内的滚轮事件 */
const BUFFER_MS = 50;

/** 方向锁定时间（毫秒）—— 确定方向后反向事件被丢弃 */
const DIRECTION_LOCK_MS = 200;

/** 滚轮方向 */
type WheelDirection = "wheel_up" | "wheel_down";

/**
 * JetBrains 终端滚轮事件过滤器。
 *
 * 逆向: VXT in 2111_unknown_VXT.js
 *
 * 用于抑制 JetBrains 终端在滚动边界处的方向噪声。
 */
export class JetBrainsWheelFilter {
  /** 事件缓冲队列 */
  private eventBuffer: MouseEvent[] = [];

  /** 缓冲计时器 */
  private bufferTimer: ReturnType<typeof setTimeout> | null = null;

  /** 当前锁定的方向，null 表示未锁定 */
  private filterDirection: WheelDirection | null = null;

  /** 最后一次滚轮事件时间戳 */
  private lastEventTime = 0;

  /** 过滤后的事件发射回调 */
  private onEmitEvent: (event: MouseEvent) => void;

  /**
   * 创建过滤器实例。
   *
   * @param onEmitEvent - 过滤后的事件发射回调
   */
  constructor(onEmitEvent: (event: MouseEvent) => void) {
    this.onEmitEvent = onEmitEvent;
  }

  /**
   * 处理滚轮事件。
   *
   * 逆向: VXT.handleWheelEvent in 2111_unknown_VXT.js:21-29
   *
   * @param event - 鼠标事件
   * @returns 如果事件应立即放行返回 true，否则返回 false（缓冲或丢弃）
   */
  handleWheelEvent(event: MouseEvent): boolean {
    if (event.action !== "wheel_up" && event.action !== "wheel_down") {
      return true;
    }

    const now = Date.now();

    if (this.filterDirection !== null) {
      if (now - this.lastEventTime > DIRECTION_LOCK_MS) {
        this.filterDirection = null;
      } else {
        this.lastEventTime = now;
        return event.action === this.filterDirection;
      }
    }

    this.lastEventTime = now;
    this.eventBuffer.push(event);

    if (!this.bufferTimer) {
      this.bufferTimer = setTimeout(() => {
        this.processBuffer();
      }, BUFFER_MS);
    }

    return false;
  }

  /**
   * 处理缓冲队列，确定主导方向并发射事件。
   *
   * 逆向: VXT.processBuffer in 2111_unknown_VXT.js:30-40
   *
   * 决策规则:
   * - 如果缓冲期内有任何 wheel_down 事件，锁定为 wheel_down
   * - 否则锁定为 wheel_up
   * - 只发射锁定方向的事件
   */
  private processBuffer(): void {
    this.bufferTimer = null;

    if (this.eventBuffer.length === 0) {
      return;
    }

    const hasWheelDown = this.eventBuffer.some((e) => e.action === "wheel_down");

    if (hasWheelDown) {
      this.filterDirection = "wheel_down";
      for (const event of this.eventBuffer) {
        if (event.action === "wheel_down") {
          this.onEmitEvent(event);
        }
      }
    } else {
      this.filterDirection = "wheel_up";
      for (const event of this.eventBuffer) {
        this.onEmitEvent(event);
      }
    }

    this.eventBuffer = [];
  }

  /**
   * 清理资源（取消计时器）。
   */
  dispose(): void {
    if (this.bufferTimer) {
      clearTimeout(this.bufferTimer);
      this.bufferTimer = null;
    }
    this.eventBuffer = [];
    this.filterDirection = null;
  }
}

/**
 * 检测当前是否为 JetBrains 终端。
 *
 * 逆向: ji() in 0428_unknown_CVT.js
 *
 * @param env - 环境变量对象，默认为 process.env
 * @returns 如果是 JetBrains 终端返回 true
 */
export function isJetBrainsTerminal(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.TERMINAL_EMULATOR?.includes("JetBrains") ?? false;
}
