function dM0(T) {
  return {
    id: T,
    created: Date.now(),
    v: 0,
    messages: []
  };
}
class IJT {
  placeholderThreadID;
  recentThreadIDsSubject = new f0([]);
  threadTitlesSubject = new f0({});
  threadHandlesSubject;
  allConnectedThreadActivityStatusesSubject = new f0({});
  legacyHandoffNavigationSubject = new W0();
  initializationStatusSubject = new f0({
    pending: !0,
    message: wIT
  });
  pendingApprovalsSubject = new f0([]);
  pendingSkillsSubject = new f0([]);
  attachedPool = null;
  attachedPoolSubscriptions = [];
  attached = !1;
  readyPromise;
  readyResolve = null;
  readyReject = null;
  constructor(T = Eh()) {
    this.placeholderThreadID = T;
    let R = new f0(dM0(this.placeholderThreadID)),
      a = new f0(new Map()),
      e = new f0(f3T(R.getValue(), {
        state: "active",
        inferenceState: "idle",
        fileChanges: {
          files: []
        }
      }));
    this.threadHandlesSubject = new f0($rT({
      thread$: R,
      threadViewState$: e,
      toolProgressByToolUseID$: a,
      pendingApprovals$: this.pendingApprovalsSubject,
      pendingSkills$: this.pendingSkillsSubject,
      getCurrentThread: () => R.getValue(),
      sendMessage: async t => (await this.waitForActiveHandle()).sendMessage(t),
      restoreTo: async t => (await this.waitForActiveHandle()).restoreTo(t),
      queueMessage: async t => (await this.waitForActiveHandle()).queueMessage(t),
      discardQueuedMessages: async () => (await this.waitForActiveHandle()).discardQueuedMessages(),
      setTitle: async t => (await this.waitForActiveHandle()).setTitle(t),
      setVisibility: async t => (await this.waitForActiveHandle()).setVisibility(t),
      cancelTurn: async () => (await this.waitForActiveHandle()).cancelTurn(),
      cancelStreaming: async () => (await this.waitForActiveHandle()).cancelStreaming(),
      retryTurn: async () => (await this.waitForActiveHandle()).retryTurn(),
      dismissEphemeralError: () => {},
      preExecuteMode: async () => (await this.waitForActiveHandle()).preExecuteMode?.(),
      postExecuteMode: async () => (await this.waitForActiveHandle()).postExecuteMode?.(),
      resolveApproval: async (t, r, h) => (await this.waitForActiveHandle()).resolveApproval(t, r, h),
      addPendingSkill: () => {},
      removePendingSkill: () => {},
      clearPendingSkills: () => {},
      getDraft: async () => (await this.waitForActiveHandle()).getDraft(),
      setDraft: async t => (await this.waitForActiveHandle()).setDraft(t),
      getFilesAffectedByTruncation: async t => (await this.waitForActiveHandle()).getFilesAffectedByTruncation(t),
      clearPendingNavigation: async () => (await this.waitForActiveHandle()).clearPendingNavigation(),
      getGuidanceFiles: async t => (await this.waitForActiveHandle()).getGuidanceFiles(t)
    })), this.readyPromise = new Promise((t, r) => {
      this.readyResolve = t, this.readyReject = r;
    }), this.readyPromise.catch(() => {
      return;
    });
  }
  get recentThreadIDs$() {
    return this.recentThreadIDsSubject;
  }
  get threadTitles$() {
    return this.threadTitlesSubject;
  }
  get threadHandles$() {
    return this.threadHandlesSubject;
  }
  get legacyHandoffNavigation$() {
    return this.legacyHandoffNavigationSubject;
  }
  get allConnectedThreadActivityStatuses$() {
    return this.allConnectedThreadActivityStatusesSubject;
  }
  get initializationStatus$() {
    return this.initializationStatusSubject;
  }
  get queueOnSubmitByDefault() {
    return this.attachedPool?.queueOnSubmitByDefault ?? !1;
  }
  hasPendingInitialization() {
    return this.attachedPool === null;
  }
  isDTWMode() {
    return this.attachedPool?.isDTWMode?.() === !0;
  }
  isThreadActorsMode() {
    return this.attachedPool?.isThreadActorsMode?.() === !0;
  }
  getTransportConnectionState() {
    if (!this.attachedPool?.getTransportConnectionState) return;
    return this.attachedPool.getTransportConnectionState();
  }
  getTransportConnectionRole() {
    if (!this.attachedPool?.getTransportConnectionRole) return;
    return this.attachedPool.getTransportConnectionRole();
  }
  getCompactionStatus() {
    if (!this.attachedPool?.getCompactionStatus) return;
    return this.attachedPool.getCompactionStatus();
  }
  attach(T) {
    if (this.attached) throw Error("DeferredThreadPool is already attached");
    this.attached = !0, this.attachedPool = T;
    let R = null,
      a = null;
    this.attachedPoolSubscriptions = [T.recentThreadIDs$.subscribe(e => this.recentThreadIDsSubject.next(e)), T.threadTitles$.subscribe(e => this.threadTitlesSubject.next(e)), T.allConnectedThreadActivityStatuses$.subscribe(e => this.allConnectedThreadActivityStatusesSubject.next(e)), ...(T.legacyHandoffNavigation$ ? [T.legacyHandoffNavigation$.subscribe(e => {
      this.legacyHandoffNavigationSubject.next(e);
    })] : []), ...(T.initializationStatus$ ? [T.initializationStatus$.subscribe(e => this.initializationStatusSubject.next(e))] : [(() => {
      return this.initializationStatusSubject.next({
        pending: !1,
        message: wIT
      }), {
        unsubscribe: () => {}
      };
    })()]), T.threadHandles$.subscribe(e => {
      if (e) R?.unsubscribe(), R = e.pendingApprovals$.subscribe(t => this.pendingApprovalsSubject.next(t)), a?.unsubscribe(), a = e.pendingSkills$.subscribe(t => this.pendingSkillsSubject.next(t)), this.threadHandlesSubject.next(e);
    }), {
      unsubscribe: () => {
        R?.unsubscribe(), a?.unsubscribe();
      }
    }], this.readyResolve?.(T), this.readyResolve = null, this.readyReject = null;
  }
  setInitError(T) {
    if (this.attached) return;
    this.readyReject?.(T), this.readyResolve = null, this.readyReject = null;
  }
  async createThread() {
    return (await this.waitForAttach()).createThread();
  }
  async switchThread(T) {
    return (await this.waitForAttach()).switchThread(T);
  }
  canNavigateBack() {
    return this.attachedPool?.canNavigateBack() ?? !1;
  }
  canNavigateForward() {
    return this.attachedPool?.canNavigateForward() ?? !1;
  }
  async navigateBack() {
    return (await this.waitForAttach()).navigateBack();
  }
  async navigateForward() {
    return (await this.waitForAttach()).navigateForward();
  }
  async createHandoff(T, R) {
    return (await this.waitForAttach()).createHandoff(T, R);
  }
  async deleteThread(T) {
    let R = await this.waitForAttach();
    if (R.deleteThread) await R.deleteThread(T);
  }
  async dispose() {
    for (let T of this.attachedPoolSubscriptions) T.unsubscribe();
    if (this.attachedPoolSubscriptions = [], this.attachedPool) await this.attachedPool.dispose();
    this.recentThreadIDsSubject.complete(), this.threadTitlesSubject.complete(), this.threadHandlesSubject.complete(), this.allConnectedThreadActivityStatusesSubject.complete(), this.legacyHandoffNavigationSubject.complete(), this.initializationStatusSubject.complete(), this.pendingApprovalsSubject.complete(), this.pendingSkillsSubject.complete();
  }
  waitForAttach() {
    if (this.attachedPool) return Promise.resolve(this.attachedPool);
    return this.readyPromise;
  }
  async waitForActiveHandle() {
    let T = await this.waitForAttach();
    return m0(T.threadHandles$.pipe(da(R => R !== null)));
  }
}