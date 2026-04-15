function rD0(T) {
  if (!T.draft) return null;
  let R = S0T(T.draft);
  if (!R.text && R.images.length === 0) return null;
  return R;
}
class jrT {
  deps;
  recentThreadIDsSubject = new f0([]);
  threadTitlesSubject = new f0({});
  activeThreadHandleSubject = new f0(null);
  allConnectedThreadActivityStatusesSubject = new f0({});
  initializationStatusSubject = new f0({
    pending: !1,
    message: Z4
  });
  threadHandleMap = new Map();
  pendingHandoffThreads = new Map();
  threadBackStack = [];
  threadForwardStack = [];
  isThreadActivationInProgress = !1;
  activeThreadContextID = null;
  handoffService;
  queueOnSubmitByDefault = !0;
  constructor(T) {
    this.deps = T, this.handoffService = AVT({
      configService: this.deps.configService,
      onFollow: this.followHandoffIfSourceActive
    });
  }
  get recentThreadIDs$() {
    return this.recentThreadIDsSubject;
  }
  get threadTitles$() {
    return this.threadTitlesSubject;
  }
  get threadHandles$() {
    return this.activeThreadHandleSubject;
  }
  get allConnectedThreadActivityStatuses$() {
    return this.allConnectedThreadActivityStatusesSubject;
  }
  get initializationStatus$() {
    return this.initializationStatusSubject;
  }
  get activeThreadHandle() {
    if (!this.activeThreadContextID) throw Error("No active thread context");
    let T = this.threadHandleMap.get(this.activeThreadContextID) ?? this.pendingHandoffThreads.get(this.activeThreadContextID)?.optimisticHandle.handle;
    if (!T) throw Error(`No thread handle for ${this.activeThreadContextID}`);
    return T;
  }
  get activeProvider() {
    if (!this.activeThreadContextID) return;
    return this.threadHandleMap.get(this.activeThreadContextID)?.provider;
  }
  hasPendingInitialization() {
    return this.initializationStatusSubject.getValue().pending;
  }
  isDTWMode() {
    return !0;
  }
  isThreadActorsMode() {
    return this.activeProvider?.usesThreadActors() ?? this.deps.useThreadActors ?? !1;
  }
  getTransportConnectionState() {
    return this.activeProvider?.getConnectionState() ?? "disconnected";
  }
  getTransportConnectionRole() {
    return this.activeProvider?.getConnectionRole() ?? null;
  }
  getCompactionStatus() {
    let T = this.activeProvider;
    if (!T) return;
    return {
      compactionState: T.getCompactionState()
    };
  }
  async createThread(T) {
    await this.activateThreadWithNavigation(T, {
      recordNavigation: !0
    });
  }
  async switchThread(T) {
    await this.activateThreadWithNavigation(T, {
      recordNavigation: !0
    });
  }
  canNavigateBack() {
    return this.threadBackStack.length > 0;
  }
  canNavigateForward() {
    return this.threadForwardStack.length > 0;
  }
  async navigateBack() {
    if (!this.canNavigateBack()) return;
    let T = this.activeThreadContextID;
    if (!T) return;
    let R = this.threadBackStack.pop();
    if (!R) return;
    this.threadForwardStack.push(T);
    try {
      await this.activateThreadWithNavigation(R, {
        recordNavigation: !1
      });
    } catch (a) {
      throw this.threadForwardStack.pop(), this.threadBackStack.push(R), a;
    }
  }
  async navigateForward() {
    if (!this.canNavigateForward()) return;
    let T = this.activeThreadContextID;
    if (!T) return;
    let R = this.threadForwardStack.pop();
    if (!R) return;
    this.threadBackStack.push(T);
    try {
      await this.activateThreadWithNavigation(R, {
        recordNavigation: !1
      });
    } catch (a) {
      throw this.threadBackStack.pop(), this.threadForwardStack.push(R), a;
    }
  }
  followHandoffIfSourceActive = async T => {
    if (this.activeThreadContextID !== T.sourceThreadID) return;
    await this.switchThread(T.targetThreadID);
  };
  async createHandoff(T, R) {
    let a = this.threadHandleMap.get(T)?.provider.getThread() ?? this.activeProvider?.getThread();
    if (!a || a.id !== T) throw Error("No thread available for handoff");
    let e = a.env?.initial?.trees?.[0]?.repository?.url ?? (await this.deps.getThreadEnvironment()).trees?.[0]?.repository?.url,
      t = await this.handoffService.createHandoffDraft({
        parentThread: a,
        goal: R.goal,
        images: R.images,
        signal: R.signal
      });
    R.signal?.throwIfAborted();
    let r = R.agentMode ?? t.sourceAgentMode ?? a.agentMode,
      h = {
        threadID: t.parentThreadID,
        type: "handoff",
        ...(t.parentMessageIndex !== void 0 ? {
          messageIndex: t.parentMessageIndex
        } : {}),
        comment: R.goal
      },
      i = Eh(),
      c = Date.now(),
      s = [{
        threadID: T,
        type: "handoff",
        role: "child",
        ...(t.parentMessageIndex !== void 0 ? {
          messageIndex: t.parentMessageIndex
        } : {}),
        createdAt: c,
        comment: R.goal
      }],
      A = {
        id: i,
        created: Date.now(),
        v: 0,
        messages: [],
        relationships: s,
        ...(r ? {
          agentMode: r
        } : {}),
        ...(t.content.length > 0 ? {
          draft: t.content,
          autoSubmitDraft: !1
        } : {})
      },
      l = tD0({
        thread: A,
        materialize: () => this.materializePendingHandoffThread(i)
      });
    return this.pendingHandoffThreads.set(i, {
      agentMode: r ?? void 0,
      relationship: h,
      repositoryURL: e,
      threadRelationships: s,
      optimisticHandle: l,
      materializingPromise: null
    }), i;
  }
  async dispose() {
    for (let T of this.threadHandleMap.values()) await T.dispose();
    for (let T of this.pendingHandoffThreads.values()) await T.optimisticHandle.dispose();
    this.threadHandleMap.clear(), this.pendingHandoffThreads.clear(), this.activeThreadHandleSubject.complete(), this.allConnectedThreadActivityStatusesSubject.complete(), this.initializationStatusSubject.complete(), this.threadTitlesSubject.complete(), this.recentThreadIDsSubject.complete();
  }
  async activateThread(T, R) {
    J.info("[dtw-thread-pool] activateThread:start", {
      requestedThreadID: T,
      hasExistingHandle: Boolean(T && this.threadHandleMap.get(T))
    });
    let a = T ? this.threadHandleMap.get(T) : void 0;
    if (a) {
      let t = a.thread$.getValue().id;
      this.activeThreadContextID = t, this.activeThreadHandleSubject.next(a), this.addToRecentThreads(t), this.syncAllConnectedThreadActivityStatuses(), J.info("[dtw-thread-pool] activateThread:reused", {
        activeThreadID: t,
        handleCount: this.threadHandleMap.size
      });
      return;
    }
    let e = T ? this.pendingHandoffThreads.get(T) : void 0;
    if (T && e) {
      this.activeThreadContextID = T, this.activeThreadHandleSubject.next(e.optimisticHandle.handle), this.syncAllConnectedThreadActivityStatuses(), J.info("[dtw-thread-pool] activateThread:optimistic", {
        activeThreadID: T,
        handleCount: this.threadHandleMap.size
      });
      return;
    }
    this.isThreadActivationInProgress = !0, this.setInitializationStatus({
      pending: !0,
      message: Z4
    });
    try {
      let t = await this.createProvider(T);
      if (R?.threadRelationships && R.threadRelationships.length > 0) t.setRelationships(R.threadRelationships);
      let r = Q3T({
          fileChangeTrackerStorage: this.deps.fileChangeTrackerStorage
        }, this.deps.osFileSystem, t.threadId),
        h = new vJT(t, {
          configService: this.deps.configService,
          toolService: this.deps.toolService,
          skillService: this.deps.skillService,
          mcpService: this.deps.mcpService,
          clientID: this.deps.clientID,
          initialToolDiscovery: this.deps.initialToolDiscovery,
          fs: r,
          filesystem: this.deps.osFileSystem,
          threadService: this.deps.threadService,
          onThreadViewStateChange: () => {
            this.syncAllConnectedThreadActivityStatuses();
          },
          handoffService: this.handoffService
        });
      this.threadHandleMap.set(t.threadId, h), h.startProviderSubscription(i => {
        this.applyProviderState(t.threadId, i);
      }), this.applyProviderState(t.threadId, t.getThread()), this.activeThreadContextID = t.threadId, this.activeThreadHandleSubject.next(h), this.addToRecentThreads(t.threadId), J.info("[dtw-thread-pool] activateThread:created", {
        activeThreadID: t.threadId,
        handleCount: this.threadHandleMap.size
      });
    } finally {
      this.isThreadActivationInProgress = !1, this.setInitializationStatus({
        pending: !1,
        message: Z4
      });
    }
  }
  async activateThreadWithNavigation(T, R) {
    let a = this.activeThreadContextID;
    await this.activateThread(T);
    let e = this.activeThreadContextID;
    if (R.recordNavigation && a !== null && e !== null && a !== e) this.recordNavigation(a);
  }
  applyProviderState(T, R) {
    let a = this.threadHandleMap.get(T);
    if (!a) return;
    let e = a.resolveAuthoritativeThread(R);
    a.writeThread(e);
    let t = this.threadTitlesSubject.getValue();
    if (t[T] !== e.title) this.threadTitlesSubject.next({
      ...t,
      [T]: e.title
    });
    this.syncAllConnectedThreadActivityStatuses();
  }
  syncAllConnectedThreadActivityStatuses() {
    let T = {};
    for (let [R, a] of this.threadHandleMap.entries()) T[R] = a.getThreadViewState();
    for (let [R, a] of this.pendingHandoffThreads.entries()) T[R] = a.optimisticHandle.getThreadViewState();
    this.allConnectedThreadActivityStatusesSubject.next(T);
  }
  addToRecentThreads(T) {
    let R = [...this.recentThreadIDsSubject.getValue()],
      a = R.indexOf(T);
    if (a !== -1) R.splice(a, 1);
    if (R.unshift(T), R.length > 50) R.pop();
    this.recentThreadIDsSubject.next(R);
  }
  recordNavigation(T) {
    this.threadBackStack.push(T), this.threadForwardStack = [];
  }
  async createProvider(T) {
    let R = T ? void 0 : (await this.deps.getThreadEnvironment()).trees?.[0]?.repository?.url,
      a = T ? void 0 : "local-client";
    return ttT.create({
      ampURL: this.deps.ampURL,
      configService: this.deps.configService,
      connectOnCreate: Boolean(T),
      executorType: a,
      onLegacyImportStateChange: e => {
        if (e === "importing") {
          this.setInitializationStatus({
            pending: !0,
            message: hD0
          });
          return;
        }
        if (this.isThreadActivationInProgress) this.setInitializationStatus({
          pending: !0,
          message: Z4
        });
      },
      repositoryURL: R,
      threadService: this.deps.threadService,
      threadId: T,
      workerUrl: process.env.AMP_WORKER_URL,
      useThreadActors: this.deps.useThreadActors,
      connectionMode: "executor+observer"
    });
  }
  async materializePendingHandoffThread(T) {
    let R = this.pendingHandoffThreads.get(T);
    if (!R) throw Error(`No pending handoff thread for ${T}`);
    if (!R.materializingPromise) {
      let r = (async () => {
        let {
          threadId: h
        } = await uA(void 0, this.deps.configService, void 0, {
          repositoryURL: R.repositoryURL,
          agentMode: R.agentMode,
          relationship: R.relationship,
          executorType: "local-client"
        });
        if (this.activeThreadContextID === T) await this.activateThread(h, {
          threadRelationships: R.threadRelationships
        });
        return h;
      })();
      R.materializingPromise = r, r.catch(() => {
        let h = this.pendingHandoffThreads.get(T);
        if (h?.materializingPromise === r) h.materializingPromise = null;
      });
    }
    let a = await R.materializingPromise,
      e = this.threadHandleMap.get(a);
    if (!e) await this.activateThread(a, {
      threadRelationships: R.threadRelationships
    }), e = this.threadHandleMap.get(a);
    if (!e) throw Error(`No DTW thread handle for ${a}`);
    let t = this.pendingHandoffThreads.get(T);
    if (t) this.pendingHandoffThreads.delete(T), await t.optimisticHandle.dispose(), this.syncAllConnectedThreadActivityStatuses();
    return e;
  }
  setInitializationStatus(T) {
    let R = this.initializationStatusSubject.getValue();
    if (R.pending === T.pending && R.message === T.message) return;
    this.initializationStatusSubject.next(T);
  }
}