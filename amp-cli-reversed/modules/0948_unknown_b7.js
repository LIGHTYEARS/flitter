class b7 {
  constructor(T) {
    var R,
      a,
      e,
      t,
      r,
      h,
      i,
      {
        baseURL: c = v5("GEMINI_NEXT_GEN_API_BASE_URL"),
        apiKey: s = (R = v5("GEMINI_API_KEY")) !== null && R !== void 0 ? R : null,
        apiVersion: A = "v1beta"
      } = T,
      l = _7(T, ["baseURL", "apiKey", "apiVersion"]);
    let o = Object.assign(Object.assign({
      apiKey: s,
      apiVersion: A
    }, l), {
      baseURL: c || "https://generativelanguage.googleapis.com"
    });
    this.baseURL = o.baseURL, this.timeout = (a = o.timeout) !== null && a !== void 0 ? a : b7.DEFAULT_TIMEOUT, this.logger = (e = o.logger) !== null && e !== void 0 ? e : console;
    let n = "warn";
    this.logLevel = n, this.logLevel = (r = (t = t_T(o.logLevel, "ClientOptions.logLevel", this)) !== null && t !== void 0 ? t : t_T(v5("GEMINI_NEXT_GEN_API_LOG"), "process.env['GEMINI_NEXT_GEN_API_LOG']", this)) !== null && r !== void 0 ? r : n, this.fetchOptions = o.fetchOptions, this.maxRetries = (h = o.maxRetries) !== null && h !== void 0 ? h : 2, this.fetch = (i = o.fetch) !== null && i !== void 0 ? i : sdR(), this.encoder = _ER, this._options = o, this.apiKey = s, this.apiVersion = A, this.clientAdapter = o.clientAdapter;
  }
  withOptions(T) {
    return new this.constructor(Object.assign(Object.assign(Object.assign({}, this._options), {
      baseURL: this.baseURL,
      maxRetries: this.maxRetries,
      timeout: this.timeout,
      logger: this.logger,
      logLevel: this.logLevel,
      fetch: this.fetch,
      fetchOptions: this.fetchOptions,
      apiKey: this.apiKey,
      apiVersion: this.apiVersion
    }), T));
  }
  baseURLOverridden() {
    return this.baseURL !== "https://generativelanguage.googleapis.com";
  }
  defaultQuery() {
    return this._options.defaultQuery;
  }
  validateHeaders({
    values: T,
    nulls: R
  }) {
    if (T.has("authorization") || T.has("x-goog-api-key")) return;
    if (this.apiKey && T.get("x-goog-api-key")) return;
    if (R.has("x-goog-api-key")) return;
    throw Error('Could not resolve authentication method. Expected the apiKey to be set. Or for the "x-goog-api-key" headers to be explicitly omitted');
  }
  async authHeaders(T) {
    let R = xI([T.headers]);
    if (R.values.has("authorization") || R.values.has("x-goog-api-key")) return;
    if (this.apiKey) return xI([{
      "x-goog-api-key": this.apiKey
    }]);
    if (this.clientAdapter.isVertexAI()) return xI([await this.clientAdapter.getAuthHeaders()]);
    return;
  }
  stringifyQuery(T) {
    return Object.entries(T).filter(([R, a]) => typeof a < "u").map(([R, a]) => {
      if (typeof a === "string" || typeof a === "number" || typeof a === "boolean") return `${encodeURIComponent(R)}=${encodeURIComponent(a)}`;
      if (a === null) return `${encodeURIComponent(R)}=`;
      throw new Ah(`Cannot stringify type ${typeof a}; Expected string, number, boolean, or null. If you need to pass nested query parameters, you can manually encode them, e.g. { query: { 'foo[key1]': value1, 'foo[key2]': value2 } }, and please open a GitHub issue requesting better support for your use case.`);
    }).join("&");
  }
  getUserAgent() {
    return `${this.constructor.name}/JS ${vy}`;
  }
  defaultIdempotencyKey() {
    return `stainless-node-retry-${cER()}`;
  }
  makeStatusError(T, R, a, e) {
    return th.generate(T, R, a, e);
  }
  buildURL(T, R, a) {
    let e = !this.baseURLOverridden() && a || this.baseURL,
      t = sER(T) ? new URL(T) : new URL(e + (e.endsWith("/") && T.startsWith("/") ? T.slice(1) : T)),
      r = this.defaultQuery();
    if (!rdR(r)) R = Object.assign(Object.assign({}, r), R);
    if (typeof R === "object" && R && !Array.isArray(R)) t.search = this.stringifyQuery(R);
    return t.toString();
  }
  async prepareOptions(T) {
    if (this.clientAdapter && this.clientAdapter.isVertexAI() && !T.path.startsWith(`/${this.apiVersion}/projects/`)) {
      let R = T.path.slice(this.apiVersion.length + 1);
      T.path = `/${this.apiVersion}/projects/${this.clientAdapter.getProject()}/locations/${this.clientAdapter.getLocation()}${R}`;
    }
  }
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
      return Object.assign({
        method: T,
        path: R
      }, e);
    }));
  }
  request(T, R = null) {
    return new Y6T(this, this.makeRequest(T, R, void 0));
  }
  async makeRequest(T, R, a) {
    var e, t, r;
    let h = await T,
      i = (e = h.maxRetries) !== null && e !== void 0 ? e : this.maxRetries;
    if (R == null) R = i;
    await this.prepareOptions(h);
    let {
      req: c,
      url: s,
      timeout: A
    } = await this.buildRequest(h, {
      retryCount: i - R
    });
    await this.prepareRequest(c, {
      url: s,
      options: h
    });
    let l = "log_" + (Math.random() * 16777216 | 0).toString(16).padStart(6, "0"),
      o = a === void 0 ? "" : `, retryOf: ${a}`,
      n = Date.now();
    if (gt(this).debug(`[${l}] sending request`, v_({
      retryOfRequestLogID: a,
      method: h.method,
      url: s,
      options: h,
      headers: c.headers
    })), (t = h.signal) === null || t === void 0 ? void 0 : t.aborted) throw new y7();
    let p = new AbortController(),
      _ = await this.fetchWithTimeout(s, c, A, p).catch(WK),
      m = Date.now();
    if (_ instanceof globalThis.Error) {
      let y = `retrying, ${R} attempts remaining`;
      if ((r = h.signal) === null || r === void 0 ? void 0 : r.aborted) throw new y7();
      let u = MK(_) || /timed? ?out/i.test(String(_) + ("cause" in _ ? String(_.cause) : ""));
      if (R) return gt(this).info(`[${l}] connection ${u ? "timed out" : "failed"} - ${y}`), gt(this).debug(`[${l}] connection ${u ? "timed out" : "failed"} (${y})`, v_({
        retryOfRequestLogID: a,
        url: s,
        durationMs: m - n,
        message: _.message
      })), this.retryRequest(h, R, a !== null && a !== void 0 ? a : l);
      if (gt(this).info(`[${l}] connection ${u ? "timed out" : "failed"} - error; no more retries left`), gt(this).debug(`[${l}] connection ${u ? "timed out" : "failed"} (error; no more retries left)`, v_({
        retryOfRequestLogID: a,
        url: s,
        durationMs: m - n,
        message: _.message
      })), u) throw new qK();
      throw new R$({
        cause: _
      });
    }
    let b = `[${l}${o}] ${c.method} ${s} ${_.ok ? "succeeded" : "failed"} with status ${_.status} in ${m - n}ms`;
    if (!_.ok) {
      let y = await this.shouldRetry(_);
      if (R && y) {
        let f = `retrying, ${R} attempts remaining`;
        return await ndR(_.body), gt(this).info(`${b} - ${f}`), gt(this).debug(`[${l}] response error (${f})`, v_({
          retryOfRequestLogID: a,
          url: _.url,
          status: _.status,
          headers: _.headers,
          durationMs: m - n
        })), this.retryRequest(h, R, a !== null && a !== void 0 ? a : l, _.headers);
      }
      let u = y ? "error; no more retries left" : "error; not retryable";
      gt(this).info(`${b} - ${u}`);
      let P = await _.text().catch(f => WK(f).message),
        k = nER(P),
        x = k ? void 0 : P;
      throw gt(this).debug(`[${l}] response error (${u})`, v_({
        retryOfRequestLogID: a,
        url: _.url,
        status: _.status,
        headers: _.headers,
        message: x,
        durationMs: Date.now() - n
      })), this.makeStatusError(_.status, k, x, _.headers);
    }
    return gt(this).info(b), gt(this).debug(`[${l}] response start`, v_({
      retryOfRequestLogID: a,
      url: _.url,
      status: _.status,
      headers: _.headers,
      durationMs: m - n
    })), {
      response: _,
      options: h,
      controller: p,
      requestLogID: l,
      retryOfRequestLogID: a,
      startTime: n
    };
  }
  async fetchWithTimeout(T, R, a, e) {
    let t = R || {},
      {
        signal: r,
        method: h
      } = t,
      i = _7(t, ["signal", "method"]),
      c = e.abort.bind(e);
    if (r) r.addEventListener("abort", c, {
      once: !0
    });
    let s = setTimeout(c, a),
      A = globalThis.ReadableStream && i.body instanceof globalThis.ReadableStream || typeof i.body === "object" && i.body !== null && Symbol.asyncIterator in i.body,
      l = Object.assign(Object.assign(Object.assign({
        signal: e.signal
      }, A ? {
        duplex: "half"
      } : {}), {
        method: "GET"
      }), i);
    if (h) l.method = h.toUpperCase();
    try {
      return await this.fetch.call(void 0, T, l);
    } finally {
      clearTimeout(s);
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
    var t;
    let r,
      h = e === null || e === void 0 ? void 0 : e.get("retry-after-ms");
    if (h) {
      let c = parseFloat(h);
      if (!Number.isNaN(c)) r = c;
    }
    let i = e === null || e === void 0 ? void 0 : e.get("retry-after");
    if (i && !r) {
      let c = parseFloat(i);
      if (!Number.isNaN(c)) r = c * 1000;else r = Date.parse(i) - Date.now();
    }
    if (!(r && 0 <= r && r < 60000)) {
      let c = (t = T.maxRetries) !== null && t !== void 0 ? t : this.maxRetries;
      r = this.calculateDefaultRetryTimeoutMillis(R, c);
    }
    return await lER(r), this.makeRequest(T, R - 1, a);
  }
  calculateDefaultRetryTimeoutMillis(T, R) {
    let a = R - T,
      e = Math.min(0.5 * Math.pow(2, a), 8),
      t = 1 - Math.random() * 0.25;
    return e * t * 1000;
  }
  async buildRequest(T, {
    retryCount: R = 0
  } = {}) {
    var a, e, t;
    let r = Object.assign({}, T),
      {
        method: h,
        path: i,
        query: c,
        defaultBaseURL: s
      } = r,
      A = this.buildURL(i, c, s);
    if ("timeout" in r) oER("timeout", r.timeout);
    r.timeout = (a = r.timeout) !== null && a !== void 0 ? a : this.timeout;
    let {
        bodyHeaders: l,
        body: o
      } = this.buildBody({
        options: r
      }),
      n = await this.buildHeaders({
        options: T,
        method: h,
        bodyHeaders: l,
        retryCount: R
      });
    return {
      req: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({
        method: h,
        headers: n
      }, r.signal && {
        signal: r.signal
      }), globalThis.ReadableStream && o instanceof globalThis.ReadableStream && {
        duplex: "half"
      }), o && {
        body: o
      }), (e = this.fetchOptions) !== null && e !== void 0 ? e : {}), (t = r.fetchOptions) !== null && t !== void 0 ? t : {}),
      url: A,
      timeout: r.timeout
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
    let r = await this.authHeaders(T),
      h = xI([t, Object.assign(Object.assign({
        Accept: "application/json",
        "User-Agent": this.getUserAgent(),
        "X-Stainless-Retry-Count": String(e)
      }, T.timeout ? {
        "X-Stainless-Timeout": String(Math.trunc(T.timeout / 1000))
      } : {}), pER()), this._options.defaultHeaders, a, T.headers, r]);
    return this.validateHeaders(h), h.values;
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
    let a = xI([R]);
    if (ArrayBuffer.isView(T) || T instanceof ArrayBuffer || T instanceof DataView || typeof T === "string" && a.values.has("content-type") || globalThis.Blob && T instanceof globalThis.Blob || T instanceof FormData || T instanceof URLSearchParams || globalThis.ReadableStream && T instanceof globalThis.ReadableStream) return {
      bodyHeaders: void 0,
      body: T
    };else if (typeof T === "object" && (Symbol.asyncIterator in T || Symbol.iterator in T && "next" in T && typeof T.next === "function")) return {
      bodyHeaders: void 0,
      body: odR(T)
    };else return this.encoder({
      body: T,
      headers: a
    });
  }
}