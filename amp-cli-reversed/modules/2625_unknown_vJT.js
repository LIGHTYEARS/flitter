function TW(T) {
  let R = z9.safeParse(T.dtwMessageID);
  if (!R.success) return;
  return R.data;
}
function RW(T) {
  let R = z9.safeParse(T.queuedMessage.dtwMessageID);
  if (R.success) return R.data;
  let a = z9.safeParse(T.id);
  if (a.success) return a.data;
  return;
}
function RD0(T) {
  return aD0.has(T);
}
class vJT {
  deps;
  thread$;
  threadState$;
  threadViewState$;
  inferenceErrors$;
  toolProgressByToolUseID$;
  pendingApprovals$;
  provider;
  threadSubject;
  threadStateSubject;
  threadViewStateSubject;
  transportSubscriptions = [];
  clientID;
  transport;
  executorRuntime;
  toolRunner;
  optimisticThreadProjection;
  pendingApprovalsSubject = new f0([]);
  pendingSkillsSubject = new f0([]);
  inferenceErrorsSubject = new W0();
  pendingSkills$ = this.pendingSkillsSubject;
  latestPendingApprovals = [];
  fileChanges = {
    files: []
  };
  currentAgentLoopState;
  activeError = null;
  retryCountdownTimer = null;
  handoffService;
  providerSubscriptions = null;
  constructor(T, R) {
    this.deps = R, this.provider = T, this.clientID = R.clientID;
    let a = Gy("info"),
      e = Gy("error"),
      t = s => ({
        ...(s ?? {}),
        threadId: this.provider.threadId
      }),
      r = {
        info: (s, A) => {
          a(s, t(A));
        },
        error: (s, A) => {
          e(s, t({
            error: A
          }));
        },
        wsMessage: (s, A, l) => {
          J.debug("DTW executor tool runner message", t({
            direction: s,
            clientID: A,
            ...(typeof l === "object" && l !== null ? l : {
              message: l
            })
          }));
        }
      };
    this.transport = this.provider.getTransport(), this.executorRuntime = new PH({
      transport: this.transport,
      toolService: this.deps.toolService,
      configService: this.deps.configService,
      clientID: this.clientID,
      threadID: this.provider.threadId,
      invokeTool: s => this.invokeToolForLease(s),
      skillService: this.deps.skillService,
      initialToolDiscovery: this.deps.initialToolDiscovery,
      onBootstrapSuccess: () => {
        this.applyLocalEnvironment();
      },
      sendGitSnapshot: !1,
      batchGuidanceFiles: cVT,
      renderToolRunError: I8T,
      log: r,
      autoResolvePendingApprovals: !1,
      handshake: s => this.sendExecutorHandshake(s),
      handshakeManagerOptions: {
        onError: ({
          error: s,
          attempt: A,
          delayMs: l
        }) => {
          J.warn("DTW executor handshake failed", {
            error: s,
            attempt: A,
            delayMs: l
          });
        },
        onExhausted: s => {
          this.handleHandshakeExhausted(s);
        }
      },
      handleExecutorRollbackRequest: async s => {
        await this.handleRollbackRequest(s).catch(() => {
          return;
        });
      },
      handleExecutorFileSystemReadDirectoryRequest: async s => {
        await this.handleFileSystemReadDirectoryRequest(s).catch(() => {
          return;
        });
      },
      handleExecutorFileSystemReadFileRequest: async s => {
        await this.handleFileSystemReadFileRequest(s).catch(() => {
          return;
        });
      }
    }), this.executorRuntime.attachTransportExecutorCallbacks({
      includeConnectionChanges: !0
    }), this.toolRunner = this.executorRuntime.toolRunner, this.executorRuntime.handleConnectionChange(this.transport.getConnectionInfo()), this.currentAgentLoopState = T.getAgentLoopState();
    let h = T.getThread();
    this.optimisticThreadProjection = new gJT(h, this.currentAgentLoopState);
    let i = this.optimisticThreadProjection.resolve(h),
      c = AB(i, this.currentAgentLoopState, this.fileChanges, this.currentEphemeralError());
    this.threadSubject = new f0(i), this.thread$ = this.threadSubject, this.threadStateSubject = new f0(lB({
      thread: i,
      viewState: c,
      resolvedTokenUsage: $h(i)
    })), this.threadState$ = this.threadStateSubject, this.threadViewStateSubject = new f0(c), this.threadViewState$ = this.threadViewStateSubject, this.inferenceErrors$ = this.inferenceErrorsSubject, this.toolProgressByToolUseID$ = this.provider.toolProgressByToolUseIDChanges().pipe(JR(uJT)), this.transportSubscriptions.push(this.threadSubject.subscribe(s => {
      this.rebuildThreadState(s);
    }), this.threadViewStateSubject.subscribe(s => {
      let A = this.threadStateSubject.getValue();
      if (A.viewState === s) return;
      this.threadStateSubject.next({
        ...A,
        viewState: s
      });
    })), this.pendingApprovals$ = this.pendingApprovalsSubject, this.refreshProviderFileChanges(), this.attachTransportHandlers(), this.handoffService = R.handoffService;
  }
  startProviderSubscription(T) {
    this.providerSubscriptions?.unsubscribe();
    let R = this.provider.threadChanges().subscribe({
        next: e => {
          T(e), this.refreshProviderFileChanges(), this.updateThreadViewStateFromProvider();
        }
      }),
      a = this.provider.agentLoopStateChanges().subscribe({
        next: e => {
          if (this.currentAgentLoopState = e, this.optimisticThreadProjection.setAgentLoopState(e), e === "error") this.inferenceErrorsSubject.next(Error("Agent failed to complete the request."));
          this.updateThreadViewStateFromProvider();
        }
      });
    this.providerSubscriptions = {
      unsubscribe: () => {
        R.unsubscribe(), a.unsubscribe();
      }
    };
  }
  writeThread(T) {
    this.currentAgentLoopState = this.provider.getAgentLoopState(), this.threadSubject.next(T);
  }
  providerThread() {
    return this.provider.getThread();
  }
  resolveAuthoritativeThread(T) {
    return this.optimisticThreadProjection.resolve(T);
  }
  getThreadViewState() {
    return this.threadViewStateSubject.getValue();
  }
  getCurrentThread() {
    return this.threadSubject.getValue();
  }
  getThreadID() {
    return this.getCurrentThread().id;
  }
  getThreadTitle() {
    return this.getCurrentThread().title;
  }
  getAgentMode() {
    return this.getCurrentThread().agentMode;
  }
  getMessages() {
    return this.getCurrentThread().messages;
  }
  getQueuedMessages() {
    return this.getCurrentThread().queuedMessages ?? [];
  }
  getInitialTreeURI() {
    return this.getCurrentThread().env?.initial.trees?.[0]?.uri;
  }
  shouldAutoSubmitDraft() {
    let T = this.getCurrentThread();
    if (!T.autoSubmitDraft) return !1;
    return ve(T) === 0;
  }
  getEmptyHandoffParentThreadID() {
    let T = this.getCurrentThread();
    if (ve(T) > 0) return;
    return zET(T, "handoff")?.threadID;
  }
  isThreadEmpty() {
    return ve(this.getCurrentThread()) === 0;
  }
  isStreaming() {
    let T = this.getMessages().at(-1);
    return T?.role === "assistant" && T.state.type === "streaming";
  }
  getResolvedTokenUsage() {
    return $h(this.thread$.getValue());
  }
  async dispose() {
    this.providerSubscriptions?.unsubscribe(), this.providerSubscriptions = null;
    for (let T of this.transportSubscriptions) T.unsubscribe();
    this.transportSubscriptions.length = 0, this.clearRetryCountdownTimer(), this.executorRuntime.dispose(), await this.provider.disposeAndWaitForClose(), this.threadSubject.complete(), this.threadStateSubject.complete(), this.threadViewStateSubject.complete(), this.inferenceErrorsSubject.complete(), this.pendingApprovalsSubject.complete(), this.pendingSkillsSubject.complete();
  }
  async sendMessage(T) {
    if (T.editIndex !== void 0) {
      await this.ensureProviderReadyForExecutorActions();
      let t = this.thread$.getValue(),
        r = t.messages[T.editIndex];
      if (!r || r.role !== "user" || !r.dtwMessageID) throw Error("Unable to edit message: missing DTW message ID");
      let h = t.messages.findIndex(c => c.role === "user");
      if (T.editIndex === h && T.agentMode && t.agentMode !== T.agentMode) this.provider.setAgentMode(T.agentMode, {
        overwrite: !0
      }), this.updateThread(c => {
        c.agentMode = T.agentMode;
      });
      this.provider.editUserMessage(r.dtwMessageID, T.content, bkT(), T.agentMode);
      let i = this.optimisticThreadProjection.optimisticUpdate({
        type: "edit",
        targetMessageID: r.dtwMessageID,
        content: T.content
      });
      this.writeThread(i);
      return;
    }
    let R = this.thread$.getValue();
    if (!R.messages.some(t => t.role === "user") && T.agentMode && R.agentMode !== T.agentMode) this.provider.setAgentMode(T.agentMode, {
      overwrite: !0
    }), this.updateThread(t => {
      t.agentMode = T.agentMode;
    });
    let a = Vb(),
      e = this.optimisticThreadProjection.optimisticUpdate({
        type: "submit",
        clientMessageID: a,
        content: T.content
      });
    this.writeThread(e);
    try {
      let t = T.prepareContentForSend ? await T.prepareContentForSend(T.content) : T.content;
      await this.ensureProviderConnectedForClientWrites();
      let r = await this.discoverGuidanceFilesForUserMessage(t);
      if (r && r.length > 0) {
        let i = r.map(s => ({
            uri: s.uri,
            lineCount: s.lineCount ?? 0,
            ...(typeof s.content === "string" ? {
              content: s.content
            } : {})
          })),
          c = this.optimisticThreadProjection.optimisticUpdate({
            type: "update-submit-guidance",
            clientMessageID: a,
            discoveredGuidanceFiles: i
          });
        this.writeThread(c);
      }
      let h = await this.collectUserState();
      this.provider.sendUserMessage(t, T.agentMode, h, a, r);
    } catch (t) {
      throw this.rollbackOptimisticSubmit(a), t;
    }
  }
  async restoreTo(T) {
    await this.ensureProviderReadyForExecutorActions();
    let R = [...this.thread$.getValue().messages.slice(0, T + 1)].reverse().find(t => t.role === "user");
    if (!R?.dtwMessageID) throw Error("Unable to edit message: missing DTW message ID");
    let a = R.content.filter(t => t.type === "text" || t.type === "image").map(t => {
      if (t.type === "image") return {
        ...t,
        source: {
          ...t.source
        }
      };
      return {
        ...t
      };
    });
    if (a.length === 0) throw Error("Unable to edit message: no editable content found");
    this.provider.editUserMessage(R.dtwMessageID, a, bkT());
    let e = this.optimisticThreadProjection.optimisticUpdate({
      type: "edit",
      targetMessageID: R.dtwMessageID,
      content: a
    });
    this.writeThread(e);
  }
  async queueMessage(T) {
    let R = Vb(),
      a = this.optimisticThreadProjection.optimisticUpdate({
        type: "submit",
        clientMessageID: R,
        content: T
      });
    this.writeThread(a);
    try {
      await this.ensureProviderConnectedForClientWrites();
      let e = await this.discoverGuidanceFilesForUserMessage(T);
      if (e && e.length > 0) {
        let r = e.map(i => ({
            uri: i.uri,
            lineCount: i.lineCount ?? 0,
            ...(typeof i.content === "string" ? {
              content: i.content
            } : {})
          })),
          h = this.optimisticThreadProjection.optimisticUpdate({
            type: "update-submit-guidance",
            clientMessageID: R,
            discoveredGuidanceFiles: r
          });
        this.writeThread(h);
      }
      let t = await this.collectUserState();
      this.provider.sendUserMessage(T, void 0, t, R, e);
    } catch (e) {
      throw this.rollbackOptimisticSubmit(R), e;
    }
  }
  async discardQueuedMessages() {
    let T = this.optimisticThreadProjection.optimisticUpdate({
      type: "discard-queued"
    });
    this.writeThread(T), this.provider.discardQueuedMessages();
  }
  async interruptQueuedMessage(T) {
    await this.ensureProviderReadyForExecutorActions(), this.provider.interruptQueuedMessage(T);
    let R = this.optimisticThreadProjection.optimisticUpdate({
      type: "interrupt-queued",
      queuedMessageID: T
    });
    this.writeThread(R);
  }
  async ensureProviderConnectedForClientWrites() {
    await this.provider.ensureConnectedForAction("client-write");
  }
  async ensureProviderReadyForExecutorActions(T) {
    await this.provider.ensureConnectedForAction("executor-action"), await this.executorRuntime.ensureReady({
      timeoutMs: eD0,
      timeoutMessage: "Timed out waiting for executor readiness. Please retry."
    });
  }
  rollbackOptimisticSubmit(T) {
    let R = this.optimisticThreadProjection.optimisticUpdate({
      type: "drop-submit",
      clientMessageID: T
    });
    this.writeThread(R);
  }
  async setVisibility(T) {
    await this.deps.threadService.updateThreadMeta(this.provider.threadId, MA(T));
    let R = await this.deps.threadService.get(this.provider.threadId);
    if (R) this.writeThread(R);
  }
  async setTitle(T) {
    let R = T.trim();
    if (!R) return;
    await this.ensureProviderReadyForExecutorActions(), this.provider.setThreadTitle(R), this.updateThread(a => {
      a.title = R;
    });
  }
  updateThread(T) {
    let R = Lt(this.threadSubject.getValue(), T),
      a = this.optimisticThreadProjection.resolve(R);
    this.writeThread(a);
  }
  async cancelTurn() {
    this.provider.cancelAgentLoop();
  }
  async cancelStreaming() {
    this.provider.cancelAgentLoop();
  }
  async retryTurn() {
    this.provider.retryAgentLoop();
  }
  invokeBashTool(T, R) {
    let a = Nc0();
    return new AR(e => {
      let t = !1,
        r = null,
        h = A => {
          try {
            this.provider.appendManualBashInvocation({
              args: T,
              run: A,
              hidden: R.hidden
            });
          } catch (l) {
            J.warn("Failed to append manual bash invocation to DTW thread", {
              error: l
            }), this.activeError = {
              message: `Failed to sync bash result to thread: ${l instanceof Error ? l.message : String(l)}`
            }, this.updateThreadViewStateFromProvider();
          }
        },
        i = (A, l = {
          emitRun: !0
        }) => {
          if (t) return;
          if (t = !0, h(A), l.emitRun) e.next(A);
          e.complete();
        },
        c = A => A instanceof Error ? A.message : String(A),
        s = () => {
          r?.unsubscribe(), i({
            status: "cancelled",
            reason: "User canceled"
          });
        };
      return R.abortController.signal.addEventListener("abort", s), (async () => {
        try {
          if (await this.ensureProviderReadyForExecutorActions(), t) return;
          let A = await Gk({
            toolName: U8,
            dtwArtifactSyncService: this.createDTWArtifactSyncService(),
            configService: this.deps.configService,
            toolService: this.deps.toolService,
            mcpService: this.deps.mcpService,
            skillService: this.deps.skillService,
            fsTracker: this.deps.fs,
            toolUseID: a,
            discoveredGuidanceFileURIs: this.toolRunner.discoveredGuidanceFileURIs,
            threadID: this.provider.threadId
          });
          if (t) return;
          let l = {
            ...A,
            userInitiated: !0
          };
          e.next({
            status: "in-progress"
          }), r = this.deps.toolService.invokeTool(U8, {
            args: T,
            userInput: {
              accepted: !0
            }
          }, l).subscribe({
            next: o => {
              if (t) return;
              if (e.next(o), o.status !== "in-progress") i(o, {
                emitRun: !1
              });
            },
            error: o => {
              i({
                status: "error",
                error: {
                  message: c(o)
                }
              });
            }
          });
        } catch (A) {
          i({
            status: "error",
            error: {
              message: c(A)
            }
          });
        }
      })(), () => {
        r?.unsubscribe(), R.abortController.signal.removeEventListener("abort", s);
      };
    });
  }
  dismissEphemeralError() {
    this.activeError = null, this.clearRetryCountdownTimer(), this.updateThreadViewStateFromProvider();
  }
  async resolveApproval(T, R, a) {
    let e = Ca.safeParse(T);
    if (!e.success) return;
    this.provider.resolveToolApproval(e.data, R, {
      denyFeedback: a
    });
  }
  addPendingSkill(T) {
    this.pendingSkillsSubject.next([...this.pendingSkillsSubject.getValue(), T]);
  }
  removePendingSkill(T) {
    this.pendingSkillsSubject.next(this.pendingSkillsSubject.getValue().filter(R => R.name !== T));
  }
  clearPendingSkills() {
    this.pendingSkillsSubject.next([]);
  }
  async getDraft() {
    let T = this.thread$.getValue().draft;
    if (!T) return null;
    let R = S0T(T);
    if (!R.text && R.images.length === 0) return null;
    return R;
  }
  async setDraft(T) {
    this.updateThread(R => {
      if (!T || !T.text && T.images.length === 0) {
        delete R.draft, delete R.autoSubmitDraft;
        return;
      }
      let a = [];
      if (T.text) a.push({
        type: "text",
        text: T.text
      });
      if (T.images.length > 0) a.push(...T.images);
      R.draft = a, R.autoSubmitDraft = !1;
    });
  }
  async clearPendingNavigation() {}
  async getGuidanceFiles(T) {
    let R = this.thread$.getValue();
    return (await _O({
      filesystem: this.deps.filesystem,
      configService: this.deps.configService,
      threadService: this.deps.threadService
    }, R, T)).map(a => ({
      uri: a.uri,
      type: a.type
    }));
  }
  async getFilesAffectedByTruncation(T) {
    let R = this.thread$.getValue(),
      a = await this.getToolUsesToRevert(R, T);
    return a.size > 0 ? this.deps.fs.tracker.getFilesForToolUses(a) : [];
  }
  async getToolUsesToRevert(T, R) {
    let a = new Set();
    T.messages.slice(0, R).forEach(r => {
      if (r.role === "user") {
        for (let h of r.content) if (h.type === "tool_result") a.add(h.toolUseID);
      } else for (let h of r.content) if (h.type === "tool_use") a.add(h.id);
    });
    let e = new Set(),
      t = await this.deps.fs.tracker.getAllRecords();
    for (let [r] of t.entries()) if (!a.has(r)) e.add(r);
    return e;
  }
  async collectUserState() {
    try {
      return (await KWT()) ?? c7;
    } catch (T) {
      return J.warn("Failed to collect IDE user state for DTW message", {
        error: T
      }), c7;
    }
  }
  resolveUserMessageGuidanceContext() {
    let T = zR.file(process.cwd()),
      R = this.thread$.getValue().env?.initial,
      a = R?.trees?.[0]?.uri ? I8(R.trees[0].uri) : T;
    return {
      workspaceRoot: a.scheme === "file" ? a : T,
      workingDirectory: T
    };
  }
  resolveMentionedPathToURI(T, R) {
    if (T.startsWith("file://")) try {
      let e = zR.parse(T);
      return e.scheme === "file" ? e : null;
    } catch {
      return null;
    }
    if (An(T)) return zR.file(T);
    let a = T.startsWith("./") || T.startsWith("../") ? R.workingDirectory : R.workspaceRoot;
    return MR.resolvePath(a, T);
  }
  async discoverGuidanceFilesForUserMessage(T) {
    let R = kr(T);
    if (!R.trim()) return;
    let {
      paths: a
    } = GWT(R);
    if (a.length === 0) return;
    let e = this.resolveUserMessageGuidanceContext(),
      t = new Set(),
      r = new Set(),
      h = [];
    for (let i of a) {
      let c = this.resolveMentionedPathToURI(i, e);
      if (!c || !MR.hasPrefix(c, e.workspaceRoot)) continue;
      let s = c.toString();
      if (r.has(s)) continue;
      r.add(s);
      let A = await fm({
        stat: (l, o) => this.deps.filesystem.stat(l, o),
        readFile: (l, o) => this.deps.filesystem.readFile(l, o)
      }, c, e.workspaceRoot, null, t);
      for (let l of A) {
        if (h.some(o => o.uri === l.uri)) continue;
        t.add(l.uri), h.push({
          uri: l.uri,
          content: l.content,
          lineCount: l.lineCount
        });
      }
    }
    return h.length > 0 ? h : void 0;
  }
  handleHandshakeExhausted(T) {
    J.error("DTW executor handshake exhausted", T);
  }
  syncApprovalRequests(T) {
    let R = this.provider.threadId;
    if (!R) {
      this.pendingApprovalsSubject.next([]);
      return;
    }
    let a = T.filter(t => t.threadId === R || t.mainThreadId === R);
    this.pendingApprovalsSubject.next(a);
    let e = new Set(a.map(pS));
    for (let t of [...this.toolRunner.sentApprovalRequests]) if (!e.has(t)) this.toolRunner.sentApprovalRequests.delete(t);
    for (let t of a) {
      let r = pS(t);
      if (this.toolRunner.sentApprovalRequests.has(r)) continue;
      let h = ZKT(t),
        i = this.transport.getConnectionInfo(),
        c = i.state === "connected" && i.role === "executor";
      if (c) this.transport.sendExecutorToolApprovalRequest(h);
      if (c) this.toolRunner.sentApprovalRequests.add(r);
    }
  }
  handleExecutorToolApprovalResponse(T) {
    this.deps.toolService.resolveApproval(T.toolCallId, T.accepted, T.input?.denyFeedback);
  }
  syncExecutorTools(T) {
    this.executorRuntime.syncExecutorToolRegistrations(T);
  }
  attachTransportHandlers() {
    this.transportSubscriptions.push(this.provider.executorReadyChanges().subscribe({
      next: T => {
        if (T) this.syncApprovalRequests(this.latestPendingApprovals);
      }
    }), this.provider.compactionStateChanges().subscribe({
      next: () => {
        this.updateThreadViewStateFromProvider();
      }
    }), this.provider.errorEvents().subscribe({
      next: T => {
        if (this.activeError = T.type === "error_set" ? T.error : null, T.type === "error_set") this.inferenceErrorsSubject.next(T.error);
        this.syncRetryCountdownTimer(), this.updateThreadViewStateFromProvider();
      }
    }), this.provider.errors().subscribe({
      next: T => {
        this.inferenceErrorsSubject.next(Error(T.message));
      }
    }), this.provider.cancelledEvents().subscribe({
      next: () => {
        this.activeError = null, this.clearRetryCountdownTimer(), this.updateThreadViewStateFromProvider();
      }
    }), this.transport.executorToolApprovalResponses().subscribe({
      next: T => {
        this.handleExecutorToolApprovalResponse(T);
      }
    }), this.deps.toolService.tools.subscribe({
      next: T => {
        this.syncExecutorTools(RtT(T));
      }
    }), this.deps.toolService.pendingApprovals$.subscribe(T => {
      this.latestPendingApprovals = T, this.syncApprovalRequests(T);
    }));
  }
  async sendExecutorHandshake(T) {
    J.debug("DTW executor handshake", {
      trigger: T,
      threadID: this.provider.threadId
    }), await this.executorRuntime.bootstrapExecutor({
      executorType: "local-client",
      trigger: T,
      workspaceRoot: process.cwd(),
      threadID: this.provider.threadId,
      suppressConnectLog: !0
    });
  }
  async applyLocalEnvironment() {
    try {
      let T = await Hs();
      this.provider.setEnvironment({
        initial: T
      });
    } catch (T) {
      J.debug("Failed to apply local environment", {
        error: T
      });
    }
  }
  createDTWArtifactSyncService() {
    return {
      upsertArtifact: (T, R) => {
        let a = Ca.safeParse(R);
        this.transport.sendExecutorArtifactUpsert(T, a.success ? a.data : void 0);
      },
      deleteArtifact: T => {
        this.transport.sendExecutorArtifactDelete(T);
      }
    };
  }
  async invokeToolForLease(T) {
    let R = typeof T.args === "object" && T.args !== null ? T.args : {},
      a = Date.now(),
      e = await Gk({
        toolName: T.toolName,
        dtwHandoffService: this.handoffService,
        dtwArtifactSyncService: this.createDTWArtifactSyncService(),
        configService: this.deps.configService,
        toolService: this.deps.toolService,
        mcpService: this.deps.mcpService,
        skillService: this.deps.skillService,
        fsTracker: this.deps.fs,
        toolUseID: T.toolCallId,
        discoveredGuidanceFileURIs: this.toolRunner.discoveredGuidanceFileURIs,
        threadID: this.provider.threadId
      });
    J.info("DTW TUI tool run environment ready", {
      toolCallId: T.toolCallId,
      toolName: T.toolName,
      threadId: this.provider.getThread().id,
      elapsedMs: Date.now() - a
    });
    let t = this.deps.toolService.invokeTool(T.toolName, {
      args: R
    }, e);
    return J.info("DTW TUI tool service returned observable", {
      toolCallId: T.toolCallId,
      toolName: T.toolName,
      threadId: this.provider.getThread().id,
      elapsedMs: Date.now() - a
    }), t;
  }
  async handleRollbackRequest(T) {
    await this.toolRunner.handleRollbackRequest(T.editId, T.toolUseIdsToRevert, R => this.deps.fs.tracker.revertChanges(R)), await this.refreshProviderFileChanges(), this.updateThreadViewStateFromProvider();
  }
  async handleFileSystemReadDirectoryRequest(T) {
    let R = await TtT({
      fileSystem: this.deps.filesystem,
      workspaceRoot: process.cwd()
    }, T.uri);
    this.transport.sendExecutorFileSystemReadDirectoryResult(T.requestId, R);
  }
  async handleFileSystemReadFileRequest(T) {
    let R = await TVT({
      fileSystem: this.deps.filesystem,
      workspaceRoot: process.cwd()
    }, T.uri);
    this.transport.sendExecutorFileSystemReadFileResult(T.requestId, R);
  }
  async refreshProviderFileChanges() {
    this.fileChanges = {
      files: await $7T(this.deps.fs.tracker)
    }, this.updateThreadViewStateFromProvider();
  }
  updateThreadViewStateFromProvider() {
    this.threadViewStateSubject.next(AB(this.threadSubject.getValue(), this.currentAgentLoopState, this.fileChanges, this.currentEphemeralError())), this.deps.onThreadViewStateChange();
  }
  rebuildThreadState(T) {
    this.threadStateSubject.next(lB({
      thread: T,
      viewState: this.threadViewStateSubject.getValue(),
      resolvedTokenUsage: $h(T)
    }));
  }
  syncRetryCountdownTimer() {
    let T = this.activeError?.retryAt;
    if (T === void 0 || T <= Date.now()) {
      this.clearRetryCountdownTimer();
      return;
    }
    if (this.retryCountdownTimer !== null) return;
    this.retryCountdownTimer = setInterval(() => {
      let R = this.activeError?.retryAt;
      if (R === void 0) {
        this.clearRetryCountdownTimer();
        return;
      }
      if (this.updateThreadViewStateFromProvider(), R <= Date.now()) this.clearRetryCountdownTimer();
    }, 1000);
  }
  clearRetryCountdownTimer() {
    if (this.retryCountdownTimer === null) return;
    clearInterval(this.retryCountdownTimer), this.retryCountdownTimer = null;
  }
  currentEphemeralError() {
    if (!this.activeError) return;
    let T = this.activeError.retryAt !== void 0 ? Math.max(0, Math.ceil((this.activeError.retryAt - Date.now()) / 1000)) : void 0,
      R = this.activeError.code !== void 0 || this.activeError.attempt !== void 0 ? {
        code: this.activeError.code,
        attempt: this.activeError.attempt
      } : void 0;
    return {
      message: this.activeError.message,
      stack: this.activeError.stack,
      error: R,
      retryCountdownSeconds: T
    };
  }
}