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
   * 如果当前正在执行帧，则标记 scheduled 标志位，在帧完成后自动触发新帧。
   * 如果已有待执行的定时器，则忽略重复请求。
   * 启用帧节流时，会在必要时延迟执行以满足最小帧间隔。
   */
  requestFrame(): void {
    if (this._frameInProgress) {
      this._frameScheduled = true;
      return;
    }
    if (this._pendingFrameTimer !== null) {
      return;
    }
    if (this._useFramePacing) {
      const now = Date.now();
      const elapsed = now - this._lastFrameTimestamp;
      if (elapsed < FrameScheduler.MIN_FRAME_INTERVAL) {
        const remaining = FrameScheduler.MIN_FRAME_INTERVAL - elapsed;
        this._pendingFrameTimer = setTimeout(() => {
          this._pendingFrameTimer = null;
          this.executeFrame();
        }, remaining);
        return;
      }
    }
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
    priority: number = 0
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
   * 按照 build -> layout -> paint -> render 顺序执行各阶段的回调，
   * 然后执行所有一次性 post-frame 回调。
   * 如果帧执行期间有新帧请求，帧完成后会自动触发一次后续帧（不会无限递归）。
   */
  executeFrame(): void {
    this._runFrame();

    // 如果帧执行期间收到了新帧请求，执行一次后续帧
    if (this._frameScheduled) {
      this._frameScheduled = false;
      this._runFrame();
    }
  }

  /**
   * 内部帧执行逻辑。
   *
   * 设置帧进行中标志，按顺序执行四个阶段的回调，
   * 执行一次性 post-frame 回调，然后清除帧进行中标志。
   */
  private _runFrame(): void {
    this._frameInProgress = true;
    this._frameScheduled = false;
    this._lastFrameTimestamp = Date.now();

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

    this._frameInProgress = false;
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
