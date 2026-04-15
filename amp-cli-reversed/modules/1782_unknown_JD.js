class JD {
  constructor(T, R) {
    this._url = T, this._resourceMetadataUrl = void 0, this._scope = void 0, this._eventSourceInit = R?.eventSourceInit, this._requestInit = R?.requestInit, this._authProvider = R?.authProvider, this._fetch = R?.fetch, this._fetchWithInit = WMT(R?.fetch, R?.requestInit);
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
    return await this._startOrAuth();
  }
  async _commonHeaders() {
    let T = {};
    if (this._authProvider) {
      let a = await this._authProvider.tokens();
      if (a) T.Authorization = `Bearer ${a.access_token}`;
    }
    if (this._protocolVersion) T["mcp-protocol-version"] = this._protocolVersion;
    let R = QD(this._requestInit?.headers);
    return new Headers({
      ...T,
      ...R
    });
  }
  _startOrAuth() {
    let T = this?._eventSourceInit?.fetch ?? this._fetch ?? fetch;
    return new Promise((R, a) => {
      this._eventSource = new Fg(this._url.href, {
        ...this._eventSourceInit,
        fetch: async (e, t) => {
          let r = await this._commonHeaders();
          r.set("Accept", "text/event-stream");
          let h = await T(e, {
            ...t,
            headers: r
          });
          if (h.status === 401 && h.headers.has("www-authenticate")) {
            let {
              resourceMetadataUrl: i,
              scope: c
            } = ZD(h);
            this._resourceMetadataUrl = i, this._scope = c;
          }
          return h;
        }
      }), this._abortController = new AbortController(), this._eventSource.onerror = e => {
        if (e.code === 401 && this._authProvider) {
          this._authThenStart().then(R, a);
          return;
        }
        let t = new QMT(e.code, e.message, e);
        a(t), this.onerror?.(t);
      }, this._eventSource.onopen = () => {}, this._eventSource.addEventListener("endpoint", e => {
        let t = e;
        try {
          if (this._endpoint = new URL(t.data, this._url), this._endpoint.origin !== this._url.origin) throw Error(`Endpoint origin does not match connection origin: ${this._endpoint.origin}`);
        } catch (r) {
          a(r), this.onerror?.(r), this.close();
          return;
        }
        R();
      }), this._eventSource.onmessage = e => {
        let t = e,
          r;
        try {
          r = vP.parse(JSON.parse(t.data));
        } catch (h) {
          this.onerror?.(h);
          return;
        }
        this.onmessage?.(r);
      };
    });
  }
  async start() {
    if (this._eventSource) throw Error("SSEClientTransport already started! If using Client class, note that connect() calls start() automatically.");
    return await this._startOrAuth();
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
    this._abortController?.abort(), this._eventSource?.close(), this.onclose?.();
  }
  async send(T) {
    if (!this._endpoint) throw Error("Not connected");
    try {
      let R = await this._commonHeaders();
      R.set("content-type", "application/json");
      let a = {
          ...this._requestInit,
          method: "POST",
          headers: R,
          body: JSON.stringify(T),
          signal: this._abortController?.signal
        },
        e = await (this._fetch ?? fetch)(this._endpoint, a);
      if (!e.ok) {
        let t = await e.text().catch(() => null);
        if (e.status === 401 && this._authProvider) {
          let {
            resourceMetadataUrl: r,
            scope: h
          } = ZD(e);
          if (this._resourceMetadataUrl = r, this._scope = h, (await Q_(this._authProvider, {
            serverUrl: this._url,
            resourceMetadataUrl: this._resourceMetadataUrl,
            scope: this._scope,
            fetchFn: this._fetchWithInit
          })) !== "AUTHORIZED") throw new _h();
          return this.send(T);
        }
        throw Error(`Error POSTing to endpoint (HTTP ${e.status}): ${t}`);
      }
      await e.body?.cancel();
    } catch (R) {
      throw this.onerror?.(R), R;
    }
  }
  setProtocolVersion(T) {
    this._protocolVersion = T;
  }
}