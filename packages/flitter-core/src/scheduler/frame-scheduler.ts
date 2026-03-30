// FrameScheduler — singleton that orchestrates on-demand frame execution
// Amp ref: c9, amp-strings.txt:530126
// Reference: .reference/frame-scheduler.md
//
// CRITICAL Amp fidelity notes:
// - Singleton with static _instance and static get instance()
// - 4-phase pipeline: BUILD -> LAYOUT -> PAINT -> RENDER
// - Frame coalescing: multiple requestFrame() calls => single frame
// - Frame pacing: respects 60fps budget (~16.67ms) in production
// - Test mode: _useFramePacing = false, frames execute immediately via setImmediate
// - No setInterval — entirely on-demand / event-driven

// ---------------------------------------------------------------------------
// Phase Enum (Amp: oJ)
// Amp ref: amp-strings.txt:530126
// ---------------------------------------------------------------------------

export const Phase = {
  BUILD: 'build',
  LAYOUT: 'layout',
  PAINT: 'paint',
  RENDER: 'render',
} as const;

export type Phase = (typeof Phase)[keyof typeof Phase];

/** Ordered array of phases for pipeline iteration */
const PHASE_ORDER: readonly Phase[] = [
  Phase.BUILD,
  Phase.LAYOUT,
  Phase.PAINT,
  Phase.RENDER,
];

// ---------------------------------------------------------------------------
// Frame Timing Constants (Amp: Iz8, Oy)
// Amp ref: amp-strings.txt:530126
// ---------------------------------------------------------------------------

/** Target frames per second */
export const TARGET_FPS = 60;

/** Frame budget in milliseconds (~16.67ms) */
export const FRAME_BUDGET_MS = 1000 / TARGET_FPS;

// ---------------------------------------------------------------------------
// Test Environment Detection (Amp: jz8)
// Amp ref: amp-strings.txt:530126
// ---------------------------------------------------------------------------

