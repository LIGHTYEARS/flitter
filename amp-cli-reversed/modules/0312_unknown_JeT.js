async function IA0(T, R) {
  if (!(await TY.isRepo(T))) return null;
  return new TY(T, R?.pollInterval);
}
class JeT {
  indexes = new Map();
  headWatchers = new Map();
  reindexingWorkspaces = new Set();
  config;
  disposed = !1;
  static forWorkspace(T) {
    return new JeT({
      workspaceRoots: [T],
      scanOnStartup: !0,
      maxIndexedFiles: 500000,
      enableFileWatching: !0,
      usePollingFallback: !1,
      enableHeadWatching: !0,
      followSymlinkDirs: !0
    });
  }
  constructor(T) {
    this.config = {
      ...T
    };
  }
  async initialize() {
    if (this.disposed) throw Error("Service has been disposed");
    if (this.config.scanOnStartup) {
      let T = this.config.workspaceRoots.map(R => this.indexWorkspace(R));
      await Promise.allSettled(T);
    }
  }
  async indexWorkspace(T) {
    if (this.disposed) throw Error("Service has been disposed");
    if (this.indexes.has(T)) {
      await this.indexes.get(T).rescan();
      return;
    }
    let R = this.config.enableFileWatching ? KKT({
        rootPath: T,
        usePolling: this.config.usePollingFallback
      }) : void 0,
      a = new YKT(T, R);
    a.on("scan-error", t => {
      J.error("Scan error in workspace", {
        rootPath: T,
        error: t
      });
    });
    let e = {
      respectIgnorePatterns: !0,
      maxFiles: this.config.maxIndexedFiles,
      followSymlinks: this.config.followSymlinkDirs,
      alwaysIncludePaths: this.config.alwaysIncludePaths
    };
    try {
      if (await a.initialize(e), this.indexes.set(T, a), this.config.enableHeadWatching) await this.setupHeadWatching(T, a, R);
    } catch (t) {
      a.dispose();
      let r = this.headWatchers.get(T);
      if (r) r.dispose(), this.headWatchers.delete(T);
      throw t;
    }
  }
  async removeWorkspace(T) {
    let R = this.indexes.get(T);
    if (R) R.dispose(), this.indexes.delete(T);
    let a = this.headWatchers.get(T);
    if (a) a.dispose(), this.headWatchers.delete(T);
  }
  searchAll(T, R) {
    let a = [];
    for (let e of this.indexes.values()) try {
      let t = e.search(T, R);
      a.push(...t);
    } catch (t) {}
    return a.sort((e, t) => t.score - e.score), R?.limit ? a.slice(0, R.limit) : a;
  }
  searchWorkspace(T, R, a) {
    let e = this.indexes.get(T);
    if (!e) return [];
    try {
      return e.search(R, a);
    } catch (t) {
      return J.error(`Search error in workspace ${T}:`, t), [];
    }
  }
  getIndexStats(T) {
    if (T) {
      let a = this.indexes.get(T);
      if (a) return [{
        ...a.getStats(),
        rootPath: T
      }];
      return [];
    }
    let R = [];
    for (let [a, e] of this.indexes.entries()) R.push({
      ...e.getStats(),
      rootPath: a
    });
    return R;
  }
  getConfig() {
    return {
      ...this.config
    };
  }
  updateConfig(T) {
    this.config = {
      ...this.config,
      ...T
    };
  }
  async rescanAll() {
    let T = [];
    for (let [R, a] of this.indexes.entries()) T.push(a.rescan().catch(e => {
      J.error(`Rescan error in workspace ${R}:`, e);
    }));
    await Promise.allSettled(T);
  }
  getIndexedWorkspaces() {
    return Array.from(this.indexes.keys());
  }
  isWorkspaceIndexed(T) {
    return this.indexes.has(T);
  }
  dispose() {
    if (this.disposed) return;
    for (let [, T] of this.indexes.entries()) T.dispose();
    for (let [, T] of this.headWatchers.entries()) T.dispose();
    this.indexes.clear(), this.headWatchers.clear(), this.disposed = !0;
  }
  isDisposed() {
    return this.disposed;
  }
  async setupHeadWatching(T, R, a) {
    try {
      let e = await IA0(T);
      if (!e) return;
      e.on("head-change", async ({
        oldSha: t,
        newSha: r
      }) => {
        if (this.reindexingWorkspaces.has(T)) {
          J.debug("Re-index already in progress, skipping", {
            rootPath: T
          });
          return;
        }
        this.reindexingWorkspaces.add(T);
        try {
          if (await R.rescan(), a && a instanceof vv) await a.reset(T);
        } catch (h) {
          J.error("Failed to re-index after change", {
            rootPath: T,
            error: h
          });
        } finally {
          this.reindexingWorkspaces.delete(T);
        }
      }), await e.start(), this.headWatchers.set(T, e), J.debug("Git HEAD watching enabled", {
        rootPath: T
      });
    } catch (e) {
      J.warn("Failed to setup git HEAD watching", {
        rootPath: T,
        error: e
      });
    }
  }
}