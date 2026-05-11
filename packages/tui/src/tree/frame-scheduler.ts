/**
 * 帧调度器。
 *
 * {@link FrameScheduler} 负责管理帧的调度与执行，按照
 * build -> layout -> paint -> render 四个阶段顺序执行注册的回调，
 * 并在所有阶段完成后执行一次性的 post-frame 回调。
 *
 * 支持帧节流（frame pacing）以限制最小帧间隔，可通过
 * {@link disableFramePacing} 禁用（测试场景常用）。
 *
 * @module
 */


/**
 * 帧阶段类型。
 *
 * 每帧按照 build -> layout -> paint -> render 顺序依次执行。
 */
export type FramePhase = "build" | "layout" | "paint" | "render";

/**
 * 帧回调条目，记录回调函数及其所属阶段、优先级和标识名称。
 */
interface FrameCallbackEntry {
  /** 回调函数 */
  callback: () => void;
  /** 所属帧阶段 */
  phase: FramePhase;
  /** 优先级，数值越小越先执行 */
  priority: number;
  /** 回调标识名称 */
  name: string;
}

/**
 * 帧调度器，管理帧的调度、阶段执行与回调管理。
 *
 * 帧执行顺序：build -> layout -> paint -> render -> post-frame 回调。
 * 支持在帧执行期间请求新帧（不会重入，而是在当前帧完成后自动触发）。
 */
export class FrameScheduler {
  /** 最小帧间隔（毫秒），用于帧节流 */
  static readonly MIN_FRAME_INTERVAL = 16;

  /** 已注册的帧回调，以 id 为键 */
  private _callbacks: Map<string, FrameCallbackEntry> = new Map();

  /** 一次性 post-frame 回调队列 */
  private _postFrameCallbacks: Array<() => void> = [];

  /** 当前帧执行期间是否收到了新帧请求 */
  private _frameScheduled: boolean = false;

  /** 当前是否正在执行帧 */
  private _frameInProgress: boolean = false;

  /** 待执行的帧节流定时器 */
  private _pendingFrameTimer: ReturnType<typeof setTimeout> | null = null;

  /** 上一帧执行的时间戳 */
  private _lastFrameTimestamp: number = 0;

  /** 是否启用帧节流 */
  private _useFramePacing: boolean = true;

  /**
   * 当前是否有帧已调度或正在执行。
   *
   * @returns 有帧调度或正在执行时返回 true
   */
  get isFrameScheduled(): boolean {
    return this._frameScheduled || this._frameInProgress;
  }

  /**
   * 禁用帧节流。
   *
   * 禁用后 {@link requestFrame} 将同步执行帧，不再限制最小帧间隔。
   * 通常在测试场景中使用。
   */
  disableFramePacing(): void {
    this._useFramePacing = false;
  }

  /**
   * 请求调度一帧。
   *
   * 逆向: amp k8.requestFrame — 永远不同步执行帧，
   * 通过 setImmediate/setTimeout 延迟到下一次 event loop，
   * 确保所有 pending I/O（如多个连续鼠标事件）先被处理完毕。
   *
   * 如果当前正在执行帧，则标记 scheduled 标志位，在帧完成后自动触发新帧。
   * 如果已有调度等待中，则忽略重复请求。
   */
  requestFrame(): void {
    // 逆向: amp k8 line 37-40 — 帧执行中时仅标记，不重入
    if (this._frameScheduled) return;
    if (this._frameInProgress) {
      this._frameScheduled = true;
      return;
    }

    this._frameScheduled = true;

    if (!this._useFramePacing) {
      // 逆向: amp k8 line 42-43 — 测试模式直接 setImmediate(0)
      this._scheduleExecution(0);
      return;
    }

    const now = performance.now();
    const elapsed = now - this._lastFrameTimestamp;

    if (this._lastFrameTimestamp === 0 || elapsed >= FrameScheduler.MIN_FRAME_INTERVAL) {
      // 逆向: amp k8 line 49-50 — 足够时间已过，立即调度（但仍异步）
      this._scheduleExecution(0);
      return;
    }

    // 逆向: amp k8 line 53-54 — 帧节流，等待剩余时间
    const remaining = Math.max(0, FrameScheduler.MIN_FRAME_INTERVAL - elapsed);
    this._scheduleExecution(remaining);
  }

