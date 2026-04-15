function Wk0() {
  if (typeof process > "u") return !1;
  return process.env.BUN_TEST === "1" || process.env.VITEST === "true" || process.env.NODE_TEST_CONTEXT === "1";
}
class k8 {
  static _instance;
  _frameCallbacks = new Map();
  _postFrameCallbacks = [];
  _frameScheduled = !1;
  _frameInProgress = !1;
  _executingPostFrameCallbacks = !1;
  _pendingFrameTimer = null;
  _lastFrameTimestamp = 0;
  _useFramePacing = !Wk0();
  _stats = {
    lastFrameTime: 0,
    phaseStats: {
      ["build"]: {
        lastTime: 0
      },
      ["layout"]: {
        lastTime: 0
      },
      ["paint"]: {
        lastTime: 0
      },
      ["render"]: {
        lastTime: 0
      }
    }
  };
  _lastCompletedStats = this.deepCopyStats(this._stats);
  static get instance() {
    return k8._instance ??= new k8();
  }
  requestFrame() {
    if (this._frameScheduled) return;
    if (this._frameInProgress) {
      this._frameScheduled = !0;
      return;
    }
    if (!this._useFramePacing) {
      this._frameScheduled = !0, this.scheduleFrameExecution(0);
      return;
    }
    let T = performance.now(),
      R = this._lastFrameTimestamp,
      a = T - R;
    if (R === 0 || a >= cP) {
      this._frameScheduled = !0, this.scheduleFrameExecution(0);
      return;
    }
    let e = Math.max(0, cP - a);
    this._frameScheduled = !0, this.scheduleFrameExecution(e);
  }
  scheduleFrameExecution(T) {
    if (T <= 0) {
      setImmediate(() => this.runScheduledFrame());
      return;
    }
    this._pendingFrameTimer = setTimeout(() => this.runScheduledFrame(), T);
  }
  runScheduledFrame() {
    if (this._pendingFrameTimer) clearTimeout(this._pendingFrameTimer), this._pendingFrameTimer = null;
    if (this._frameInProgress) return;
    this.executeFrame();
  }
  addFrameCallback(T, R, a, e = 0, t) {
    this._frameCallbacks.set(T, {
      callback: R,
      phase: a,
      priority: e,
      name: t || T
    });
  }
  removeFrameCallback(T) {
    this._frameCallbacks.delete(T);
  }
  addPostFrameCallback(T, R) {
    if (this._postFrameCallbacks.push({
      callback: T,
      name: R
    }), !this._frameScheduled && (!this._frameInProgress || this._executingPostFrameCallbacks)) this.requestFrame();
  }
  executeFrame() {
    if (this._frameInProgress) return;
    let T = performance.now();
    this._frameScheduled = !1, this._frameInProgress = !0;
    try {
      for (let R of ["build", "layout", "paint", "render"]) this.executePhase(R);
      this.executePostFrameCallbacks();
    } catch (R) {
      J.error("Frame execution error:", R instanceof Error ? R.message : String(R));
    } finally {
      if (this.recordFrameStats(performance.now() - T), this._lastFrameTimestamp = T, this._lastCompletedStats = this.deepCopyStats(this._stats), this._frameInProgress = !1, this._frameScheduled) {
        let R = performance.now() - this._lastFrameTimestamp,
          a = R >= cP ? 0 : Math.max(0, cP - R);
        this.scheduleFrameExecution(a);
      }
    }
  }
  executePhase(T) {
    let R = performance.now();
    try {
      let a = Array.from(this._frameCallbacks.values()).filter(e => e.phase === T).sort((e, t) => e.priority - t.priority);
      for (let e of a) try {
        e.callback();
      } catch (t) {
        J.error(`Frame callback error in ${T} phase (${e.name})`, {
          errorMessage: t instanceof Error ? t.message : String(t),
          errorType: t?.constructor?.name,
          stackTrace: t instanceof Error ? t.stack : void 0
        }), e8(!1, `FATAL: ${T} error in ${e.name}: ${t}`);
      }
    } finally {
      let a = performance.now() - R;
      this.recordPhaseStats(T, a);
    }
  }
  executePostFrameCallbacks() {
    if (this._postFrameCallbacks.length === 0) return;
    let T = this._postFrameCallbacks.splice(0);
    this._executingPostFrameCallbacks = !0;
    try {
      for (let {
        callback: R,
        name: a
      } of T) try {
        R();
      } catch (e) {
        J.error(`Post-frame callback error (${a || "anonymous"}):`, e instanceof Error ? e.message : String(e));
      }
    } finally {
      this._executingPostFrameCallbacks = !1;
    }
  }
  recordFrameStats(T) {
    this._stats.lastFrameTime = T;
  }
  recordPhaseStats(T, R) {
    this._stats.phaseStats[T].lastTime = R;
  }
  get isFrameScheduled() {
    return this._frameScheduled || this._frameInProgress;
  }
  get isFrameInProgress() {
    return this._frameInProgress;
  }
  get frameStats() {
    return this.deepCopyStats(this._lastCompletedStats);
  }
  deepCopyStats(T) {
    return {
      ...T,
      phaseStats: {
        ["build"]: {
          ...T.phaseStats.build
        },
        ["layout"]: {
          ...T.phaseStats.layout
        },
        ["paint"]: {
          ...T.phaseStats.paint
        },
        ["render"]: {
          ...T.phaseStats.render
        }
      }
    };
  }
  resetStats() {
    this._stats = {
      lastFrameTime: 0,
      phaseStats: {
        ["build"]: {
          lastTime: 0
        },
        ["layout"]: {
          lastTime: 0
        },
        ["paint"]: {
          lastTime: 0
        },
        ["render"]: {
          lastTime: 0
        }
      }
    };
  }
  get pendingPostFrameCallbacks() {
    return this._postFrameCallbacks.length;
  }
  dispose() {
    if (this._pendingFrameTimer) clearTimeout(this._pendingFrameTimer), this._pendingFrameTimer = null;
    this._frameCallbacks.clear(), this._postFrameCallbacks.length = 0, this._frameScheduled = !1, this._frameInProgress = !1, this._lastFrameTimestamp = 0, this.resetStats();
  }
}