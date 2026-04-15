class X8R {
  currentId = null;
  current = null;
  statsCache = new Map();
  subscribeTimer = null;
  subscription = null;
  listeners = [];
  threadService = null;
  scrollController = new Q3();
  constructor() {}
  setThreadService(T) {
    this.threadService = T;
  }
  async select(T) {
    if (!this.threadService) {
      J.error("TUI assert failed: ThreadService used before being set");
      return;
    }
    if (this.currentId === T) return;
    this.cancelTimerAndSubscription(), this.currentId = T;
    let R = await this.threadService.get(T);
    if (R) {
      if (this.currentId === T) this.current = R, this.notifyListeners();
    }
    this.subscribeTimer = setTimeout(() => {
      this.subscribeLive(T);
    }, 1000);
  }
  clear() {
    this.cancelTimerAndSubscription(), this.currentId = null, this.current = null, this.notifyListeners();
  }
  addListener(T) {
    this.listeners.push(T);
  }
  removeListener(T) {
    let R = this.listeners.indexOf(T);
    if (R !== -1) this.listeners.splice(R, 1);
  }
  getCurrentThread() {
    return this.current;
  }
  getCurrentStats() {
    if (!this.current) return null;
    let T = this.statsCache.get(this.current.id);
    if (T && T.version === this.current.v) return T.stats;
    let R = uz0(this.current);
    return this.statsCache.set(this.current.id, {
      stats: R,
      version: this.current.v
    }), R;
  }
  clearStatsCache() {
    this.statsCache.clear();
  }
  dispose() {
    this.cancelTimerAndSubscription(), this.clearStatsCache(), this.scrollController.dispose(), this.listeners = [];
  }
  subscribeLive(T) {
    if (!this.threadService) {
      J.error("TUI assert failed: ThreadService used before being set");
      return;
    }
    if (this.currentId !== T) return;
    this.subscription = this.threadService.observe(T).subscribe(R => {
      if (this.currentId === T) this.current = R, this.notifyListeners();
    });
  }
  cancelTimerAndSubscription() {
    if (this.subscribeTimer) clearTimeout(this.subscribeTimer), this.subscribeTimer = null;
    if (this.subscription) this.subscription.unsubscribe(), this.subscription = null;
  }
  notifyListeners() {
    for (let T of this.listeners) T(this.current);
  }
}