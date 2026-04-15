class nVT {
  options;
  inFlight = null;
  readyWaiter = null;
  retryTimer = null;
  attempt = 0;
  generation = 0;
  lastInfo = null;
  disposed = !1;
  baseDelayMs;
  maxDelayMs;
  maxAttempts;
  constructor(T) {
    this.options = T, this.baseDelayMs = T.baseDelayMs ?? OM.baseDelayMs, this.maxDelayMs = T.maxDelayMs ?? OM.maxDelayMs, this.maxAttempts = T.maxAttempts ?? OM.maxAttempts;
  }
  ensureHandshake(T) {
    return this.tryHandshake(T);
  }
  ensureReady(T) {
    if (this.disposed) return Promise.reject(Error("Executor handshake manager is disposed"));
    if (this.isReady()) return Promise.resolve();
    if (!this.readyWaiter) this.readyWaiter = up0();
    this.tryHandshake("connect");
    let R = this.readyWaiter.promise;
    if (!T?.timeoutMs) return R;
    let a = T.timeoutMessage ?? `Timed out waiting for handshake after ${T.timeoutMs}ms`;
    return this.withTimeout(R, T.timeoutMs, a);
  }
  handleConnectionChange(T) {
    if (this.lastInfo = T, T.state !== "connected") {
      this.reset("disconnected");
      return;
    }
    if (T.role === "executor") {
      this.reset("executor"), this.resolveReadyWaiter();
      return;
    }
    this.tryHandshake("connect");
  }
  dispose() {
    this.disposed = !0, this.generation++, this.clearRetryTimer(), this.rejectReadyWaiter(Error("Executor handshake manager is disposed"));
  }
  isReady() {
    return this.lastInfo?.state === "connected" && this.lastInfo.role === "executor";
  }
  resolveReadyWaiter() {
    let T = this.readyWaiter;
    if (!T) return;
    this.readyWaiter = null, T.resolve();
  }
  rejectReadyWaiter(T) {
    let R = this.readyWaiter;
    if (!R) return;
    this.readyWaiter = null, R.reject(T);
  }
  reset(T) {
    this.generation++, this.attempt = 0, this.clearRetryTimer();
  }
  clearRetryTimer() {
    if (!this.retryTimer) return;
    clearTimeout(this.retryTimer), this.retryTimer = null;
  }
  async withTimeout(T, R, a) {
    let e = null;
    try {
      return await Promise.race([T, new Promise((t, r) => {
        e = setTimeout(() => {
          r(Error(a));
        }, R);
      })]);
    } finally {
      if (e) clearTimeout(e);
    }
  }
  tryHandshake(T) {
    if (this.disposed || this.inFlight) return this.inFlight;
    let R = this.generation,
      a = this.options.handshake(T);
    return this.inFlight = a, a.then(() => {
      if (this.disposed || R !== this.generation) return;
      this.attempt = 0, this.clearRetryTimer(), this.resolveReadyWaiter();
    }).catch(e => {
      if (this.disposed || R !== this.generation) return;
      this.scheduleRetry(T, e);
    }).finally(() => {
      if (this.inFlight === a) this.inFlight = null;
    }), a;
  }
  scheduleRetry(T, R) {
    if (this.disposed) return;
    if (!this.lastInfo || this.lastInfo.state !== "connected" || this.lastInfo.role === "executor") return;
    this.attempt += 1;
    let a = sVT(this.attempt, {
      baseDelayMs: this.baseDelayMs,
      maxDelayMs: this.maxDelayMs,
      maxAttempts: this.maxAttempts
    });
    if (a === null) {
      this.clearRetryTimer(), this.options.onExhausted?.({
        attempt: this.attempt,
        maxAttempts: this.maxAttempts,
        error: R
      }), this.rejectReadyWaiter(R instanceof Error ? R : Error("Executor handshake failed and exhausted retries"));
      return;
    }
    this.clearRetryTimer(), this.options.onError?.({
      trigger: T,
      attempt: this.attempt,
      delayMs: a,
      error: R
    }), this.retryTimer = setTimeout(() => {
      if (this.retryTimer = null, !this.lastInfo || this.lastInfo.state !== "connected" || this.lastInfo.role === "executor") return;
      this.tryHandshake("retry");
    }, a);
  }
}