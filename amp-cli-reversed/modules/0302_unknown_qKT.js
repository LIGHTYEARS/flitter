function jkT(T, R) {
  if (!R) return R;
  return T + R.split(`
`).join(`
` + T);
}
class qKT {
  history = [];
  index = -1;
  loaded = !1;
  historyFile;
  maxSize;
  constructor(T) {
    this.historyFile = T?.historyFile || TA0, this.maxSize = T?.maxSize || RA0, this.ensureLoaded();
  }
  async ensureLoaded() {
    if (!this.loaded) await this.cleanupStaleLockFile(), this.history = await this.readHistoryFromDisk(), this.loaded = !0;
  }
  async cleanupStaleLockFile() {
    let T = this.historyFile + ".lock";
    try {
      await dkT(T), J.info("Cleaned up stale lock file", {
        lockFile: T
      });
    } catch (R) {
      if (R.code !== "ENOENT") J.warn("Failed to clean up stale lock file", {
        lockFile: T,
        error: R instanceof Error ? R.message : String(R)
      });
    }
  }
  async readHistoryFromDisk() {
    try {
      let T = await OkT(this.historyFile, "utf-8");
      if (!T.trim()) return [];
      return this.parseJsonlContent(T);
    } catch (T) {
      if (T.code !== "ENOENT") return J.warn("Failed to read history file", {
        error: T instanceof Error ? T.message : String(T)
      }), [];
      if (this.historyFile.endsWith(".jsonl")) {
        let R = this.historyFile.replace(".jsonl", ".json");
        try {
          let a = await OkT(R, "utf-8");
          if (a.trim()) {
            let e = JSON.parse(a);
            J.info("Migrating from old history.json to history.jsonl", {
              oldFile: R,
              newFile: this.historyFile,
              size: e.length
            });
            let t = e.map(r => ({
              text: r
            }));
            await this.writeHistoryToDisk(t);
            try {
              await import("fs/promises").then(r => r.unlink(R));
            } catch {}
            return t;
          }
        } catch {}
      }
      return [];
    }
  }
  parseJsonlContent(T) {
    let R = T.trim().split(`
`),
      a = [];
    for (let e of R) if (e.trim()) try {
      let t = JSON.parse(e);
      if (typeof t === "string") a.push({
        text: t
      });else if (typeof t === "object" && t !== null && typeof t.text === "string") a.push({
        text: t.text,
        cwd: typeof t.cwd === "string" ? t.cwd : void 0
      });else J.warn("Skipping invalid entry in history", {
        line: e,
        type: typeof t
      });
    } catch (t) {
      J.warn("Skipping invalid JSONL line in history", {
        line: e
      });
    }
    return a;
  }
  async writeHistoryToDisk(T) {
    await SkT(AS.dirname(this.historyFile), {
      recursive: !0
    });
    let R = T.map(a => JSON.stringify(a)).join(`
`) + `
`;
    await hF(this.historyFile, R, {
      encoding: "utf-8",
      mode: 384
    });
  }
  async add(T, R) {
    if (!T.trim()) return;
    if (await this.ensureLoaded(), this.history.length > 0 && this.history[this.history.length - 1]?.text === T) return;
    let a = {
      text: T,
      cwd: R
    };
    try {
      if (await SkT(AS.dirname(this.historyFile), {
        recursive: !0
      }), await this.atomicAppend(a), this.history.push(a), this.history.length > this.maxSize) {
        let e = await this.readHistoryFromDisk();
        if (e.length > this.maxSize) {
          let t = e.slice(e.length - this.maxSize);
          await this.writeHistoryToDisk(t), this.history = t;
        }
      }
    } catch (e) {
      J.error(`Failed to save history: ${e instanceof Error ? e.message : String(e)}`);
    }
    this.reset();
  }
  async atomicAppend(T) {
    let R = JSON.stringify(T) + `
`,
      a = this.historyFile + ".lock",
      e = 10,
      t = 50;
    for (let r = 0; r < 10; r++) try {
      let h = await Ql0(a, "wx");
      try {
        await hF(this.historyFile, R, {
          flag: "a",
          encoding: "utf-8",
          mode: 384
        });
      } finally {
        await h.close(), await hF(a, "", {
          flag: "w"
        });
        try {
          await dkT(a);
        } catch {}
      }
      return;
    } catch (h) {
      if (h.code === "EEXIST" && r < 9) {
        await new Promise(i => setTimeout(i, 50));
        continue;
      }
      throw h;
    }
    throw Error("Failed to acquire lock for history file after multiple attempts");
  }
  getAll() {
    return [...this.history];
  }
  previous() {
    if (this.history.length === 0) return null;
    if (this.index === 0) return this.history[0]?.text ?? null;
    if (this.index === -1) this.index = this.history.length - 1;else this.index--;
    return this.history[this.index]?.text ?? null;
  }
  next() {
    if (this.history.length === 0 || this.index === -1) return null;
    if (this.index++, this.index >= this.history.length) return this.index = -1, null;
    return this.history[this.index]?.text ?? null;
  }
  reset() {
    this.index = -1;
  }
}