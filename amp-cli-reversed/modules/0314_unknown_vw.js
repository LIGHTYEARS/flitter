class vw {
  opts;
  fuzzyService = null;
  state = "unstarted";
  initPromise = null;
  workspaceRoot;
  constructor(T = process.cwd(), R = {}, a = !1) {
    if (this.opts = R, this.workspaceRoot = T, a) this.initPromise = this.init(), this.initPromise.then(() => {
      J.debug("Fuzzy service background initialization completed");
    }).catch(e => {
      J.debug("Fuzzy service background initialization failed", e);
    });
  }
  async start() {
    if (this.initPromise !== null) return this.initPromise;
    return this.initPromise = this.init(), this.initPromise;
  }
  async init() {
    if (S4.resolve(this.workspaceRoot) === S4.resolve(aA0.homedir())) {
      J.debug("Skipping fuzzy service initialization for home directory");
      return;
    }
    this.state = "initializing";
    try {
      this.fuzzyService = gA0([this.workspaceRoot], {
        scanOnStartup: !0,
        enableFileWatching: !0,
        usePollingFallback: !1,
        ...this.opts
      }), await this.fuzzyService.initialize(), this.state = "ready";
    } catch (T) {
      this.state = "failed";
      let R = T instanceof Error ? T.message : String(T);
      J.warn("Failed to initialize fuzzy service, will use fallback", {
        error: R
      });
    }
  }
  async query(T, R = 50, a, e) {
    if (this.initPromise !== void 0) try {
      await this.initPromise;
    } catch (r) {
      return J.warn("Background fuzzy initialization failed, returning empty results", r), [];
    }
    if (!this.fuzzyService) return J.warn("Fuzzy service not initialized, returning empty results"), [];
    let t = r => S4.relative(this.workspaceRoot, r);
    try {
      let r = T.trim();
      return this.fuzzyService.searchAll(r, {
        limit: R,
        minScore: r ? 0.1 : void 0,
        openFiles: a,
        dirtyFiles: e
      }).map(h => t(h.entry.path));
    } catch (r) {
      return J.error("Fuzzy search failed", r), [];
    }
  }
  async queryCompletions(T, R = 50, a, e) {
    if (this.initPromise !== void 0) try {
      await this.initPromise;
    } catch (r) {
      return J.warn("Background fuzzy initialization failed, returning empty results", r), [];
    }
    if (!this.fuzzyService) return J.warn("Fuzzy service not initialized, returning empty results"), [];
    let t = r => S4.relative(this.workspaceRoot, r);
    try {
      let r = T.trim();
      return this.fuzzyService.searchAll(r, {
        limit: R,
        minScore: r ? 0.1 : void 0,
        openFiles: a,
        dirtyFiles: e,
        downrankTestAndStoryPaths: !0
      }).map(h => ({
        path: t(h.entry.path),
        kind: h.entry.isDirectory() ? "folder" : "file"
      }));
    } catch (r) {
      return J.error("Fuzzy search failed", r), [];
    }
  }
  getStats() {
    return {
      state: this.state,
      stats: this.fuzzyService?.getIndexStats() ?? []
    };
  }
  dispose() {
    if (this.fuzzyService) this.fuzzyService.dispose(), this.fuzzyService = null;
    this.state = "unstarted", this.initPromise = null;
  }
}