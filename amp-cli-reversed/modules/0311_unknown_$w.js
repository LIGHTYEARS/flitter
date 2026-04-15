function uA0(T, R, a) {
  return new XKT(T, a).match(R);
}
class $w {
  metadata;
  entries;
  entriesByPath;
  entriesById;
  constructor(T, R = [], a, e) {
    if (this.metadata = T, this.entries = R, a && e) this.entriesByPath = a, this.entriesById = e;else {
      let t = new Map(),
        r = new Map();
      for (let h of R) t.set(h.path, h), r.set(h.id, h);
      this.entriesByPath = t, this.entriesById = r;
    }
    this.cachedArray = Array.from(this.entriesByPath.values()), this.entriesArrayDirty = !1;
  }
  static create(T) {
    let R = Date.now();
    return new $w({
      id: R,
      createdAt: R,
      rootPath: T,
      entryCount: 0,
      scanStatus: "scanning"
    }, []);
  }
  static fromEntries(T, R) {
    let a = Date.now(),
      e = {
        id: a,
        createdAt: a,
        rootPath: T,
        entryCount: R.length,
        scanStatus: "complete"
      };
    return new $w(e, R);
  }
  entriesArrayDirty = !1;
  cachedArray = [];
  getAllEntries() {
    if (this.entriesArrayDirty) this.cachedArray = [...this.entriesByPath.values()], this.entriesArrayDirty = !1;
    return this.cachedArray;
  }
  getEntryByPath(T) {
    return this.entriesByPath.get(T) ?? null;
  }
  getEntryById(T) {
    return this.entriesById.get(T) ?? null;
  }
  applyChanges(T) {
    let {
      added: R = [],
      removed: a = [],
      modified: e = []
    } = T;
    for (let t of a) {
      let r = this.entriesByPath.get(t);
      if (r) {
        if (this.entriesByPath.delete(t), this.entriesById.delete(r.id), !this.entriesArrayDirty) {
          let h = this.cachedArray.findIndex(i => i.path === t);
          if (h >= 0) this.cachedArray.splice(h, 1);
        }
      }
    }
    for (let t of [...R, ...e]) if (this.entriesByPath.set(t.path, t), this.entriesById.set(t.id, t), !this.entriesArrayDirty) {
      let r = this.cachedArray.findIndex(h => h.path === t.path);
      if (r >= 0) this.cachedArray.splice(r, 1);
      this.cachedArray.unshift(t);
    }
    this.metadata.entryCount = this.entriesByPath.size;
  }
  findEntries(T) {
    return this.entries.filter(T);
  }
  getFiles() {
    return this.findEntries(T => T.kind === "file");
  }
  getDirectories() {
    return this.findEntries(T => T.kind === "directory");
  }
  getInDirectory(T) {
    let R = T.endsWith("/") ? T : T + "/";
    return this.findEntries(a => a.path.startsWith(R) && a.path !== T);
  }
  hasPath(T) {
    return this.entriesByPath.has(T);
  }
  getStats() {
    let T = this.metadata.entryCount || this.entries.length,
      R = this.getFiles().length,
      a = T - R,
      e = T * 250;
    return {
      totalEntries: T,
      fileEntries: R,
      directoryEntries: a,
      memoryUsage: e
    };
  }
}