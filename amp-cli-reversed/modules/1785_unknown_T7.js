function JyR() {
  return "type" in dN;
}
class T7 {
  constructor(T, R) {
    this._hasCompletedAuthFlow = !1, this._url = T, this._resourceMetadataUrl = void 0, this._scope = void 0, this._requestInit = R?.requestInit, this._authProvider = R?.authProvider, this._fetch = R?.fetch, this._fetchWithInit = WMT(R?.fetch, R?.requestInit), this._sessionId = R?.sessionId, this._reconnectionOptions = R?.reconnectionOptions ?? tDT;
  }
  async _authThenStart() {
    if (!this._authProvider) throw new _h("No auth provider");
    let T;
    try {
      T = await Q_(this._authProvider, {
        serverUrl: this._url,
        resourceMetadataUrl: this._resourceMetadataUrl,
        scope: this._scope,
        fetchFn: this._fetchWithInit
      });
    } catch (R) {
      throw this.onerror?.(R), R;
    }
    if (T !== "AUTHORIZED") throw new _h();
    return await this._startOrAuthSse({
      resumptionToken: void 0
    });
  }
  async _commonHeaders() {
    let T = {};
    if (this._authProvider) {
      let a = await this._authProvider.tokens();
      if (a) T.Authorization = `Bearer ${a.access_token}`;
    }
    if (this._sessionId) T["mcp-session-id"] = this._sessionId;
    if (this._protocolVersion) T["mcp-protocol-version"] = this._protocolVersion;
    let R = QD(this._requestInit?.headers);
    return new Headers({
      ...T,
      ...R
    });
  }
  async _startOrAuthSse(T) {
    let {
      resumptionToken: R
    } = T;
    try {
      let a = await this._commonHeaders();
      if (a.set("Accept", "text/event-stream"), R) a.set("last-event-id", R);
      let e = await (this._fetch ?? fetch)(this._url, {
        method: "GET",
        headers: a,
        signal: this._abortController?.signal
      });
      if (!e.ok) {
        if (await e.body?.cancel(), e.status === 401 && this._authProvider) return await this._authThenStart();
        if (e.status === 405) return;
        throw new I_(e.status, `Failed to open SSE stream: ${e.statusText}`);
      }
      this._handleSseStream(e.body, T, !0);
    } catch (a) {
      throw this.onerror?.(a), a;
    }
  }
  _getNextReconnectionDelay(T) {
    if (this._serverRetryMs !== void 0) return this._serverRetryMs;
    let R = this._reconnectionOptions.initialReconnectionDelay,
      a = this._reconnectionOptions.reconnectionDelayGrowFactor,
      e = this._reconnectionOptions.maxReconnectionDelay;
    return Math.min(R * Math.pow(a, T), e);
  }
  _scheduleReconnection(T, R = 0) {
    let a = this._reconnectionOptions.maxRetries;
    if (R >= a) {
      this.onerror?.(Error(`Maximum reconnection attempts (${a}) exceeded.`));
      return;
    }
    let e = this._getNextReconnectionDelay(R);
    this._reconnectionTimeout = setTimeout(() => {
      this._startOrAuthSse(T).catch(t => {
        this.onerror?.(Error(`Failed to reconnect SSE stream: ${t instanceof Error ? t.message : String(t)}`)), this._scheduleReconnection(T, R + 1);
      });
    }, e);
  }
  _handleSseStream(T, R, a) {
    if (!T) return;
    let {
        onresumptiontoken: e,
        replayMessageId: t
      } = R,
      r,
      h = !1,
      i = !1;
    (async () => {
      try {
        let c = T.pipeThrough(new TextDecoderStream()).pipeThrough(new eDT({
          onRetry: s => {
            this._serverRetryMs = s;
          }
        })).getReader();
        while (!0) {
          let {
            value: s,
            done: A
          } = await c.read();
          if (A) break;
          if (s.id) r = s.id, h = !0, e?.(s.id);
          if (!s.data) continue;
          if (!s.event || s.event === "message") try {
            let l = vP.parse(JSON.parse(s.data));
            if (zg(l)) {
              if (i = !0, t !== void 0) l.id = t;
            }
            this.onmessage?.(l);
          } catch (l) {
            this.onerror?.(l);
          }
        }
        if ((a || h) && !i && this._abortController && !this._abortController.signal.aborted) this._scheduleReconnection({
          resumptionToken: r,
          onresumptiontoken: e,
          replayMessageId: t
        }, 0);
      } catch (c) {
        if (this.onerror?.(Error(`SSE stream disconnected: ${c}`)), (a || h) && !i && this._abortController && !this._abortController.signal.aborted) try {
          this._scheduleReconnection({
            resumptionToken: r,
            onresumptiontoken: e,
            replayMessageId: t
          }, 0);
        } catch (s) {
          this.onerror?.(Error(`Failed to reconnect: ${s instanceof Error ? s.message : String(s)}`));
        }
      }
    })();
  }
  async start() {
    if (this._abortController) throw Error("StreamableHTTPClientTransport already started! If using Client class, note that connect() calls start() automatically.");
    this._abortController = new AbortController();
  }
  async finishAuth(T) {
    if (!this._authProvider) throw new _h("No auth provider");
    if ((await Q_(this._authProvider, {
      serverUrl: this._url,
      authorizationCode: T,
      resourceMetadataUrl: this._resourceMetadataUrl,
      scope: this._scope,
      fetchFn: this._fetchWithInit
    })) !== "AUTHORIZED") throw new _h("Failed to authorize");
  }
  async close() {
    if (this._reconnectionTimeout) clearTimeout(this._reconnectionTimeout), this._reconnectionTimeout = void 0;
    this._abortController?.abort(), this.onclose?.();
  }
  async send(T, R) {
    try {
      let {
        resumptionToken: a,
        onresumptiontoken: e
      } = R || {};
      if (a) {
        this._startOrAuthSse({
          resumptionToken: a,
          replayMessageId: cG(T) ? T.id : void 0
        }).catch(A => this.onerror?.(A));
        return;
      }
      let t = await this._commonHeaders();
      t.set("content-type", "application/json"), t.set("accept", "application/json, text/event-stream");
      let r = {
          ...this._requestInit,
          method: "POST",
          headers: t,
          body: JSON.stringify(T),
          signal: this._abortController?.signal
        },
        h = await (this._fetch ?? fetch)(this._url, r),
        i = h.headers.get("mcp-session-id");
      if (i) this._sessionId = i;
      if (!h.ok) {
        let A = await h.text().catch(() => null);
        if (h.status === 401 && this._authProvider) {
          if (this._hasCompletedAuthFlow) throw new I_(401, "Server returned 401 after successful authentication");
          let {
            resourceMetadataUrl: l,
            scope: o
          } = ZD(h);
          if (this._resourceMetadataUrl = l, this._scope = o, (await Q_(this._authProvider, {
            serverUrl: this._url,
            resourceMetadataUrl: this._resourceMetadataUrl,
            scope: this._scope,
            fetchFn: this._fetchWithInit
          })) !== "AUTHORIZED") throw new _h();
          return this._hasCompletedAuthFlow = !0, this.send(T);
        }
        if (h.status === 403 && this._authProvider) {
          let {
            resourceMetadataUrl: l,
            scope: o,
            error: n
          } = ZD(h);
          if (n === "insufficient_scope") {
            let p = h.headers.get("WWW-Authenticate");
            if (this._lastUpscopingHeader === p) throw new I_(403, "Server returned 403 after trying upscoping");
            if (o) this._scope = o;
            if (l) this._resourceMetadataUrl = l;
            if (this._lastUpscopingHeader = p ?? void 0, (await Q_(this._authProvider, {
              serverUrl: this._url,
              resourceMetadataUrl: this._resourceMetadataUrl,
              scope: this._scope,
              fetchFn: this._fetch
            })) !== "AUTHORIZED") throw new _h();
            return this.send(T);
          }
        }
        throw new I_(h.status, `Error POSTing to endpoint: ${A}`);
      }
      if (this._hasCompletedAuthFlow = !1, this._lastUpscopingHeader = void 0, h.status === 202) {
        if (await h.body?.cancel(), zmR(T)) this._startOrAuthSse({
          resumptionToken: void 0
        }).catch(A => this.onerror?.(A));
        return;
      }
      let c = (Array.isArray(T) ? T : [T]).filter(A => "method" in A && "id" in A && A.id !== void 0).length > 0,
        s = h.headers.get("content-type");
      if (c) {
        if (s?.includes("text/event-stream")) this._handleSseStream(h.body, {
          onresumptiontoken: e
        }, !1);else if (s?.includes("application/json")) {
          let A = await h.json(),
            l = Array.isArray(A) ? A.map(o => vP.parse(o)) : [vP.parse(A)];
          for (let o of l) this.onmessage?.(o);
        } else throw await h.body?.cancel(), new I_(-1, `Unexpected content type: ${s}`);
      } else await h.body?.cancel();
    } catch (a) {
      throw this.onerror?.(a), a;
    }
  }
  get sessionId() {
    return this._sessionId;
  }
  async terminateSession() {
    if (!this._sessionId) return;
    try {
      let T = await this._commonHeaders(),
        R = {
          ...this._requestInit,
          method: "DELETE",
          headers: T,
          signal: this._abortController?.signal
        },
        a = await (this._fetch ?? fetch)(this._url, R);
      if (await a.body?.cancel(), !a.ok && a.status !== 405) throw new I_(a.status, `Failed to terminate session: ${a.statusText}`);
      this._sessionId = void 0;
    } catch (T) {
      throw this.onerror?.(T), T;
    }
  }
  setProtocolVersion(T) {
    this._protocolVersion = T;
  }
  get protocolVersion() {
    return this._protocolVersion;
  }
  async resumeStream(T, R) {
    await this._startOrAuthSse({
      resumptionToken: T,
      onresumptiontoken: R?.onresumptiontoken
    });
  }
}