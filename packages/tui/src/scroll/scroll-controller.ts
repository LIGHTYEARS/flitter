/**
 * 滚动控制器 —— 滚动系统的核心状态管理器。
 *
 * {@link ScrollController} 负责管理滚动偏移量（offset）、最大滚动范围
 * （maxScrollExtent）、跟随模式（followMode）和滚动动画。
 * 它是 TUI 框架中所有可滚动内容（对话消息、文件列表、命令输出）的
 * 滚动基础设施核心。
 *
 * 对应逆向工程中的 Q3 类 (widget-property-system.js 行 393-585)。
 *
 * @module
 */

import type { ScrollPhysics } from "./scroll-physics.js";
import { ClampingScrollPhysics } from "./scroll-physics.js";

// ════════════════════════════════════════════════════
//  ScrollController
// ════════════════════════════════════════════════════

/**
 * 滚动偏移量控制器。
 *
 * 提供完整的滚动管理能力：
 * - 偏移量管理: jumpTo / scrollUp / scrollDown / scrollToTop / scrollToBottom
 * - 翻页: scrollPageUp / scrollPageDown（半屏翻页）
 * - 动画过渡: animateTo（easeOutCubic 缓动曲线）
 * - 跟随模式: followMode 开启时新内容追加自动滚到底部
 * - 边界检测: atTop / atBottom / atEdge
 * - 生命周期: dispose 清理所有资源
 *
 * @example
 * ```ts
 * const controller = new ScrollController();
 * controller.updateMaxScrollExtent(200);
 * controller.jumpTo(50);
 * console.log(controller.offset); // 50
 * controller.scrollToBottom();
 * console.log(controller.offset); // 200
 * controller.dispose();
 * ```
 */
export class ScrollController {
  /** 当前滚动偏移量 */
  private _offset: number = 0;

  /** 最大滚动范围 */
  private _maxScrollExtent: number = 0;

  /** 是否处于跟随模式（自动滚到底部） */
  private _followMode: boolean = true;

  /** 是否已释放 */
  private _disposed: boolean = false;

  /** 监听器集合 */
  private _listeners: Set<() => void> = new Set();

  /** 动画定时器 */
  private _animationTimer: ReturnType<typeof setInterval> | null = null;

  /** 动画目标偏移量 */
  private _animationTarget: number | null = null;

  /** 动画起始偏移量 */
  private _animationStartOffset: number = 0;

  /** 动画起始时间戳 */
  private _animationStartTime: number = 0;

  /** 动画持续时间（毫秒） */
  private _animationDuration: number = 0;

  /** 滚动物理特性 */
  private _physics: ScrollPhysics = new ClampingScrollPhysics();

  // ════════════════════════════════════════════════════
  //  属性访问器
  // ════════════════════════════════════════════════════

  /**
   * 当前滚动偏移量。
   *
   * @returns 当前偏移量，范围 [0, maxScrollExtent]
   */
  get offset(): number {
    return this._offset;
  }

  /**
   * 最大滚动范围。
   *
   * @returns 最大可滚动偏移量
   */
  get maxScrollExtent(): number {
    return this._maxScrollExtent;
  }

  /**
   * 是否处于跟随模式。
   *
   * 跟随模式开启时，当 maxScrollExtent 更新时会自动滚动到底部，
   * 适用于流式输出场景。
   *
   * @returns 跟随模式状态
   */
  get followMode(): boolean {
    return this._followMode;
  }

  /**
   * 是否已释放资源。
   *
   * @returns 释放状态
   */
  get disposed(): boolean {
    return this._disposed;
  }

  /**
   * 是否在顶部（offset <= 0）。
   *
   * @returns 是否在顶部
   */
  get atTop(): boolean {
    return this._offset <= 0;
  }

  /**
   * 是否在底部（offset >= maxScrollExtent）。
   *
   * @returns 是否在底部
   */
  get atBottom(): boolean {
    return this._offset >= this._maxScrollExtent;
  }

  /**
   * 是否在边缘（顶部或底部）。
   *
   * @returns 是否在边缘
   */
  get atEdge(): boolean {
    return this.atTop || this.atBottom;
  }

  // ════════════════════════════════════════════════════
  //  监听器管理
  // ════════════════════════════════════════════════════

  /**
   * 添加滚动变化监听器。
   *
   * @param fn - 当偏移量或 maxScrollExtent 变化时调用的回调
   */
  addListener(fn: () => void): void {
    this._listeners.add(fn);
  }

  /**
   * 移除滚动变化监听器。
   *
   * @param fn - 要移除的回调
   */
  removeListener(fn: () => void): void {
    this._listeners.delete(fn);
  }

  /**
   * 通知所有监听器。每个回调在 try/catch 中执行，
   * 单个回调的异常不会阻止其他回调执行。
   */
  private _notifyListeners(): void {
    const snapshot = [...this._listeners];
    for (const fn of snapshot) {
      try {
        fn();
      } catch {
        // 静默处理监听器错误，不中断其他监听器
      }
    }
  }

  // ════════════════════════════════════════════════════
  //  偏移量管理
  // ════════════════════════════════════════════════════

