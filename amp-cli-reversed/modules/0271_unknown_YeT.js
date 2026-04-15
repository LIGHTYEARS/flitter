function EKT(T) {
  return !!(T.apiKey && T.WebSocketClass);
}
function Gn0(T) {
  if (EKT(T)) return "one-step";
  return "two-step";
}
class YeT {
  ws = null;
  connectionInfo = {
    state: "disconnected",
    role: null,
    clientId: null,
    threadId: null
  };
  reconnectCause = null;
  reconnectAttempts = 0;
  reconnectTimeoutID = null;
  reconnectResetTimeoutID = null;
  pingIntervalID = null;
  disposed = !1;
  lastPongAt = Date.now();
  intentionallyClosedSockets = new WeakSet();
  reconnectActivityCleanup = null;
  lifecycleEventID = 0;
  lifecycleEvents = [];
  connectionSubject = new f0({
    state: "disconnected",
    role: null,
    clientId: null,
    threadId: null
  });
  lifecycleEventSubject = new f0([]);
  config;
  currentThreadID = null;
  currentWsToken = null;
  constructor(T) {
    this.config = {
      baseURL: T.baseURL,
      threadId: T.threadId,
      apiKey: T.apiKey,
      wsToken: T.wsToken,
      wsTokenProvider: T.wsTokenProvider,
      webSocketProvider: T.webSocketProvider,
      reconnectDelayMs: T.reconnectDelayMs ?? Dn0,
      maxReconnectDelayMs: T.maxReconnectDelayMs ?? wn0,
      maxReconnectAttempts: T.maxReconnectAttempts ?? Bn0,
      pingIntervalMs: T.pingIntervalMs ?? Nn0,
      connectTimeoutMs: T.connectTimeoutMs ?? Un0,
      WebSocketClass: T.WebSocketClass,
      useThreadActors: T.useThreadActors
    }, this.currentThreadID = T.threadId ?? null, this.currentWsToken = T.wsToken ?? null, this.recordLifecycleEvent("transport_initialized", `flow=${Gn0(this.config)} threadId=${this.currentThreadID ?? "none"}`);
  }
  getThreadId() {
    return this.currentThreadID;
  }
  connectionChanges() {
    return this.connectionSubject;
  }
  getConnectionInfo() {
    return {
      ...this.connectionInfo
    };
  }
  waitForConnected(T) {
    if (this.connectionInfo.state === "connected") return Promise.resolve(!0);
    if (this.disposed || T <= 0) return Promise.resolve(!1);
    return new Promise(R => {
      let a = !1,
        e = null,
        t = null,
        r = h => {
          if (a) return;
          if (a = !0, e) clearTimeout(e), e = null;
          t?.unsubscribe(), t = null, R(h);
        };
      e = setTimeout(() => {
        r(!1);
      }, T), t = this.connectionSubject.subscribe({
        next: h => {
          if (h.state === "connected") r(!0);
        },
        error: () => {
          r(!1);
        },
        complete: () => {
          r(!1);
        }
      });
    });
  }
  connectionLifecycleChanges() {
    return this.lifecycleEventSubject;
  }
  getConnectionLifecycleEvents() {
    return [...this.lifecycleEvents];
  }
  async connect() {
    return this.connectInternal({
      fromReconnect: !1
    });
  }
  recordLifecycleEvent(T, R) {
    let a = {
        id: ++this.lifecycleEventID,
        at: Date.now(),
        type: T,
        ...(R ? {
          details: R
        } : {})
      },
      e = Wn0,
      t = this.lifecycleEvents.slice(-(e - 1));
    this.lifecycleEvents = [...t, a], this.lifecycleEventSubject.next([...this.lifecycleEvents]);
  }
  async connectInternal(T) {
    if (this.disposed) throw new z8("Transport is disposed");
    if (this.ws) return;
    this.recordLifecycleEvent("connect_requested", T.fromReconnect ? `mode=reconnect attempt=${this.reconnectAttempts}` : "mode=initial"), this.updateConnectionState("connecting");
    try {
      let R = this.config.WebSocketClass ?? WebSocket,
        a;
      if (this.config.webSocketProvider) a = await this.config.webSocketProvider();else if (EKT(this.config)) {
        let e = this.config.baseURL.replace(/^http:/, "ws:").replace(/^https:/, "wss:"),
          t = this.config.apiKey;
        if (!t) throw new z8("1-step flow requires apiKey");
        let r = this.currentThreadID ?? this.config.threadId;
        if (!r) r = (await this.fetchWsToken()).threadId;
        let h = `${e}/threads`;
        if (r) h = `${h}?threadId=${encodeURIComponent(r)}`;
        a = new R(h, {
          headers: {
            Authorization: `Bearer ${t}`
          }
        });
      } else {
        let e = this.config.baseURL.replace(/^http:/, "ws:").replace(/^https:/, "wss:"),
          {
            threadId: t,
            wsToken: r
          } = await this.ensureWsToken();
        this.currentThreadID = t, this.currentWsToken = r;
        let h = `${e}/threads`;
        a = new R(h, ["amp", r]);
      }
      try {
        a.binaryType = "arraybuffer";
      } catch {}
      await this.waitForOpen(a), this.ws = a, this.lastPongAt = Date.now(), this.setupWebSocketHandlers(a), this.stopWaitingForReconnectActivity(), this.scheduleReconnectAttemptsReset(), this.reconnectCause = null, this.updateConnectionState("connected"), this.recordLifecycleEvent("connect_succeeded", `threadId=${this.currentThreadID ?? "none"} attempt=${this.reconnectAttempts}`);
    } catch (R) {
      let a = R instanceof Error ? R.message : String(R);
      if (this.recordLifecycleEvent("connect_failed", `mode=${T.fromReconnect ? "reconnect" : "initial"} error=${a}`), !T.fromReconnect && !this.disposed) this.reconnectCause = {
        type: "connect_failed",
        at: Date.now(),
        error: a
      }, this.scheduleReconnect();
      throw R;
    }
  }
  disconnect() {
    this.recordLifecycleEvent("disconnect_requested"), this.stopPingInterval(), this.cancelReconnect(), this.reconnectCause = null;
    let T = this.ws;
    if (T) {
      if (this.ws = null, this.intentionallyClosedSockets.add(T), T.readyState === WebSocket.OPEN) T.close(1000, "Client disconnect");
    }
    this.updateConnectionState("disconnected");
  }
  async disconnectAndWait(T) {
    let R = this.ws;
    if (!R || R.readyState !== WebSocket.OPEN) return this.disconnect(), {
      status: "not_connected"
    };
    let a = this.waitForSocketClose(R, T?.waitForCloseTimeoutMs ?? Hn0);
    return this.disconnect(), a;
  }
  dispose() {
    if (this.disposed) return;
    this.recordLifecycleEvent("disposed"), this.disposed = !0, this.disconnect(), this.connectionSubject.complete(), this.lifecycleEventSubject.complete();
  }
  sendRaw(T) {
    if (!this.hasOpenSocket()) throw new z8("WebSocket is not connected");
    this.ws?.send(T);
  }
  hasOpenSocket() {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }
  waitForSocketClose(T, R) {
    return new Promise(a => {
      let e = !1,
        t = null,
        r = i => {
          if (e) return;
          if (e = !0, t) clearTimeout(t);
          T.removeEventListener("close", h), a(i);
        },
        h = i => {
          let c = i;
          r({
            status: c.code === 1000 ? "server_acknowledged" : "timeout",
            ...(typeof c.code === "number" ? {
              closeCode: c.code
            } : {}),
            ...(typeof c.reason === "string" ? {
              closeReason: c.reason
            } : {})
          });
        };
      if (t = setTimeout(() => {
        r({
          status: "timeout"
        });
      }, R), T.addEventListener("close", h), T.readyState === WebSocket.CLOSED) r({
        status: "timeout"
      });
    });
  }
  updateConnectionState(T) {
    if (T === "disconnected" || T === "reconnecting") {
      let R = {
        state: T,
        role: null,
        clientId: null,
        threadId: null
      };
      if (this.reconnectCause) R.reconnectCause = this.reconnectCause;
      this.connectionInfo = R;
    } else if (this.connectionInfo.state = T, T === "connected") this.connectionInfo.threadId = this.currentThreadID, this.reconnectCause = null, delete this.connectionInfo.reconnectCause;else if (this.reconnectCause) this.connectionInfo.reconnectCause = this.reconnectCause;
    this.connectionSubject.next({
      ...this.connectionInfo
    }), this.recordLifecycleEvent("state_changed", `state=${T} cause=${Fn0(this.reconnectCause)}`);
  }
  async handleAuthExpired() {
    this.recordLifecycleEvent("auth_refresh_started");
    try {
      if (this.currentWsToken = null, this.config.wsTokenProvider) {
        let T = await this.config.wsTokenProvider({
          forceRefresh: !0
        });
        this.currentThreadID = T.threadId, this.currentWsToken = T.wsToken;
      }
      this.recordLifecycleEvent("auth_refresh_succeeded", `threadId=${this.currentThreadID ?? "none"}`);
    } catch {
      this.recordLifecycleEvent("auth_refresh_failed");
    }
  }
  onRawMessage(T) {}
  onMaxReconnectExceeded(T) {}
  async ensureWsToken() {
    let T = this.reconnectAttempts > 0;
    if (!T && this.currentWsToken && this.currentThreadID) return {
      threadId: this.currentThreadID,
      wsToken: this.currentWsToken
    };
    if (this.config.wsTokenProvider) {
      let R = await this.config.wsTokenProvider(T ? {
        forceRefresh: !0
      } : void 0);
      return this.currentThreadID = R.threadId, this.currentWsToken = R.wsToken, R;
    }
    if (!T && this.config.wsToken && this.config.threadId) return {
      threadId: this.config.threadId,
      wsToken: this.config.wsToken
    };
    return this.fetchWsToken();
  }
  async fetchWsToken() {
    let T = `${this.config.baseURL.replace(/^ws:/, "http:").replace(/^wss:/, "https:")}/threads`,
      R = {
        "Content-Type": "application/json"
      };
    if (this.config.apiKey) R.Authorization = `Bearer ${this.config.apiKey}`;
    let a = this.currentThreadID ?? this.config.threadId,
      e = {};
    if (a) e.threadId = a;
    let t = await fetch(T, {
      method: "POST",
      headers: R,
      body: JSON.stringify(e)
    });
    if (!t.ok) {
      let h = await t.text().catch(() => "");
      throw new z8(`Failed to get wsToken: ${t.status} ${h}`);
    }
    let r = await t.json();
    if (!r.threadId || !r.wsToken) throw new z8("Invalid response from /threads: missing threadId or wsToken");
    return this.currentThreadID = r.threadId, this.currentWsToken = r.wsToken, {
      threadId: r.threadId,
      wsToken: r.wsToken
    };
  }
  async waitForOpen(T) {
    if (T.readyState === WebSocket.OPEN) return;
    return new Promise((R, a) => {
      let e = setTimeout(() => {
          t(), this.updateConnectionState("disconnected");
          try {
            if (T.readyState === WebSocket.CONNECTING) T.close();
          } catch {}
          a(new z8(`WebSocket connection timed out after ${this.config.connectTimeoutMs}ms`));
        }, this.config.connectTimeoutMs),
        t = () => {
          clearTimeout(e), T.removeEventListener("open", r), T.removeEventListener("error", h), T.removeEventListener("close", i);
        },
        r = () => {
          t(), R();
        },
        h = c => {
          t(), this.updateConnectionState("disconnected");
          let s = "message" in c ? c.message : "error" in c && c.error instanceof Error ? c.error.message : c.type;
          a(new z8(`WebSocket connection failed: ${s}`));
        },
        i = c => {
          t(), this.updateConnectionState("disconnected"), a(new z8(`WebSocket closed during connect: code=${c.code} reason=${c.reason || "none"}`));
        };
      if (T.addEventListener("open", r), T.addEventListener("error", h), T.addEventListener("close", i), T.readyState === WebSocket.OPEN) return r();
      if (T.readyState === WebSocket.CLOSED || T.readyState === WebSocket.CLOSING) return i({
        code: 1006,
        reason: "Socket already closed before connect"
      });
    });
  }
  setupWebSocketHandlers(T) {
    if (T.addEventListener("message", R => {
      let a = R.data;
      if (typeof a === "string") {
        if (a === "pong") {
          this.lastPongAt = Date.now(), this.startPingIntervalOnce();
          return;
        }
        this.startPingIntervalOnce(), this.onRawMessage(a);
      } else if (a instanceof ArrayBuffer) this.startPingIntervalOnce(), this.onRawMessage(new TextDecoder().decode(a));
    }), T.addEventListener("close", R => {
      this.handleClose(T, R.code, R.reason);
    }), T.addEventListener("error", () => {
      this.handleError(T);
    }), !this.config.useThreadActors) this.startPingInterval();
  }
  handleClose(T, R, a) {
    let e = this.intentionallyClosedSockets.has(T);
    if (e) this.intentionallyClosedSockets.delete(T);
    if (this.recordLifecycleEvent("socket_closed", `code=${R} reason=${a || "none"} intentional=${e}`), T !== this.ws) return;
    if (this.ws = null, this.stopPingInterval(), this.cancelReconnectAttemptsReset(), !this.disposed && !e) {
      let t = this.reconnectCause,
        r = t?.type === "ping_timeout" && R === 4000 && !a ? {
          ...t,
          at: Date.now(),
          code: R
        } : {
          type: "close",
          at: Date.now(),
          code: R,
          ...(a ? {
            reason: a
          } : {})
        };
      if (this.reconnectCause = r, R === 4001 || a.includes("Token expired")) this.handleAuthExpired().catch(() => {
        return;
      }).finally(() => {
        if (!this.disposed) this.scheduleReconnect();
      });else this.scheduleReconnect();
    } else this.reconnectCause = null, this.updateConnectionState("disconnected");
  }
  handleError(T) {
    if (T !== this.ws) return;
    if (this.recordLifecycleEvent("socket_error", "error=WebSocket error event"), this.reconnectCause = {
      type: "error",
      at: Date.now(),
      error: "WebSocket error event"
    }, this.ws) this.ws.close();
  }
  scheduleReconnect(T) {
    if (this.disposed || this.reconnectTimeoutID) return;
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.stopWaitingForReconnectActivity(), this.recordLifecycleEvent("reconnect_exhausted", `attempts=${this.reconnectAttempts} max=${this.config.maxReconnectAttempts}`), this.updateConnectionState("disconnected"), this.onMaxReconnectExceeded(this.config.maxReconnectAttempts);
      return;
    }
    if (!T?.bypassActivityGate && this.shouldWaitForReconnectActivity()) {
      this.recordLifecycleEvent("reconnect_waiting_for_activity", `offline=${this.isBrowserOffline()} hidden=${this.isDocumentHidden()}`), this.updateConnectionState("reconnecting"), this.waitForReconnectActivity();
      return;
    }
    this.stopWaitingForReconnectActivity(), this.updateConnectionState("reconnecting"), this.reconnectAttempts++;
    let R = T?.immediate ? 0 : this.getReconnectDelayMs();
    this.recordLifecycleEvent("reconnect_scheduled", `attempt=${this.reconnectAttempts} delayMs=${Math.round(R)}`), this.reconnectTimeoutID = setTimeout(() => {
      this.reconnectTimeoutID = null, this.connectInternal({
        fromReconnect: !0
      }).catch(a => {
        if (this.reconnectCause = {
          type: "connect_failed",
          at: Date.now(),
          error: a instanceof Error ? a.message : String(a)
        }, !this.disposed) this.scheduleReconnect();
      });
    }, R);
  }
  cancelReconnect() {
    if (this.reconnectTimeoutID) clearTimeout(this.reconnectTimeoutID), this.reconnectTimeoutID = null;
    this.stopWaitingForReconnectActivity(), this.cancelReconnectAttemptsReset(), this.reconnectAttempts = 0;
  }
  getReconnectDelayMs() {
    let T = this.config.reconnectDelayMs * 2 ** (this.reconnectAttempts - 1),
      R = 0.8 + Math.random() * 0.4;
    return Math.min(T * R, this.config.maxReconnectDelayMs);
  }
  shouldWaitForReconnectActivity() {
    let T = PkT(),
      R = tF();
    if (!T && !R) return !1;
    return this.isBrowserOffline() || this.isDocumentHidden();
  }
  isBrowserOffline() {
    let T = zn0();
    if (typeof T?.onLine !== "boolean") return !1;
    return T.onLine === !1;
  }
  isDocumentHidden() {
    let T = tF();
    if (!T) return !1;
    return T.visibilityState === "hidden";
  }
  waitForReconnectActivity() {
    if (this.reconnectActivityCleanup) return;
    let T = PkT(),
      R = tF();
    if (!T && !R) return;
    let a = () => {
      this.handleReconnectActivity();
    };
    for (let e of ukT) T?.addEventListener(e, a);
    for (let e of ykT) R?.addEventListener(e, a);
    this.reconnectActivityCleanup = () => {
      for (let e of ukT) T?.removeEventListener(e, a);
      for (let e of ykT) R?.removeEventListener(e, a);
    };
  }
  stopWaitingForReconnectActivity() {
    this.reconnectActivityCleanup?.(), this.reconnectActivityCleanup = null;
  }
  handleReconnectActivity() {
    if (this.disposed || this.ws) {
      this.stopWaitingForReconnectActivity();
      return;
    }
    if (this.shouldWaitForReconnectActivity()) return;
    this.stopWaitingForReconnectActivity(), this.recordLifecycleEvent("reconnect_activity_detected"), this.scheduleReconnect({
      immediate: !0,
      bypassActivityGate: !0
    });
  }
  scheduleReconnectAttemptsReset() {
    this.cancelReconnectAttemptsReset(), this.reconnectResetTimeoutID = setTimeout(() => {
      this.reconnectResetTimeoutID = null, this.reconnectAttempts = 0;
    }, qn0);
  }
  cancelReconnectAttemptsReset() {
    if (this.reconnectResetTimeoutID) clearTimeout(this.reconnectResetTimeoutID), this.reconnectResetTimeoutID = null;
  }
  startPingIntervalOnce() {
    if (this.pingIntervalID) return;
    this.startPingInterval();
  }
  startPingInterval() {
    this.stopPingInterval();
    let T = Date.now();
    this.pingIntervalID = setInterval(() => {
      let R = Date.now(),
        a = R - T;
      if (T = R, a > this.config.pingIntervalMs * 3) {
        this.lastPongAt = R;
        return;
      }
      if (this.hasOpenSocket()) {
        let e = R - this.lastPongAt,
          t = this.config.pingIntervalMs * 2;
        if (e > t) {
          this.recordLifecycleEvent("ping_timeout", `elapsedMs=${e} thresholdMs=${t}`), this.reconnectCause = {
            type: "ping_timeout",
            at: R,
            code: 4000,
            reason: "Pong timeout",
            error: `No pong received for ${e}ms (threshold ${t}ms)`
          }, this.ws?.close(4000, "Pong timeout");
          return;
        }
        try {
          this.ws?.send("ping");
        } catch {}
      }
    }, this.config.pingIntervalMs);
  }
  stopPingInterval() {
    if (this.pingIntervalID) clearInterval(this.pingIntervalID), this.pingIntervalID = null;
  }
}