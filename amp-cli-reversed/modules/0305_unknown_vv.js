class vv {
  static isRepo(T) {
    try {
      return EkT("git rev-parse --is-inside-work-tree", {
        cwd: T,
        stdio: "ignore"
      }), !0;
    } catch {
      return !1;
    }
  }
  repos = new Map();
  callbacks = [];
  ongoingScans = new Map();
  scanCooldownMs;
  constructor(T = 5000) {
    this.scanCooldownMs = T;
  }
  async resolveRepoRoot(T) {
    let {
      stdout: R
    } = await O4("git", ["rev-parse", "--show-toplevel"], {
      cwd: T
    });
    return R.trim();
  }
  async watch(T) {
    let R = await this.resolveRepoRoot(T);
    if (this.repos.has(R)) return;
    await this.initialise(R);
  }
  unwatch(T) {
    if (!this.repos.get(T)) return;
    this.repos.delete(T), this.ongoingScans.delete(T);
  }
  dispose() {
    for (let T of Array.from(this.repos.keys())) this.unwatch(T);
    this.callbacks.length = 0;
  }
  onFileSystemEvent(T) {
    this.callbacks.push(T);
  }
  offFileSystemEvent(T) {
    let R = this.callbacks.indexOf(T);
    if (R !== -1) this.callbacks.splice(R, 1);
  }
  getWatchedPaths() {
    return Array.from(this.repos.keys());
  }
  isSupported() {
    try {
      return EkT("git --version", {
        stdio: "ignore"
      }), !0;
    } catch {
      return !1;
    }
  }
  async triggerScan(T, R = !1) {
    let a = await this.resolveRepoRoot(T),
      e = this.repos.get(a);
    if (!e) {
      if (J.debug("First time watching repo", {
        repoRoot: a
      }), await this.watch(T), e = this.repos.get(a), !e) return;
      return;
    }
    let t = Date.now(),
      r = t - e.lastScanTime;
    if (!R && r < this.scanCooldownMs) return;
    J.debug("Starting scan", {
      repoRoot: a,
      force: R,
      timeSinceLastScan: r
    }), e.lastScanTime = t, await this.scan(a);
  }
  async reset(T) {
    let R = await this.resolveRepoRoot(T),
      a = this.repos.get(R);
    if (!a) return;
    a.cancelled = !0;
    let e = this.ongoingScans.get(R);
    if (e) await e.catch(() => {});
    this.repos.delete(R), this.ongoingScans.delete(R), await this.watch(T);
  }
  async initialise(T) {
    let R = Date.now(),
      a = await O4("git", ["ls-files", "--others", "--exclude-standard", "-z"], {
        cwd: T,
        maxBuffer: 67108864
      }),
      e = new Set(),
      t = a.stdout.split("\x00").filter(Boolean);
    for (let r of t) {
      let h = y$(T, r);
      e.add(h);
    }
    this.repos.set(T, {
      lastScanTime: R,
      seenUntracked: e
    });
  }
  async scan(T) {
    let R = this.repos.get(T);
    if (!R || R.cancelled) return;
    let a = this.performScan(T);
    this.ongoingScans.set(T, a);
    try {
      await a;
    } finally {
      if (this.ongoingScans.get(T) === a) this.ongoingScans.delete(T);
    }
  }
  async performScan(T) {
    let R = this.repos.get(T);
    if (!R || R.cancelled) return;
    let a = Date.now();
    try {
      let [e, t] = await Promise.all([O4("git", ["ls-files", "--others", "--exclude-standard", "-z"], {
          cwd: T,
          maxBuffer: 1 / 0,
          timeout: 60000
        }), O4("git", ["ls-files", "--deleted", "-z"], {
          cwd: T,
          maxBuffer: 1 / 0,
          timeout: 60000
        })]),
        r = e.stdout.split("\x00").filter(Boolean),
        h = t.stdout.split("\x00").filter(Boolean),
        i = [],
        c = [],
        s = this.repos.get(T);
      if (!s || s.cancelled) return;
      let A = [],
        l = new Set();
      for (let o of r) {
        let n = y$(T, o);
        l.add(n);
        try {
          let p = await iF.stat(n);
          if (!p.isFile()) continue;
          if (!s.seenUntracked.has(n)) i.push(n), A.push({
            type: "created",
            path: n,
            timestamp: p.mtimeMs,
            isDirectory: !1
          });else c.push(n);
        } catch {}
      }
      for (let o of Array.from(s.seenUntracked)) if (!l.has(o)) {
        if (!(await iF.access(o).then(() => !0).catch(() => !1))) A.push({
          type: "deleted",
          path: o,
          timestamp: a,
          isDirectory: !1
        });
      }
      for (let o of h) {
        let n = y$(T, o);
        A.push({
          type: "deleted",
          path: n,
          timestamp: a,
          isDirectory: !1
        });
      }
      if (s.seenUntracked = l, s.lastScanTime = a, A.length) for (let o of this.callbacks) o(A);
    } catch (e) {
      J.warn("Fast ls-files scan failed, falling back to full status", {
        repoRoot: T,
        error: e instanceof Error ? e.message : String(e),
        duration: Date.now() - a
      }), await this.performFullStatusScan(T);
    }
  }
  async performFullStatusScan(T) {
    let R = this.repos.get(T);
    if (!R || R.cancelled) return;
    let a = Date.now(),
      {
        stdout: e
      } = await rA0(hA0, {
        cwd: T,
        maxBuffer: 16777216
      }),
      t = this.repos.get(T);
    if (!t || t.cancelled) return;
    let r = [],
      h = [],
      i = [],
      c = [],
      s = [];
    for (let A of this.parseStatus(e)) {
      let l = y$(T, A.path);
      if (A.type === "created") {
        h.push(l);
        let o = await iF.stat(l).catch(() => null);
        if (!o) {
          s.push(l);
          continue;
        }
        if (o.isFile() && o.mtimeMs > t.lastScanTime) c.push(l), r.push({
          type: "created",
          path: l,
          timestamp: o.mtimeMs,
          isDirectory: !1
        });else s.push(l);
      }
      if (A.type === "deleted") i.push(l), r.push({
        type: "deleted",
        path: l,
        timestamp: a,
        isDirectory: !1
      });
    }
    if (J.debug("Git status discovery (status)", {
      repoRoot: T,
      createdDiscovered: h,
      deletedDiscovered: i,
      createdNew: c,
      createdNotNew: s,
      counts: {
        createdDiscovered: h.length,
        deletedDiscovered: i.length,
        createdNew: c.length,
        createdNotNew: s.length
      }
    }), r.length) for (let A of this.callbacks) A(r);
  }
  parseStatus(T) {
    let R = [],
      a = T.split("\x00");
    for (let e of a) {
      if (!e) continue;
      let t = e[0];
      if (t === "?") {
        let r = e.slice(2);
        R.push({
          type: "created",
          path: r
        });
        continue;
      }
      if (t === "1") {
        let r = e[2],
          h = e.substring(e.indexOf("\t") + 1);
        if (r === "D") R.push({
          type: "deleted",
          path: h
        });else if (r === "A") R.push({
          type: "created",
          path: h
        });
      }
    }
    return R;
  }
}