class ZCT {
  _status = {};
  statusSubject = new f0(this._status);
  projectConfig;
  queryPollTimeout;
  queryPollToken = 0;
  querySource;
  ws;
  id = 1;
  reconnectTimeoutId;
  reconnectStartTime;
  isReconnecting = !1;
  connectionSource = "never-connected";
  pendingRequests = new Map();
  constructor() {
    this.statusSubject.subscribe(T => {
      if (T.ideName) {
        let R = ECT(T.ideName);
        if (R) Mg(R);
      }
    });
  }
  get status() {
    return new AR(T => {
      T.next(this._status);
      let R = this.statusSubject.subscribe(T);
      return () => R.unsubscribe();
    });
  }
  sendStatus(T) {
    this._status = {
      ...this._status,
      ...T
    }, this.statusSubject.next(this._status);
  }
  getIdeName() {
    return this._status.ideName || "ide";
  }
  async start(T, R = !1, a) {
    if (T.connection !== "query" && AN(T.ideName)) {
      this.projectConfig = void 0, this.clearReconnectTimeout(), this.ws?.close(), this.ws = void 0, this.clearPendingRequests(), this.stopQueryPolling(), this.sendStatus({
        enabled: !0,
        ideName: T.ideName,
        connected: !1,
        authenticated: !1,
        connectionState: "disconnected",
        reconnectElapsedMs: void 0,
        errorMessage: `Amp connects to ${T.ideName} through file queries, not websockets`,
        openFile: void 0,
        selections: void 0,
        visibleFiles: void 0
      });
      return;
    }
    let e = R || !this.projectConfig || this.projectConfig.port !== T.port || this.projectConfig.authToken !== T.authToken || this.projectConfig.connection !== T.connection || this.projectConfig.workspaceId !== T.workspaceId;
    if (this.projectConfig = T, this.sendStatus({
      enabled: !0
    }), this.connectionSource = a ?? "auto-startup", e && this.ws) this.ws.close(), this.ws = void 0, this.clearPendingRequests();
    this.stopQueryPolling(), await this.tryConnect(this.projectConfig);
  }
  sendRequest = (T, R) => {
    let a = this.ws;
    if (!a) return Promise.resolve(void 0);
    if (!this.isWsOpen()) return Promise.reject(Error("WebSocket is not open"));
    return new Promise((e, t) => {
      let r = `${this.id++}`,
        h = {
          clientRequest: {
            id: r,
            [T]: R
          }
        },
        i = setTimeout(() => {
          this.pendingRequests.delete(r), t(Error(`Timeout after ${ecT}ms for request ${JSON.stringify(h, null, 2)}`));
        }, ecT);
      this.pendingRequests.set(r, {
        resolve: e,
        reject: t,
        timeout: i,
        method: T
      }), a.send(JSON.stringify(h));
    });
  };
  clearPendingRequests() {
    for (let [T, R] of this.pendingRequests.entries()) clearTimeout(R.timeout), R.reject(Error("WebSocket connection closed"));
    this.pendingRequests.clear();
  }
  handleResponse(T) {
    if (!T?.id) return;
    let R = this.pendingRequests.get(T.id);
    if (!R) return;
    if (J.debug("ide-client: received response", {
      type: "response_received",
      source: this.getIdeName(),
      responseId: T?.id,
      hasError: !!T?.error
    }), clearTimeout(R.timeout), this.pendingRequests.delete(T.id), T.error) {
      R.reject(Error(JSON.stringify(T.error)));
      return;
    }
    let a = T[R.method];
    if (a) R.resolve(a);else R.reject(Error(`Invalid response for method ${R.method}. Got ${JSON.stringify(T, null, 2)}`));
  }
  async tryConnect(T) {
    if (T.connection === "query") {
      let a = this.resolveQuery(T);
      if (a) this.startQueryPolling(T, a);
      return;
    }
    if (await this.isConnected()) {
      J.debug("ide-client: already connected", {
        type: "already_connected",
        source: this.getIdeName()
      });
      return;
    }
    if (this.clearReconnectTimeout(), this.ws?.close(), this.clearPendingRequests(), !T) {
      this.sendStatus({
        connected: !1,
        authenticated: !1,
        openFile: void 0,
        selections: void 0,
        errorMessage: "IDE Not Connected"
      });
      return;
    }
    this.sendStatus({
      ideName: T.ideName
    });
    let R = new (await PpR())(`ws://localhost:${T.port}?auth=${encodeURIComponent(T.authToken)}`);
    this.ws = R, this.id = 1, R.onopen = async () => {
      try {
        if (J.info("ide-client: connected", {
          type: "connected",
          source: this.getIdeName(),
          ideName: T.ideName,
          port: T.port
        }), this.connectionSource !== "never-connected") this.connectionSource = "user-initiated";
        this.clearReconnectTimeout(), this.reconnectStartTime = void 0, this.isReconnecting = !1, this.sendStatus({
          connected: !0,
          authenticated: !0,
          connectionState: "connected",
          reconnectElapsedMs: void 0,
          errorMessage: void 0
        });
      } catch (a) {
        J.error("ide-client: connection error", a), this.sendStatus({
          connected: !1,
          authenticated: !1,
          openFile: void 0,
          selections: void 0,
          errorMessage: "IDE Not Connected"
        });
      }
    }, R.onclose = a => {
      try {
        if (this.clearPendingRequests(), a.code === 1000 && a.reason === "Authentication failed") this.sendStatus({
          connected: !1,
          authenticated: !1,
          openFile: void 0,
          selections: void 0,
          errorMessage: "IDE authentication failed - try restarting your IDE"
        });else J.warn("ide-client: disconnected", {
          code: a.code,
          reason: a.reason
        }), this.sendStatus({
          connected: !1,
          authenticated: !1,
          openFile: void 0,
          selections: void 0,
          errorMessage: "IDE Not Connected"
        });
        this.ws = void 0, this.scheduleReconnect();
      } catch (e) {
        J.error("ide-client: disconnect error", e);
      }
    }, R.onerror = () => {
      this.clearPendingRequests();
    }, R.onmessage = async a => {
      let e = a.data.toString();
      try {
        let t = CCT.safeParse(JSON.parse(e));
        if (t.error) {
          J.error("ide-client: failed to parse server message", K.prettifyError(t.error));
          return;
        }
        if (t.data?.serverResponse) this.handleResponse(t.data.serverResponse);
        this.handleNotification(t.data?.serverNotification);
      } catch (t) {
        J.error("ide-client: error handling server message", {
          error: t,
          data: e
        });
      }
    };
  }
  clearReconnectTimeout() {
    if (this.reconnectTimeoutId) clearTimeout(this.reconnectTimeoutId), this.reconnectTimeoutId = void 0;
  }
  scheduleReconnect() {
    if (this.connectionSource === "never-connected") return;
    if (this.isReconnecting) return;
    if (!this.reconnectStartTime) this.reconnectStartTime = Date.now();
    let T = Date.now() - this.reconnectStartTime;
    if (T >= xpR) {
      this.sendStatus({
        connectionState: "disconnected",
        reconnectElapsedMs: T
      });
      let R = 60000 - T;
      if (R > 0) this.clearReconnectTimeout(), this.reconnectTimeoutId = setTimeout(() => {
        let a = Date.now() - (this.reconnectStartTime || Date.now());
        this.sendStatus({
          connectionState: "disconnected",
          reconnectElapsedMs: a
        });
      }, R);
      return;
    }
    this.isReconnecting = !0, this.sendStatus({
      connectionState: "reconnecting",
      reconnectElapsedMs: T,
      ideName: this.projectConfig?.ideName
    }), this.reconnectTimeoutId = setTimeout(() => {
      this.executeReconnectAttempt().catch(R => {
        J.error("ide-client: reconnect timer failed", R);
      });
    }, kpR);
  }
  async executeReconnectAttempt() {
    try {
      if (!this.projectConfig) {
        J.debug("ide-client: no config available during reconnect, will retry");
        return;
      }
      let T = await this.resolveActiveConfig(this.projectConfig);
      this.projectConfig = T, await this.tryConnect(T);
    } catch (T) {
      J.error("ide-client: reconnect loop error", T);
    } finally {
      this.handleReconnectResult(await this.isConnected());
    }
  }
  async resolveActiveConfig(T) {
    if (T.connection === "query") {
      let {
        config: R
      } = await this.findQueryConfig(T);
      return R ?? T;
    }
    if (aO(T.pid)) return T;
    return (await OD()).find(R => R.ideName === T.ideName && R.workspaceFolders.length === T.workspaceFolders.length && R.workspaceFolders.every(a => T.workspaceFolders.includes(a))) ?? T;
  }
  handleReconnectResult(T) {
    if (this.isReconnecting = !1, !T) this.scheduleReconnect();else this.clearReconnectTimeout(), this.reconnectStartTime = void 0, this.sendStatus({
      connectionState: "connected",
      reconnectElapsedMs: void 0
    });
  }
  startQueryPolling(T, R) {
    this.stopQueryPolling();
    let a = ++this.queryPollToken;
    this.querySource = {
      config: T,
      query: R
    }, this.sendStatus({
      ideName: R.ideName,
      workspace: T.workspaceFolders[0],
      connected: !0,
      authenticated: !0,
      connectionState: "connected",
      reconnectElapsedMs: void 0,
      errorMessage: void 0
    });
    let e = async () => {
      if (a !== this.queryPollToken) return;
      let t;
      try {
        t = await R.readWorkspaceState(T);
      } catch (r) {
        J.warn("ide-client: query poll failed", {
          ideName: R.ideName,
          error: r
        }), t = null;
      }
      if (a !== this.queryPollToken) return;
      if (!t) {
        this.sendStatus({
          connected: !1,
          authenticated: !1,
          connectionState: "disconnected",
          errorMessage: `${R.ideName} Not Connected`,
          openFile: void 0,
          selections: void 0,
          visibleFiles: void 0
        }), this.stopQueryPolling(), this.scheduleReconnect();
        return;
      }
      this.sendStatus({
        connected: !0,
        authenticated: !0,
        connectionState: "connected",
        openFile: t.openFile,
        selections: t.selection ? [t.selection] : void 0,
        visibleFiles: t.openFiles
      }), this.queryPollTimeout = setTimeout(() => {
        e();
      }, fpR);
    };
    e();
  }
  stopQueryPolling() {
    if (this.queryPollToken += 1, this.queryPollTimeout) clearTimeout(this.queryPollTimeout), this.queryPollTimeout = void 0;
  }
  isWsOpen() {
    return this.ws?.readyState === 1;
  }
  async isConnected() {
    if (this.projectConfig?.connection === "query") return this._status.connected === !0;
    if (!this._status.authenticated) return !1;
    if (!this.isWsOpen()) return !1;
    try {
      return (await this.sendRequest("ping", {
        message: "beepboop"
      }))?.message === "beepboop";
    } catch (T) {
      return J.debug("isConnected ping failed", {
        error: T
      }), !1;
    }
  }
  async requestDiagnosticsFromIDE(T) {
    try {
      return await this.sendRequest("getDiagnostics", {
        path: T
      });
    } catch (R) {
      J.debug("ide-diags: failed to request diagnostics from IDE", {
        error: R,
        path: T
      });
      return;
    }
  }
  async openURIInIDE(T) {
    if (this.projectConfig?.connection === "query") return this.querySource?.query.openURI(T);
    if (!this.isWsOpen()) return;
    try {
      let R = await this.sendRequest("openURI", {
        uri: T
      });
      if (!R) return !1;
      return !!R.success;
    } catch (R) {
      return J.debug("ide-client: openURI request failed", {
        error: R,
        uri: T
      }), !1;
    }
  }
  handleNotification(T) {
    if (!T) return;
    if (T.selectionDidChange) this.sendStatus({
      selections: T.selectionDidChange.selections,
      openFile: T.selectionDidChange.uri
    });else if (T.visibleFilesDidChange) {
      let R = T.visibleFilesDidChange.uris;
      this.sendStatus({
        visibleFiles: R,
        ...(R.length === 0 && {
          openFile: void 0,
          selections: void 0
        })
      });
    } else if (T.pluginMetadata) this.sendStatus({
      pluginVersion: T.pluginMetadata.version,
      pluginDirectory: T.pluginMetadata.pluginDirectory
    });
  }
  async findQueryConfig(T) {
    let R = (T.workspaceId ? T : (await this.listQueryConfigs()).find(e => e.workspaceFolders.every(t => T.workspaceFolders.includes(t)))) ?? (await OD({
      includeAll: !0
    })).find(e => e.connection === "query" && e.workspaceId === T.workspaceId);
    if (!R) return {};
    let a = this.resolveQuery(R);
    if (!a) return {
      config: R
    };
    return {
      query: a,
      config: R
    };
  }
  async listQueryConfigs() {
    return (await Promise.all(jj.map(async T => {
      try {
        return await T.listConfigs();
      } catch (R) {
        return J.debug("ide-client: failed to list query configs", {
          ideName: T.ideName,
          error: R
        }), [];
      }
    }))).flat();
  }
  resolveQuery(T) {
    return jj.find(R => R.ideName === T.ideName);
  }
  selectConfig(T) {
    this.projectConfig = T;
  }
  getSelectedConfig() {
    return this.projectConfig;
  }
}