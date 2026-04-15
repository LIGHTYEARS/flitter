async function pD0(T, R, a) {
  let e = R ? await OJT(T, R, {
    nonBlockingOwnershipCheck: a?.nonBlockingOwnershipCheck ?? !1
  }) : await T.createThread();
  return new SrT(T, e);
}
class SrT {
  deps;
  queueOnSubmitByDefault = !1;
  restoreTo = this.truncateThread.bind(this);
  stateTracker;
  activeThreadHandleSubject;
  workersByThreadID = new Map();
  currentWorker;
  activeThreadHandleValue;
  activeThreadHandleThreadID;
  latestStatus = {
    state: "initial"
  };
  threadSubscription = null;
  statusSubscription = null;
  pendingSkillsSubscription = null;
  recentThreadIDsSubject = new f0([]);
  pendingApprovalsSubject = new f0([]);
  pendingSkillsSubject = new f0([]);
  threadViewStatesSubject = new f0({});
  threadTitlesSubject = new f0({});
  legacyHandoffNavigationSubject = new W0();
  pendingNavigationInFlightThreadID = null;
  threadBackStack = [];
  threadForwardStack = [];
  subscriptions = [];
  workerSubscription = null;
  disposing = !1;
  constructor(T, R) {
    this.deps = T, this.currentWorker = R, this.stateTracker = new jJT(this.buildPoolState(R.thread, this.recentThreadIDsSubject.getValue())), this.workersByThreadID.set(R.thread.id, R), this.activeThreadHandleValue = this.createHandle(R.thread.id, R), this.activeThreadHandleThreadID = R.thread.id, this.activeThreadHandleSubject = new f0(this.activeThreadHandleValue), this.refreshDerivedState(R.thread), this.addToRecentThreads(R.thread.id), this.subscribeToWorker(R), this.subscribeToPendingApprovals(), this.subscribeToGlobalWorkerStates(), this.subscribeToWorkerTitles();
  }
  get threadHandles$() {
    return this.activeThreadHandleSubject;
  }
  get threadState$() {
    return this.stateTracker.state$.pipe(JR(T => T.threadState));
  }
  get currentThreadState() {
    return this.stateTracker.state.threadState;
  }
  get currentThread() {
    return this.stateTracker.state.currentThread;
  }
  get currentThreadID() {
    return this.stateTracker.state.currentThreadID;
  }
  get recentThreadIDs$() {
    return this.recentThreadIDsSubject;
  }
  get recentThreadIDs() {
    return this.stateTracker.state.recentThreadIDs;
  }
  get threadTitles$() {
    return this.threadTitlesSubject;
  }
  get legacyHandoffNavigation$() {
    return this.legacyHandoffNavigationSubject;
  }
  get allConnectedThreadActivityStatuses$() {
    return this.threadViewStatesSubject;
  }
  get pendingApprovals$() {
    return this.pendingApprovalsSubject;
  }
  get pendingSkills$() {
    return this.pendingSkillsSubject;
  }
  getWorkerForExecuteMode() {
    return this.currentWorker;
  }
  async createThread() {
    let T = await this.deps.createThread();
    this.switchToWorker(T, {
      recordNavigation: !0
    });
  }
  async switchThread(T) {
    await this.switchToThreadByID(T, {
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
    let T = this.currentWorker.thread.id,
      R = this.threadBackStack.pop();
    if (!R) return;
    this.threadForwardStack.push(T);
    try {
      await this.switchToThreadByID(R, {
        recordNavigation: !1
      });
    } catch (a) {
      throw this.threadForwardStack.pop(), this.threadBackStack.push(R), a;
    }
  }
  async navigateForward() {
    if (!this.canNavigateForward()) return;
    let T = this.currentWorker.thread.id,
      R = this.threadForwardStack.pop();
    if (!R) return;
    this.threadBackStack.push(T);
    try {
      await this.switchToThreadByID(R, {
        recordNavigation: !1
      });
    } catch (a) {
      throw this.threadBackStack.pop(), this.threadForwardStack.push(R), a;
    }
  }
  async sendMessage(T) {
    await this.currentWorker.handle({
      type: "user:message",
      index: T.editIndex,
      message: {
        content: T.content,
        agentMode: T.agentMode
      }
    }), this.maybeMarkLastUserMessageInterrupted(this.currentWorker);
  }
  async truncateThread(T) {
    await this.currentWorker.handle({
      type: "thread:truncate",
      fromIndex: T
    });
  }
  createHandle(T, R) {
    let a = t => {
        if (this.currentThreadID !== T) throw Error(`ThreadHandle.${t} called for inactive thread ${T}. Current thread is ${this.currentThreadID}.`);
      },
      e = async t => {
        await R.handle({
          type: "thread:truncate",
          fromIndex: t
        });
      };
    return $rT({
      thread$: this.deps.threadService.observe(T),
      threadViewState$: this.threadViewStatesSubject.pipe(JR(t => t[T] ?? {
        state: "initial",
        interactionState: !1,
        toolState: {
          running: 0,
          blocked: 0
        }
      })),
      inferenceErrors$: R.status.pipe(JR(t => t.state === "active" ? t.ephemeralError : void 0), da(t => t !== void 0)),
      toolProgressByToolUseID$: this.deps.threadService.observe(T).pipe(JR(t => nD0(t))),
      pendingApprovals$: this.pendingApprovals$,
      pendingSkills$: this.pendingSkills$,
      getCurrentThread: () => R.thread,
      getResolvedTokenUsage: () => $h(R.thread),
      sendMessage: async t => {
        a("sendMessage"), await R.handle({
          type: "user:message",
          index: t.editIndex,
          message: {
            content: t.content,
            agentMode: t.agentMode
          }
        }), this.maybeMarkLastUserMessageInterrupted(R);
      },
      restoreTo: async t => {
        a("restoreTo"), await e(t);
      },
      queueMessage: async t => {
        a("queueMessage"), await R.handle({
          type: "user:message-queue:enqueue",
          message: {
            content: t
          }
        });
      },
      discardQueuedMessages: async () => {
        a("discardQueuedMessages"), await R.handle({
          type: "user:message-queue:discard"
        });
      },
      setTitle: async t => {
        a("setTitle"), await R.handle({
          type: "title",
          value: t
        }), await this.deps.threadService.flushVersion(T, R.thread.v);
      },
      setVisibility: async t => {
        a("setVisibility"), await this.deps.workerDeps.threadService.updateThreadMeta(T, MA(t));
      },
      cancelTurn: async () => {
        a("cancelTurn"), await this.maybeCancelActiveTurn(R);
      },
      cancelStreaming: async () => {
        a("cancelStreaming"), await this.maybeCancelActiveTurn(R);
      },
      retryTurn: async () => {
        a("retryTurn"), await R.retry();
      },
      dismissEphemeralError: () => {
        a("dismissEphemeralError"), R.dismissEphemeralError();
      },
      preExecuteMode: async () => {
        a("preExecuteMode"), R.continueInferenceAfterRejection(!0);
      },
      postExecuteMode: async () => {
        a("postExecuteMode");
        let t = R.thread.v;
        await this.deps.threadService.flushVersion(T, t);
      },
      setTestEphemeralError: t => {
        a("setTestEphemeralError"), R.setTestEphemeralError(t);
      },
      resolveApproval: async (t, r, h) => {
        a("resolveApproval"), this.deps.workerDeps.toolService.resolveApproval(t, r, h);
      },
      addPendingSkill: t => {
        a("addPendingSkill"), R.addPendingSkill(t);
      },
      removePendingSkill: t => {
        a("removePendingSkill"), R.removePendingSkill(t);
      },
      clearPendingSkills: () => {
        a("clearPendingSkills"), R.clearPendingSkills();
      },
      getDraft: async () => {
        return a("getDraft"), lD0(R.thread);
      },
      setDraft: async t => {
        a("setDraft"), await R.handle({
          type: "draft",
          content: AD0(t)
        });
      },
      getFilesAffectedByTruncation: async t => {
        return a("getFilesAffectedByTruncation"), R.getFilesAffectedByTruncation(t);
      },
      clearPendingNavigation: async () => {
        a("clearPendingNavigation"), await R.handle({
          type: "clearPendingNavigation"
        });
      },
      getGuidanceFiles: async t => {
        let r = this.stateTracker.state.currentThread;
        if (!r) return [];
        return (await _O({
          filesystem: this.getFilesystemReader(),
          configService: this.deps.workerDeps.configService,
          threadService: this.deps.threadService
        }, r, t)).map(h => ({
          uri: h.uri,
          type: h.type
        }));
      },
      invokeBashTool: (t, r) => {
        a("invokeBashTool");
        let h = R.invokeBashTool(t, r.abortController.signal, r.hidden);
        return new AR(i => {
          let c = !1,
            s = h.subscribe({
              next: A => i.next(A),
              error: A => {
                c = !0, i.error(A);
              },
              complete: () => {
                c = !0, i.complete();
              }
            });
          return () => {
            if (!c) r.abortController.abort();
            s.unsubscribe();
          };
        });
      }
    });
  }
  maybeMarkLastUserMessageInterrupted(T) {
    let R = this.stateTracker.state.currentThread;
    if (!R) return;
    if (this.latestStatus.state !== "active") return;
    let a = R.messages.findLast(t => t?.role === "assistant"),
      e = a?.state.type === "streaming";
    if (!(this.latestStatus.inferenceState === "running" || e)) return;
    if (e) {
      if (a.content.some(t => t.type === "thinking" && Xm(t))) return;
    }
    for (let t = R.messages.length - 1; t >= 0; t--) {
      let r = R.messages[t];
      if (r?.role === "user" && !r.interrupted) {
        T.handle({
          type: "user:message:interrupt",
          messageIndex: t
        });
        let h = [...R.messages];
        h[t] = {
          ...r,
          interrupted: !0
        };
        let i = {
          ...R,
          messages: h
        };
        this.refreshDerivedState(i), this.updateInterruptedMessage(i, t);
        break;
      }
    }
  }
  updateInterruptedMessage(T, R) {
    let a = T.messages[R];
    if (!a || a.role !== "user" || a.interrupted) return;
    let e = T.messages.map((t, r) => {
      if (r !== R) return t;
      return {
        ...t,
        interrupted: !0
      };
    });
    this.refreshDerivedState({
      ...T,
      messages: e
    });
  }
  async queueMessage(T) {
    await this.currentWorker.handle({
      type: "user:message-queue:enqueue",
      message: {
        content: T
      }
    });
  }
  async discardQueuedMessages() {
    await this.currentWorker.handle({
      type: "user:message-queue:discard"
    });
  }
  setTitle = async T => {
    await this.currentWorker.handle({
      type: "title",
      value: T
    }), await this.deps.threadService.flushVersion(this.currentThreadID, this.currentWorker.thread.v);
  };
  setVisibility = async T => {
    await this.deps.workerDeps.threadService.updateThreadMeta(this.currentThreadID, MA(T));
  };
  async cancelTurn() {
    await this.maybeCancelActiveTurn(this.currentWorker);
  }
  async cancelStreaming() {
    await this.maybeCancelActiveTurn(this.currentWorker);
  }
  async maybeCancelActiveTurn(T) {
    let R = this.stateTracker.state.currentThread;
    if (!R) return;
    if (this.latestStatus.state !== "active") return;
    let a = R.messages.findLast(t => t?.role === "assistant")?.state.type === "streaming",
      e = this.hasActiveTools(R);
    if (!(this.latestStatus.inferenceState === "running" || this.latestStatus.inferenceState === "retrying" || Boolean(a) || e)) return;
    this.maybeMarkLastUserMessageInterrupted(T), await T.cancel();
  }
  hasActiveTools(T) {
    for (let R of T.messages) {
      if (R?.role !== "user") continue;
      for (let a of R.content) {
        if (a.type !== "tool_result") continue;
        if (a.run.status === "in-progress" || a.run.status === "queued") return !0;
      }
    }
    return !1;
  }
  async retryTurn() {
    await this.currentWorker.retry();
  }
  dismissEphemeralError() {
    this.currentWorker.dismissEphemeralError();
  }
  async resolveApproval(T, R, a) {
    this.deps.workerDeps.toolService.resolveApproval(T, R, a);
  }
  addPendingSkill(T) {
    this.currentWorker.addPendingSkill(T);
  }
  removePendingSkill(T) {
    this.currentWorker.removePendingSkill(T);
  }
  clearPendingSkills() {
    this.currentWorker.clearPendingSkills();
  }
  async getFilesAffectedByTruncation(T) {
    return this.currentWorker.getFilesAffectedByTruncation(T);
  }
  invokeBashTool(T, R) {
    let a = this.currentWorker.invokeBashTool(T, R.abortController.signal, R.hidden);
    return new AR(e => {
      let t = !1,
        r = a.subscribe({
          next: h => e.next(h),
          error: h => {
            t = !0, e.error(h);
          },
          complete: () => {
            t = !0, e.complete();
          }
        });
      return () => {
        if (!t) R.abortController.abort();
        r.unsubscribe();
      };
    });
  }
  async createHandoff(T, R) {
    let a = {
      toolService: this.deps.workerDeps.toolService,
      configService: this.deps.workerDeps.configService,
      skillService: this.deps.workerDeps.skillService,
      getThreadEnvironment: this.deps.workerDeps.getThreadEnvironment,
      filesystem: this.getFilesystemReader(),
      threadService: this.deps.workerDeps.threadService
    };
    return (await ct.handoff(this.deps.workerDeps, {
      threadID: T,
      goal: R.goal,
      images: R.images,
      mode: "draft",
      navigate: !1,
      agentMode: R.agentMode ?? void 0,
      queuedMessages: R.queuedMessages,
      clearQueuedMessages: !0,
      blockIndex: 0,
      buildSystemPromptDeps: a,
      signal: R.signal,
      filesystem: this.getFilesystemReader()
    })).threadID;
  }
  async clearPendingNavigation() {
    await this.currentWorker.handle({
      type: "clearPendingNavigation"
    });
  }
  getFilesystemReader() {
    return this.deps.workerDeps.osFileSystem;
  }
  setTestEphemeralError(T) {
    this.currentWorker.setTestEphemeralError(T);
  }
  setTestRetryCountdown(T) {
    let R = Math.max(0, Math.ceil((T.retryAt - Date.now()) / 1000));
    this.currentWorker.setTestEphemeralError(Object.assign(Error(T.message), {
      retryCountdownSeconds: R
    }));
  }
  async getThreadEnvironment() {
    return await this.deps.workerDeps.getThreadEnvironment();
  }
  async dispose() {
    if (this.disposing) return;
    this.disposing = !0, this.cleanupSubscriptions(), await Promise.all(Array.from(this.workersByThreadID.values()).map(T => T.asyncDispose())), this.workersByThreadID.clear(), this.pendingApprovalsSubject.complete(), this.pendingSkillsSubject.complete(), this.threadViewStatesSubject.complete(), this.threadTitlesSubject.complete(), this.legacyHandoffNavigationSubject.complete(), this.recentThreadIDsSubject.complete(), this.activeThreadHandleSubject.complete(), this.disposing = !1;
  }
  async deleteThread(T) {
    if (this.currentWorker.thread.id === T) return;
    this.workersByThreadID.delete(T), await ct.dispose(T), await this.deps.threadService.delete(T);
  }
  subscribeToWorker(T) {
    this.threadSubscription?.unsubscribe(), this.statusSubscription?.unsubscribe(), this.pendingSkillsSubscription?.unsubscribe(), this.threadSubscription = this.deps.threadService.observe(T.thread.id).subscribe(R => {
      this.refreshDerivedState(R);
    }), this.statusSubscription = T.status.subscribe(R => {
      this.latestStatus = R, this.updateThreadState(this.stateTracker.state.currentThread);
    }), this.pendingSkillsSubscription = T.pendingSkills.subscribe(R => {
      this.pendingSkillsSubject.next(R);
    });
  }
  subscribeToPendingApprovals() {
    let T = this.deps.workerDeps.toolService.pendingApprovals$.subscribe(R => {
      let a = this.stateTracker.state.currentThreadID,
        e = R.filter(t => t.threadId === a || t.mainThreadId === a);
      this.pendingApprovalsSubject.next(e);
    });
    this.subscriptions.push(T);
  }
  subscribeToGlobalWorkerStates() {
    let T = ct.statuses.subscribe(R => {
      this.threadViewStatesSubject.next(R);
    });
    this.subscriptions.push(T);
  }
  subscribeToWorkerTitles() {
    let T = async R => {
      let a = {};
      await Promise.all(Array.from(R.keys()).map(async e => {
        a[e] = (await this.deps.threadService.getPrimitiveProperty(e, "title")) ?? void 0;
      })), this.threadTitlesSubject.next(a);
    };
    this.workerSubscription = ct.workers.subscribe(R => {
      T(R);
    });
  }
  setCurrentWorker(T) {
    if (this.workersByThreadID.set(T.thread.id, T), T.thread.id !== this.currentWorker.thread.id) this.addToRecentThreads(T.thread.id);
    this.currentWorker = T, this.latestStatus = {
      state: "initial"
    }, this.refreshDerivedState(T.thread), this.subscribeToWorker(T);
  }
  refreshDerivedState(T) {
    let R = this.buildPoolState(T, this.recentThreadIDsSubject.getValue());
    this.threadTitlesSubject.next({
      ...this.threadTitlesSubject.getValue(),
      [T.id]: T.title ?? void 0
    }), this.stateTracker.update(R), this.maybeEmitLegacyHandoffNavigation(T), this.emitActiveThreadHandleIfNeeded();
  }
  maybeEmitLegacyHandoffNavigation(T) {
    let R = T.pendingNavigation;
    if (!R || T.id !== this.currentThreadID) return;
    if (this.pendingNavigationInFlightThreadID === R) return;
    this.pendingNavigationInFlightThreadID = R, this.legacyHandoffNavigationSubject.next(R), this.currentWorker.handle({
      type: "clearPendingNavigation"
    }).catch(() => {
      return;
    }).finally(() => {
      if (this.pendingNavigationInFlightThreadID === R) this.pendingNavigationInFlightThreadID = null;
    });
  }
  buildPoolState(T, R) {
    let a = f3T(T, this.latestStatus);
    return {
      threadState: lB({
        thread: T,
        viewState: a,
        resolvedTokenUsage: $h(T)
      }),
      currentThread: T,
      currentThreadID: T.id,
      recentThreadIDs: R
    };
  }
  updateThreadState(T) {
    this.refreshDerivedState(T);
  }
  addToRecentThreads(T) {
    let R = [...this.recentThreadIDsSubject.getValue()],
      a = R.indexOf(T);
    if (a !== -1) R.splice(a, 1);
    if (R.unshift(T), R.length > 50) R.pop();
    this.recentThreadIDsSubject.next(R), this.stateTracker.update({
      ...this.stateTracker.state,
      recentThreadIDs: R
    });
  }
  switchToWorker(T, R) {
    let a = this.currentWorker.thread.id;
    if (this.workersByThreadID.set(T.thread.id, T), this.setCurrentWorker(T), R.recordNavigation && T.thread.id !== a) this.recordNavigation(a);
  }
  async switchToThreadByID(T, R) {
    let a = this.workersByThreadID.get(T) ?? (await OJT(this.deps, T));
    this.switchToWorker(a, R);
  }
  recordNavigation(T) {
    this.threadBackStack.push(T), this.threadForwardStack = [];
  }
  cleanupSubscriptions() {
    this.threadSubscription?.unsubscribe(), this.statusSubscription?.unsubscribe(), this.pendingSkillsSubscription?.unsubscribe(), this.workerSubscription?.unsubscribe(), this.threadSubscription = null, this.statusSubscription = null, this.pendingSkillsSubscription = null, this.workerSubscription = null;
    for (let T of this.subscriptions) T.unsubscribe();
    this.subscriptions = [];
  }
  emitActiveThreadHandleIfNeeded() {
    if (this.activeThreadHandleThreadID !== this.currentThreadID) this.activeThreadHandleValue = this.createHandle(this.currentThreadID, this.currentWorker), this.activeThreadHandleThreadID = this.currentThreadID;
    this.activeThreadHandleSubject.next(this.activeThreadHandleValue);
  }
}