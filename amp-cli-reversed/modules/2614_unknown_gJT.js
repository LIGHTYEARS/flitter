class gJT {
  authoritativeThread;
  currentAgentLoopState;
  pendingMessageSubmits = [];
  pendingQueuedSubmits = [];
  pendingQueuedInterruptMessageIDs = new Set();
  pendingEdit;
  constructor(T, R) {
    this.authoritativeThread = T, this.currentAgentLoopState = R;
  }
  setAgentLoopState(T) {
    this.currentAgentLoopState = T;
  }
  optimisticUpdate(T) {
    switch (T.type) {
      case "submit":
        return this.optimisticSubmit(T);
      case "discard-queued":
        return this.pendingQueuedSubmits = [], this.pendingQueuedInterruptMessageIDs.clear(), this.buildProjection();
      case "interrupt-queued":
        return this.optimisticInterruptQueued(T);
      case "edit":
        return this.optimisticEdit(T);
      case "drop-submit":
        return this.dropOptimisticSubmit(T);
      case "update-submit-guidance":
        return this.updateOptimisticSubmitGuidance(T);
    }
  }
  updateOptimisticSubmitGuidance(T) {
    let R = !1;
    if (this.pendingMessageSubmits = this.pendingMessageSubmits.map(a => {
      if (a.clientMessageID !== T.clientMessageID) return a;
      return R = !0, {
        ...a,
        discoveredGuidanceFiles: T.discoveredGuidanceFiles
      };
    }), !R) this.pendingQueuedSubmits = this.pendingQueuedSubmits.map(a => {
      if (a.clientMessageID !== T.clientMessageID) return a;
      return R = !0, {
        ...a,
        discoveredGuidanceFiles: T.discoveredGuidanceFiles
      };
    });
    return this.buildProjection();
  }
  dropOptimisticSubmit(T) {
    let R = this.pendingMessageSubmits.filter(e => e.clientMessageID !== T.clientMessageID),
      a = this.pendingQueuedSubmits.filter(e => e.clientMessageID !== T.clientMessageID);
    if (R.length === this.pendingMessageSubmits.length && a.length === this.pendingQueuedSubmits.length) return this.buildProjection();
    return this.pendingMessageSubmits = R, this.pendingQueuedSubmits = a, this.buildProjection();
  }
  optimisticInterruptQueued(T) {
    let R = this.buildProjection(),
      a = (R.queuedMessages ?? []).find(e => (e.queuedMessage.dtwMessageID ?? e.id) === T.queuedMessageID);
    if (!a || vrT(a)) return R;
    if (this.pendingQueuedInterruptMessageIDs.has(T.queuedMessageID)) return this.buildProjection();
    return this.pendingQueuedInterruptMessageIDs.add(T.queuedMessageID), this.buildProjection();
  }
  optimisticSubmit(T) {
    if (GM0(this.pendingMessageSubmits, this.pendingQueuedSubmits, this.authoritativeThread, T.clientMessageID)) return this.buildProjection();
    let R = {
      clientMessageID: T.clientMessageID,
      content: T.content,
      userState: T.userState,
      sentAt: T.sentAt ?? Date.now()
    };
    if (RD0(this.currentAgentLoopState)) this.pendingQueuedSubmits.push(R);else this.pendingMessageSubmits.push(R);
    return this.buildProjection();
  }
  optimisticEdit(T) {
    let R = this.buildProjection(),
      a = DET(R, T.targetMessageID);
    if (a < 0) return R;
    return this.pendingMessageSubmits = [], this.pendingQueuedSubmits = [], this.pendingEdit = {
      targetMessageID: T.targetMessageID,
      content: T.content,
      truncatedMessageIDs: qM0(R, a)
    }, this.buildProjection();
  }
  resolve(T) {
    if (!this.hasPendingOverlay()) return this.authoritativeThread = T, T;
    let R = this.authoritativeThread;
    return this.authoritativeThread = T, this.reconcilePending(R), this.buildProjection();
  }
  hasPendingOverlay() {
    return DM0(this.pendingMessageSubmits, this.pendingQueuedSubmits, this.pendingQueuedInterruptMessageIDs, this.pendingEdit);
  }
  reconcilePending(T) {
    let R = WM0(this.authoritativeThread);
    this.pendingMessageSubmits = KM0(T, this.authoritativeThread, R, this.pendingMessageSubmits), this.pendingQueuedSubmits = QM0(this.authoritativeThread, R, this.pendingQueuedSubmits), this.pendingQueuedInterruptMessageIDs = ZM0(this.authoritativeThread, this.pendingQueuedSubmits, this.pendingQueuedInterruptMessageIDs), this.pendingEdit = JM0(R, this.pendingEdit);
  }
  buildProjection() {
    if (!this.hasPendingOverlay()) return this.authoritativeThread;
    let T = this.pendingEdit;
    return MM0(this.authoritativeThread, R => wM0(R, T), R => BM0(R, this.pendingMessageSubmits), R => NM0(R, this.pendingQueuedSubmits), R => UM0(R, this.pendingQueuedInterruptMessageIDs));
  }
}