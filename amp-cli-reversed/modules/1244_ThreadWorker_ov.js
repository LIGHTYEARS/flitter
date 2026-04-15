class ov {
  deps;
  threadID;
  trackFilesFromHistory() {
    J.debug("Tracking files from thread history", {
      name: "trackFilesFromHistory",
      threadID: this.threadID
    });
    for (let T of this.thread.messages) {
      if (T.role === "user" && T.fileMentions?.files) this.trackFiles(T.fileMentions.files.map(R => R.uri).filter(R => R !== void 0));
      if (T.role === "user") {
        for (let R of T.content) if (R.type === "tool_result" && R.run?.status === "done") this.trackFiles(R.run.trackFiles ?? []);
      }
    }
  }
  async getConfig(T) {
    return m0(this.deps.configService.config, T);
  }
  async isAutoSnapshotEnabled() {
    return (await this.getConfig()).settings["experimental.autoSnapshot"] ?? !1;
  }
  async restoreToSnapshot(T) {}
  setupSettingsChangeHandlers() {
    this.setupPermissionsChangeHandler();
  }
  setupEphemeralErrorLogging() {
    this.ephemeralError.pipe(M$(this.disposed$)).subscribe(T => {
      if (T) J.error("ephemeral error", {
        error: T
      });
    });
  }
  setupPermissionsChangeHandler() {
    this.deps.configService.config.pipe(JR(T => ({
      permissions: I0T(T.settings?.permissions),
      dangerouslyAllowAll: T.settings?.dangerouslyAllowAll ?? !1
    })), E9((T, R) => T.dangerouslyAllowAll === R.dangerouslyAllowAll && T.permissions === R.permissions), DnR(1), M$(this.disposed$)).subscribe(() => {
      this.reevaluateBlockedTools();
    });
  }
  reevaluateBlockedTools() {
    if (this.isDisposed) return;
    for (let T = this.thread.messages.length - 1; T >= 0; T--) {
      let R = this.thread.messages[T];
      if (!R || R.role !== "user") continue;
      let a = !1;
      for (let e of R.content) if (e.type === "tool_result" && e.run?.status === "blocked-on-user" && e.toolUseID) a = !0, this.checkAndApproveBlockedTool(e.toolUseID);
      if (!a) break;
    }
  }
  async checkAndApproveBlockedTool(T) {
    try {
      let R = Tn(this.thread, T);
      if (!R) {
        J.warn("Tool use block not found for blocked tool", {
          toolUseID: T
        });
        return;
      }
      let a = await PLT(R.name, R.input ?? {}, {
        configService: this.deps.configService
      }, this.thread.mainThreadID ? "subagent" : "thread", this.threadID, T);
      if (a.permitted) J.info("Auto-approving previously blocked tool due to permission change", {
        toolName: R.name,
        toolUseID: T,
        threadID: this.threadID
      }), this.handle({
        type: "user:tool-input",
        toolUse: T,
        value: {
          accepted: !0
        }
      });else J.debug("Tool remains blocked after permission change", {
        toolName: R.name,
        toolUseID: T,
        reason: a.reason
      });
    } catch (R) {
      J.warn("Failed to re-evaluate blocked tool", {
        error: R,
        toolUseID: T
      });
    }
  }
  ops = {
    tools: {},
    toolMessages: {},
    inference: null,
    titleGeneration: null
  };
  _state = new f0("initial");
  state = this._state.pipe(E9(), f3({
    shouldCountRefs: !0
  }));
  handleMutex = new Cm();
  ephemeralError = new f0(void 0);
  ephemeralErrorRetryAttempt = 0;
  retryCountdownSeconds = new f0(void 0);
  retryTimer = null;
  retrySession = 0;
  _inferenceState = new f0("idle");
  _turnStartTime = new f0(void 0);
  _turnElapsedMs = new f0(void 0);
  fileChanges = new f0({
    files: []
  });
  get inferenceState() {
    return this._inferenceState.getValue();
  }
  toolCallUpdates = new W0();
  trackedFiles = new Ls();
  discoveredGuidanceFileURIs = new Set();
  fs;
  cachedFileChanges = [];
  disposed$ = new W0();
  isDisposed = !1;
  shouldContinueAfterRejection = !1;
  _pendingSkills = new f0([]);
  handoffState = new f0(void 0);
  pendingSkills = this._pendingSkills.pipe(E9(), f3({
    shouldCountRefs: !0
  }));
  _awaitingSkillInvocation = new f0([]);
  toolOrchestrator;
  currentAgentSpan = null;
  currentSpan = null;
  traceStore;
  constructor(T, R) {
    this.deps = T, this.threadID = R, this.fs = Q3T({
      fileChangeTrackerStorage: this.deps.fileChangeTrackerStorage
    }, this.deps.osFileSystem, R), this.traceStore = {
      startTrace: a => {
        this.updateThread({
          type: "trace:start",
          span: a
        });
      },
      recordTraceEvent: (a, e) => {
        this.updateThread({
          type: "trace:event",
          span: a,
          event: e
        });
      },
      recordTraceAttributes: (a, e) => {
        this.updateThread({
          type: "trace:attributes",
          span: a,
          attributes: e
        });
      },
      endTrace: a => {
        this.updateThread({
          type: "trace:end",
          span: a
        });
      }
    }, this.toolOrchestrator = new FWT(R, T.toolService, this.createOrchestratorCallbacks());
  }
  createTracer(T) {
    return IDT(this.traceStore, T);
  }
  getPluginTracer() {
    let T = this.currentSpan?.id ?? this.currentAgentSpan?.span;
    if (!T) return;
    return this.createTracer(T);
  }
  createOrchestratorCallbacks() {
    return {
      getThread: () => this.thread,
      updateThread: T => this.updateThread(T),
      handle: (T, R) => this.handle(T, R),
      getToolRunEnvironment: (T, R) => this.getToolRunEnvironment(T, R),
      getHooks: async () => (await this.getConfig()).settings?.hooks,
      getConfig: () => this.getConfig(),
      updateFileChanges: () => this.updateFileChanges(),
      trackFiles: T => this.trackFiles(T),
      isDisposed: () => this.isDisposed,
      getDisposed$: () => this.disposed$,
      onSkillToolComplete: T => this.onSkillToolComplete(T),
      applyHookResult: T => Promise.resolve(BI(this, T)),
      applyPostHookResult: (T, R) => Promise.resolve(BI(this, T, R)),
      requestPluginToolCall: this.deps.pluginService ? T => this.deps.pluginService.event.toolCall(T, this.getPluginTracer()) : void 0,
      requestPluginToolResult: this.deps.pluginService ? T => this.deps.pluginService.event.toolResult(T, this.getPluginTracer()) : void 0
    };
  }
  async getToolRunEnvironment(T, R) {
    let a = await this.getWorkspaceRoot(R),
      e = O0T(this.thread),
      t = Tn(this.thread, T);
    return {
      ...this.deps,
      dir: a,
      tool: t?.name ?? "",
      thread: this.thread,
      config: await this.getConfig(R),
      trackedFiles: new Ls(this.trackedFiles),
      filesystem: this.fs.trackedFileSystem(T),
      fileChangeTracker: this.fs.tracker,
      getAllTrackedChanges: this.getAllTrackedChanges.bind(this),
      toolUseID: T,
      todos: e,
      toolMessages: new AR(() => {}),
      threadEnvironment: this.thread.env?.initial ?? (await this.deps.getThreadEnvironment()),
      handleThreadDelta: this.handle.bind(this),
      agentMode: await this.getSelectedAgentMode(),
      discoveredGuidanceFileURIs: this.discoveredGuidanceFileURIs,
      dtwHandoffService: void 0
    };
  }
  onSkillToolComplete(T) {
    let R = T.input;
    this.thread = Lt(this.thread, a => {
      if (!a.activatedSkills) a.activatedSkills = [];
      if (!a.activatedSkills.some(e => e.name === R.name)) a.activatedSkills.push({
        name: R.name,
        arguments: R.arguments
      });
    });
  }
  status = this.state.pipe(L9(T => T === "active" ? v3(this._inferenceState.pipe(E9()), this.fileChanges.pipe(E9()), this.ephemeralError, this.handoffState.pipe(E9()), this.retryCountdownSeconds.pipe(E9()), this._turnStartTime.pipe(E9()), this._turnElapsedMs.pipe(E9()), this.toolCallUpdates.pipe(Y3(void 0))).pipe(JR(([R, a, e, t, r, h, i]) => ({
    state: T,
    inferenceState: R,
    fileChanges: a,
    ephemeralError: e ? {
      message: e.message,
      stack: "stack" in e ? e.stack : void 0,
      error: "error" in e && e.error && typeof e.error === "object" && "error" in e.error ? e.error.error : void 0,
      retryCountdownSeconds: r
    } : void 0,
    handoff: t,
    turnStartTime: h,
    turnElapsedMs: i
  })), M$(this.disposed$)) : AR.of({
    state: T
  })), f3({
    shouldCountRefs: !0
  }));
  threadReadWriter = null;
  get thread() {
    if (!this.threadReadWriter) throw Error(`thread read-writer not initialized for ThreadWorker: ${this.threadID}`);
    return this.threadReadWriter.read();
  }
  set thread(T) {
    if (!this.threadReadWriter) throw Error(`thread read-writer not initialized for ThreadWorker: ${this.threadID}`);
    this.threadReadWriter.write(T), this.__testing__setThread(T);
  }
  updateThread(T) {
    if (!this.threadReadWriter) throw Error(`thread read-writer not initialized for ThreadWorker: ${this.threadID}`);
    this.threadReadWriter.update(BfR(T, new Date())), this.__testing__setThread(this.threadReadWriter.read());
  }
  async acquireThread() {
    if (!this.threadReadWriter) this.threadReadWriter = await this.deps.threadService.exclusiveSyncReadWriter(this.threadID), this._state.next("active");
  }
  __testing__setThread(T) {}
  __testing__getDeps() {
    return this.deps;
  }
  async resume() {
    if (this.resumed) return;
    if (this.resumed = !0, this.handleCalled) throw Error("cannot call ThreadWorker.resume after ThreadWorker.handle");
    if (await this.acquireThread(), !(await this.isAutoSnapshotEnabled())) await this.restoreFileChangesFromBackups();
    let T = this.thread.messages.at(-1);
    if (T?.role === "assistant" && T.state.type === "streaming") this.updateThread({
      type: "thread:truncate",
      fromIndex: this.thread.messages.length - 1
    });
    if (this.trackFilesFromHistory(), this.triggerTitleGeneration(), !this.shouldResumeFromLastMessage(T)) return;
    await this.toolOrchestrator.onResume(), this.setupSettingsChangeHandlers(), this.setupEphemeralErrorLogging(), this.replayLastCompleteMessage();
  }
  resumed = !1;
  shouldResumeFromLastMessage(T) {
    if (NlR(T) || HlR(T) && !this.shouldContinueAfterRejection || NET(T)) return this._inferenceState.next("cancelled"), !1;
    return !0;
  }
  replayLastCompleteMessage() {
    let T = this.thread.messages.findLastIndex(a => a.role === "user" ? qlR(a) : a.role === "assistant" && a.state.type === "complete");
    if (T === -1) {
      if (this.thread.messages.length !== 0) throw Error(`(bug) invalid thread: ${this.threadID}`);
      return;
    }
    let R = this.thread.messages[T];
    switch (R.role) {
      case "user":
        if (!R.interrupted) this.onThreadDelta({
          type: "user:message",
          message: R
        });
        break;
      case "assistant":
        this.onThreadDelta({
          type: "assistant:message",
          message: R
        });
        break;
    }
  }
  async handle(T, R) {
    let a = T.type === "user:message" && T.index !== void 0 ? T.index : void 0;
    await this.handleMutex.acquire();
    try {
      await this.innerHandle(T, R);
    } finally {
      this.handleMutex.release();
    }
    if (a !== void 0) await this.performMessageEditCleanup(a);
  }
  async innerHandle(T, R) {
    if (this.isDisposed) {
      J.debug(`Skipping ${T.type} - worker disposed.`, {
        name: "handle queue",
        threadID: this.threadID
      });
      return;
    }
    if (R?.aborted) {
      J.debug(`Skipping ${T.type} - signal aborted.`, {
        name: "handle queue",
        threadID: this.threadID
      });
      return;
    }
    if (await this.resume(), this.handleCalled = !0, await this.acquireThread(), T.type === "pending-skills") {
      let t = this._pendingSkills.getValue();
      this._pendingSkills.next([...t, ...T.skills]), J.info("Pending skills set for injection", {
        threadID: this.threadID,
        skillNames: T.skills.map(r => r.name)
      });
      return;
    }
    let a = T,
      e = [];
    if (T.type === "user:message") {
      let t = await UwR(T.message, {
          configService: this.deps.configService,
          filesystem: this.fs.fileSystem
        }),
        r = (await this.getConfig(R)).settings["experimental.autoSnapshot"] ?? !1,
        h = [];
      if (r) {
        let i = this.thread.nextMessageId ?? 0,
          c = await this.getWorkspaceRoot(R ?? new AbortController().signal),
          {
            createSnapshots: s
          } = await Promise.resolve().then(() => (fmT(), OX));
        h = await s(c ? [c] : [], this.threadID, i);
      }
      if (e = this._pendingSkills.getValue(), e.length > 0) J.info("Pending skills will be injected as info message", {
        threadID: this.threadID,
        skillNames: e.map(i => i.name)
      }), this._pendingSkills.next([]);
      a = Lt(T, i => {
        if (i.message = O8(t.message), h.length > 0) {
          if (!i.message.userState) i.message.userState = O8({
            currentlyVisibleFiles: []
          });
          i.message.userState.snapshotOIDs = O8(h);
        }
        R?.throwIfAborted();
      });
    }
    if (a.type === "assistant:message" || a.type === "assistant:message-update") a = this.addNormalizedInputToToolUses(a);
    try {
      if (this.ephemeralError.getValue() !== void 0) this.ephemeralError.next(void 0);
      let t = this.thread;
      if (this.updateThread(a), this.onThreadDelta(a, t), e.length > 0) await this.injectPendingSkills(e, R);
    } catch (t) {
      if (!xr(t)) J.error("Ephemeral error during handle processing", t, {
        name: "ThreadWorker",
        threadID: this.threadID
      }), this.ephemeralError.next(t instanceof Error ? t : Error(String(t)));else J.debug(`AbortError caught during handle processing for ${a.type}.`, {
        name: "handle queue",
        threadID: this.threadID
      });
    }
  }
  handleCalled = !1;
  addNormalizedInputToToolUses(T) {
    let R = this.thread.agentMode;
    if (!T.message.content.some(a => a.type === "tool_use")) return T;
    return Lt(T, a => {
      for (let e of a.message.content) if (e.type === "tool_use") {
        if (!e.name) {
          J.warn("Skipping tool_use normalization due to missing name", {
            threadID: this.threadID
          });
          continue;
        }
        let t = this.deps.toolService.normalizeToolName(e.name);
        if (t !== e.name) e.normalizedName = t;
        if (e.input && typeof e.input === "object") {
          let r = this.deps.toolService.normalizeToolArgs(e.name, e.input, R);
          if (JSON.stringify(r) !== JSON.stringify(e.input)) e.normalizedInput = r;
        }
        if ((t !== e.name ? t : e.name) === j0T && !e.metadata?.handoffThreadID) e.metadata = {
          ...e.metadata,
          handoffThreadID: Eh()
        };
      }
    });
  }
  onThreadDelta(T, R) {
    switch (T.type) {
      case "user:message":
        {
          if (this.resetRetryAttempts(), this._turnStartTime.next(Date.now()), this._turnElapsedMs.next(void 0), T.index !== void 0 && R) {
            let t = R.messages[T.index];
            if (t?.role === "user" && t.userState?.snapshotOIDs && t.userState.snapshotOIDs.length > 0) this.restoreToSnapshot([...t.userState.snapshotOIDs]).catch(r => {
              J.error("Failed to restore edit snapshots", r, {
                name: "ThreadWorker",
                threadID: this.threadID
              });
            });
          }
          if (T.index !== void 0) this.trackedFiles.clear(), this.thread.messages.forEach(t => {
            if (t.role === "user") {
              for (let r of t.content) if (r.type === "tool_result" && r.run?.status === "done" && r.run.trackFiles) this.trackFiles(r.run.trackFiles);
              if (t.fileMentions?.files) this.trackFiles(t.fileMentions.files.map(r => r.uri).filter(r => r !== void 0));
            }
          });else this.trackFiles(T.message.fileMentions?.files?.map(t => t.uri).filter(t => t !== void 0) ?? []);
          let a = this.thread.messages.at(-1)?.messageId ?? 0,
            e = kr(T.message.content);
          this.startAgentSpan(a), this.runInferenceAndUpdateThread({
            agentStart: {
              messageId: a,
              messageText: e
            }
          });
          break;
        }
      case "user:message-queue:dequeue":
        {
          let a = this.thread.messages.at(-1);
          if (!a) break;
          if (a.role !== "user") break;
          this._turnStartTime.next(Date.now()), this._turnElapsedMs.next(void 0), this.trackFiles(a.fileMentions?.files?.map(r => r.uri).filter(r => r !== void 0) ?? []);
          let e = a.messageId ?? 0,
            t = kr(a.content);
          this.startAgentSpan(e), this.runInferenceAndUpdateThread({
            agentStart: {
              messageId: e,
              messageText: t
            }
          });
          break;
        }
      case "user:tool-input":
        {
          this.toolOrchestrator.userProvideInput(T.toolUse, T.value).catch(a => {
            J.error("userProvideInput failed", {
              name: "ThreadWorker.handleDelta",
              threadID: this.threadID,
              toolUse: T.toolUse,
              error: a instanceof Error ? a.message : String(a)
            });
          });
          break;
        }
      case "tool:data":
        {
          if (this.toolOrchestrator.isCancelled(T.toolUse)) {
            let e = sA(this.thread).get(T.toolUse)?.run,
              t = e ? FD(e) : void 0;
            this.updateThread({
              type: "tool:data",
              toolUse: T.toolUse,
              data: {
                status: "cancelled",
                reason: "user:interrupted",
                progress: t
              }
            });
            return;
          }
          let a = Tn(this.thread, T.toolUse);
          if (T.data.status === "done" && a?.name === db) {
            let e = T.data.result;
            if ("task" in e && e.nextTask) {
              let t = $h(this.thread),
                r = this.deps.internalHooks?.onTaskCompleted?.({
                  thread: this.thread,
                  completedTask: e.task,
                  nextTask: e.nextTask,
                  usage: t ? {
                    totalInputTokens: t.totalInputTokens,
                    maxInputTokens: t.maxInputTokens
                  } : void 0
                });
              if (r) BI(this, r);
            }
          }
          if (wt(T.data.status)) this.toolOrchestrator.clearCancelled(T.toolUse), this.toolOrchestrator.resolveToolCompletion(T.toolUse, T.data.status === "done", Error(`Tool ${T.data.status}: ${T.toolUse}`));
          if (a) {
            let e = QwR(this.thread, T.toolUse, this.shouldContinueAfterRejection);
            J.debug(`updated tool_result${e ? " and running inference because all tools completed" : ""}`, {
              name: `handleThreadDelta(${T.type}, ${T.toolUse}, ${T.data.status})`,
              threadID: this.threadID
            });
            let t = this.shouldContinueAfterRejection || this._inferenceState.getValue() !== "cancelled";
            if (e && t) this.runInferenceAndUpdateThread();
          }
          this.toolCallUpdates.next();
          break;
        }
      case "assistant:message":
        {
          if (T.message.state.type === "complete" && T.message.state.stopReason === "tool_use") {
            let a = this.thread.messages.at(-1);
            (this.currentAgentSpan ? this.createTracer(this.currentAgentSpan.span) : Yo).startActiveSpan("tools", {
              context: {
                messageId: a?.messageId
              }
            }, async () => {
              await this.toolOrchestrator.onAssistantMessageComplete(T.message);
            }).catch(e => {
              J.error("onAssistantMessageComplete failed", {
                name: "ThreadWorker.handleDelta",
                threadID: this.threadID,
                messageState: T.message.state.type,
                error: e instanceof Error ? e.message : String(e)
              });
            });
          }
          break;
        }
      case "assistant:message-update":
        break;
      case "user:message-queue:enqueue":
        {
          let a = this._inferenceState.getValue();
          if (IUT(this.thread, a) !== "tool-running") {
            if (a === "cancelled") {
              this.handle({
                type: "user:message-queue:dequeue"
              });
              break;
            } else if (a === "idle") {
              let e = this.thread.messages.at(-1);
              if (e?.role === "assistant") {
                if (e.state.type === "cancelled" || e.state.type === "error") {
                  this.handle({
                    type: "user:message-queue:dequeue"
                  });
                  break;
                }
                if (e.state.type === "complete" && e.state.stopReason !== "tool_use") {
                  this.handle({
                    type: "user:message-queue:dequeue"
                  });
                  break;
                }
              } else if (e?.role === "info") {
                this.handle({
                  type: "user:message-queue:dequeue"
                });
                break;
              }
            }
          }
          break;
        }
      case "info:manual-bash-invocation":
        {
          this.handle({
            type: "user:message-queue:dequeue"
          });
          break;
        }
      case "cancelled":
        {
          if (this.resetRetryAttempts(), this.currentAgentSpan && this.currentAgentSpan.messageId !== void 0) {
            let a = this.currentAgentSpan.messageId,
              e = this.createTracer(this.currentAgentSpan.span);
            this.stopAgentSpan(this.currentAgentSpan.span), this.deps.pluginService.event.agentEnd({
              message: this.getMessageText(a),
              id: a,
              status: "interrupted",
              messages: Wq(this.getMessagesSince(a))
            }, e).then(t => this.handleAgentEndResult(t)).catch(t => J.debug("Failed to emit agent.end", {
              error: t
            }));
          }
          break;
        }
      case "thread:truncate":
        {
          if (this.toolOrchestrator.cancelAll("system:edited").catch(a => {
            J.error("Failed to cancel tools on truncate", a, {
              name: "ThreadWorker",
              threadID: this.threadID
            });
          }), R) {
            let a = R.messages[T.fromIndex];
            if (a?.role === "user" && a.userState?.snapshotOIDs && a.userState.snapshotOIDs.length > 0) for (let e of a.userState.snapshotOIDs) Promise.resolve().then(() => (fmT(), OX)).then(({
              restoreSnapshot: t
            }) => t(e)).catch(t => {
              J.error("Failed to restore edit snapshots on truncate", t, {
                name: "ThreadWorker",
                threadID: this.threadID
              });
            });else this.cleanupFileChanges(T.fromIndex).catch(e => {
              J.error("Failed to cleanup file changes on truncate", e, {
                name: "ThreadWorker",
                threadID: this.threadID
              });
            });
          }
          break;
        }
      case "inference:completed":
        {
          this.resetRetryAttempts();
          let a = T.model?.includes("gpt-5") || T.model?.includes("codex"),
            e = !T.usage || T.usage.totalInputTokens === 0 || T.usage.outputTokens === 0;
          if (a && e) J.warn("[thread-worker] Missing token counts in deep mode inference", {
            threadID: this.threadID,
            model: T.model,
            hasUsage: !!T.usage,
            inputTokens: T.usage?.inputTokens,
            outputTokens: T.usage?.outputTokens,
            totalInputTokens: T.usage?.totalInputTokens,
            cacheReadInputTokens: T.usage?.cacheReadInputTokens,
            cacheCreationInputTokens: T.usage?.cacheCreationInputTokens
          });
          let t = dt(this.thread, "assistant");
          if (t && t.state.type === "complete" && t.state.stopReason === "refusal") {
            this.ephemeralError.next(Error("The model refused to respond to this request. Please retry with a different prompt."));
            break;
          }
          this.checkAndAppendAwaitedSkills();
          let r = dt(this.thread, "assistant"),
            h = r?.state.type === "complete" && r.state.stopReason === "tool_use";
          if (r && h) {
            let i = this.currentAgentSpan ? this.createTracer(this.currentAgentSpan.span) : Yo,
              c = r.messageId;
            i.startActiveSpan("tools", {
              context: {
                messageId: c
              }
            }, async () => {
              await this.toolOrchestrator.onAssistantMessageComplete(r);
            }).catch(s => {
              J.error("onAssistantMessageComplete failed after inference", {
                name: "ThreadWorker.handleDelta",
                threadID: this.threadID,
                messageState: r.state.type,
                error: s instanceof Error ? s.message : String(s)
              });
            });
          }
          if (r && r.state.type === "complete" && r.state.stopReason === "end_turn") {
            let i = this._turnStartTime.getValue();
            if (i !== void 0) {
              let c = Date.now() - i;
              this._turnElapsedMs.next(c), this.thread = Lt(this.thread, s => {
                let A = s.messages.findLast(l => l.role === "assistant");
                if (A && A.role === "assistant") A.turnElapsedMs = c;
                s.v++;
              });
            }
            if (this._turnStartTime.next(void 0), this.thread.queuedMessages && this.thread.queuedMessages.length > 0) this.handle({
              type: "user:message-queue:dequeue"
            });else {
              BI(this, P7R(this.deps.internalHooks?.onAssistantTurnEnd, {
                thread: this.thread
              }));
              let c = $h(this.thread);
              if (c && this.deps.internalHooks?.onInferenceCompleted) {
                let s = this.deps.internalHooks.onInferenceCompleted({
                  thread: this.thread,
                  usage: {
                    totalInputTokens: c.totalInputTokens,
                    maxInputTokens: c.maxInputTokens
                  },
                  isIdle: !0
                });
                BI(this, s);
              }
              if (this.currentAgentSpan && this.currentAgentSpan.messageId !== void 0) {
                let s = this.currentAgentSpan.messageId,
                  A = this.createTracer(this.currentAgentSpan.span);
                this.stopAgentSpan(this.currentAgentSpan.span), this.deps.pluginService.event.agentEnd({
                  message: this.getMessageText(s),
                  id: s,
                  status: "done",
                  messages: Wq(this.getMessagesSince(s))
                }, A).then(l => this.handleAgentEndResult(l)).catch(l => J.debug("Failed to emit agent.end", {
                  error: l
                }));
              }
            }
          }
          break;
        }
    }
  }
  getMessageText(T) {
    let R = this.thread.messages.find(a => a.messageId === T);
    if (R) return kr(R.content);
    return "";
  }
  getMessagesSince(T) {
    let R = this.thread.messages.findIndex(a => a.messageId === T);
    if (R === -1) return [];
    return this.thread.messages.slice(R);
  }
  startAgentSpan(T) {
    let R = fDT();
    this.currentAgentSpan = {
      span: R,
      messageId: T
    }, this.updateThread({
      type: "trace:start",
      span: {
        name: "agent",
        id: R,
        startTime: new Date().toISOString(),
        context: {
          messageId: T
        }
      }
    });
  }
  stopAgentSpan(T) {
    if (this.updateThread({
      type: "trace:end",
      span: {
        name: "agent",
        id: T,
        endTime: new Date().toISOString()
      }
    }), this.currentAgentSpan?.span === T) this.currentAgentSpan = null;
  }
  handleAgentEndResult(T) {
    if (T.action !== "continue" || !T.userMessage) return;
    this.handle({
      type: "user:message",
      message: {
        content: [{
          type: "text",
          text: T.userMessage
        }]
      }
    }).catch(R => {
      J.debug("Failed to handle plugin agent.end continue", {
        error: R
      });
    });
  }
  triggerTitleGeneration() {
    if (this.thread.mainThreadID !== void 0 || this.thread.title) return;
    this.ops.titleGeneration?.abort(), this.ops.titleGeneration = new AbortController();
    let T = this.ops.titleGeneration.signal;
    this.getConfig(T).then(R => {
      if (T.aborted) return;
      let a = R.settings?.["agent.skipTitleGenerationIfMessageContains"],
        e = Array.isArray(a) ? a.filter(r => typeof r === "string") : [],
        t = this.thread.messages.find(r => {
          if (r.role !== "user") return !1;
          let h = kr(r.content);
          if (!h) return !1;
          if (e.length === 0) return !0;
          return !e.some(i => h.includes(i));
        });
      if (J.debug("Checking for message to generate title for", {
        skipPatterns: e,
        rawSkipPatterns: a,
        hasFirstEligibleMessage: t !== void 0,
        firstEligibleMessageId: t?.messageId
      }), t) this.deps.generateThreadTitle(t, this.thread.id, this.deps.configService, T).then(({
        title: r,
        usage: h
      }) => {
        if (T.aborted || this.isDisposed) return;
        if (r !== void 0 && this.thread.title !== r) this.updateThread({
          type: "title",
          value: r,
          usage: h
        });
      }).catch(r => {
        if (!xr(r)) J.error("generateThreadTitle error", r, {
          name: "ThreadWorker",
          threadID: this.threadID
        });else J.info("Title generation aborted", {
          firstEligibleMessageId: t?.messageId,
          threadID: this.threadID
        });
      });
    }).catch(R => {
      if (!xr(R)) J.error("ThreadWorker title generation config error", R);else J.info("Title generation aborted in outer catch", {
        threadID: this.threadID
      });
    });
  }
  async getWorkspaceRoot(T) {
    let R = await m0(this.deps.configService.workspaceRoot, T);
    if (R) return R;
    let a = this.thread.env?.initial?.trees?.find(e => e.uri !== void 0)?.uri;
    return a ? Ht(a) : null;
  }
  async runInferenceAndUpdateThread(T) {
    if (T?.agentStart) {
      let {
        messageId: R,
        messageText: a
      } = T.agentStart;
      try {
        let e = await this.deps.pluginService.event.agentStart({
          message: a,
          id: R
        }, this.currentAgentSpan ? this.createTracer(this.currentAgentSpan.span) : void 0, {
          threadID: this.threadID
        });
        if (e.message) this.updateThread({
          type: "user:message:append-content",
          messageId: R,
          content: [{
            type: "text",
            text: e.message.content
          }]
        });
      } catch (e) {
        J.debug("Failed to emit agent.start", {
          error: e
        });
      }
    }
    return this.doRunInferenceSetup();
  }
  async doRunInferenceSetup() {
    if (J.debug("runInferenceAndUpdateThread: begin", {
      threadID: this.threadID,
      inferenceState: this._inferenceState.getValue(),
      messageCount: this.thread.messages.length
    }), this.ops.inference?.abort(), this.ops.inference = null, this._inferenceState.getValue() === "cancelled") this._inferenceState.next("idle");
    let T = new AbortController();
    this.ops.inference = T;
    let R = this.currentAgentSpan?.span;
    await this.toolOrchestrator.onNewUserMessage(), await (this.currentAgentSpan ? this.createTracer(this.currentAgentSpan.span) : Yo).startActiveSpan("inference", {
      context: {
        messageId: this.currentAgentSpan?.messageId
      }
    }, () => this.doRunInferenceAndUpdateThread(T, R));
  }
  async doRunInferenceAndUpdateThread(T, R) {
    try {
      await this.doRunInferenceAndUpdateThreadInner(T, R);
    } catch (a) {
      if (xr(a) || JsT(a)) return;
      throw a;
    }
  }
  async doRunInferenceAndUpdateThreadInner(T, R) {
    let a = $h(this.thread);
    if (a && a.totalInputTokens >= a.maxInputTokens) {
      let p = Error("Context limit reached");
      this.ephemeralError.next(p);
      return;
    }
    let e = this.thread.messages.at(-1);
    if (this.thread.mainThreadID === void 0 && e?.role === "user" && this.thread.messages.filter(p => p.role === "user").length === 1) {
      if (this.deps.getThreadEnvironment) this.deps.getThreadEnvironment().then(async p => {
        this.updateThread({
          type: "environment",
          env: {
            initial: {
              ...this.thread.env?.initial,
              ...p
            }
          }
        });
      }).catch(p => {
        J.error("Failed to initialize thread environment", p, {
          threadID: this.threadID
        });
      });
    }
    this.triggerTitleGeneration();
    let t = await this.getConfig(),
      {
        model: r,
        agentMode: h
      } = pn(t.settings, this.thread),
      i = this.thread.messages.at(-1)?.messageId;
    J.debug("runInferenceAndUpdateThread: starting inference", {
      threadID: this.threadID,
      lastUserMessageId: i,
      selectedModel: r,
      agentMode: h
    });
    let c = this.deps.getServerStatus ? await m0(this.deps.getServerStatus().pipe(da(p => p !== "pending")), T.signal) : void 0,
      s = c && X9(c) ? c.user.email : void 0;
    if (!nN(h, s)) throw Error(`Agent mode '${h}' is only available for internal users`);
    let A = {
        toolService: this.deps.toolService,
        configService: this.deps.configService,
        skillService: this.deps.skillService,
        getThreadEnvironment: this.deps.getThreadEnvironment,
        filesystem: this.fs.fileSystem,
        threadService: this.deps.threadService,
        serverStatus: c
      },
      l,
      o = 0,
      n = Date.now();
    try {
      let [p, _, m] = r.match(/(.*?)\/(.*)/) ?? [],
        b = r7R(_ ?? "", m ?? ""),
        {
          systemPrompt: y,
          tools: u
        } = await LO(A, this.thread, {
          enableTaskList: !1,
          enableTask: !0,
          enableOracle: !0,
          enableChart: !1
        }, {
          model: m ?? "",
          provider: _ ?? "",
          agentMode: h ?? "smart"
        }, T.signal),
        P = t7R(r, t.settings, h),
        k = b.stream({
          model: m ?? "",
          thread: this.thread,
          systemPrompt: y,
          tools: u,
          configService: this.deps.configService,
          serverStatus: c,
          signal: T.signal,
          reasoningEffort: P
        });
      this._inferenceState.next("running"), n = Date.now(), J.debug("ThreadWorker inference stream started", {
        threadID: this.threadID,
        lastUserMessageId: i,
        selectedModel: r,
        agentMode: h
      });
      for await (let x of k) o++, l = x, await this.handle({
        type: "assistant:message-update",
        message: x
      });
      if (J.debug("ThreadWorker inference stream finished", {
        threadID: this.threadID,
        streamEventCount: o,
        durationMs: Date.now() - n,
        lastMessageState: l?.state.type,
        lastMessageId: l?.messageId
      }), l) {
        let x = l.state.type === "streaming",
          f = l.content.some(v => v.type === "tool_use" && v.complete && Object.keys(v.input ?? {}).length === 0);
        if (x || f) J.warn("Stream ended with incomplete message", {
          name: "ThreadWorker.runInference",
          threadID: this.threadID,
          streamEventCount: o,
          durationMs: Date.now() - n,
          messageState: l.state.type,
          stopReason: l.state.type === "complete" ? l.state.stopReason : void 0,
          contentBlocks: l.content.map(v => ({
            type: v.type,
            ...(v.type === "tool_use" ? {
              name: v.name,
              complete: v.complete,
              inputKeys: Object.keys(v.input ?? {})
            } : {}),
            ...(v.type === "text" ? {
              textLength: v.text.length
            } : {})
          }))
        });
      }
      await this.handle({
        type: "inference:completed",
        model: l?.usage?.model ?? r,
        usage: l?.usage
      });
    } catch (p) {
      if (J.debug("ThreadWorker inference stream error", {
        threadID: this.threadID,
        error: p instanceof Error ? p.message : String(p),
        errorName: p instanceof Error ? p.name : void 0,
        streamEventCount: o,
        durationMs: Date.now() - n,
        lastMessageState: l?.state.type,
        lastMessageId: l?.messageId
      }), !(xr(p) || JsT(p))) {
        let _ = p instanceof Error ? p : Error(String(p));
        if (dO({
          message: _.message
        })) {
          this.ephemeralError.next(_);
          return;
        }
        let m = "status" in _ && typeof _.status === "number" ? _.status : void 0;
        if (vUT({
          message: _.message,
          status: m
        })) {
          let b = this.getRetryDelaySeconds();
          if (b !== void 0) this.startRetryCountdown(b);
        }
        this.ephemeralError.next(_);
      }
      if (l && l.messageId) {
        let _ = await this.deps.pluginService.event.agentEnd({
          message: kr(l.content),
          id: l.messageId,
          status: "error",
          messages: Wq(this.getMessagesSince(l.messageId))
        }, R ? this.createTracer(R) : void 0);
        if (R) this.stopAgentSpan(R);
        this.handleAgentEndResult(_);
      } else if (R) this.stopAgentSpan(R);
      return;
    } finally {
      if (this.ops.inference === T) this.ops.inference = null, this._inferenceState.next("idle");
    }
  }
  async findAndCancelToolRun(T, R) {
    this.cancelInference(), await this.toolOrchestrator.findAndCancelToolRun(T, R);
  }
  async cancelToolOnly(T, R) {
    await this.toolOrchestrator.cancelToolOnly(T, R);
  }
  invokeBashTool(T, R, a) {
    return new AR(e => {
      let t,
        r,
        h,
        i = (c => {
          return xN(c, () => {
            if (J.warn("Manual bash abort -> unsubscribe", {
              threadID: this.threadID
            }), h?.unsubscribe(), r?.unsubscribe(), e?.complete(), t) this.handleManualBashInvocation(T, {
              status: "cancelled",
              progress: FD(t)
            }, a);
          });
        })(R);
      return (async () => {
        try {
          if (R.aborted) {
            e.error(Error("Operation was aborted"));
            return;
          }
          let c = await this.getWorkspaceRoot(R),
            s = await this.getConfig(R);
          if (this.isDisposed) {
            e.complete();
            return;
          }
          let A = {
            ...this.deps,
            dir: c,
            tool: U8,
            thread: this.thread,
            config: s,
            trackedFiles: new Ls(this.trackedFiles),
            filesystem: ymR(this.fs.fileSystem),
            fileChangeTracker: this.fs.tracker,
            getAllTrackedChanges: this.getAllTrackedChanges.bind(this),
            toolUseID: fx(),
            todos: [],
            threadEnvironment: this.thread.env?.initial ?? (await this.deps.getThreadEnvironment()),
            handleThreadDelta: this.handle.bind(this),
            discoveredGuidanceFileURIs: this.discoveredGuidanceFileURIs,
            userInitiated: !0
          };
          r = this.deps.toolService.invokeTool(U8, {
            args: T,
            userInput: {
              accepted: !0
            }
          }, A).subscribe({
            next: l => {
              t = l, e.next(l);
            },
            error: l => {
              e.error(l);
            },
            complete: () => {
              if (t) this.handleManualBashInvocation(T, t, a);
              e.complete();
            }
          }), h = this.disposed$.subscribe(() => {
            i(), r?.unsubscribe(), e?.complete();
          });
        } catch (c) {
          e.error(c);
        }
      })(), () => {
        i(), r?.unsubscribe(), h?.unsubscribe();
      };
    });
  }
  async handleManualBashInvocation(T, R, a) {
    await this.handle({
      type: "info:manual-bash-invocation",
      args: T,
      toolRun: R,
      hidden: a
    });
  }
  async cleanupThreadBackups(T) {
    try {
      await this.fs.tracker.cleanupBackups(), J.debug(`Cleaned up backup files for thread ${T}`, {
        threadID: T
      });
    } catch (R) {
      J.error("Error cleaning up thread backups", R, {
        threadID: T
      });
    }
  }
  async cancel() {
    J.debug("cancel: aborting inference operation and tools"), this.cancelInference(), await this.toolOrchestrator.cancelAll("user:cancelled"), await this.handle({
      type: "cancelled"
    }, void 0);
  }
  cancelInference() {
    if (this.ops.inference) this.ops.inference.abort(Error(u9T.USER_CANCELLED)), this.ops.inference = null;
    this._inferenceState.next("cancelled"), this._turnStartTime.next(void 0), this._turnElapsedMs.next(void 0);
  }
  static BASE_RETRY_SECONDS = 5;
  static MAX_RETRY_SECONDS = 60;
  static MAX_AUTO_RETRIES = 5;
  getRetryDelaySeconds() {
    if (this.ephemeralErrorRetryAttempt >= ov.MAX_AUTO_RETRIES) return;
    let T = ov.BASE_RETRY_SECONDS * 2 ** this.ephemeralErrorRetryAttempt;
    return Math.min(T, ov.MAX_RETRY_SECONDS);
  }
  async retry() {
    if (J.debug("retry: retrying inference operation"), this.clearRetryCountdown(), this.ephemeralError.getValue() !== void 0) this.ephemeralErrorRetryAttempt++, this.ephemeralError.next(void 0);
    if (this.ops.inference) this.ops.inference.abort(), this.ops.inference = null;
    let T = this.thread.messages.at(-1);
    if (T?.role === "assistant" && (T.state.type !== "complete" || T.state.stopReason === "refusal")) this.updateThread({
      type: "thread:truncate",
      fromIndex: this.thread.messages.length - 1
    });
    this._inferenceState.next("idle"), await this.runInferenceAndUpdateThread();
  }
  resetRetryAttempts() {
    this.ephemeralErrorRetryAttempt = 0;
  }
  dismissEphemeralError() {
    this.clearRetryCountdown(), this.ephemeralError.next(void 0), this.ephemeralErrorRetryAttempt = 0;
  }
  clearRetryCountdown() {
    if (this.retrySession++, this.retryTimer !== null) clearInterval(this.retryTimer), this.retryTimer = null;
    this.retryCountdownSeconds.next(void 0);
  }
  startRetryCountdown(T) {
    this.clearRetryCountdown();
    let R = this.retrySession,
      a = Date.now() + T * 1000;
    this.retryCountdownSeconds.next(T), this.retryTimer = setInterval(() => {
      if (R !== this.retrySession) return;
      let e = Math.max(0, Math.ceil((a - Date.now()) / 1000));
      if (e <= 0) this.clearRetryCountdown(), this.retry().catch(t => {
        J.error("Auto-retry failed", {
          error: t
        });
      });else this.retryCountdownSeconds.next(e);
    }, 1000);
  }
  addPendingSkill(T) {
    J.debug("addPendingSkill", {
      threadID: this.threadID,
      skillName: T.name
    });
    let R = this._pendingSkills.getValue();
    if (!R.some(a => a.name === T.name)) this._pendingSkills.next([...R, T]);
  }
  removePendingSkill(T) {
    J.debug("removePendingSkill", {
      threadID: this.threadID,
      skillName: T
    });
    let R = this._pendingSkills.getValue();
    this._pendingSkills.next(R.filter(a => a.name !== T));
  }
  clearPendingSkills() {
    J.debug("clearPendingSkills", {
      threadID: this.threadID
    }), this._pendingSkills.next([]);
  }
  getPendingSkills() {
    return this._pendingSkills.getValue();
  }
  setTestEphemeralError(T) {
    this.ephemeralError.next(T);
  }
  trackFiles(T) {
    for (let R of T) this.trackedFiles.add(R);
  }
  async restoreFileChangesFromBackups() {
    try {
      let T = await this.fs.tracker.restoreFromBackups();
      J.debug(`Restored ${T.totalBackups} backup files from disk`), await this.updateFileChanges();
    } catch (T) {
      J.error("Error restoring file changes", T, {
        threadID: this.threadID
      });
    }
  }
  async revertFileChanges(T) {
    await this.fs.tracker.revertAll(T), await this.updateFileChanges();
  }
  async getAllTrackedChanges() {
    return this.fs.tracker.getAllRecords();
  }
  async cleanupForkThreads(T = this.thread.messages.length) {
    await this.acquireThread(), this.updateThread({
      type: "thread:truncate",
      fromIndex: T
    });
  }
  async getToolUsesToRevert(T = this.thread.messages.length) {
    let R = new Set();
    this.thread.messages.slice(0, T).forEach(t => {
      if (t.role === "user") {
        for (let r of t.content) if (r.type === "tool_result") R.add(r.toolUseID);
      } else for (let r of t.content) if (r.type === "tool_use") R.add(r.id);
    });
    let a = new Set(),
      e = await this.fs.tracker.getAllRecords();
    for (let [t] of e.entries()) if (!R.has(t)) a.add(t);
    return a;
  }
  async getFilesAffectedByTruncation(T) {
    let R = await this.getToolUsesToRevert(T);
    return R.size > 0 ? this.fs.tracker.getFilesForToolUses(R) : [];
  }
  async cleanupFileChanges(T = this.thread.messages.length) {
    let R = await this.getToolUsesToRevert(T);
    if (R.size === 0) return;
    await this.fs.tracker.revertChanges(R), await this.updateFileChanges();
  }
  async performMessageEditCleanup(T) {
    if (await this.toolOrchestrator.cancelAll("system:edited"), !(await this.isAutoSnapshotEnabled())) await this.cleanupFileChanges();
    await this.cleanupForkThreads();
  }
  async updateFileChanges() {
    if (await this.isAutoSnapshotEnabled()) return;
    this.cachedFileChanges = await $7T(this.fs.tracker), this.fileChanges.next({
      files: this.cachedFileChanges
    });
  }
  async injectPendingSkills(T, R) {
    let a = T.map(e => e.name);
    J.info("Adding info message to prompt skill invocation", {
      threadID: this.threadID,
      skillNames: a
    }), this._awaitingSkillInvocation.next(T), this.thread = Lt(this.thread, e => {
      let t = e.nextMessageId ?? 0;
      e.nextMessageId = t + 1, e.messages.push({
        role: "info",
        messageId: t,
        content: [{
          type: "text",
          text: `You MUST call the ${oc} tool to load: ${a.join(", ")}. Do this immediately before responding.`
        }]
      }), e.v++;
    });
  }
  checkAndAppendAwaitedSkills() {
    let T = this._awaitingSkillInvocation.getValue();
    if (T.length === 0) return;
    this._awaitingSkillInvocation.next([]);
    let {
      updatedThread: R,
      uninvoked: a
    } = YwR(this.thread, {
      toolName: oc,
      items: T,
      wasInvoked: (e, t) => e.some(r => r.name === oc && r.input.name === t.name),
      toToolInput: e => ({
        name: e.name,
        arguments: e.arguments
      })
    });
    if (a.length > 0) J.info("Skills not invoked by model, appending tool_use blocks", {
      threadID: this.threadID,
      uninvokedSkills: a.map(e => e.name)
    }), this.thread = R;
  }
  async executeHandoff(T) {
    J.info("Executing handoff", {
      threadID: this.threadID,
      goal: T
    }), this.handoffState.next({
      goal: T
    });
    try {
      let {
          threadWorkerService: R
        } = await Promise.resolve().then(() => (op(), YWT)),
        a = {
          toolService: this.deps.toolService,
          configService: this.deps.configService,
          skillService: this.deps.skillService,
          getThreadEnvironment: this.deps.getThreadEnvironment,
          filesystem: this.fs.fileSystem,
          threadService: this.deps.threadService
        },
        {
          threadID: e
        } = await R.handoff(this.deps, {
          threadID: this.threadID,
          goal: T,
          images: [],
          mode: "initial",
          agentMode: this.thread.agentMode,
          queuedMessages: this.thread.queuedMessages,
          clearQueuedMessages: !0,
          blockIndex: 0,
          buildSystemPromptDeps: a
        });
      J.info("Handoff thread created and running in background", {
        fromThreadID: this.threadID,
        newThreadID: e,
        goal: T
      }), this.handoffState.next({
        goal: T,
        result: {
          newThreadID: e
        }
      });
    } catch (R) {
      J.error("Handoff failed", R, {
        threadID: this.threadID,
        goal: T
      }), this.handoffState.next({
        goal: T,
        result: {
          error: R instanceof Error ? R.message : String(R)
        }
      });
    }
  }
  continueInferenceAfterRejection(T = !0) {
    this.shouldContinueAfterRejection = T;
  }
  getTurnStartTime() {
    return this._turnStartTime.getValue();
  }
  setTurnStartTime(T) {
    this._turnStartTime.next(T);
  }
  async asyncDispose() {
    if (this.isDisposed) return;
    if (J.debug("ThreadWorker disposal starting", {
      name: "ThreadWorker.dispose",
      threadID: this.threadID,
      activeToolCount: this.toolOrchestrator.getRunningToolIds().length
    }), this.isDisposed = !0, await this.toolOrchestrator.cancelAll("system:disposed"), this.disposed$.next(), this.disposed$.complete(), this.clearRetryCountdown(), this._state.complete(), this.ephemeralError.complete(), this._inferenceState.complete(), this.fileChanges.complete(), this.toolCallUpdates.complete(), this.retryCountdownSeconds.complete(), this.toolOrchestrator.dispose(), this.ops.inference) this.ops.inference.abort(), this.ops.inference = null;
    if (this.ops.titleGeneration) this.ops.titleGeneration.abort(), this.ops.titleGeneration = null;
    if (this.fs.tracker.dispose(), this.threadReadWriter) await this.threadReadWriter.asyncDispose(), this.threadReadWriter = null;
  }
  async getSelectedAgentMode() {
    let T = await this.getConfig(),
      {
        agentMode: R
      } = pn(T.settings, this.thread);
    return R;
  }
}