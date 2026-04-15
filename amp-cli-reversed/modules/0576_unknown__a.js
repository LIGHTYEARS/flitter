function rAT(T) {
  return T.type === "tool_use" || T.type === "server_tool_use";
}
function hAT(T) {}
class _a {
  constructor({
    baseURL: T = nC("ANTHROPIC_BASE_URL"),
    apiKey: R = nC("ANTHROPIC_API_KEY") ?? null,
    authToken: a = nC("ANTHROPIC_AUTH_TOKEN") ?? null,
    ...e
  } = {}) {
    AK.add(this), NL.set(this, void 0);
    let t = {
      apiKey: R,
      authToken: a,
      ...e,
      baseURL: T || "https://api.anthropic.com"
    };
    if (!t.dangerouslyAllowBrowser && MxR()) throw new f9(`It looks like you're running in a browser-like environment.

This is disabled by default, as it risks exposing your secret API credentials to attackers.
If you understand the risks and have appropriate mitigations in place,
you can set the \`dangerouslyAllowBrowser\` option to \`true\`, e.g.,

new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
`);
    this.baseURL = t.baseURL, this.timeout = t.timeout ?? pK.DEFAULT_TIMEOUT, this.logger = t.logger ?? console;
    let r = "warn";
    this.logLevel = r, this.logLevel = UlT(t.logLevel, "ClientOptions.logLevel", this) ?? UlT(nC("ANTHROPIC_LOG"), "process.env['ANTHROPIC_LOG']", this) ?? r, this.fetchOptions = t.fetchOptions, this.maxRetries = t.maxRetries ?? 2, this.fetch = t.fetch ?? BxR(), $0(this, NL, UxR, "f"), this._options = t, this.apiKey = typeof R === "string" ? R : null, this.authToken = a;
  }
  withOptions(T) {
    return new this.constructor({
      ...this._options,
      baseURL: this.baseURL,
      maxRetries: this.maxRetries,
      timeout: this.timeout,
      logger: this.logger,
      logLevel: this.logLevel,
      fetch: this.fetch,
      fetchOptions: this.fetchOptions,
      apiKey: this.apiKey,
      authToken: this.authToken,
      ...T
    });
  }
  defaultQuery() {
    return this._options.defaultQuery;
  }
  validateHeaders({
    values: T,
    nulls: R
  }) {
    if (T.get("x-api-key") || T.get("authorization")) return;
    if (this.apiKey && T.get("x-api-key")) return;
    if (R.has("x-api-key")) return;
    if (this.authToken && T.get("authorization")) return;
    if (R.has("authorization")) return;
    throw Error('Could not resolve authentication method. Expected either apiKey or authToken to be set. Or for one of the "X-Api-Key" or "Authorization" headers to be explicitly omitted');
  }
  async authHeaders(T) {
    return i8([await this.apiKeyAuth(T), await this.bearerAuth(T)]);
  }
  async apiKeyAuth(T) {
    if (this.apiKey == null) return;
    return i8([{
      "X-Api-Key": this.apiKey
    }]);
  }
  async bearerAuth(T) {
    if (this.authToken == null) return;
    return i8([{
      Authorization: `Bearer ${this.authToken}`
    }]);
  }
  stringifyQuery(T) {
    return Object.entries(T).filter(([R, a]) => typeof a < "u").map(([R, a]) => {
      if (typeof a === "string" || typeof a === "number" || typeof a === "boolean") return `${encodeURIComponent(R)}=${encodeURIComponent(a)}`;
      if (a === null) return `${encodeURIComponent(R)}=`;
      throw new f9(`Cannot stringify type ${typeof a}; Expected string, number, boolean, or null. If you need to pass nested query parameters, you can manually encode them, e.g. { query: { 'foo[key1]': value1, 'foo[key2]': value2 } }, and please open a GitHub issue requesting better support for your use case.`);
    }).join("&");
  }
  getUserAgent() {
    return `${this.constructor.name}/JS ${fy}`;
  }
  defaultIdempotencyKey() {
    return `stainless-node-retry-${M7T()}`;
  }
  makeStatusError(T, R, a, e) {
    return pr.generate(T, R, a, e);
  }
  buildURL(T, R, a) {
    let e = !mR(this, AK, "m", bwT).call(this) && a || this.baseURL,
      t = OxR(T) ? new URL(T) : new URL(e + (e.endsWith("/") && T.startsWith("/") ? T.slice(1) : T)),
      r = this.defaultQuery();
    if (!jxR(r)) R = {
      ...r,
      ...R
    };
    if (typeof R === "object" && R && !Array.isArray(R)) t.search = this.stringifyQuery(R);
    return t.toString();
  }
  _calculateNonstreamingTimeout(T) {
    if (3600 * T / 128000 > 600) throw new f9("Streaming is required for operations that may take longer than 10 minutes. See https://github.com/anthropics/anthropic-sdk-typescript#streaming-responses for more details");
    return 600000;
  }
  async prepareOptions(T) {}
  async prepareRequest(T, {
    url: R,
    options: a
  }) {}
  get(T, R) {
    return this.methodRequest("get", T, R);
  }
  post(T, R) {
    return this.methodRequest("post", T, R);
  }
  patch(T, R) {
    return this.methodRequest("patch", T, R);
  }
  put(T, R) {
    return this.methodRequest("put", T, R);
  }
  delete(T, R) {
    return this.methodRequest("delete", T, R);
  }
  methodRequest(T, R, a) {
    return this.request(Promise.resolve(a).then(e => {
      return {
        method: T,
        path: R,
        ...e
      };
    }));
  }
  request(T, R = null) {
    return new o8T(this, this.makeRequest(T, R, void 0));
  }
  async makeRequest(T, R, a) {
    let e = await T,
      t = e.maxRetries ?? this.maxRetries;
    if (R == null) R = t;
    await this.prepareOptions(e);
    let {
      req: r,
      url: h,
      timeout: i
    } = await this.buildRequest(e, {
      retryCount: t - R
    });
    await this.prepareRequest(r, {
      url: h,
      options: e
    });
    let c = "log_" + (Math.random() * 16777216 | 0).toString(16).padStart(6, "0"),
      s = a === void 0 ? "" : `, retryOf: ${a}`,
      A = Date.now();
    if (It(this).debug(`[${c}] sending request`, $_({
      retryOfRequestLogID: a,
      method: e.method,
      url: h,
      options: e,
      headers: r.headers
    })), e.signal?.aborted) throw new pi();
    let l = new AbortController(),
      o = await this.fetchWithTimeout(h, r, i, l).catch(WG),
      n = Date.now();
    if (o instanceof globalThis.Error) {
      let m = `retrying, ${R} attempts remaining`;
      if (e.signal?.aborted) throw new pi();
      let b = Wj(o) || /timed? ?out/i.test(String(o) + ("cause" in o ? String(o.cause) : ""));
      if (R) return It(this).info(`[${c}] connection ${b ? "timed out" : "failed"} - ${m}`), It(this).debug(`[${c}] connection ${b ? "timed out" : "failed"} (${m})`, $_({
        retryOfRequestLogID: a,
        url: h,
        durationMs: n - A,
        message: o.message
      })), this.retryRequest(e, R, a ?? c);
      if (It(this).info(`[${c}] connection ${b ? "timed out" : "failed"} - error; no more retries left`), It(this).debug(`[${c}] connection ${b ? "timed out" : "failed"} (error; no more retries left)`, $_({
        retryOfRequestLogID: a,
        url: h,
        durationMs: n - A,
        message: o.message
      })), b) throw new h8T();
      throw new F$({
        cause: o
      });
    }
    let p = [...o.headers.entries()].filter(([m]) => m === "request-id").map(([m, b]) => ", " + m + ": " + JSON.stringify(b)).join(""),
      _ = `[${c}${s}${p}] ${r.method} ${h} ${o.ok ? "succeeded" : "failed"} with status ${o.status} in ${n - A}ms`;
    if (!o.ok) {
      let m = await this.shouldRetry(o);
      if (R && m) {
        let k = `retrying, ${R} attempts remaining`;
        return await NxR(o.body), It(this).info(`${_} - ${k}`), It(this).debug(`[${c}] response error (${k})`, $_({
          retryOfRequestLogID: a,
          url: o.url,
          status: o.status,
          headers: o.headers,
          durationMs: n - A
        })), this.retryRequest(e, R, a ?? c, o.headers);
      }
      let b = m ? "error; no more retries left" : "error; not retryable";
      It(this).info(`${_} - ${b}`);
      let y = await o.text().catch(k => WG(k).message),
        u = w7T(y),
        P = u ? void 0 : y;
      throw It(this).debug(`[${c}] response error (${b})`, $_({
        retryOfRequestLogID: a,
        url: o.url,
        status: o.status,
        headers: o.headers,
        message: P,
        durationMs: Date.now() - A
      })), this.makeStatusError(o.status, u, P, o.headers);
    }
    return It(this).info(_), It(this).debug(`[${c}] response start`, $_({
      retryOfRequestLogID: a,
      url: o.url,
      status: o.status,
      headers: o.headers,
      durationMs: n - A
    })), {
      response: o,
      options: e,
      controller: l,
      requestLogID: c,
      retryOfRequestLogID: a,
      startTime: A
    };
  }
  getAPIList(T, R, a) {
    return this.requestAPIList(R, a && "then" in a ? a.then(e => ({
      method: "get",
      path: T,
      ...e
    })) : {
      method: "get",
      path: T,
      ...a
    });
  }
  requestAPIList(T, R) {
    let a = this.makeRequest(R, null, void 0);
    return new K7T(this, a, T);
  }
  async fetchWithTimeout(T, R, a, e) {
    let {
        signal: t,
        method: r,
        ...h
      } = R || {},
      i = this._makeAbort(e);
    if (t) t.addEventListener("abort", i, {
      once: !0
    });
    let c = setTimeout(i, a),
      s = globalThis.ReadableStream && h.body instanceof globalThis.ReadableStream || typeof h.body === "object" && h.body !== null && Symbol.asyncIterator in h.body,
      A = {
        signal: e.signal,
        ...(s ? {
          duplex: "half"
        } : {}),
        method: "GET",
        ...h
      };
    if (r) A.method = r.toUpperCase();
    try {
      return await this.fetch.call(void 0, T, A);
    } finally {
      clearTimeout(c);
    }
  }
  async shouldRetry(T) {
    let R = T.headers.get("x-should-retry");
    if (R === "true") return !0;
    if (R === "false") return !1;
    if (T.status === 408) return !0;
    if (T.status === 409) return !0;
    if (T.status === 429) return !0;
    if (T.status >= 500) return !0;
    return !1;
  }
  async retryRequest(T, R, a, e) {
    let t,
      r = e?.get("retry-after-ms");
    if (r) {
      let i = parseFloat(r);
      if (!Number.isNaN(i)) t = i;
    }
    let h = e?.get("retry-after");
    if (h && !t) {
      let i = parseFloat(h);
      if (!Number.isNaN(i)) t = i * 1000;else t = Date.parse(h) - Date.now();
    }
    if (!(t && 0 <= t && t < 60000)) {
      let i = T.maxRetries ?? this.maxRetries;
      t = this.calculateDefaultRetryTimeoutMillis(R, i);
    }
    return await ExR(t), this.makeRequest(T, R - 1, a);
  }
  calculateDefaultRetryTimeoutMillis(T, R) {
    let a = R - T,
      e = Math.min(0.5 * Math.pow(2, a), 8),
      t = 1 - Math.random() * 0.25;
    return e * t * 1000;
  }
  calculateNonstreamingTimeout(T, R) {
    if (3600000 * T / 128000 > 600000 || R != null && T > R) throw new f9("Streaming is required for operations that may take longer than 10 minutes. See https://github.com/anthropics/anthropic-sdk-typescript#long-requests for more details");
    return 600000;
  }
  async buildRequest(T, {
    retryCount: R = 0
  } = {}) {
    let a = {
        ...T
      },
      {
        method: e,
        path: t,
        query: r,
        defaultBaseURL: h
      } = a,
      i = this.buildURL(t, r, h);
    if ("timeout" in a) dxR("timeout", a.timeout);
    a.timeout = a.timeout ?? this.timeout;
    let {
        bodyHeaders: c,
        body: s
      } = this.buildBody({
        options: a
      }),
      A = await this.buildHeaders({
        options: T,
        method: e,
        bodyHeaders: c,
        retryCount: R
      });
    return {
      req: {
        method: e,
        headers: A,
        ...(a.signal && {
          signal: a.signal
        }),
        ...(globalThis.ReadableStream && s instanceof globalThis.ReadableStream && {
          duplex: "half"
        }),
        ...(s && {
          body: s
        }),
        ...(this.fetchOptions ?? {}),
        ...(a.fetchOptions ?? {})
      },
      url: i,
      timeout: a.timeout
    };
  }
  async buildHeaders({
    options: T,
    method: R,
    bodyHeaders: a,
    retryCount: e
  }) {
    let t = {};
    if (this.idempotencyHeader && R !== "get") {
      if (!T.idempotencyKey) T.idempotencyKey = this.defaultIdempotencyKey();
      t[this.idempotencyHeader] = T.idempotencyKey;
    }
    let r = i8([t, {
      Accept: "application/json",
      "User-Agent": this.getUserAgent(),
      "X-Stainless-Retry-Count": String(e),
      ...(T.timeout ? {
        "X-Stainless-Timeout": String(Math.trunc(T.timeout / 1000))
      } : {}),
      ...wxR(),
      ...(this._options.dangerouslyAllowBrowser ? {
        "anthropic-dangerous-direct-browser-access": "true"
      } : void 0),
      "anthropic-version": "2023-06-01"
    }, await this.authHeaders(T), this._options.defaultHeaders, a, T.headers]);
    return this.validateHeaders(r), r.values;
  }
  _makeAbort(T) {
    return () => T.abort();
  }
  buildBody({
    options: {
      body: T,
      headers: R
    }
  }) {
    if (!T) return {
      bodyHeaders: void 0,
      body: void 0
    };
    let a = i8([R]);
    if (ArrayBuffer.isView(T) || T instanceof ArrayBuffer || T instanceof DataView || typeof T === "string" && a.values.has("content-type") || globalThis.Blob && T instanceof globalThis.Blob || T instanceof FormData || T instanceof URLSearchParams || globalThis.ReadableStream && T instanceof globalThis.ReadableStream) return {
      bodyHeaders: void 0,
      body: T
    };else if (typeof T === "object" && (Symbol.asyncIterator in T || Symbol.iterator in T && "next" in T && typeof T.next === "function")) return {
      bodyHeaders: void 0,
      body: N7T(T)
    };else if (typeof T === "object" && a.values.get("content-type") === "application/x-www-form-urlencoded") return {
      bodyHeaders: {
        "content-type": "application/x-www-form-urlencoded"
      },
      body: this.stringifyQuery(T)
    };else return mR(this, NL, "f").call(this, {
      body: T,
      headers: a
    });
  }
}