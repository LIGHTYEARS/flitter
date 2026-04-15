function QkR(T) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(T);
}
class Im {
  fs;
  constructor(T) {
    this.fs = T;
  }
  async store(T, R, a) {
    let e = this.backupDirForThread(T);
    if (!e) return;
    await this.fs.mkdirp(e);
    let t = MR.joinPath(e, this.filename(R));
    await this.fs.writeFile(t, JSON.stringify(a, null, 2)), await this.invalidateBackfillMarker(e);
  }
  async invalidateBackfillMarker(T) {
    let R = MR.joinPath(T, VkR);
    try {
      await this.fs.delete(R);
    } catch {}
  }
  async load(T, R) {
    let a = this.backupDirForThread(T);
    if (!a) return null;
    try {
      let e = await this.fs.readFile(MR.joinPath(a, this.filename(R)));
      return JSON.parse(e);
    } catch (e) {
      return J.error(`Error loading backup file ${this.filename(R)}:`, e), null;
    }
  }
  async list(T) {
    let R = this.backupDirForThread(T);
    if (!R) return [];
    await this.fs.mkdirp(R);
    try {
      let a = await this.fs.readdir(R),
        e = [];
      for (let t of a) {
        let r = MR.relativePath(R, t.uri);
        if (!r) continue;
        let h = r.split(".");
        if (h.length === 2) {
          let i = h[0],
            c = h[1];
          if (i && QkR(c)) e.push({
            toolUseID: i,
            fileChangeID: c
          });
        }
      }
      return e;
    } catch (a) {
      return J.error("Error listing backup files:", a), [];
    }
  }
  async cleanup(T) {
    let R = this.backupDirForThread(T);
    if (!R) return;
    try {
      await this.fs.delete(R, {
        recursive: !0
      });
    } catch (a) {
      if (!Er(a)) J.error(`Error cleaning up backup files in ${R}:`, a);
    }
  }
  getRootURI() {
    let T = typeof process < "u" ? YkR.homedir() : null;
    if (!T) return null;
    return MR.joinPath(zR.file(T), ".amp", "file-changes");
  }
  filename(T) {
    return `${T.toolUseID}.${T.fileChangeID}`;
  }
  backupDirForThread(T) {
    let R = this.getRootURI();
    if (!R) return null;
    return MR.joinPath(R, T);
  }
}