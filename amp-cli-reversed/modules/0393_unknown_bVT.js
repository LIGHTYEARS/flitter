function Jp0(T, R) {
  let a = new URL(T);
  if (!a.pathname.endsWith("/")) a.pathname += "/";
  return new URL(`threads/${R}`, a).toString();
}
class bVT {
  options;
  clients = new Map();
  clientCounter = 0;
  disposed = !1;
  pluginsBootstrapped = !1;
  pendingExitCode = null;
  toolSyncSubscription = null;
  resolveRunLoop = null;
  constructor(T) {
    this.options = T;
  }
  bindClientThread(T, R) {
    let a = T.threadId !== R;
    if (T.threadId = R, T.fsTracker && !a) return;
    let e = this.options.fileSystem ?? He,
      t = new Im(e);
    T.fsTracker = Q3T({
      fileChangeTrackerStorage: t
    }, e, R);
  }
  async connectTransport(T, R, a) {
    let e = await T.ensureConnected({
      maxAttempts: 1,
      waitForConnectedTimeoutMs: VkT
    });
    if (!e) {
      let t = T.getConnectionInfo();
      ie(`${R} waiting for reconnect during ${a}`, {
        connectionState: t.state,
        reconnectCauseType: t.reconnectCause?.type,
        reconnectCauseCode: t.reconnectCause?.code,
        reconnectCauseReason: t.reconnectCause?.reason,
        waitedMs: VkT
      });
    }
    return e;
  }
  async recoverTransport(T, R, a, e) {
    let t = this.clients.get(T);
    if (!t || t.recoveringTransport || this.disposed) return;
    t.recoveringTransport = !0, ie(`${T} recovering transport after send failure`, {
      messageType: R,
      error: a.message,
      ...e
    });
    try {
      let r = t.transport.getConnectionInfo();
      if (r.state === "connecting" || r.state === "authenticating" || r.state === "reconnecting") {
        ie(`${T} recovery waiting for in-flight connection`, {
          connectionState: r.state,
          reconnectCauseType: r.reconnectCause?.type,
          reconnectCauseCode: r.reconnectCause?.code,
          reconnectCauseReason: r.reconnectCause?.reason
        });
        return;
      }
      if (r.state === "connected") t.transport.disconnect();
      let h = await this.connectTransport(t.transport, T, "recovery"),
        i = t.transport.getThreadId();
      if (i) this.bindClientThread(t, i);
      if (!h) return;
      t.executorRuntime.ensureHandshake("retry");
    } catch (r) {
      Vi(`${T} transport recovery failed`, r);
    } finally {
      t.recoveringTransport = !1;
    }
  }
  async start() {
    ie("Starting Headless DTW Harness", {
      ampURL: this.options.ampURL,
      workerUrl: this.options.workerUrl ?? Pi(this.options.ampURL),
      workspaceRoot: this.options.workspaceRoot,
      threadId: this.options.threadId ?? null
    }), this.toolSyncSubscription ??= this.options.toolService.tools.subscribe({
      next: T => {
        let R = RtT(T);
        for (let a of this.clients.values()) this.syncExecutorTools(a, R);
      }
    });
    try {
      let T = await this.createClient(this.options.threadId);
      ie("Initial client created", {
        clientId: T.id,
        threadId: T.threadId
      }), this.logThreadURL(T.threadId);
      let R = await this.runLoop();
      if (R !== 0) throw Error(`Headless DTW harness exited with code ${R}`);
    } catch (T) {
      throw Vi("Failed to start harness", T), T;
    }
  }
  logThreadURL(T) {
    if (!T) return;
    let R = Jp0(this.options.ampURL, T);
    ie(`Thread URL: ${oR.blue.underline(R)}`);
  }
  async shutdown(T, R) {
    if (this.pendingExitCode === null || T > this.pendingExitCode) this.pendingExitCode = T;
    let a = this.resolveRunLoop;
    if (a) this.resolveRunLoop = null;
    if (!this.disposed) {
      if (T === 0) ie(R);else Vi(R);
      await this.dispose();
    }
    if (a) {
      let e = this.pendingExitCode ?? T;
      this.pendingExitCode = null, a(e);
    }
  }
  async invokeToolForClient(T, R) {
    let {
      toolService: a,
      configService: e,
      mcpService: t,
      skillService: r
    } = this.options;
    if (!a || !e || !t) throw Error("Tool service not available");
    let {
        toolName: h,
        toolCallId: i,
        args: c
      } = R,
      s = typeof c === "object" && c !== null ? c : {},
      A = AVT({
        configService: e,
        apiKey: this.options.apiKey
      }),
      l = await Gk({
        toolName: h,
        dtwHandoffService: A,
        dtwArtifactSyncService: {
          upsertArtifact: (o, n) => {
            let p = Ca.safeParse(n);
            T.transport.sendExecutorArtifactUpsert(o, p.success ? p.data : void 0);
          },
          deleteArtifact: o => {
            T.transport.sendExecutorArtifactDelete(o);
          }
        },
        configService: e,
        toolService: a,
        mcpService: t,
        skillService: r,
        fsTracker: T.fsTracker ?? void 0,
        toolUseID: i,
        discoveredGuidanceFileURIs: T.toolRunner.discoveredGuidanceFileURIs,
        threadID: T.threadId
      });
    return a.invokeTool(h, {
      args: s
    }, l);
  }
  async createClient(T) {
    let R = `client-${++this.clientCounter}`,
      a = `cli-headless-${crypto.randomUUID()}`,
      e = this.options.workerUrl ?? Pi(this.options.ampURL),
      t = {
        current: null
      },
      r = () => {
        let m = t.current;
        if (!m) throw Error("Headless client callbacks invoked before initialization");
        return m;
      },
      h = this.options.useThreadActors ? process.env.RIVET_PUBLIC_ENDPOINT ?? lH(this.options.ampURL) : void 0;
    ie(`Creating client ${R}`, {
      threadId: T,
      workerUrl: e,
      useThreadActors: this.options.useThreadActors ?? !1,
      rivetPublicEndpoint: h ?? "(not used)",
      options: this.options
    });
    let i;
    if (this.options.useThreadActors && h) {
      let m = nH({
        endpoint: h
      });
      i = {
        baseURL: h,
        threadId: T,
        webSocketProvider: async () => {
          return await m.threadActor.getOrCreate([T], {
            params: {
              apiKey: this.options.apiKey,
              threadId: T,
              executorClientId: a
            },
            ...(this.options.ownerUserId && typeof this.options.threadVersion === "number" ? {
              createWithInput: {
                threadId: T,
                ownerUserId: this.options.ownerUserId,
                threadVersion: this.options.threadVersion
              }
            } : {})
          }).webSocket("/");
        },
        WebSocketClass: WebSocket,
        maxReconnectAttempts: Number.POSITIVE_INFINITY,
        pingIntervalMs: 5000,
        useThreadActors: !0
      };
    } else i = {
      baseURL: e,
      apiKey: this.options.apiKey,
      threadId: T,
      WebSocketClass: WebSocket,
      maxReconnectAttempts: Number.POSITIVE_INFINITY,
      pingIntervalMs: 5000
    };
    let c = null,
      s = new ZeT({
        transport: i,
        observerCallbacks: {
          onEvent: m => {
            this.handleObserverEvent(r(), m);
          }
        },
        executorCallbacks: {
          onToolLease: m => {
            c?.onToolLeaseMessage(m);
          },
          onToolLeaseRevoked: m => {
            c?.onToolLeaseRevokedMessage(m);
          },
          onExecutorRollbackRequest: m => {
            c?.onExecutorRollbackRequestMessage(m);
          },
          onFileSystemReadDirectoryRequest: m => {
            c?.onExecutorFileSystemReadDirectoryRequestMessage(m);
          },
          onFileSystemReadFileRequest: m => {
            c?.onExecutorFileSystemReadFileRequestMessage(m);
          }
        }
      }),
      A = m => ({
        ...(m ?? {}),
        threadId: T
      }),
      l = {
        info: (m, b) => {
          ie(m, A(b));
        },
        error: (m, b) => {
          Vi(m, b);
        },
        wsMessage: (m, b, y) => {
          Th(m, b, A(typeof y === "object" && y !== null ? y : {
            message: y
          }));
        }
      },
      o = new PH({
        transport: s,
        toolService: this.options.toolService,
        configService: this.options.configService,
        clientID: R,
        executorClientID: a,
        threadID: T,
        invokeTool: m => this.invokeToolForClient(r(), m),
        skillService: this.options.skillService,
        fileSystem: this.options.fileSystem,
        bootstrapLogMessage: (m, b) => {
          Th(m, R, b);
        },
        initialToolDiscovery: this.options.initialToolDiscovery,
        onBootstrapSuccess: async () => {
          let m = r();
          if (!m.hasLoggedPostBootstrapThreadURL && m.threadId) this.logThreadURL(m.threadId), m.hasLoggedPostBootstrapThreadURL = !0;
          this.setNotifyForwarder(m), this.bootstrapPluginsAfterExecutorConnect(m);
        },
        sendGitSnapshot: !0,
        handshake: m => this.connectAsExecutor(r(), m),
        handshakeManagerOptions: {
          onError: ({
            error: m,
            attempt: b,
            delayMs: y
          }) => {
            Vi(`${R} executor handshake failed`, {
              error: m,
              attempt: b,
              delayMs: y
            });
          },
          onExhausted: ({
            error: m,
            maxAttempts: b
          }) => {
            this.shutdown(1, `${R} executor handshake failed after ${b} attempts: ${m instanceof Error ? m.message : String(m)}`);
          }
        },
        captureGitStatus: () => rVT(this.options.workspaceRoot),
        batchGuidanceFiles: cVT,
        renderToolRunError: I8T,
        onTransportSendFailure: (m, b, y, u) => {
          this.recoverTransport(m, b, y, u);
        },
        log: l,
        autoResolvePendingApprovals: !1,
        handleExecutorRollbackRequest: async m => {
          let b = r();
          await this.handleExecutorRollbackRequest(b, m);
        },
        handleExecutorFileSystemReadDirectoryRequest: async m => {
          let b = r();
          await this.handleExecutorFileSystemReadDirectoryRequest(b, m);
        },
        handleExecutorFileSystemReadFileRequest: async m => {
          let b = r();
          await this.handleExecutorFileSystemReadFileRequest(b, m);
        },
        logInboundExecutorMessages: !0
      });
    c = o;
    let n = {
      id: R,
      transport: s,
      threadId: T,
      hasLoggedPostBootstrapThreadURL: !1,
      executorRuntime: o,
      toolRunner: o.toolRunner,
      fsTracker: null,
      recoveringTransport: !1
    };
    t.current = n, this.clients.set(R, n), o.handleConnectionChange(s.getConnectionInfo()), this.subscribeToApprovalRequests(n), ie(`Connecting ${R}...`);
    let p = await this.connectTransport(s, R, "startup"),
      _ = s.getThreadId();
    if (_) this.bindClientThread(n, _);
    if (p) ie(`Connected ${R}`, {
      threadId: _
    });
    if (p) n.executorRuntime.ensureHandshake("connect");
    return n;
  }
  async connectAsExecutor(T, R) {
    ie(`Connecting ${T.id} as executor...`, {
      trigger: R
    });
    try {
      await T.executorRuntime.bootstrapExecutor({
        executorType: "sandbox",
        trigger: R,
        workspaceRoot: this.options.workspaceRoot,
        threadID: T.threadId,
        suppressConnectLog: !0
      });
    } catch (a) {
      throw Vi(`${T.id} executor bootstrap failed`, a), a;
    }
  }
  setNotifyForwarder(T) {
    let R = this.options.pluginPlatform;
    if (!R) return;
    R.setNotifyForwarder(async a => {
      let e = {
        type: "event",
        event: "ui.notify",
        data: {
          message: a
        }
      };
      try {
        Th("SEND", T.id, {
          type: "executor_plugin_message",
          message: e
        }), T.transport.sendPluginMessage(e);
      } catch (t) {
        Vi(`${T.id} failed to forward plugin notification`, t);
      }
    });
  }
  bootstrapPluginsAfterExecutorConnect(T) {
    let R = this.options.pluginService;
    if (!R || this.pluginsBootstrapped) return;
    this.pluginsBootstrapped = !0, ie(`${T.id} reloading plugins after executor bootstrap`), R.reload();
  }
  syncExecutorTools(T, R) {
    T.executorRuntime.syncExecutorToolRegistrations(R, {
      logMessage: (a, e) => {
        Th(a, T.id, e);
      }
    });
  }
  syncApprovalRequests(T, R) {
    if (!T.threadId) return;
    let a = R.filter(t => t.threadId === T.threadId || t.mainThreadId === T.threadId),
      e = new Set(a.map(pS));
    for (let t of [...T.toolRunner.sentApprovalRequests]) if (!e.has(t)) T.toolRunner.sentApprovalRequests.delete(t);
    for (let t of a) {
      let r = pS(t);
      if (T.toolRunner.sentApprovalRequests.has(r)) continue;
      let h = ZKT(t);
      Th("SEND", T.id, {
        type: "executor_tool_approval_request",
        toolCallId: h.toolCallId,
        toolName: h.toolName
      }), T.transport.sendExecutorToolApprovalRequest(h), T.toolRunner.sentApprovalRequests.add(r);
    }
  }
  handleExecutorToolApprovalResponse(T, R) {
    let {
      toolService: a
    } = this.options;
    if (!a) {
      Vi(`${T.id} received approval response without tool service`);
      return;
    }
    ie(`${T.id} approval resolved`, {
      toolCallId: R.toolCallId,
      accepted: R.accepted
    }), a.resolveApproval(R.toolCallId, R.accepted, R.input?.denyFeedback);
  }
  handleObserverEvent(T, R) {
    let a = T.id;
    switch (R.type) {
      case "connection_changed":
        {
          let {
            info: e
          } = R;
          if (e.state === "connected" && e.threadId) this.bindClientThread(T, e.threadId);
          let t = {
            role: e.role ?? "unclaimed"
          };
          if (e.state === "reconnecting" && e.reconnectCause) Object.assign(t, Zp0(e.reconnectCause));
          ie(`${a} connection: ${e.state}`, t), T.executorRuntime.handleConnectionChange(e);
          return;
        }
      case "delta":
        Th("RECV", a, {
          eventType: "delta",
          ...R.message
        });
        return;
      case "error_notice":
        Th("RECV", a, R.message), Vi(`${a} error`, R.message.message);
        return;
      case "executor_tool_approval_response":
        Th("RECV", a, R.message), this.handleExecutorToolApprovalResponse(T, R.message);
        return;
      case "executor_error":
        Th("RECV", a, R.message), Vi(`${a} executor error`, R.message.message);
        return;
      default:
        Th("RECV", a, R.message);
    }
  }
  subscribeToApprovalRequests(T) {
    let {
      toolService: R
    } = this.options;
    if (R) R.pendingApprovals$.subscribe(a => {
      this.syncApprovalRequests(T, a);
    });
  }
  async handleExecutorRollbackRequest(T, R) {
    let {
        id: a,
        fsTracker: e
      } = T,
      {
        editId: t,
        toolUseIdsToRevert: r
      } = R;
    if (!e) {
      Vi(`${a} rollback failed: no file tracker`), Th("SEND", a, {
        type: "executor_rollback_ack",
        editId: t,
        ok: !1,
        error: "File tracker not initialized"
      }), T.transport.sendExecutorRollbackAck(t, !1, "File tracker not initialized");
      return;
    }
    await T.toolRunner.handleRollbackRequest(t, r, h => e.tracker.revertChanges(h));
  }
  async handleExecutorFileSystemReadDirectoryRequest(T, R) {
    let a = await TtT({
      fileSystem: this.options.fileSystem ?? He,
      workspaceRoot: this.options.workspaceRoot
    }, R.uri);
    Th("SEND", T.id, {
      type: "executor_filesystem_read_directory_result",
      requestId: R.requestId,
      ...a
    }), T.transport.sendExecutorFileSystemReadDirectoryResult(R.requestId, a);
  }
  async handleExecutorFileSystemReadFileRequest(T, R) {
    let a = await TVT({
      fileSystem: this.options.fileSystem ?? He,
      workspaceRoot: this.options.workspaceRoot
    }, R.uri);
    Th("SEND", T.id, {
      type: "executor_filesystem_read_file_result",
      requestId: R.requestId,
      ...a
    }), T.transport.sendExecutorFileSystemReadFileResult(R.requestId, a);
  }
  async runLoop() {
    if (ie("Harness running. Press Ctrl+C to exit."), this.pendingExitCode !== null) return this.pendingExitCode;
    return await new Promise(T => {
      let R = !1,
        a = r => {
          if (R) {
            ie(`Received ${r} while shutdown is already in progress`);
            return;
          }
          R = !0, this.shutdown(0, `Received ${r}, shutting down harness...`);
        },
        e = () => a("SIGINT"),
        t = () => a("SIGTERM");
      this.resolveRunLoop = r => {
        process.off("SIGINT", e), process.off("SIGTERM", t), T(r);
      }, process.on("SIGINT", e), process.on("SIGTERM", t);
    });
  }
  getClients() {
    return Array.from(this.clients.values());
  }
  async dispose() {
    this.disposed = !0, this.toolSyncSubscription?.unsubscribe(), this.toolSyncSubscription = null, this.options.pluginPlatform?.setNotifyForwarder(null);
    for (let T of this.clients.values()) {
      if (T.executorRuntime.dispose(), (await T.transport.disconnectAndWait()).status === "timeout") ie(`${T.id} timed out waiting for close acknowledgement before dispose`);
      T.transport.dispose();
    }
    this.clients.clear();
  }
}