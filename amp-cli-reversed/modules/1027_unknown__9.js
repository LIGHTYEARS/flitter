function MCR(T, R) {
  return SCR(T, R);
}
class _9 {
  constructor({
    baseURL: T = Uu("OPENAI_BASE_URL"),
    apiKey: R = Uu("OPENAI_API_KEY"),
    organization: a = Uu("OPENAI_ORG_ID") ?? null,
    project: e = Uu("OPENAI_PROJECT_ID") ?? null,
    webhookSecret: t = Uu("OPENAI_WEBHOOK_SECRET") ?? null,
    ...r
  } = {}) {
    if (GV.add(this), YL.set(this, void 0), this.completions = new s3T(this), this.chat = new g7(this), this.embeddings = new o3T(this), this.files = new n3T(this), this.images = new l3T(this), this.audio = new aP(this), this.moderations = new p3T(this), this.models = new A3T(this), this.fineTuning = new w_(this), this.graders = new M7(this), this.vectorStores = new av(this), this.webhooks = new b3T(this), this.beta = new D_(this), this.batches = new c3T(this), this.uploads = new w7(this), this.responses = new Tv(this), this.realtime = new J$(this), this.conversations = new S7(this), this.evals = new d7(this), this.containers = new j7(this), this.skills = new Rv(this), this.videos = new _3T(this), R === void 0) throw new Y0("Missing credentials. Please pass an `apiKey`, or set the `OPENAI_API_KEY` environment variable.");
    let h = {
      apiKey: R,
      organization: a,
      project: e,
      webhookSecret: t,
      ...r,
      baseURL: T || "https://api.openai.com/v1"
    };
    if (!h.dangerouslyAllowBrowser && MER()) throw new Y0(`It looks like you're running in a browser-like environment.

This is disabled by default, as it risks exposing your secret API credentials to attackers.
If you understand the risks and have appropriate mitigations in place,
you can set the \`dangerouslyAllowBrowser\` option to \`true\`, e.g.,

new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety
`);
    this.baseURL = h.baseURL, this.timeout = h.timeout ?? KV.DEFAULT_TIMEOUT, this.logger = h.logger ?? console;
    let i = "warn";
    this.logLevel = i, this.logLevel = y_T(h.logLevel, "ClientOptions.logLevel", this) ?? y_T(Uu("OPENAI_LOG"), "process.env['OPENAI_LOG']", this) ?? i, this.fetchOptions = h.fetchOptions, this.maxRetries = h.maxRetries ?? 2, this.fetch = h.fetch ?? BER(), b9(this, YL, UER, "f"), this._options = h, this.apiKey = typeof R === "string" ? R : "Missing Key", this.organization = a, this.project = e, this.webhookSecret = t;
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
      organization: this.organization,
      project: this.project,
      webhookSecret: this.webhookSecret,
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
    return;
  }
  async authHeaders(T) {
    return S0([{
      Authorization: `Bearer ${this.apiKey}`
    }]);
  }
  stringifyQuery(T) {
    return XER(T);
  }
  getUserAgent() {
    return `${this.constructor.name}/JS ${jy}`;
  }
  defaultIdempotencyKey() {
    return `stainless-node-retry-${iNT()}`;
  }
  makeStatusError(T, R, a, e) {
    return $t.generate(T, R, a, e);
  }
  async _callApiKey() {
    let T = this._options.apiKey;
    if (typeof T !== "function") return !1;
    let R;
    try {
      R = await T();
    } catch (a) {
      if (a instanceof Y0) throw a;
      throw new Y0(`Failed to get token from 'apiKey' function: ${a.message}`, {
        cause: a
      });
    }
    if (typeof R !== "string" || !R) throw new Y0(`Expected 'apiKey' function argument to return a string but it returned ${R}`);
    return this.apiKey = R, !0;
  }
  buildURL(T, R, a) {
    let e = !bR(this, GV, "m", lUT).call(this) && a || this.baseURL,
      t = OER(T) ? new URL(T) : new URL(e + (e.endsWith("/") && T.startsWith("/") ? T.slice(1) : T)),
      r = this.defaultQuery(),
      h = Object.fromEntries(t.searchParams);
    if (!s_T(r) || !s_T(h)) R = {
      ...h,
      ...r,
      ...R
    };
    if (typeof R === "object" && R && !Array.isArray(R)) t.search = this.stringifyQuery(R);
    return t.toString();
  }
  async prepareOptions(T) {
    await this._callApiKey();
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
      return {
        method: T,
        path: R,
        ...e
      };
    }));
  }
  request(T, R = null) {
    return new J8T(this, this.makeRequest(T, R, void 0));
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
    if (De(this).debug(`[${c}] sending request`, j_({
      retryOfRequestLogID: a,
      method: e.method,
      url: h,
      options: e,
      headers: r.headers
    })), e.signal?.aborted) throw new fh();
    let l = new AbortController(),
      o = await this.fetchWithTimeout(h, r, i, l).catch(YK),
      n = Date.now();
    if (o instanceof globalThis.Error) {
      let m = `retrying, ${R} attempts remaining`;
      if (e.signal?.aborted) throw new fh();
      let b = XK(o) || /timed? ?out/i.test(String(o) + ("cause" in o ? String(o.cause) : ""));
      if (R) return De(this).info(`[${c}] connection ${b ? "timed out" : "failed"} - ${m}`), De(this).debug(`[${c}] connection ${b ? "timed out" : "failed"} (${m})`, j_({
        retryOfRequestLogID: a,
        url: h,
        durationMs: n - A,
        message: o.message
      })), this.retryRequest(e, R, a ?? c);
      if (De(this).info(`[${c}] connection ${b ? "timed out" : "failed"} - error; no more retries left`), De(this).debug(`[${c}] connection ${b ? "timed out" : "failed"} (error; no more retries left)`, j_({
        retryOfRequestLogID: a,
        url: h,
        durationMs: n - A,
        message: o.message
      })), b) throw new lU();
      throw new V$({
        cause: o
      });
    }
    let p = [...o.headers.entries()].filter(([m]) => m === "x-request-id").map(([m, b]) => ", " + m + ": " + JSON.stringify(b)).join(""),
      _ = `[${c}${s}${p}] ${r.method} ${h} ${o.ok ? "succeeded" : "failed"} with status ${o.status} in ${n - A}ms`;
    if (!o.ok) {
      let m = await this.shouldRetry(o);
      if (R && m) {
        let k = `retrying, ${R} attempts remaining`;
        return await NER(o.body), De(this).info(`${_} - ${k}`), De(this).debug(`[${c}] response error (${k})`, j_({
          retryOfRequestLogID: a,
          url: o.url,
          status: o.status,
          headers: o.headers,
          durationMs: n - A
        })), this.retryRequest(e, R, a ?? c, o.headers);
      }
      let b = m ? "error; no more retries left" : "error; not retryable";
      De(this).info(`${_} - ${b}`);
      let y = await o.text().catch(k => YK(k).message),
        u = EER(y),
        P = u ? void 0 : y;
      throw De(this).debug(`[${c}] response error (${b})`, j_({
        retryOfRequestLogID: a,
        url: o.url,
        status: o.status,
        headers: o.headers,
        message: P,
        durationMs: Date.now() - A
      })), this.makeStatusError(o.status, u, P, o.headers);
    }
    return De(this).info(_), De(this).debug(`[${c}] response start`, j_({
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
    return new INT(this, a, T);
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
    if (t === void 0) {
      let i = T.maxRetries ?? this.maxRetries;
      t = this.calculateDefaultRetryTimeoutMillis(R, i);
    }
    return await $O(t), this.makeRequest(T, R - 1, a);
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
    if ("timeout" in a) dER("timeout", a.timeout);
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
    let r = S0([t, {
      Accept: "application/json",
      "User-Agent": this.getUserAgent(),
      "X-Stainless-Retry-Count": String(e),
      ...(T.timeout ? {
        "X-Stainless-Timeout": String(Math.trunc(T.timeout / 1000))
      } : {}),
      ...wER(),
      "OpenAI-Organization": this.organization,
      "OpenAI-Project": this.project
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
    let a = S0([R]);
    if (ArrayBuffer.isView(T) || T instanceof ArrayBuffer || T instanceof DataView || typeof T === "string" && a.values.has("content-type") || globalThis.Blob && T instanceof globalThis.Blob || T instanceof FormData || T instanceof URLSearchParams || globalThis.ReadableStream && T instanceof globalThis.ReadableStream) return {
      bodyHeaders: void 0,
      body: T
    };else if (typeof T === "object" && (Symbol.asyncIterator in T || Symbol.iterator in T && "next" in T && typeof T.next === "function")) return {
      bodyHeaders: void 0,
      body: oNT(T)
    };else if (typeof T === "object" && a.values.get("content-type") === "application/x-www-form-urlencoded") return {
      bodyHeaders: {
        "content-type": "application/x-www-form-urlencoded"
      },
      body: this.stringifyQuery(T)
    };else return bR(this, YL, "f").call(this, {
      body: T,
      headers: a
    });
  }
}