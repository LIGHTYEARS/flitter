class rWT {
  constructor({
    baseURL: T,
    baseURLOverridden: R,
    maxRetries: a = 2,
    timeout: e = 60000,
    httpAgent: t,
    fetch: r
  }) {
    hM.set(this, void 0), this.baseURL = T, cWT(this, hM, R, "f"), this.maxRetries = J5("maxRetries", a), this.timeout = J5("timeout", e), this.httpAgent = t, this.fetch = r ?? DUT;
  }
  authHeaders(T) {
    return {};
  }
  defaultHeaders(T) {
    return {
      Accept: "application/json",
      ...(["head", "get"].includes(T.method) ? {} : {
        "Content-Type": "application/json"
      }),
      "User-Agent": this.getUserAgent(),
      ...PDR(),
      ...this.authHeaders(T)
    };
  }
  validateHeaders(T, R) {}
  defaultIdempotencyKey() {
    return `stainless-node-retry-${IDR()}`;
  }
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
    return this.request(Promise.resolve(a).then(async e => {
      let t = e && OU(e?.body) ? new DataView(await e.body.arrayBuffer()) : e?.body instanceof DataView ? e.body : e?.body instanceof ArrayBuffer ? new DataView(e.body) : e && ArrayBuffer.isView(e?.body) ? new DataView(e.body.buffer) : e?.body;
      return {
        method: T,
        path: R,
        ...e,
        body: t
      };
    }));
  }
  getAPIList(T, R, a) {
    return this.requestAPIList(R, {
      method: "get",
      path: T,
      ...a
    });
  }
  calculateContentLength(T) {
    if (typeof T === "string") {
      if (typeof Buffer < "u") return Buffer.byteLength(T, "utf8").toString();
      if (typeof TextEncoder < "u") return new TextEncoder().encode(T).length.toString();
    } else if (ArrayBuffer.isView(T)) return T.byteLength.toString();
    return null;
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
        defaultBaseURL: h,
        headers: i = {}
      } = a,
      c = ArrayBuffer.isView(a.body) || a.__binaryRequest && typeof a.body === "string" ? a.body : tmT(a.body) ? a.body.body : a.body ? JSON.stringify(a.body, null, 2) : null,
      s = this.calculateContentLength(c),
      A = this.buildURL(t, r, h);
    if ("timeout" in a) J5("timeout", a.timeout);
    a.timeout = a.timeout ?? this.timeout;
    let l = a.httpAgent ?? this.httpAgent ?? BUT(A),
      o = a.timeout + 1000;
    if (typeof l?.options?.timeout === "number" && o > (l.options.timeout ?? 0)) l.options.timeout = o;
    if (this.idempotencyHeader && e !== "get") {
      if (!T.idempotencyKey) T.idempotencyKey = this.defaultIdempotencyKey();
      i[this.idempotencyHeader] = T.idempotencyKey;
    }
    let n = this.buildHeaders({
      options: a,
      headers: i,
      contentLength: s,
      retryCount: R
    });
    return {
      req: {
        method: e,
        ...(c && {
          body: c
        }),
        headers: n,
        ...(l && {
          agent: l
        }),
        signal: a.signal ?? null
      },
      url: A,
      timeout: a.timeout
    };
  }
  buildHeaders({
    options: T,
    headers: R,
    contentLength: a,
    retryCount: e
  }) {
    let t = {};
    if (a) t["content-length"] = a;
    let r = this.defaultHeaders(T);
    if (hmT(t, r), hmT(t, R), tmT(T.body) && tv !== "node") delete t["content-type"];
    if (QC(r, "x-stainless-retry-count") === void 0 && QC(R, "x-stainless-retry-count") === void 0) t["x-stainless-retry-count"] = String(e);
    if (QC(r, "x-stainless-timeout") === void 0 && QC(R, "x-stainless-timeout") === void 0 && T.timeout) t["x-stainless-timeout"] = String(Math.trunc(T.timeout / 1000));
    return this.validateHeaders(t, R), t;
  }
  async prepareOptions(T) {}
  async prepareRequest(T, {
    url: R,
    options: a
  }) {}
  parseHeaders(T) {
    return !T ? {} : Symbol.iterator in T ? Object.fromEntries(Array.from(T).map(R => [...R])) : {
      ...T
    };
  }
  makeStatusError(T, R, a, e) {
    return vt.generate(T, R, a, e);
  }
  request(T, R = null) {
    return new PX(this.makeRequest(T, R));
  }
  async makeRequest(T, R) {
    let a = await T,
      e = a.maxRetries ?? this.maxRetries;
    if (R == null) R = e;
    await this.prepareOptions(a);
    let {
      req: t,
      url: r,
      timeout: h
    } = await this.buildRequest(a, {
      retryCount: e - R
    });
    if (await this.prepareRequest(t, {
      url: r,
      options: a
    }), Pb("request", r, a, t.headers), a.signal?.aborted) throw new J7();
    let i = new AbortController(),
      c = await this.fetchWithTimeout(r, t, h, i).catch(kX);
    if (c instanceof Error) {
      if (a.signal?.aborted) throw new J7();
      if (R) return this.retryRequest(a, R);
      if (c.name === "AbortError") throw new V3T();
      throw new sv({
        cause: c
      });
    }
    let s = uDR(c.headers);
    if (!c.ok) {
      if (R && this.shouldRetry(c)) {
        let n = `retrying, ${R} attempts remaining`;
        return Pb(`response (error; ${n})`, c.status, r, s), this.retryRequest(a, R, s);
      }
      let A = await c.text().catch(n => kX(n).message),
        l = kDR(A),
        o = l ? void 0 : A;
      throw Pb(`response (error; ${R ? "(error; no more retries left)" : "(error; not retryable)"})`, c.status, r, s, o), this.makeStatusError(c.status, l, o, s);
    }
    return {
      response: c,
      options: a,
      controller: i
    };
  }
  requestAPIList(T, R) {
    let a = this.makeRequest(R, null);
    return new oWT(this, a, T);
  }
  buildURL(T, R, a) {
    let e = !sWT(this, hM, "f") && a || this.baseURL,
      t = xDR(T) ? new URL(T) : new URL(e + (e.endsWith("/") && T.startsWith("/") ? T.slice(1) : T)),
      r = this.defaultQuery();
    if (!hWT(r)) R = {
      ...r,
      ...R
    };
    if (typeof R === "object" && R && !Array.isArray(R)) t.search = this.stringifyQuery(R);
    return t.toString();
  }
  stringifyQuery(T) {
    return Object.entries(T).filter(([R, a]) => typeof a < "u").map(([R, a]) => {
      if (typeof a === "string" || typeof a === "number" || typeof a === "boolean") return `${encodeURIComponent(R)}=${encodeURIComponent(a)}`;
      if (a === null) return `${encodeURIComponent(R)}=`;
      throw new yi(`Cannot stringify type ${typeof a}; Expected string, number, boolean, or null. If you need to pass nested query parameters, you can manually encode them, e.g. { query: { 'foo[key1]': value1, 'foo[key2]': value2 } }, and please open a GitHub issue requesting better support for your use case.`);
    }).join("&");
  }
  async fetchWithTimeout(T, R, a, e) {
    let {
      signal: t,
      ...r
    } = R || {};
    if (t) t.addEventListener("abort", () => e.abort());
    let h = setTimeout(() => e.abort(), a),
      i = {
        signal: e.signal,
        ...r
      };
    if (i.method) i.method = i.method.toUpperCase();
    return this.fetch.call(void 0, T, i).finally(() => {
      clearTimeout(h);
    });
  }
  shouldRetry(T) {
    let R = T.headers.get("x-should-retry");
    if (R === "true") return !0;
    if (R === "false") return !1;
    if (T.status === 408) return !0;
    if (T.status === 409) return !0;
    if (T.status === 429) return !0;
    if (T.status >= 500) return !0;
    return !1;
  }
  async retryRequest(T, R, a) {
    let e,
      t = a?.["retry-after-ms"];
    if (t) {
      let h = parseFloat(t);
      if (!Number.isNaN(h)) e = h;
    }
    let r = a?.["retry-after"];
    if (r && !e) {
      let h = parseFloat(r);
      if (!Number.isNaN(h)) e = h * 1000;else e = Date.parse(r) - Date.now();
    }
    if (!(e && 0 <= e && e < 60000)) {
      let h = T.maxRetries ?? this.maxRetries;
      e = this.calculateDefaultRetryTimeoutMillis(R, h);
    }
    return await fDR(e), this.makeRequest(T, R - 1);
  }
  calculateDefaultRetryTimeoutMillis(T, R) {
    let a = R - T,
      e = Math.min(0.5 * Math.pow(2, a), 8),
      t = 1 - Math.random() * 0.25;
    return e * t * 1000;
  }
  getUserAgent() {
    return `${this.constructor.name}/JS ${Oy}`;
  }
}