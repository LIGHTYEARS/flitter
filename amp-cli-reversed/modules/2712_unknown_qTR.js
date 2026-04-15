class qTR {
  isInHandoffMode = !1;
  isGeneratingHandoff = !1;
  isConfirmingAbortHandoff = !1;
  pendingHandoffPrompt = null;
  spinner = null;
  spinnerInterval = null;
  abortController = null;
  abortConfirmTimeout = null;
  listeners = new Set();
  countdownSeconds = null;
  countdownInterval = null;
  onCountdownComplete = null;
  countdownCancelled = !1;
  getActiveThreadHandle;
  getThreadPool;
  switchToThread;
  constructor(T) {
    this.getActiveThreadHandle = T.getActiveThreadHandle, this.getThreadPool = T.getThreadPool, this.switchToThread = T.switchToThread;
  }
  addListener(T) {
    this.listeners.add(T);
  }
  removeListener(T) {
    this.listeners.delete(T);
  }
  notifyListeners() {
    let T = this.getState();
    for (let R of this.listeners) R(T);
  }
  getState() {
    return {
      isInHandoffMode: this.isInHandoffMode,
      isGeneratingHandoff: this.isGeneratingHandoff,
      isConfirmingAbortHandoff: this.isConfirmingAbortHandoff,
      pendingHandoffPrompt: this.pendingHandoffPrompt,
      spinner: this.spinner,
      countdownSeconds: this.countdownSeconds
    };
  }
  startCountdown(T) {
    this.stopCountdown(), this.countdownSeconds = 10, this.countdownCancelled = !1, this.onCountdownComplete = T, this.notifyListeners(), this.countdownInterval = setInterval(() => {
      if (this.countdownCancelled) return;
      if (this.countdownSeconds !== null && this.countdownSeconds > 0) {
        if (this.countdownSeconds--, this.notifyListeners(), this.countdownSeconds === 0 && !this.countdownCancelled) {
          let R = this.onCountdownComplete;
          this.stopCountdown(), R?.();
        }
      }
    }, 1000);
  }
  stopCountdown() {
    if (this.countdownCancelled = !0, this.countdownInterval) clearInterval(this.countdownInterval), this.countdownInterval = null;
    if (this.countdownSeconds !== null) this.countdownSeconds = null, this.notifyListeners();
    this.onCountdownComplete = null;
  }
  enter() {
    this.isInHandoffMode = !0, this.notifyListeners();
  }
  exit() {
    this.pendingHandoffPrompt = null, this.isInHandoffMode = !1, this.notifyListeners();
  }
  reset() {
    this.isInHandoffMode = !1, this.isGeneratingHandoff = !1, this.isConfirmingAbortHandoff = !1, this.pendingHandoffPrompt = null, this.stopCountdown(), this.stopSpinner(), this.clearAbortConfirmTimeout(), this.notifyListeners();
  }
  resetUIState() {
    this.isInHandoffMode = !1, this.isGeneratingHandoff = !1, this.isConfirmingAbortHandoff = !1, this.stopCountdown(), this.stopSpinner(), this.clearAbortConfirmTimeout(), this.notifyListeners();
  }
  startSpinner() {
    this.spinner = new xa(), this.spinnerInterval = setInterval(() => {
      this.spinner?.step(), this.notifyListeners();
    }, 100);
  }
  stopSpinner() {
    if (this.spinnerInterval) clearInterval(this.spinnerInterval), this.spinnerInterval = null;
    this.spinner = null;
  }
  cancelGeneration() {
    if (this.abortController) this.abortController.abort(Error("Handoff cancelled by user")), this.abortController = null, this.stopSpinner(), this.isGeneratingHandoff = !1, this.stopCountdown(), this.notifyListeners();
  }
  async submit(T, R, a) {
    this.pendingHandoffPrompt = T, this.isGeneratingHandoff = !0, this.notifyListeners(), this.startSpinner();
    let e = this.getActiveThreadHandle(),
      t = await this.getCurrentThread(e);
    if (!t) return this.stopSpinner(), this.isGeneratingHandoff = !1, this.isInHandoffMode = !1, this.notifyListeners(), {
      ok: !1,
      error: Error("No active thread for handoff")
    };
    let r = new AbortController();
    this.abortController = r;
    let h = setTimeout(() => r.abort(new pW("Handoff took too long and was aborted (timeout: 60s)")), 60000);
    try {
      let i = a ?? t.agentMode,
        c = await this.getThreadPool().createHandoff(t.id, {
          goal: T,
          images: R,
          agentMode: i,
          queuedMessages: t.queuedMessages ? [...t.queuedMessages] : void 0,
          signal: r.signal
        });
      return clearTimeout(h), this.abortController = null, this.stopSpinner(), this.isGeneratingHandoff = !1, this.isInHandoffMode = !1, this.notifyListeners(), await this.switchToThread(c), {
        ok: !0,
        threadID: c
      };
    } catch (i) {
      clearTimeout(h), this.abortController = null, this.stopSpinner();
      let c = i instanceof Error && (i.message === "Handoff cancelled by user" || i.name === "AbortError" || i.message.includes("abort"));
      if (this.isGeneratingHandoff = !1, this.stopCountdown(), !c) this.isInHandoffMode = !1;
      if (this.notifyListeners(), c) return {
        ok: !1,
        error: Error("Cancelled")
      };
      return J.error("Failed to create handoff thread", {
        error: i
      }), {
        ok: !1,
        error: i instanceof Error ? i : Error(String(i))
      };
    }
  }
  getEmptyHandoffParentThreadID(T) {
    if (!T || T.messages.length > 0) return null;
    return T.relationships?.find(R => R.type === "handoff" && R.role === "child")?.threadID ?? null;
  }
  startAbortConfirmation() {
    this.isConfirmingAbortHandoff = !0, this.notifyListeners(), this.clearAbortConfirmTimeout(), this.abortConfirmTimeout = setTimeout(() => {
      this.isConfirmingAbortHandoff = !1, this.abortConfirmTimeout = null, this.notifyListeners();
    }, 1000);
  }
  clearAbortConfirmTimeout() {
    if (this.abortConfirmTimeout) clearTimeout(this.abortConfirmTimeout), this.abortConfirmTimeout = null;
  }
  async confirmAbort() {
    let T = await this.getCurrentThread(this.getActiveThreadHandle()),
      R = this.getEmptyHandoffParentThreadID(T);
    if (!R || !T) return this.isConfirmingAbortHandoff = !1, this.clearAbortConfirmTimeout(), this.notifyListeners(), null;
    let a = T.id,
      e = this.pendingHandoffPrompt;
    this.isConfirmingAbortHandoff = !1, this.clearAbortConfirmTimeout(), this.notifyListeners();
    try {
      if (await this.switchToThread(R), e) this.pendingHandoffPrompt = null, this.isInHandoffMode = !0, this.notifyListeners();
      return this.getThreadPool().deleteThread?.(a).catch(t => {
        J.error("Failed to dispose handoff thread", {
          error: t
        });
      }), {
        parentThreadID: R,
        currentThreadID: a
      };
    } catch (t) {
      return J.error("Failed to switch to parent thread", {
        error: t
      }), null;
    }
  }
  getPendingPrompt() {
    return this.pendingHandoffPrompt;
  }
  clearPendingPrompt() {
    this.pendingHandoffPrompt = null;
  }
  async getCurrentThread(T) {
    return m0(T.thread$).catch(() => null);
  }
  dispose() {
    if (this.stopSpinner(), this.stopCountdown(), this.clearAbortConfirmTimeout(), this.abortController) this.abortController.abort(), this.abortController = null;
    this.listeners.clear();
  }
}