function isTestEnvironment(): boolean {
  if (typeof process === 'undefined') return false;
  return (
    process.env.BUN_TEST === '1' ||
    process.env.VITEST === 'true' ||
    process.env.NODE_TEST_CONTEXT === '1'
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A registered per-phase callback */
export interface FrameCallback {
  callback: () => void;
  phase: Phase;
  priority: number;
  name: string;
}

/** A one-shot post-frame callback */
export interface PostFrameCallback {
  callback: () => void;
  name: string;
}

/** Per-phase timing stat */
export interface PhaseStat {
  lastTime: number;
}

/** Frame stats snapshot */
export interface FrameStats {
  lastFrameTime: number;
  phaseStats: Record<Phase, PhaseStat>;
}

// ---------------------------------------------------------------------------
// FrameScheduler (Amp: c9) -- Singleton
// Amp ref: amp-strings.txt:530126
//
// Orchestrates the 4-phase frame pipeline:
//   1. requestFrame() — coalesces and paces frame requests
//   2. executeFrame() — runs BUILD, LAYOUT, PAINT, RENDER phases
//   3. Post-frame callbacks — one-shot tasks after all phases
//
// On-demand: frames are only scheduled when dirty state triggers
// requestFrame(). No setInterval or continuous loop.
// ---------------------------------------------------------------------------

export class FrameScheduler {
  // Amp ref: c9._instance
  private static _instance: FrameScheduler | null = null;

  // Amp ref: c9._frameCallbacks = new Map()
  private _frameCallbacks: Map<string, FrameCallback> = new Map();

  // Amp ref: c9._postFrameCallbacks = []
  private _postFrameCallbacks: PostFrameCallback[] = [];

  // Amp ref: c9._frameScheduled = false
  private _frameScheduled: boolean = false;

  // Amp ref: c9._frameInProgress = false
  private _frameInProgress: boolean = false;

  // Amp ref: c9._executingPostFrameCallbacks = false
  private _executingPostFrameCallbacks: boolean = false;

  // Amp ref: c9._pendingFrameTimer = null
  private _pendingFrameTimer: ReturnType<typeof setTimeout> | null = null;

  // Amp ref: c9._lastFrameTimestamp = 0
  private _lastFrameTimestamp: number = 0;

  // Pause state for TUI suspend (external editor integration)
  // When paused, requestFrame() records demand but does not schedule execution.
  private _paused: boolean = false;

  // Amp ref: c9._useFramePacing = !jz8()
  private _useFramePacing: boolean = !isTestEnvironment();

  // Amp ref: c9._stats
  private _stats: FrameStats = {
    lastFrameTime: 0,
    phaseStats: {
      [Phase.BUILD]: { lastTime: 0 },
      [Phase.LAYOUT]: { lastTime: 0 },
      [Phase.PAINT]: { lastTime: 0 },
      [Phase.RENDER]: { lastTime: 0 },
    },
  };

  // Amp ref: c9._lastCompletedStats = this.deepCopyStats(this._stats)
  private _lastCompletedStats: FrameStats = this.deepCopyStats(this._stats);

  private _errorLogger: (msg: string, ...args: unknown[]) => void =
    console.error;

  // -------------------------------------------------------------------------
  // Singleton Access
  // Amp ref: static get instance() { return c9._instance ??= new c9; }
  // -------------------------------------------------------------------------

  static get instance(): FrameScheduler {
    return (FrameScheduler._instance ??= new FrameScheduler());
  }

  /**
   * Reset the singleton for testing.
   * Clears instance, all callbacks, timers, and state.
   */
  static reset(): void {
    if (FrameScheduler._instance) {
      const inst = FrameScheduler._instance;
      if (inst._pendingFrameTimer !== null) {
        clearTimeout(inst._pendingFrameTimer);
        inst._pendingFrameTimer = null;
      }
      inst._frameCallbacks.clear();
      inst._postFrameCallbacks.length = 0;
      inst._frameScheduled = false;
      inst._frameInProgress = false;
      inst._executingPostFrameCallbacks = false;
      inst._lastFrameTimestamp = 0;
      inst._paused = false;
    }
    FrameScheduler._instance = null;
  }

  /**
   * Disable frame pacing for testing.
   * When frame pacing is disabled, frames execute immediately via setImmediate
   * instead of being delayed for 60fps pacing.
   *
   * This is separate from isTestEnvironment() to support cases where
   * BUN_TEST env var is not set by the test runner.
   */
  disableFramePacing(): void {
    this._useFramePacing = false;
  }

  /**
   * Enable frame pacing (production mode).
   * Frames will be paced to respect 60fps (~16.67ms) budget.
   */
  enableFramePacing(): void {
    this._useFramePacing = true;
  }

  /**
   * Pause frame scheduling. Any requestFrame() calls while paused
   * are recorded but not acted upon until resume().
   * Used when suspending the TUI for an external process (e.g., $EDITOR).
   */
  pause(): void {
    this._paused = true;
    // Cancel any pending timer so no frames fire while paused
    if (this._pendingFrameTimer !== null) {
      clearTimeout(this._pendingFrameTimer);
      this._pendingFrameTimer = null;
    }
  }

  /**
   * Resume frame scheduling. If frames were requested while paused,
   * schedule one immediately.
   */
  resume(): void {
    const wasPaused = this._paused;
    this._paused = false;
    if (wasPaused && this._frameScheduled) {
      this.scheduleFrameExecution(0);
    }
  }

  /**
   * Whether the frame scheduler is currently paused.
   */
  get isPaused(): boolean {
    return this._paused;
  }

  setErrorLogger(logger: (msg: string, ...args: unknown[]) => void): void {
    this._errorLogger = logger;
  }

  // -------------------------------------------------------------------------
  // requestFrame() — On-Demand Scheduling Entry Point
  // Amp ref: c9.requestFrame()
  // -------------------------------------------------------------------------

  /**
   * Request a new frame to be scheduled.
   *
   * - Coalesces multiple calls: if already scheduled, returns immediately
   * - If frame in progress, marks for re-run after current frame completes
   * - Respects frame pacing in production (60fps budget)
   * - In test mode, executes immediately via setImmediate
   */
  requestFrame(): void {
    // Already queued — skip (coalesce)
    if (this._frameScheduled) return;

    // Frame in progress — mark for re-run after current frame
    if (this._frameInProgress) {
      this._frameScheduled = true;
      return;
    }

    // Paused — record demand but do not schedule
    if (this._paused) {
      this._frameScheduled = true;
      return;
    }

    // Test mode: no pacing, schedule immediately
    if (!this._useFramePacing) {
      this._frameScheduled = true;
      this.scheduleFrameExecution(0);
      return;
    }

    // Frame pacing: respect the 16.67ms budget
    const now = performance.now();
    const lastFrame = this._lastFrameTimestamp;
    const elapsed = now - lastFrame;

    if (lastFrame === 0 || elapsed >= FRAME_BUDGET_MS) {
      // First frame or enough time has passed — run now
      this._frameScheduled = true;
      this.scheduleFrameExecution(0);
      return;
    }

    // Delay to hit the frame boundary
    const remaining = Math.max(0, FRAME_BUDGET_MS - elapsed);
    this._frameScheduled = true;
    this.scheduleFrameExecution(remaining);
  }

  // -------------------------------------------------------------------------
  // scheduleFrameExecution(delay)
  // Amp ref: c9.scheduleFrameExecution(g)
  // -------------------------------------------------------------------------

  /**
   * Schedule the actual frame execution with an optional delay.
   *
   * - delay <= 0: use setImmediate (yield to I/O, high priority)
   * - delay > 0: use setTimeout for frame pacing
   */
  private scheduleFrameExecution(delay: number): void {
    if (delay <= 0) {
      // Amp: setImmediate(() => this.runScheduledFrame())
      setImmediate(() => this.runScheduledFrame());
      return;
    }
    // Amp: this._pendingFrameTimer = setTimeout(...)
    this._pendingFrameTimer = setTimeout(
      () => this.runScheduledFrame(),
      delay,
    );
  }

  // -------------------------------------------------------------------------
  // runScheduledFrame()
  // Amp ref: c9.runScheduledFrame()
  // -------------------------------------------------------------------------

  /**
   * Entry point for scheduled frame execution.
   * Clears pending timer and guards against re-entry.
   */
  private runScheduledFrame(): void {
    // Clear pending timer handle
    if (this._pendingFrameTimer) {
      clearTimeout(this._pendingFrameTimer);
      this._pendingFrameTimer = null;
    }
    // Guard against re-entry
    if (this._frameInProgress) return;
    this.executeFrame();
  }

  // -------------------------------------------------------------------------
  // executeFrame() — Core Frame Loop
  // Amp ref: c9.executeFrame()
  // -------------------------------------------------------------------------

  /**
   * Execute a complete frame: all 4 phases + post-frame callbacks.
   *
   * Phases execute in strict order: BUILD -> LAYOUT -> PAINT -> RENDER
   * After phases, post-frame callbacks run (one-shot).
   * If _frameScheduled was set during execution, re-schedules with pacing.
   */
  private executeFrame(): void {
    // Guard against re-entry
    if (this._frameInProgress) return;

    const startTime = performance.now();
    this._frameScheduled = false;
    this._frameInProgress = true;

    try {
      // Execute 4-phase pipeline in strict order
      // Amp ref: for (let t of ["build", "layout", "paint", "render"]) this.executePhase(t)
      for (const phase of PHASE_ORDER) {
        this.executePhase(phase);
      }

      // Execute one-shot post-frame callbacks
      this.executePostFrameCallbacks();
    } catch (error) {
      // Amp ref: V.error("Frame execution error:", ...)
      // In production, errors would go to a logger. For now, console.error.
      const message =
        error instanceof Error ? error.message : String(error);
      this._errorLogger('Frame execution error:', message);
    } finally {
      // Record frame timing stats
      this.recordFrameStats(performance.now() - startTime);
      this._lastFrameTimestamp = startTime;
      this._lastCompletedStats = this.deepCopyStats(this._stats);
      this._frameInProgress = false;

      // If another frame was requested during execution, re-schedule
      // Amp ref: if (this._frameScheduled) { ... scheduleFrameExecution(b) }
      if (this._frameScheduled) {
        if (!this._useFramePacing) {
          // Test mode: schedule immediately
          this.scheduleFrameExecution(0);
        } else {
          const elapsed = performance.now() - this._lastFrameTimestamp;
          const delay =
            elapsed >= FRAME_BUDGET_MS
              ? 0
              : Math.max(0, FRAME_BUDGET_MS - elapsed);
          this.scheduleFrameExecution(delay);
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // executePhase(phase)
  // Amp ref: c9.executePhase(g)
  // -------------------------------------------------------------------------

  /**
   * Execute all callbacks registered for a given phase.
   *
   * Callbacks are filtered by phase, sorted by priority (lower = first),
   * and executed with individual try/catch (error in one callback does
   * not prevent others from executing).
   */
  private executePhase(phase: Phase): void {
    const phaseStart = performance.now();

    try {
      // Amp ref: Array.from(this._frameCallbacks.values())
      //   .filter(s => s.phase === g)
      //   .sort((s, a) => s.priority - a.priority)
      const callbacks = Array.from(this._frameCallbacks.values())
        .filter((cb) => cb.phase === phase)
        .sort((a, b) => a.priority - b.priority);

      for (const cb of callbacks) {
        try {
          cb.callback();
        } catch (error) {
          // Amp ref: V.error(`Frame callback error in ${g} phase (${s.name})`, {...})
          const message =
            error instanceof Error ? error.message : String(error);
          this._errorLogger(
            `Frame callback error in ${phase} phase (${cb.name}):`,
            message,
          );
        }
      }
    } finally {
      // Record per-phase timing
      const phaseTime = performance.now() - phaseStart;
      this.recordPhaseStats(phase, phaseTime);
    }
  }

  // -------------------------------------------------------------------------
  // Post-Frame Callbacks
  // Amp ref: c9.executePostFrameCallbacks()
  // -------------------------------------------------------------------------

  /**
   * Execute and drain all pending post-frame callbacks.
   *
   * Post-frame callbacks are one-shot: they are removed after execution.
   * New callbacks added during execution are NOT executed in this round.
   */
  private executePostFrameCallbacks(): void {
    if (this._postFrameCallbacks.length === 0) return;

    // Drain all pending callbacks (splice returns removed items)
    // Amp ref: let g = this._postFrameCallbacks.splice(0)
    const callbacks = this._postFrameCallbacks.splice(0);
    this._executingPostFrameCallbacks = true;

    try {
      for (const { callback, name } of callbacks) {
        try {
          callback();
        } catch (error) {
          // Amp ref: V.error(`Post-frame callback error (${b || "anonymous"}):`, ...)
          const message =
            error instanceof Error ? error.message : String(error);
          this._errorLogger(
            `Post-frame callback error (${name || 'anonymous'}):`,
            message,
          );
        }
      }
    } finally {
      this._executingPostFrameCallbacks = false;
    }
  }

  // -------------------------------------------------------------------------
  // Callback Registration
  // Amp ref: c9.addFrameCallback, c9.removeFrameCallback, c9.addPostFrameCallback
  // -------------------------------------------------------------------------

  /**
   * Register a per-phase frame callback.
   *
   * @param id - Unique identifier for the callback (used as Map key)
   * @param callback - Function to execute during the phase
   * @param phase - Which pipeline phase to execute in
   * @param priority - Execution order within the phase (lower = first). Default 0.
   * @param name - Human-readable name for debugging
   */
  addFrameCallback(
    id: string,
    callback: () => void,
    phase: Phase,
    priority: number = 0,
    name?: string,
  ): void {
    // Amp ref: this._frameCallbacks.set(id, { callback, phase, priority, name: name || id })
    this._frameCallbacks.set(id, {
      callback,
      phase,
      priority,
      name: name || id,
    });
  }

  /**
   * Remove a previously registered frame callback.
   *
   * @param id - The callback identifier to remove
   */
  removeFrameCallback(id: string): void {
    // Amp ref: this._frameCallbacks.delete(id)
    this._frameCallbacks.delete(id);
  }

  /**
   * Add a one-shot post-frame callback.
   *
   * Post-frame callbacks execute after all 4 phases complete,
   * then are removed. Requests a frame if not already scheduled.
   *
   * @param callback - Function to execute after the frame
   * @param name - Human-readable name for debugging
   */
  addPostFrameCallback(callback: () => void, name?: string): void {
    // Amp ref: this._postFrameCallbacks.push({ callback, name })
    this._postFrameCallbacks.push({
      callback,
      name: name || 'anonymous',
    });

    // Request a frame if not already scheduled
    // Amp ref: if (!this._frameScheduled && (!this._frameInProgress || this._executingPostFrameCallbacks))
    //   this.requestFrame()
    if (
      !this._frameScheduled &&
      (!this._frameInProgress || this._executingPostFrameCallbacks)
    ) {
      this.requestFrame();
    }
  }

  // -------------------------------------------------------------------------
  // Stats & Getters
  // Amp ref: c9 stats methods and getters
  // -------------------------------------------------------------------------

  /**
   * Record total frame execution time.
   * Amp ref: c9.recordFrameStats(g) { this._stats.lastFrameTime = g; }
   */
  private recordFrameStats(totalTime: number): void {
    this._stats.lastFrameTime = totalTime;
  }

  /**
   * Record execution time for a specific phase.
   * Amp ref: c9.recordPhaseStats(g, t) { this._stats.phaseStats[g].lastTime = t; }
   */
  private recordPhaseStats(phase: Phase, time: number): void {
    this._stats.phaseStats[phase].lastTime = time;
  }

  /**
   * Whether a frame is scheduled or currently in progress.
   * Amp ref: get isFrameScheduled() { return this._frameScheduled || this._frameInProgress; }
   */
  get isFrameScheduled(): boolean {
    return this._frameScheduled || this._frameInProgress;
  }

  /**
   * Whether a frame is currently being executed.
   * Amp ref: get isFrameInProgress() { return this._frameInProgress; }
   */
  get isFrameInProgress(): boolean {
    return this._frameInProgress;
  }

  /**
   * Get a deep copy of the last completed frame stats.
   * Amp ref: get frameStats() { return this.deepCopyStats(this._lastCompletedStats); }
   */
  get frameStats(): FrameStats {
    return this.deepCopyStats(this._lastCompletedStats);
  }

  /**
   * Deep copy stats object including nested phaseStats.
   * Amp ref: c9.deepCopyStats(g)
   */
  private deepCopyStats(stats: FrameStats): FrameStats {
    return {
      ...stats,
      phaseStats: {
        [Phase.BUILD]: { ...stats.phaseStats[Phase.BUILD] },
        [Phase.LAYOUT]: { ...stats.phaseStats[Phase.LAYOUT] },
        [Phase.PAINT]: { ...stats.phaseStats[Phase.PAINT] },
        [Phase.RENDER]: { ...stats.phaseStats[Phase.RENDER] },
      },
    };
  }

  /**
   * Reset all stats to zero.
   * Amp ref: c9.resetStats()
   */
  resetStats(): void {
    this._stats = {
      lastFrameTime: 0,
      phaseStats: {
        [Phase.BUILD]: { lastTime: 0 },
        [Phase.LAYOUT]: { lastTime: 0 },
        [Phase.PAINT]: { lastTime: 0 },
        [Phase.RENDER]: { lastTime: 0 },
      },
    };
    this._lastCompletedStats = this.deepCopyStats(this._stats);
  }

  /**
   * Whether frame pacing is enabled (false in test environments).
   * Exposed for testing only.
   */
  get useFramePacing(): boolean {
    return this._useFramePacing;
  }

  /**
   * Get the number of registered frame callbacks.
   * Useful for diagnostics.
   */
  get frameCallbackCount(): number {
    return this._frameCallbacks.size;
  }

  /**
   * Get the number of pending post-frame callbacks.
   * Useful for diagnostics.
   */
  get postFrameCallbackCount(): number {
    return this._postFrameCallbacks.length;
  }
}
