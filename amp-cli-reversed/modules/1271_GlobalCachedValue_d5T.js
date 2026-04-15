class d5T {
  options;
  value;
  lastError;
  lastUpdated = 0;
  pendingPromise;
  eventsSubject = new W0();
  events = this.eventsSubject;
  constructor(T) {
    this.options = T;
  }
  async get() {
    if (this.lastError) return this.recompute();
    let T = Date.now() - this.lastUpdated;
    if (this.value === void 0 || T >= this.options.hardTTL) return this.recompute();
    if (T >= this.options.softTTL && !this.pendingPromise) this.recompute().catch(() => {});
    return this.value;
  }
  getCached() {
    return this.value;
  }
  async refresh() {
    return this.recompute();
  }
  recompute() {
    if (this.pendingPromise) return this.pendingPromise;
    return this.pendingPromise = this.performRecomputation(), this.pendingPromise.finally(() => {
      this.pendingPromise = void 0;
    }), this.pendingPromise;
  }
  async performRecomputation() {
    try {
      let T = await this.options.compute(),
        R = this.value;
      this.lastError = void 0, this.value = T, this.lastUpdated = Date.now();
      let a = this.options.changes(R, T);
      if (a !== void 0) try {
        this.eventsSubject.next(a);
      } catch (e) {
        J.error("Uncaught error for GlobalCachedValue.events subscriber", e);
      }
      return T;
    } catch (T) {
      let R = T instanceof Error ? T : Error(String(T));
      this.lastError = R;
      let a = this.value;
      this.value = void 0;
      let e = this.options.changes(a, void 0);
      if (e !== void 0) try {
        this.eventsSubject.next(e);
      } catch (t) {
        J.error("Uncaught error for GlobalCachedValue.events subscriber", t);
      }
      throw R;
    }
  }
}