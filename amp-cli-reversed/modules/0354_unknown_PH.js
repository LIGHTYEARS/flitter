class PH {
  options;
  toolRunner;
  sentApprovalRequests;
  discoveredGuidanceFileURIs;
  handshakeManager;
  runtimeLog;
  advertisedExecutorTools = [];
  lastSentSettingsJSON = "";
  settingsSubscription = null;
  executorCallbacksAttached = !1;
  constructor(T) {
    this.options = T, this.runtimeLog = this.options.log ?? {
      info: (a, e) => J.info(`[executor-client] ${a}`, e),
      error: (a, e) => J.error(`[executor-client] ${a}`, {
        error: e
      }),
      wsMessage: (a, e, t) => {
        J.info("[executor-client] websocket message", {
          direction: a,
          clientID: e,
          ...(typeof t === "object" && t !== null ? t : {
            message: t
          })
        });
      }
    };
    let R = async () => {
      J.info("[executor-client] executor handshake requested", {
        clientID: this.options.clientID
      });
    };
    this.handshakeManager = new nVT({
      handshake: this.options.handshake ?? R,
      ...this.options.handshakeManagerOptions
    }), this.toolRunner = new lVT({
      clientID: this.options.clientID,
      transport: this.options.transport,
      log: this.runtimeLog,
      invokeTool: a => this.invokeTool(a),
      captureGitStatus: this.options.captureGitStatus,
      batchGuidanceFiles: this.options.batchGuidanceFiles ?? (a => [a]),
      renderToolRunError: this.options.renderToolRunError ?? (a => a?.message ?? "Tool run failed"),
      onTransportSendFailure: this.options.onTransportSendFailure
    }), this.sentApprovalRequests = this.toolRunner.sentApprovalRequests, this.discoveredGuidanceFileURIs = this.toolRunner.discoveredGuidanceFileURIs;
  }
  async connect(T) {
    if (!this.executorCallbacksAttached) this.attachTransportExecutorCallbacks({
      includeConnectionChanges: !0
    }), this.handleConnectionChange(this.options.transport.getConnectionInfo());
    await this.bootstrapExecutor({
      executorType: T,
      trigger: "connect"
    });
  }
  ensureHandshake(T) {
    return this.handshakeManager.ensureHandshake(T);
  }
  ensureReady(T) {
    return this.handshakeManager.ensureReady(T);
  }
  async bootstrapExecutor(T) {
    await this.connectAsExecutor(T.executorType, T.workspaceRoot ?? this.options.workspaceRoot ?? "", T.threadID ?? this.options.threadID, T.trigger, T.suppressConnectLog);
  }
  syncExecutorToolRegistrations(T, R) {
    let a = this.options.transport.getConnectionInfo();
    if (a.state !== "connected" || a.role !== "executor") return;
    this.advertisedExecutorTools = oVT({
      transport: this.options.transport,
      nextTools: T,
      previouslyAdvertisedTools: this.advertisedExecutorTools,
      logMessage: R?.logMessage
    });
  }
  handleConnectionChange(T) {
    this.handshakeManager.handleConnectionChange(T);
  }
  onToolLeaseMessage(T) {
    this.handleToolLease(T);
  }
  onToolLeaseRevokedMessage(T) {
    this.handleToolLeaseRevoked(T);
  }
  onExecutorRollbackRequestMessage(T) {
    this.handleExecutorRollbackRequest(T);
  }
  onExecutorFileSystemReadDirectoryRequestMessage(T) {
    this.handleExecutorFileSystemReadDirectoryRequest(T);
  }
  onExecutorFileSystemReadFileRequestMessage(T) {
    this.handleExecutorFileSystemReadFileRequest(T);
  }
  attachTransportExecutorCallbacks(T) {
    if (!this.options.transport.setExecutorCallbacks) {
      this.executorCallbacksAttached = !0;
      return;
    }
    let R = T?.includeConnectionChanges ?? !1,
      a = this.getInboundExecutorHandlers(),
      e = {
        onToolLease: a.onToolLease,
        onToolLeaseRevoked: a.onToolLeaseRevoked,
        onFileSystemReadFileRequest: a.onFileSystemReadFileRequest
      };
    if (R) e.onConnectionChange = t => {
      this.handleConnectionChange(t);
    };
    if (a.onExecutorRollbackRequest) e.onExecutorRollbackRequest = a.onExecutorRollbackRequest;
    if (a.onFileSystemReadDirectoryRequest) e.onFileSystemReadDirectoryRequest = a.onFileSystemReadDirectoryRequest;
    this.options.transport.setExecutorCallbacks(e), this.executorCallbacksAttached = !0;
  }
  clearTransportExecutorCallbacks() {
    if (!this.executorCallbacksAttached) return;
    this.options.transport.setExecutorCallbacks?.(null), this.executorCallbacksAttached = !1;
  }
  dispose() {
    this.clearTransportExecutorCallbacks(), this.toolRunner.dispose(), this.handshakeManager.dispose(), this.settingsSubscription?.unsubscribe(), this.settingsSubscription = null;
  }
  async invokeTool(T) {
    if (this.options.invokeTool) return await this.options.invokeTool(T);
    if (!this.options.getEnvironment) throw Error("Executor runtime requires getEnvironment or invokeTool");
    let {
        toolCallId: R,
        toolName: a,
        args: e
      } = T,
      t = typeof e === "object" && e !== null ? e : {},
      r = await this.options.getEnvironment();
    return r.thread = {
      ...r.thread,
      id: this.options.threadID
    }, r.toolUseID = R, this.options.toolService.invokeTool(a, {
      args: t
    }, r);
  }
  async connectAsExecutor(T, R, a, e, t = !1) {
    if (this.settingsSubscription?.unsubscribe(), this.settingsSubscription = null, !t) J.info(`Connecting ${this.options.clientID} as executor...`);
    try {
      let {
        advertisedTools: r
      } = await kp0({
        transport: this.options.transport,
        executorClientID: this.options.executorClientID ?? this.options.clientID,
        workspaceRoot: R,
        threadId: a,
        configService: this.options.configService,
        toolService: this.options.toolService,
        skillService: this.options.skillService,
        fileSystem: this.options.fileSystem,
        logMessage: this.options.bootstrapLogMessage,
        executorType: T,
        initialToolDiscovery: this.options.initialToolDiscovery,
        sendGitSnapshot: this.options.sendGitSnapshot ?? !1,
        previouslyAdvertisedTools: this.advertisedExecutorTools
      });
      if (this.advertisedExecutorTools = r, this.toolRunner.flushBufferedTerminalResults(), this.options.onBootstrapSuccess) await this.options.onBootstrapSuccess(e);
      this.startSettingsSync();
    } catch (r) {
      throw J.error(`executor ${this.options.clientID} bootstrap failed`, r), r;
    }
  }
  startSettingsSync() {
    if (this.settingsSubscription) return;
    this.settingsSubscription = this.options.configService.config.subscribe({
      next: T => {
        this.lastSentSettingsJSON = xp0(this.options.transport, T, this.lastSentSettingsJSON);
      }
    });
  }
  getInboundExecutorHandlers() {
    let T = {
      onToolLease: R => {
        this.handleToolLease(R);
      },
      onToolLeaseRevoked: R => {
        this.handleToolLeaseRevoked(R);
      },
      onFileSystemReadFileRequest: R => {
        this.handleExecutorFileSystemReadFileRequest(R);
      }
    };
    if (this.options.handleExecutorRollbackRequest) T.onExecutorRollbackRequest = R => {
      this.handleExecutorRollbackRequest(R);
    };
    if (this.options.handleExecutorFileSystemReadDirectoryRequest || this.options.readFileSystemDirectory) T.onFileSystemReadDirectoryRequest = R => {
      this.handleExecutorFileSystemReadDirectoryRequest(R);
    };
    return T;
  }
  maybeLogInboundExecutorMessage(T) {
    if (!this.options.logInboundExecutorMessages) return;
    this.runtimeLog.wsMessage("RECV", this.options.clientID, T);
  }
  handleToolLease(T) {
    this.maybeLogInboundExecutorMessage(T), this.toolRunner.handleToolLease(T);
  }
  handleToolLeaseRevoked(T) {
    this.maybeLogInboundExecutorMessage(T), this.toolRunner.handleToolRevocation(T);
  }
  handleExecutorRollbackRequest(T) {
    if (this.maybeLogInboundExecutorMessage(T), !this.options.handleExecutorRollbackRequest) return;
    this.options.handleExecutorRollbackRequest(T);
  }
  async handleExecutorFileSystemReadDirectoryRequest(T) {
    if (this.maybeLogInboundExecutorMessage(T), this.options.handleExecutorFileSystemReadDirectoryRequest) {
      await this.options.handleExecutorFileSystemReadDirectoryRequest(T);
      return;
    }
    if (!this.options.readFileSystemDirectory) throw Error("Method not implemented.");
    let R = await this.options.readFileSystemDirectory(T);
    this.options.transport.sendExecutorFileSystemReadDirectoryResult(T.requestId, R);
  }
  handleExecutorFileSystemReadFileRequest(T) {
    if (this.maybeLogInboundExecutorMessage(T), this.options.handleExecutorFileSystemReadFileRequest) {
      this.options.handleExecutorFileSystemReadFileRequest(T);
      return;
    }
    throw Error("Method not implemented.");
  }
}