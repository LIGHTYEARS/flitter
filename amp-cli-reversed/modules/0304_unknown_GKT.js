class GKT {
  watchedPaths = new Map();
  callbacks = [];
  pollInterval;
  constructor(T = 1000) {
    this.pollInterval = T;
  }
  async watch(T) {
    if (this.watchedPaths.has(T)) return;
    let {
        promises: R
      } = await import("fs"),
      a = new Map();
    try {
      await this.scanPath(R, T, a);
    } catch (t) {
      throw Error(`Failed to watch path ${T}: ${t}`);
    }
    let e = setInterval(async () => {
      try {
        await this.checkForChanges(R, T, a);
      } catch (t) {
        J.warn("Error polling path", {
          path: T,
          error: t
        });
      }
    }, this.pollInterval);
    this.watchedPaths.set(T, {
      interval: e,
      lastModified: a
    });
  }
  unwatch(T) {
    let R = this.watchedPaths.get(T);
    if (R) clearInterval(R.interval), this.watchedPaths.delete(T);
  }
  dispose() {
    for (let T of Array.from(this.watchedPaths.keys())) this.unwatch(T);
    this.callbacks.length = 0;
  }
  onFileSystemEvent(T) {
    this.callbacks.push(T);
  }
  offFileSystemEvent(T) {
    let R = this.callbacks.indexOf(T);
    if (R >= 0) this.callbacks.splice(R, 1);
  }
  getWatchedPaths() {
    return Array.from(this.watchedPaths.keys());
  }
  isSupported() {
    return !0;
  }
  async scanPath(T, R, a) {
    try {
      let e = await T.stat(R);
      if (a.set(R, e.mtime.getTime()), e.isDirectory()) {
        let t = await T.readdir(R);
        for (let r of t) {
          let h = y$(R, r);
          await this.scanPath(T, h, a);
        }
      }
    } catch (e) {}
  }
  async checkForChanges(T, R, a) {
    let e = [],
      t = new Map();
    await this.scanPath(T, R, t);
    for (let [r, h] of Array.from(t.entries())) {
      let i = a.get(r);
      if (i === void 0) e.push({
        type: "created",
        path: r,
        timestamp: Date.now(),
        isDirectory: await this.isDirectory(T, r)
      });else if (h > i) e.push({
        type: "modified",
        path: r,
        timestamp: Date.now(),
        isDirectory: await this.isDirectory(T, r)
      });
    }
    for (let r of Array.from(a.keys())) if (!t.has(r)) e.push({
      type: "deleted",
      path: r,
      timestamp: Date.now(),
      isDirectory: !1
    });
    a.clear();
    for (let [r, h] of Array.from(t.entries())) a.set(r, h);
    if (e.length > 0) for (let r of this.callbacks) try {
      r(e);
    } catch (h) {
      J.error("Error in file watcher callback", {
        error: h
      });
    }
  }
  async isDirectory(T, R) {
    try {
      return (await T.stat(R)).isDirectory();
    } catch {
      return !1;
    }
  }
}