  /**
   * 调度帧执行。
   *
   * 逆向: amp k8.scheduleFrameExecution — delay=0 时用 setImmediate，
   * 确保在当前 event loop 的所有 I/O callbacks 处理完后才执行帧。
   * 这防止了连续鼠标事件之间的中间状态被渲染。
   */
  private _scheduleExecution(delay: number): void {
    if (delay <= 0) {
      // setImmediate 在 I/O callbacks 之后执行，让 pending 输入事件先被处理
      setImmediate(() => this._runScheduledFrame());
    } else {
      this._pendingFrameTimer = setTimeout(() => this._runScheduledFrame(), delay);
    }
  }

  /**
   * 运行已调度的帧。
   *
   * 逆向: amp k8.runScheduledFrame
   */
  private _runScheduledFrame(): void {
    this._pendingFrameTimer = null;
    if (this._frameInProgress) return;
    this.executeFrame();
  }

  /**
   * 注册帧回调到指定阶段。
   *
   * 同一 id 的回调会覆盖之前注册的回调。
   *
   * @param id - 回调唯一标识
   * @param callback - 回调函数
   * @param phase - 所属帧阶段
   * @param priority - 优先级（默认 0），数值越小越先执行
   */
  addFrameCallback(
    id: string,
    callback: () => void,
    phase: FramePhase,
    priority: number = 0,
  ): void {
    this._callbacks.set(id, { callback, phase, priority, name: id });
  }

  /**
   * 移除指定 id 的帧回调。
   *
   * @param id - 要移除的回调标识
   */
  removeFrameCallback(id: string): void {
    this._callbacks.delete(id);
  }

  /**
   * 添加一次性 post-frame 回调。
   *
   * 该回调将在下一帧的四个阶段全部完成后执行一次，然后自动移除。
   * 添加后会自动请求一帧以确保回调被执行。
   *
   * @param callback - 回调函数
   */
  addPostFrameCallback(callback: () => void): void {
    this._postFrameCallbacks.push(callback);
    this.requestFrame();
  }

  /**
   * 执行一帧。
   *
   * 逆向: amp k8.executeFrame — 清除 scheduled 标志，设置 inProgress，
   * 执行四阶段 + post-frame 回调。帧完成后如果有新请求则重新调度。
   */
  executeFrame(): void {
    if (this._frameInProgress) return;

    this._frameScheduled = false;
    this._frameInProgress = true;
    this._lastFrameTimestamp = performance.now();

    try {
      // 按顺序执行四个阶段
      const phases: FramePhase[] = ["build", "layout", "paint", "render"];
      for (const phase of phases) {
        this._executePhase(phase);
      }

      // 执行一次性 post-frame 回调
      const postCallbacks = [...this._postFrameCallbacks];
      this._postFrameCallbacks = [];
      for (const cb of postCallbacks) {
        cb();
      }
    } finally {
      this._frameInProgress = false;

      // 逆向: amp k8 line 95-99 — 帧执行期间如果收到新请求，重新调度
      if (this._frameScheduled) {
        if (!this._useFramePacing) {
          this._scheduleExecution(0);
        } else {
          const now = performance.now();
          const elapsed = now - this._lastFrameTimestamp;
          const delay = elapsed >= FrameScheduler.MIN_FRAME_INTERVAL
            ? 0
            : Math.max(0, FrameScheduler.MIN_FRAME_INTERVAL - elapsed);
          this._scheduleExecution(delay);
        }
      }
    }
  }

  /** @deprecated 已合并到 executeFrame，保留仅为向后兼容测试 */
  private _runFrame(): void {
    this.executeFrame();
  }

  /**
   * 执行指定阶段的所有回调。
   *
   * 筛选出属于该阶段的回调，按优先级升序排列后依次执行。
   *
   * @param phase - 要执行的帧阶段
   */
  private _executePhase(phase: FramePhase): void {
    const entries: FrameCallbackEntry[] = [];
    for (const entry of this._callbacks.values()) {
      if (entry.phase === phase) {
        entries.push(entry);
      }
    }
    entries.sort((a, b) => a.priority - b.priority);
    for (const entry of entries) {
      entry.callback();
    }
  }

  /**
   * 释放资源。
   *
   * 清除待执行的定时器、所有帧回调和 post-frame 回调。
   */
  dispose(): void {
    if (this._pendingFrameTimer !== null) {
      clearTimeout(this._pendingFrameTimer);
      this._pendingFrameTimer = null;
    }
    this._callbacks.clear();
    this._postFrameCallbacks = [];
  }
}
