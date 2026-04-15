class ttT {
  threadSubject;
  agentLoopStateSubject = new f0("idle");
  executorReadySubject = new f0(!1);
  deltaState = {
    streamingMessageId: null,
    streamingBlocks: [],
    completedMessages: []
  };
  toolProgressByToolUseIDSubject = new f0(new Map());
  threadResumeCursor;
  messages;
  queuedMessages;
  relationships;
  threadTitle;
  processedIds;
  agentLoopState = "idle";
  toolProgressByToolUseID = new Map();
  compactionStateSubject = new f0("idle");
  compactionState = "idle";
  lastConnectionState = "disconnected";
  lastConnectionInfo = null;
  connectionMode;
  pendingClientWritesByMessageID = new Map();
  connectedTransportGeneration = 0;
  pendingClientWriteReplayGeneration = null;
  observerCallbacksAttached = !1;
  transport;
  usesThreadActorsBackend;
  threadId;
  constructor(T, R, a, e, t) {
    this.threadId = T.id, this.threadTitle = T.title, this.messages = [...T.messages], this.queuedMessages = P$(T.queuedMessages) ?? [], this.relationships = T.relationships ?? [], this.processedIds = a, this.transport = R, this.usesThreadActorsBackend = t?.usesThreadActors ?? !1, this.threadResumeCursor = dn0(e), this.threadSubject = new f0(T), this.connectionMode = t?.connectionMode ?? "observer", this.subscribeToTransport();
  }
  static async create(T) {
    let R = await uA(T.threadId, T.configService, T.apiKey, {
        repositoryURL: T.repositoryURL,
        executorType: T.executorType,
        usesThreadActors: T.useThreadActors
      }),
      a = R,
      e = await kH(R.threadId, T.threadService),
      t = Mp0(R, T.useThreadActors);
    if (t !== "none") {
      T.onLegacyImportStateChange?.("importing");
      try {
        let A = etT(e),
          l = t === "legacy-import-to-dtw" ? await wp0(e, T.configService, T.apiKey, {
            ampURL: T.ampURL,
            workerURL: T.workerUrl,
            payload: A
          }) : await Bp0(e, T.configService, T.apiKey, {
            ampURL: T.ampURL,
            payload: A,
            ownerUserId: R.ownerUserId,
            threadVersion: R.threadVersion,
            agentMode: R.agentMode
          }),
          o = t !== "legacy-import-to-dtw";
        if (await Np0(R.threadId, T.configService, T.apiKey, {
          executorType: "local-client",
          usesThreadActors: o
        }), a = {
          ...R,
          usesDtw: !0,
          usesThreadActors: o,
          executorType: "local-client"
        }, l === "imported" && t !== "local-client-dtw-to-thread-actors") e = Dp0(e, A);
      } finally {
        T.onLegacyImportStateChange?.("idle");
      }
    }
    let {
        messages: r,
        processedIds: h
      } = Up0(e),
      i = {
        ...e,
        id: R.threadId,
        messages: r,
        queuedMessages: P$(e.queuedMessages),
        relationships: e.relationships ? [...e.relationships] : void 0
      },
      c = new uH(await Yp0(T, a)),
      s = new ttT(i, c, h, e.v, {
        connectionMode: T.connectionMode,
        usesThreadActors: a.usesThreadActors
      });
    try {
      if (T.connectOnCreate ?? !0) await s.transport.ensureConnected({
        maxAttempts: 1,
        waitForConnectedTimeoutMs: 0,
        onRetryableConnectError: A => {
          let l = s.transport.getConnectionInfo();
          J.warn("[dtw] Initial transport connect failed; waiting for reconnect", {
            threadId: s.threadId,
            connectionState: l.state,
            ...KkT(l.reconnectCause),
            error: A
          });
        }
      }), s.emitThread();
      return s;
    } catch (A) {
      throw s.dispose(), A;
    }
  }
  threadChanges() {
    return this.threadSubject;
  }
  agentLoopStateChanges() {
    return this.agentLoopStateSubject;
  }
  executorReadyChanges() {
    return this.executorReadySubject;
  }
  toolProgressByToolUseIDChanges() {
    return this.toolProgressByToolUseIDSubject;
  }
  getThread() {
    return this.threadSubject.getValue();
  }
  getAgentLoopState() {
    return this.agentLoopState;
  }
  getConnectionState() {
    return this.lastConnectionInfo?.state ?? this.transport.getConnectionInfo().state;
  }
  getConnectionRole() {
    return this.lastConnectionInfo?.role ?? this.transport.getConnectionInfo().role;
  }
  usesThreadActors() {
    return this.usesThreadActorsBackend;
  }
  getCompactionState() {
    return this.compactionState;
  }
  compactionStateChanges() {
    return this.compactionStateSubject;
  }
  setEnvironment(T) {
    let R = this.threadSubject.getValue();
    if (R.env?.initial) return;
    let a = {
      ...R,
      ...{
        env: T
      }
    };
    this.threadSubject.next(a);
  }
  setRelationships(T) {
    if (this.relationships.length > 0) return;
    this.relationships = T, this.emitThread();
  }
  setAgentMode(T, R) {
    if (!T) return;
    let a = this.threadSubject.getValue();
    if (!R?.overwrite && a.agentMode) return;
    if (a.agentMode === T) return;
    let e = {
      ...a,
      agentMode: T
    };
    this.threadSubject.next(e);
  }
  async ensureConnectedForAction(T) {
    if (this.transport.getConnectionInfo().state === "reconnecting") {
      let a = T === "client-write" ? "client write action" : "executor action";
      J.info(`Forcing transport reconnect before ${a}`);
    }
    if (await this.transport.ensureConnected({
      forceReconnectWhenReconnecting: !0,
      onAttemptTimeout: ({
        attempt: a,
        maxAttempts: e,
        nextDelayMs: t
      }) => {
        J.info("[dtw] Connection attempt timed out, retrying", {
          attempt: a,
          maxAttempts: e,
          nextDelayMs: t,
          threadId: this.threadId
        });
      }
    })) return;
    let R = this.transport.getConnectionInfo().state;
    throw Error(R === "reconnecting" ? "Timed out while reconnecting. Please retry after reconnecting." : "Timed out waiting for connection. Please retry.");
  }
  editUserMessage(...T) {
    this.transport.editUserMessage(...T);
  }
  setThreadTitle(...T) {
    this.transport.setThreadTitle(...T);
  }
  cancelAgentLoop(...T) {
    this.transport.cancelAgentLoop(...T);
  }
  retryAgentLoop(...T) {
    this.transport.retryAgentLoop(...T);
  }
  appendManualBashInvocation(...T) {
    this.transport.appendManualBashInvocation(...T);
  }
  resolveToolApproval(...T) {
    this.transport.resolveToolApproval(...T);
  }
  errorEvents() {
    return this.transport.errorEvents();
  }
  errors() {
    return this.transport.errors();
  }
  cancelledEvents() {
    return this.transport.cancelledEvents();
  }
  getTransport() {
    return this.transport;
  }
  emitThread(T) {
    let R = this.threadSubject.getValue(),
      a = T?.agentMode ?? R.agentMode,
      e = Wp0(this.deltaState.streamingMessageId, this.deltaState.streamingBlocks, this.messages.length, this.deltaState.streamingParentToolCallId),
      t = e ? [...this.messages, e] : [...this.messages],
      r = t.reduce((i, c) => Math.max(i, c.messageId), -1) + 1,
      h = {
        ...R,
        id: this.threadId,
        ...(a ? {
          agentMode: a
        } : {}),
        v: this.threadResumeCursor.getVersion(),
        title: this.threadTitle,
        messages: t,
        queuedMessages: this.queuedMessages.length > 0 ? P$(this.queuedMessages) : void 0,
        relationships: this.relationships.length > 0 ? [...this.relationships] : void 0,
        nextMessageId: Math.max(r, 0)
      };
    this.threadSubject.next(h), this.reconcilePendingClientWrites(h), this.replayPendingClientWritesIfNeeded(h);
  }
  reconcilePendingClientWrites(T) {
    if (this.pendingClientWritesByMessageID.size === 0) return;
    let R = new Set();
    for (let a of T.messages) {
      let e = z9.safeParse(a.dtwMessageID);
      if (e.success) R.add(e.data);
    }
    for (let a of T.queuedMessages ?? []) {
      let e = z9.safeParse(a.id);
      if (e.success) R.add(e.data);
      let t = z9.safeParse(a.queuedMessage.dtwMessageID);
      if (t.success) R.add(t.data);
    }
    for (let a of R) this.pendingClientWritesByMessageID.delete(a);
  }
  replayPendingClientWritesIfNeeded(T) {
    if (this.pendingClientWritesByMessageID.size === 0) {
      this.pendingClientWriteReplayGeneration = null;
      return;
    }
    if (this.pendingClientWriteReplayGeneration !== this.connectedTransportGeneration) return;
    if (this.transport.getConnectionInfo().state !== "connected") return;
    let R = !1;
    for (let [a, e] of this.pendingClientWritesByMessageID) try {
      this.sendUserMessage(e.content, e.agentMode, e.userState, a, e.discoveredGuidanceFiles);
    } catch (t) {
      R = !0, J.warn("Failed to replay pending client write", {
        threadId: this.threadId,
        messageID: a,
        error: t
      });
      break;
    }
    if (!R) this.pendingClientWriteReplayGeneration = null;
    this.reconcilePendingClientWrites(T);
  }
  emitToolProgress() {
    this.toolProgressByToolUseIDSubject.next(new Map(this.toolProgressByToolUseID));
  }
  clearToolProgress(T) {
    if (this.toolProgressByToolUseID.delete(T)) this.emitToolProgress();
  }
  clearToolProgressFromBlocks(T) {
    for (let R of T) if (R.type === "tool_result") this.clearToolProgress(R.toolUseID);
  }
  setCompactionState(T) {
    if (this.compactionState === T) return;
    this.compactionState = T, this.compactionStateSubject.next(T);
  }
  advanceThreadVersionFromSeq(T) {
    this.threadResumeCursor.advanceFromSeq(T);
  }
  runTransportHandler(T, R) {
    try {
      R();
    } catch (a) {
      J.error("[dtw] Transport handler failed", {
        threadId: this.threadId,
        handler: T,
        connectionState: this.lastConnectionState,
        error: a
      });
    }
  }
  subscribeToTransport() {
    let T = {
      onConnectionChange: R => {
        this.runTransportHandler("connectionChanges", () => {
          let a = this.lastConnectionState,
            e = this.lastConnectionInfo,
            t = R.state !== this.lastConnectionState,
            r = e !== null && (R.role !== e.role || R.clientId !== e.clientId);
          if (!t && !r) return;
          if (t) this.logConnectionStateTransition(this.lastConnectionState, R);else if (r && e) this.logConnectionRoleTransition(e, R);
          let h = R.state,
            i = h === "connected" && this.lastConnectionState !== "connected";
          if (i) this.threadResumeCursor.reset();
          this.lastConnectionState = h, this.lastConnectionInfo = {
            ...R
          };
          let c = R.state === "connected" && R.role === "executor";
          this.executorReadySubject.next(c);
          let s = c && e?.role !== "executor";
          if (i && this.connectionMode === "observer" || s && this.connectionMode === "executor+observer") this.transport.resumeFromVersion(this.threadResumeCursor.getVersion());
          if (h === "connected" && a !== "connected") this.connectedTransportGeneration += 1, this.pendingClientWriteReplayGeneration = this.connectedTransportGeneration, this.replayPendingClientWritesIfNeeded(this.threadSubject.getValue());
        });
      },
      onError: R => {
        this.runTransportHandler("errors", () => {
          let a = R.code === "PARSE_ERROR" ? Mn0(R.message) : null;
          if (J.warn("[dtw] Transport error", {
            threadId: this.threadId,
            connectionState: this.lastConnectionState,
            code: R.code,
            message: a !== null ? "Received invalid DTW payload (see parse details)" : R.message,
            parseErrorSource: a?.source,
            parseErrorDirection: a?.direction,
            parseErrorStage: a?.stage,
            parseErrorSummary: a?.summary,
            parseErrorMessageType: a?.messageType,
            parseErrorIssues: a?.issues,
            parseErrorPayloadPreview: a?.payloadPreview
          }), R.code === "PARSE_ERROR") {
            let e = a?.messageType ? ` (type="${a.messageType}")` : "";
            J.warn("[dtw] Invalid DTW parse payload received", {
              threadId: this.threadId,
              messageType: a?.messageType,
              messageTypeSuffix: e
            });
          }
        });
      },
      onAgentState: R => {
        this.runTransportHandler("agentStates", () => {
          this.agentLoopState = R.state, this.agentLoopStateSubject.next(R.state);
        });
      },
      onDelta: R => {
        this.runTransportHandler("deltas", () => {
          if (qp0(R, this.deltaState), R.role === "user" && R.state === "complete" && R.blocks) this.clearToolProgressFromBlocks(R.blocks);
          if (this.deltaState.completedMessages.length > 0) {
            for (let a of this.deltaState.completedMessages) if (a.role === "user") this.clearToolProgressFromBlocks(a.blocks);
            this.messages = zp0(this.messages, this.deltaState.completedMessages, this.processedIds), this.deltaState.completedMessages = [];
          }
          this.emitThread();
        });
      },
      onToolProgress: R => {
        this.runTransportHandler("toolProgress", () => {
          let a = R.toolCallId,
            e = Op0(R.progress),
            t = Cp0(R.progress),
            r = this.toolProgressByToolUseID.get(a),
            h = R.progress !== void 0 ? Lp0(R.progress) : r?.subagentProgressTurns,
            i = R.progress !== void 0;
          if (e === void 0 && t === void 0 && !i) {
            if (this.toolProgressByToolUseID.delete(a)) this.emitToolProgress();
            return;
          }
          let c = {
            status: t ?? r?.status ?? "in-progress",
            content: e ?? r?.content ?? "",
            ...(h !== void 0 ? {
              subagentProgressTurns: h
            } : {})
          };
          if (r?.status === c.status && r?.content === c.content && r?.subagentProgressTurns === c.subagentProgressTurns) return;
          this.toolProgressByToolUseID.set(a, c), this.emitToolProgress();
        });
      },
      onCompactionEvent: R => {
        this.runTransportHandler("compactionEvents", () => {
          if (R.type === "compaction_started") {
            this.setCompactionState("compacting");
            return;
          }
          this.setCompactionState("idle");
        });
      },
      onMessageEvent: R => {
        this.runTransportHandler("messageEvents", () => {
          let a = FkT(R);
          if (this.messages = Gp0(R, this.messages, this.processedIds), R.message.role === "user") this.clearToolProgressFromBlocks(R.message.content);
          if (this.deltaState.streamingMessageId === R.message.messageId) this.deltaState.streamingMessageId = null, this.deltaState.streamingBlocks = [], this.deltaState.streamingParentToolCallId = void 0;
          this.advanceThreadVersionFromSeq(R.seq), this.emitThread({
            agentMode: a
          });
        });
      },
      onMessageEdited: R => {
        this.runTransportHandler("messageEdited", () => {
          let a = FkT(R);
          this.messages = Kp0(R, this.messages), this.processedIds = Hp0(this.messages), this.advanceThreadVersionFromSeq(R.seq), this.emitThread({
            agentMode: a
          });
        });
      },
      onThreadTitle: R => {
        this.runTransportHandler("threadTitles", () => {
          this.threadTitle = R.title ?? void 0, this.emitThread();
        });
      },
      onThreadRelationships: R => {
        this.runTransportHandler("threadRelationships", () => {
          if (R.relationships.length > 0 || this.relationships.length === 0) this.relationships = R.relationships;
          this.advanceThreadVersionFromSeq(R.seq), this.emitThread();
        });
      },
      onQueuedMessages: R => {
        this.runTransportHandler("queuedMessages", () => {
          this.queuedMessages = Xp0(this.queuedMessages, R), this.emitThread();
        });
      }
    };
    this.transport.setObserverCallbacks(T), this.observerCallbacksAttached = !0;
  }
  clearTransportObserverCallbacks() {
    if (!this.observerCallbacksAttached) return;
    this.transport.setObserverCallbacks(null), this.observerCallbacksAttached = !1;
  }
  logConnectionStateTransition(T, R) {
    let a = {
      threadId: this.threadId,
      from: T,
      to: R.state,
      threadVersion: this.threadResumeCursor.getVersion(),
      ...KkT(R.reconnectCause)
    };
    if (R.role) a.role = R.role;
    if (R.clientId) a.clientId = R.clientId;
    if (R.threadId && R.threadId !== this.threadId) a.transportThreadId = R.threadId;
    if (R.state === "connected") {
      if (T === "reconnecting") {
        J.info("[dtw] Transport reconnected", a);
        return;
      }
      J.info("[dtw] Transport connected", a);
      return;
    }
    if (R.state === "reconnecting") {
      J.warn("[dtw] Transport reconnecting", a);
      return;
    }
    if (R.state === "disconnected") {
      J.warn("[dtw] Transport disconnected", a);
      return;
    }
    J.info("[dtw] Transport state changed", a);
  }
  logConnectionRoleTransition(T, R) {
    let a = {
      threadId: this.threadId,
      state: R.state,
      fromRole: T.role,
      toRole: R.role,
      threadVersion: this.threadResumeCursor.getVersion()
    };
    if (T.clientId || R.clientId) a.fromClientId = T.clientId, a.toClientId = R.clientId;
    if (R.threadId && R.threadId !== this.threadId) a.transportThreadId = R.threadId;
    J.info("[dtw] Transport role changed", a);
  }
  sendUserMessage(T, R, a, e, t) {
    this.setAgentMode(R);
    let r = this.transport.sendUserMessage(T, R, {
      userState: a,
      messageId: e,
      discoveredGuidanceFiles: t
    });
    return this.pendingClientWritesByMessageID.set(r, {
      content: T,
      agentMode: R,
      userState: a,
      discoveredGuidanceFiles: t
    }), r;
  }
  interruptQueuedMessage(T) {
    this.transport.interruptQueuedMessage(T);
  }
  discardQueuedMessages() {
    let T = P$(this.queuedMessages);
    if (this.queuedMessages.length === 0) return;
    let R = this.queuedMessages.map(a => z9.safeParse(a.id)).filter(a => a.success).map(a => a.data);
    this.queuedMessages = [], this.emitThread();
    try {
      for (let a of R) this.transport.removeQueuedMessage(a);
    } catch (a) {
      throw this.queuedMessages = T ?? [], this.emitThread(), a;
    }
  }
  resumeFromVersion(T) {
    this.transport.resumeFromVersion(T);
  }
  disposeSubscriptionsAndState() {
    this.clearTransportObserverCallbacks(), this.pendingClientWritesByMessageID.clear(), this.pendingClientWriteReplayGeneration = null, this.compactionStateSubject.complete(), this.agentLoopStateSubject.complete(), this.executorReadySubject.complete(), this.toolProgressByToolUseIDSubject.complete();
  }
  async disposeAndWaitForClose() {
    if (this.disposeSubscriptionsAndState(), (await this.transport.disconnectAndWait()).status === "timeout") J.info("[dtw] Timed out waiting for close acknowledgement before dispose", {
      threadId: this.threadId
    });
    this.transport.dispose();
  }
  dispose() {
    this.disposeSubscriptionsAndState(), this.transport.dispose();
  }
}