  /**
   * 直接跳转到指定偏移量。
   *
   * 偏移量通过 ScrollPhysics 钳位到 [0, maxScrollExtent] 范围。
   * 取消正在进行的动画。如果偏移量未变化则不通知监听器。
   *
   * @param offset - 目标偏移量
   */
  jumpTo(offset: number): void {
    if (this._disposed) return;

    // 取消进行中的动画
    this._cancelAnimation();

    const clamped = this._physics.clampOffset(offset, 0, this._maxScrollExtent);
    if (this._offset === clamped) return;

    this._offset = clamped;
    this._notifyListeners();
  }

  /**
   * 更新最大滚动范围。
   *
   * 当内容高度变化（如新消息追加）时调用。
   * followMode=true 时会自动调用 scrollToBottom()。
   *
   * @param extent - 新的最大滚动范围
   */
  updateMaxScrollExtent(extent: number): void {
    if (this._disposed) return;

    const oldExtent = this._maxScrollExtent;
    this._maxScrollExtent = extent;

    if (this._followMode) {
      this.scrollToBottom();
    }

    if (oldExtent !== extent) {
      this._notifyListeners();
    }
  }

  /**
   * 向上滚动指定行数。
   *
   * @param lines - 滚动行数，默认 3
   */
  scrollUp(lines: number = 3): void {
    if (this._disposed) return;
    this.jumpTo(this._offset - lines);
  }

  /**
   * 向下滚动指定行数。
   *
   * @param lines - 滚动行数，默认 3
   */
  scrollDown(lines: number = 3): void {
    if (this._disposed) return;
    this.jumpTo(this._offset + lines);
  }

  /**
   * 滚动到顶部。
   */
  scrollToTop(): void {
    this.jumpTo(0);
  }

  /**
   * 滚动到底部。
   */
  scrollToBottom(): void {
    this.jumpTo(this._maxScrollExtent);
  }

  /**
   * 向上翻半页。
   *
   * @param viewportSize - 视口高度（行数）
   */
  scrollPageUp(viewportSize: number): void {
    const step = Math.max(1, Math.floor(viewportSize / 2));
    this.scrollUp(step);
  }

  /**
   * 向下翻半页。
   *
   * @param viewportSize - 视口高度（行数）
   */
  scrollPageDown(viewportSize: number): void {
    const step = Math.max(1, Math.floor(viewportSize / 2));
    this.scrollDown(step);
  }

  // ════════════════════════════════════════════════════
  //  动画
  // ════════════════════════════════════════════════════

  /**
   * 以 easeOutCubic 缓动曲线动画滚动到目标偏移量。
   *
   * 如果持续时间为 0 或距离 <= 1 行，直接 jumpTo。
   * 如果已有动画进行中，更新动画目标。
   *
   * @param target - 目标偏移量
   * @param duration - 动画持续时间（毫秒），默认 200
   */
  animateTo(target: number, duration: number = 200): void {
    if (this._disposed) return;

    const clamped = this._physics.clampOffset(target, 0, this._maxScrollExtent);

    // 距离太近或持续时间为 0，直接跳转
    if (duration <= 0 || Math.abs(this._offset - clamped) <= 1) {
      this.jumpTo(clamped);
      return;
    }

    // 已有动画进行中，更新目标
    if (this._animationTimer && this._animationTarget !== null) {
      this._animationTarget = clamped;
      return;
    }

    this._animationTarget = clamped;
    this._animationStartOffset = this._offset;
    this._animationStartTime = Date.now();
    this._animationDuration = Math.max(1, duration);

    this._animationTimer = setInterval(() => {
      const elapsed = Date.now() - this._animationStartTime;
      const progress = Math.min(elapsed / this._animationDuration, 1);
      const eased = this._easeOutCubic(progress);

      const target = this._animationTarget!;
      const delta = target - this._animationStartOffset;

      if (progress >= 1) {
        this._cancelAnimation();
        this._updateOffset(target);
      } else {
        const current = this._animationStartOffset + delta * eased;
        this._updateOffset(Math.round(current));
      }
    }, 16);
  }

  /**
   * easeOutCubic 缓动曲线。
   *
   * @param t - 进度值 [0, 1]
   * @returns 缓动后的进度值
   */
  private _easeOutCubic(t: number): number {
    return 1 - (1 - t) ** 3;
  }

  /**
   * 取消正在进行的动画。
   */
  private _cancelAnimation(): void {
    if (this._animationTimer) {
      clearInterval(this._animationTimer);
      this._animationTimer = null;
      this._animationTarget = null;
    }
  }

  /**
   * 内部更新偏移量并通知监听器。
   *
   * @param offset - 新的偏移量
   */
  private _updateOffset(offset: number): void {
    if (this._disposed) return;
    if (this._offset === offset) return;
    this._offset = offset;
    this._notifyListeners();
  }

  // ════════════════════════════════════════════════════
  //  followMode 控制
  // ════════════════════════════════════════════════════

  /**
   * 启用跟随模式。
   */
  enableFollowMode(): void {
    this._followMode = true;
  }

  /**
   * 禁用跟随模式。
   */
  disableFollowMode(): void {
    this._followMode = false;
  }

  /**
   * 切换跟随模式。
   */
  toggleFollowMode(): void {
    this._followMode = !this._followMode;
  }

  // ════════════════════════════════════════════════════
  //  生命周期
  // ════════════════════════════════════════════════════

  /**
   * 释放资源。
   *
   * 取消动画定时器，清空监听器列表，设置 disposed 标志。
   * 重复调用不会抛出异常。
   */
  dispose(): void {
    if (this._disposed) return;
    this._cancelAnimation();
    this._listeners.clear();
    this._disposed = true;
  }
}
