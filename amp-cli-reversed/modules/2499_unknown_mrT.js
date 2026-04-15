class mrT {
  fuzzyClient;
  cachedDirtyFiles = [];
  cachedCommits = [];
  refreshPromise;
  refreshCommitsPromise;
  constructor(T) {
    this.fuzzyClient = T, this.refreshDirtyFilesInBackground(), this.refreshCommitsInBackground();
  }
  async buildOptions(T) {
    if (T.trigger === "@") {
      let R = T.query;
      if (R.toLowerCase().startsWith(IIT)) {
        let t = R.slice(IIT.length);
        return this.buildCommitOptions(t);
      }
      let a = R.length === 0 ? 18 : 20,
        e = await this.buildFileOptions(R, a);
      return this.appendHintOptions(R, e);
    }
    return [];
  }
  async buildFileOptions(T, R) {
    try {
      let a = await this.getOpenFiles(),
        e = this.cachedDirtyFiles;
      return this.refreshDirtyFilesInBackground(), (await this.fuzzyClient.queryCompletions(T, R, a, e)).map(t => OE0(t));
    } catch (a) {
      return [];
    }
  }
  async getOpenFiles() {
    let T = await m0(Us.status);
    if (!T.connected) return;
    let R = [];
    if (T.openFile) R.push(zR.parse(T.openFile).fsPath);
    if (T.visibleFiles) for (let a of T.visibleFiles) {
      let e = zR.parse(a).fsPath;
      if (!R.includes(e)) R.push(e);
    }
    if (R.length === 0) return;
    return R;
  }
  refreshDirtyFilesInBackground() {
    if (this.refreshPromise !== void 0) return;
    this.refreshPromise = DzR(this.fuzzyClient.workspaceRoot).then(T => {
      this.cachedDirtyFiles = T;
    }).catch(() => {}).finally(() => {
      this.refreshPromise = void 0;
    });
  }
  async buildCommitOptions(T) {
    this.refreshCommitsInBackground();
    let R = this.cachedCommits;
    if (!R.length) return [];
    return iC0(R, T).slice(0, 20).map(a => ({
      type: "commit",
      hash: a.hash,
      shortHash: a.shortHash,
      message: a.message,
      relativeDate: a.relativeDate
    }));
  }
  refreshCommitsInBackground() {
    if (this.refreshCommitsPromise !== void 0) return;
    this.refreshCommitsPromise = wzR(this.fuzzyClient.workspaceRoot).then(T => {
      this.cachedCommits = T;
    }).catch(() => {}).finally(() => {
      this.refreshCommitsPromise = void 0;
    });
  }
  appendHintOptions(T, R) {
    if (T.length > 0) return R;
    let a = [{
      type: "hint",
      kind: "commit",
      message: "mention a commit"
    }, {
      type: "hint",
      kind: "thread",
      message: "mention a thread"
    }];
    return [...R, ...a];
  }
}