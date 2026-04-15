class azT {
  remote;
  threadSubjects = new Map();
  pendingThreadLoads = new Map();
  exclusiveLocks = new Set();
  uploadInFlight = new Map();
  uploadedVersionByThreadID = new Map();
  dirtyThreads = new Set();
  uploadTimer = null;
  threadEntriesByID = new Map();
  threadEntriesState = new f0(null);
  threadEntriesLoaded = !1;
  threadEntriesLoadPromise = null;
  _observeThreadEntries;
  maxThreads;
  uploadThrottleMs;
  constructor(T, R = {}) {
    this.remote = T, this.maxThreads = R.maxThreads === void 0 || R.maxThreads === null ? null : Math.max(1, Math.floor(R.maxThreads)), this.uploadThrottleMs = R.uploadThrottleMs === void 0 ? 1000 : Math.max(0, R.uploadThrottleMs);
  }
  setCachedThread(T, R = {
    scheduleUpload: !1
  }) {
    let a = JA(T, !0),
      e = this.threadSubjects.get(T.id);
    if (e) e.next(a);else this.threadSubjects.set(T.id, new f0(a));
    if (R.uploadedVersion !== void 0) this.uploadedVersionByThreadID.set(T.id, R.uploadedVersion);
    if (this.syncThreadEntryFromThread(a), R.scheduleUpload) this.markDirty(T.id);
    return this.threadSubjects.get(T.id);
  }
  writeCachedThread(T, R) {
    return this.setCachedThread(T, R).getValue();
  }
  upsertThreadEntry(T) {
    let R = this.threadEntriesByID.get(T.id);
    if (R && T4(R, T)) return;
    if (this.threadEntriesByID.set(T.id, T), this.threadEntriesLoaded) this.emitCurrentThreadEntries();
  }
  deleteThreadEntry(T) {
    if (!this.threadEntriesByID.delete(T)) return;
    if (this.threadEntriesLoaded) this.emitCurrentThreadEntries();
  }
  syncThreadEntryFromThread(T) {
    if (T.messages.length === 0 && !T.draft) this.deleteThreadEntry(T.id);else this.upsertThreadEntry(fuT(T));
  }
  threadEntriesFromCachedThreads() {
    let T = new Map();
    for (let R of this.threadSubjects.values()) {
      let a = R.getValue();
      if (!(a.messages.length === 0 && !a.draft)) T.set(a.id, fuT(a));
    }
    return T;
  }
  currentThreadEntries() {
    let T = Array.from(this.threadEntriesByID.values()).toSorted((R, a) => a.userLastInteractedAt - R.userLastInteractedAt);
    return this.maxThreads === null ? T : T.slice(0, this.maxThreads);
  }
  emitCurrentThreadEntries() {
    this.threadEntriesState.next(this.currentThreadEntries());
  }
  async ensureThreadEntriesLoaded() {
    if (this.threadEntriesLoaded) return;
    if (this.threadEntriesLoadPromise) return this.threadEntriesLoadPromise;
    this.threadEntriesLoadPromise = (async () => {
      let T = await this.remote.listThreads({
          limit: this.maxThreads
        }),
        R = new Map();
      for (let a of T) {
        let e = this.threadEntriesByID.get(a.id);
        R.set(a.id, e && T4(e, a) ? e : a);
      }
      for (let [a, e] of this.threadEntriesFromCachedThreads()) {
        let t = R.get(a);
        R.set(a, t && T4(t, e) ? t : e);
      }
      this.threadEntriesByID = R, this.threadEntriesLoaded = !0, this.emitCurrentThreadEntries();
    })();
    try {
      await this.threadEntriesLoadPromise;
    } finally {
      this.threadEntriesLoadPromise = null;
    }
  }
  markDirty(T) {
    this.dirtyThreads.add(T), this.scheduleUploadFlush();
  }
  scheduleUploadFlush() {
    if (this.uploadTimer !== null) return;
    this.uploadTimer = setTimeout(() => {
      this.uploadTimer = null, this.flushPendingUploads();
    }, this.uploadThrottleMs);
  }
  async flushPendingUploads() {
    let T = Array.from(this.dirtyThreads);
    if (this.dirtyThreads = new Set(), await Promise.all(T.map(async R => {
      try {
        await this.uploadThreadNow(R);
      } catch (a) {
        J.error("Failed to upload thread", {
          name: "ThreadService",
          error: a,
          threadID: R
        }), this.dirtyThreads.add(R);
      }
    })), this.dirtyThreads.size > 0) this.scheduleUploadFlush();
  }
  async uploadThreadNow(T) {
    while (!0) {
      let R = this.threadSubjects.get(T);
      if (!R) return;
      let a = R.getValue(),
        e = this.uploadedVersionByThreadID.get(T);
      if (e !== void 0 && e >= a.v) return;
      let t = this.uploadInFlight.get(T);
      if (t) {
        await t;
        continue;
      }
      let r = a.v,
        h = this.remote.uploadThread(a).then(() => {
          this.uploadedVersionByThreadID.set(T, r);
        }).finally(() => {
          this.uploadInFlight.delete(T);
        });
      this.uploadInFlight.set(T, h), await h;
    }
  }
  async ensureThreadSubject(T, R) {
    let a = this.threadSubjects.get(T);
    if (a) return a;
    let e = this.pendingThreadLoads.get(T);
    if (e) {
      let r = await e;
      if (r) return r;
      if (!R.createIfMissing) return null;
    }
    let t = (async () => {
      let r = await this.remote.getThread(T, R.signal);
      if (r) return this.setCachedThread(r, {
        scheduleUpload: !1,
        uploadedVersion: r.v
      });
      if (!R.createIfMissing) return null;
      let h = GqR(T);
      return this.setCachedThread(h, {
        scheduleUpload: R.scheduleUploadOnCreate
      });
    })();
    this.pendingThreadLoads.set(T, t);
    try {
      return await t;
    } finally {
      this.pendingThreadLoads.delete(T);
    }
  }
  async getCachedThread(T, R) {
    return (await this.ensureThreadSubject(T, {
      createIfMissing: !1,
      scheduleUploadOnCreate: !1,
      signal: R
    }))?.getValue() ?? null;
  }
  async get(T, R) {
    return this.getCachedThread(T, R);
  }
  async getPrimitiveProperty(T, R) {
    let a = await this.getCachedThread(T);
    if (!a) return null;
    return a[R];
  }
  observe(T) {
    return new AR(R => {
      let a = null,
        e = !1;
      return this.ensureThreadSubject(T, {
        createIfMissing: !1,
        scheduleUploadOnCreate: !1
      }).then(t => {
        if (e || !t) return;
        a = t.subscribe(R);
      }).catch(t => {
        if (!e) R.error(t);
      }), () => {
        e = !0, a?.unsubscribe();
      };
    });
  }
  async exclusiveSyncReadWriter(T, R = {}) {
    if (this.exclusiveLocks.has(T)) throw Error(`Thread ${T} already has an exclusive read-writer`);
    let a = R.scheduleUpload !== !1,
      e = await this.ensureThreadSubject(T, {
        createIfMissing: !0,
        scheduleUploadOnCreate: a
      });
    if (!e) throw Error(`Thread ${T} could not be loaded`);
    this.exclusiveLocks.add(T);
    let t = !1,
      r = h => this.writeCachedThread(h, {
        scheduleUpload: a
      });
    return {
      read: () => {
        if (t) throw Error("thread exclusive read-writer was disposed");
        return e.getValue();
      },
      write: h => {
        if (t) throw Error("thread exclusive read-writer was disposed");
        r(h);
      },
      update: h => {
        if (t) throw Error("thread exclusive read-writer was disposed");
        let i = Lt(e.getValue(), h);
        return r(i);
      },
      asyncDispose: async () => {
        if (t) return;
        t = !0, this.exclusiveLocks.delete(T);
      }
    };
  }
  flush() {
    if (this.uploadTimer !== null) clearTimeout(this.uploadTimer), this.uploadTimer = null;
    this.flushPendingUploads();
  }
  async flushVersion(T, R) {
    await this.uploadThreadNow(T);
    let a = this.uploadedVersionByThreadID.get(T);
    if (a === void 0 || a < R) throw Error(`Failed to upload thread ${T} to version ${R}`);
  }
  async delete(T) {
    await this.remote.deleteThread(T);
    let R = new Set([T]);
    for (let a of this.threadSubjects.values()) {
      let e = a.getValue();
      if (e.mainThreadID === T) R.add(e.id);
    }
    for (let a of this.threadEntriesByID.values()) if (a.mainThreadID === T) R.add(a.id);
    for (let a of R) this.threadSubjects.delete(a), this.threadEntriesByID.delete(a), this.exclusiveLocks.delete(a), this.pendingThreadLoads.delete(a), this.uploadInFlight.delete(a), this.uploadedVersionByThreadID.delete(a), this.dirtyThreads.delete(a);
    if (this.threadEntriesLoaded) this.emitCurrentThreadEntries();
  }
  async archive(T, R) {
    let a = await this.getCachedThread(T);
    if (!a) throw Error(`Thread ${T} not found`);
    if (this.exclusiveLocks.has(T)) {
      let e = Lt(a, t => {
        t.archived = R, t.v++;
      });
      this.writeCachedThread(e, {
        scheduleUpload: !1
      }), await this.uploadThreadNow(T);
    } else {
      let e = await this.exclusiveSyncReadWriter(T, {
        scheduleUpload: !1
      });
      e.update(t => {
        t.archived = R, t.v++;
      }), await e.asyncDispose(), await this.uploadThreadNow(T);
    }
  }
  async updateThreadMeta(T, R) {
    if (!(await this.ensureThreadSubject(T, {
      createIfMissing: !1,
      scheduleUploadOnCreate: !1
    }))) throw Error(`Thread ${T} not found`);
    await this.uploadThreadNow(T), await this.remote.setThreadMeta(T, R);
    let a = await this.remote.getThread(T);
    if (!a) throw Error(`Thread ${T} could not be reloaded after updating metadata`);
    this.setCachedThread(a, {
      scheduleUpload: !1,
      uploadedVersion: a.v
    });
  }
  observeThreadEntries() {
    if (!this._observeThreadEntries) {
      let T = this.threadEntriesState.pipe(da(R => R !== null), wnR(200, {
        leading: !0,
        trailing: !0
      }), f3());
      this._observeThreadEntries = new AR(R => {
        let a = T.subscribe(R);
        return this.ensureThreadEntriesLoaded().catch(e => R.error(e)), () => a.unsubscribe();
      });
    }
    return this._observeThreadEntries;
  }
  observeThreadList(T) {
    return this.observeThreadEntries().pipe(JR(R => R.filter(a => !a.mainThreadID && (T.includeArchived || !a.archived))), E9((R, a) => {
      if (R.length !== a.length) return !1;
      return R.every((e, t) => {
        let r = a[t];
        return r ? T4(e, r, {
          includeVersion: !1
        }) : !1;
      });
    }));
  }
  invalidateThreadListCache() {
    this.threadEntriesByID = this.threadEntriesFromCachedThreads(), this.threadEntriesLoaded = !1, this.threadEntriesLoadPromise = null, this._observeThreadEntries = void 0, this.threadEntriesState.next(null);
  }
  async asyncDispose() {
    if (this.uploadTimer !== null) clearTimeout(this.uploadTimer), this.uploadTimer = null;
    let T = new Set([...this.dirtyThreads, ...this.uploadInFlight.keys()]);
    await Promise.all(Array.from(T).map(R => this.uploadThreadNow(R))), this.threadEntriesByID.clear(), this.threadEntriesLoaded = !1, this.threadEntriesLoadPromise = null, this._observeThreadEntries = void 0, this.threadEntriesState.next(null), this.dirtyThreads.clear(), this.exclusiveLocks.clear(), this.pendingThreadLoads.clear(), this.threadSubjects.clear(), this.uploadInFlight.clear(), this.uploadedVersionByThreadID.clear();
  }
}