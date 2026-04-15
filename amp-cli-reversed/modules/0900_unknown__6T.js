function vOR(T) {
  let R = {},
    a = H(T, ["sdkHttpResponse"]);
  if (a != null) Y(R, ["sdkHttpResponse"], a);
  return R;
}
class _6T {
  constructor(T) {
    var R, a, e;
    if (this.clientOptions = Object.assign({}, T), this.customBaseUrl = (R = T.httpOptions) === null || R === void 0 ? void 0 : R.baseUrl, this.clientOptions.vertexai) {
      if (this.clientOptions.project && this.clientOptions.location) this.clientOptions.apiKey = void 0;else if (this.clientOptions.apiKey) this.clientOptions.project = void 0, this.clientOptions.location = void 0;
    }
    let t = {};
    if (this.clientOptions.vertexai) {
      if (!this.clientOptions.location && !this.clientOptions.apiKey && !this.customBaseUrl) this.clientOptions.location = "global";
      if (!(this.clientOptions.project && this.clientOptions.location || this.clientOptions.apiKey) && !this.customBaseUrl) throw Error("Authentication is not set up. Please provide either a project and location, or an API key, or a custom base URL.");
      let r = T.project && T.location || !!T.apiKey;
      if (this.customBaseUrl && !r) t.baseUrl = this.customBaseUrl, this.clientOptions.project = void 0, this.clientOptions.location = void 0;else if (this.clientOptions.apiKey || this.clientOptions.location === "global") t.baseUrl = "https://aiplatform.googleapis.com/";else if (this.clientOptions.project && this.clientOptions.location) t.baseUrl = `https://${this.clientOptions.location}-aiplatform.googleapis.com/`;
      t.apiVersion = (a = this.clientOptions.apiVersion) !== null && a !== void 0 ? a : eER;
    } else {
      if (!this.clientOptions.apiKey) throw new u7({
        message: "API key must be set when using the Gemini API.",
        status: 403
      });
      t.apiVersion = (e = this.clientOptions.apiVersion) !== null && e !== void 0 ? e : tER, t.baseUrl = "https://generativelanguage.googleapis.com/";
    }
    if (t.headers = this.getDefaultHeaders(), this.clientOptions.httpOptions = t, T.httpOptions) this.clientOptions.httpOptions = this.patchHttpOptions(t, T.httpOptions);
  }
  isVertexAI() {
    var T;
    return (T = this.clientOptions.vertexai) !== null && T !== void 0 ? T : !1;
  }
  getProject() {
    return this.clientOptions.project;
  }
  getLocation() {
    return this.clientOptions.location;
  }
  getCustomBaseUrl() {
    return this.customBaseUrl;
  }
  async getAuthHeaders() {
    let T = new Headers();
    return await this.clientOptions.auth.addAuthHeaders(T), T;
  }
  getApiVersion() {
    if (this.clientOptions.httpOptions && this.clientOptions.httpOptions.apiVersion !== void 0) return this.clientOptions.httpOptions.apiVersion;
    throw Error("API version is not set.");
  }
  getBaseUrl() {
    if (this.clientOptions.httpOptions && this.clientOptions.httpOptions.baseUrl !== void 0) return this.clientOptions.httpOptions.baseUrl;
    throw Error("Base URL is not set.");
  }
  getRequestUrl() {
    return this.getRequestUrlInternal(this.clientOptions.httpOptions);
  }
  getHeaders() {
    if (this.clientOptions.httpOptions && this.clientOptions.httpOptions.headers !== void 0) return this.clientOptions.httpOptions.headers;else throw Error("Headers are not set.");
  }
  getRequestUrlInternal(T) {
    if (!T || T.baseUrl === void 0 || T.apiVersion === void 0) throw Error("HTTP options are not correctly set.");
    let R = [T.baseUrl.endsWith("/") ? T.baseUrl.slice(0, -1) : T.baseUrl];
    if (T.apiVersion && T.apiVersion !== "") R.push(T.apiVersion);
    return R.join("/");
  }
  getBaseResourcePath() {
    return `projects/${this.clientOptions.project}/locations/${this.clientOptions.location}`;
  }
  getApiKey() {
    return this.clientOptions.apiKey;
  }
  getWebsocketBaseUrl() {
    let T = this.getBaseUrl(),
      R = new URL(T);
    return R.protocol = R.protocol == "http:" ? "ws" : "wss", R.toString();
  }
  setBaseUrl(T) {
    if (this.clientOptions.httpOptions) this.clientOptions.httpOptions.baseUrl = T;else throw Error("HTTP options are not correctly set.");
  }
  constructUrl(T, R, a) {
    let e = [this.getRequestUrlInternal(R)];
    if (a) e.push(this.getBaseResourcePath());
    if (T !== "") e.push(T);
    return new URL(`${e.join("/")}`);
  }
  shouldPrependVertexProjectPath(T, R) {
    if (R.baseUrl && R.baseUrlResourceScope === UK.COLLECTION) return !1;
    if (this.clientOptions.apiKey) return !1;
    if (!this.clientOptions.vertexai) return !1;
    if (T.path.startsWith("projects/")) return !1;
    if (T.httpMethod === "GET" && T.path.startsWith("publishers/google/models")) return !1;
    return !0;
  }
  async request(T) {
    let R = this.clientOptions.httpOptions;
    if (T.httpOptions) R = this.patchHttpOptions(this.clientOptions.httpOptions, T.httpOptions);
    let a = this.shouldPrependVertexProjectPath(T, R),
      e = this.constructUrl(T.path, R, a);
    if (T.queryParams) for (let [r, h] of Object.entries(T.queryParams)) e.searchParams.append(r, String(h));
    let t = {};
    if (T.httpMethod === "GET") {
      if (T.body && T.body !== "{}") throw Error("Request body should be empty for GET request, but got non empty request body");
    } else t.body = T.body;
    return t = await this.includeExtraHttpOptionsToRequestInit(t, R, e.toString(), T.abortSignal), this.unaryApiCall(e, t, T.httpMethod);
  }
  patchHttpOptions(T, R) {
    let a = JSON.parse(JSON.stringify(T));
    for (let [e, t] of Object.entries(R)) if (typeof t === "object") a[e] = Object.assign(Object.assign({}, a[e]), t);else if (t !== void 0) a[e] = t;
    return a;
  }
  async requestStream(T) {
    let R = this.clientOptions.httpOptions;
    if (T.httpOptions) R = this.patchHttpOptions(this.clientOptions.httpOptions, T.httpOptions);
    let a = this.shouldPrependVertexProjectPath(T, R),
      e = this.constructUrl(T.path, R, a);
    if (!e.searchParams.has("alt") || e.searchParams.get("alt") !== "sse") e.searchParams.set("alt", "sse");
    let t = {};
    return t.body = T.body, t = await this.includeExtraHttpOptionsToRequestInit(t, R, e.toString(), T.abortSignal), this.streamApiCall(e, t, T.httpMethod);
  }
  async includeExtraHttpOptionsToRequestInit(T, R, a, e) {
    if (R && R.timeout || e) {
      let t = new AbortController(),
        r = t.signal;
      if (R.timeout && (R === null || R === void 0 ? void 0 : R.timeout) > 0) {
        let h = setTimeout(() => t.abort(), R.timeout);
        if (h && typeof h.unref === "function") h.unref();
      }
      if (e) e.addEventListener("abort", () => {
        t.abort();
      });
      T.signal = r;
    }
    if (R && R.extraBody !== null) jOR(T, R.extraBody);
    return T.headers = await this.getHeadersInternal(R, a), T;
  }
  async unaryApiCall(T, R, a) {
    return this.apiCall(T.toString(), Object.assign(Object.assign({}, R), {
      method: a
    })).then(async e => {
      return await QAT(e), new fk(e);
    }).catch(e => {
      if (e instanceof Error) throw e;else throw Error(JSON.stringify(e));
    });
  }
  async streamApiCall(T, R, a) {
    return this.apiCall(T.toString(), Object.assign(Object.assign({}, R), {
      method: a
    })).then(async e => {
      return await QAT(e), this.processStreamResponse(e);
    }).catch(e => {
      if (e instanceof Error) throw e;else throw Error(JSON.stringify(e));
    });
  }
  processStreamResponse(T) {
    return ac(this, arguments, function* () {
      var R;
      let a = (R = T === null || T === void 0 ? void 0 : T.body) === null || R === void 0 ? void 0 : R.getReader(),
        e = new TextDecoder("utf-8");
      if (!a) throw Error("Response body is empty");
      try {
        let t = "",
          r = "data:",
          h = [`

`, "\r\r", `\r
\r
`];
        while (!0) {
          let {
            done: i,
            value: c
          } = yield S9(a.read());
          if (i) {
            if (t.trim().length > 0) throw Error("Incomplete JSON segment at the end");
            break;
          }
          let s = e.decode(c, {
            stream: !0
          });
          try {
            let o = JSON.parse(s);
            if ("error" in o) {
              let n = JSON.parse(JSON.stringify(o.error)),
                p = n.status,
                _ = n.code,
                m = `got status: ${p}. ${JSON.stringify(o)}`;
              if (_ >= 400 && _ < 600) throw new u7({
                message: m,
                status: _
              });
            }
          } catch (o) {
            if (o.name === "ApiError") throw o;
          }
          t += s;
          let A = -1,
            l = 0;
          while (!0) {
            A = -1, l = 0;
            for (let p of h) {
              let _ = t.indexOf(p);
              if (_ !== -1 && (A === -1 || _ < A)) A = _, l = p.length;
            }
            if (A === -1) break;
            let o = t.substring(0, A);
            t = t.substring(A + l);
            let n = o.trim();
            if (n.startsWith(r)) {
              let p = n.substring(r.length).trim();
              try {
                let _ = new Response(p, {
                  headers: T === null || T === void 0 ? void 0 : T.headers,
                  status: T === null || T === void 0 ? void 0 : T.status,
                  statusText: T === null || T === void 0 ? void 0 : T.statusText
                });
                yield yield S9(new fk(_));
              } catch (_) {
                throw Error(`exception parsing stream chunk ${p}. ${_}`);
              }
            }
          }
        }
      } finally {
        a.releaseLock();
      }
    });
  }
  async apiCall(T, R) {
    return fetch(T, R).catch(a => {
      throw Error(`exception ${a} sending request`);
    });
  }
  getDefaultHeaders() {
    let T = {},
      R = B6T + " " + this.clientOptions.userAgentExtra;
    return T[RER] = R, T[HK] = R, T[JdR] = "application/json", T;
  }
  async getHeadersInternal(T, R) {
    let a = new Headers();
    if (T && T.headers) {
      for (let [e, t] of Object.entries(T.headers)) a.append(e, t);
      if (T.timeout && T.timeout > 0) a.append(TER, String(Math.ceil(T.timeout / 1000)));
    }
    return await this.clientOptions.auth.addAuthHeaders(a, R), a;
  }
  getFileName(T) {
    var R;
    let a = "";
    if (typeof T === "string") a = T.replace(/[/\\]+$/, ""), a = (R = a.split(/[/\\]/).pop()) !== null && R !== void 0 ? R : "";
    return a;
  }
  async uploadFile(T, R) {
    var a;
    let e = {};
    if (R != null) e.mimeType = R.mimeType, e.name = R.name, e.displayName = R.displayName;
    if (e.name && !e.name.startsWith("files/")) e.name = `files/${e.name}`;
    let t = this.clientOptions.uploader,
      r = await t.stat(T);
    e.sizeBytes = String(r.size);
    let h = (a = R === null || R === void 0 ? void 0 : R.mimeType) !== null && a !== void 0 ? a : r.type;
    if (h === void 0 || h === "") throw Error("Can not determine mimeType. Please provide mimeType in the config.");
    e.mimeType = h;
    let i = {
        file: e
      },
      c = this.getFileName(T),
      s = b0("upload/v1beta/files", i._url),
      A = await this.fetchUploadUrl(s, e.sizeBytes, e.mimeType, c, i, R === null || R === void 0 ? void 0 : R.httpOptions);
    return t.upload(T, A, this);
  }
  async uploadFileToFileSearchStore(T, R, a) {
    var e;
    let t = this.clientOptions.uploader,
      r = await t.stat(R),
      h = String(r.size),
      i = (e = a === null || a === void 0 ? void 0 : a.mimeType) !== null && e !== void 0 ? e : r.type;
    if (i === void 0 || i === "") throw Error("Can not determine mimeType. Please provide mimeType in the config.");
    let c = `upload/v1beta/${T}:uploadToFileSearchStore`,
      s = this.getFileName(R),
      A = {};
    if (a != null) p6T(a, A);
    let l = await this.fetchUploadUrl(c, h, i, s, A, a === null || a === void 0 ? void 0 : a.httpOptions);
    return t.uploadToFileSearchStore(R, l, this);
  }
  async downloadFile(T) {
    await this.clientOptions.downloader.download(T, this);
  }
  async fetchUploadUrl(T, R, a, e, t, r) {
    var h;
    let i = {};
    if (r) i = r;else i = {
      apiVersion: "",
      headers: Object.assign({
        "Content-Type": "application/json",
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": `${R}`,
        "X-Goog-Upload-Header-Content-Type": `${a}`
      }, e ? {
        "X-Goog-Upload-File-Name": e
      } : {})
    };
    let c = await this.request({
      path: T,
      body: JSON.stringify(t),
      httpMethod: "POST",
      httpOptions: i
    });
    if (!c || !(c === null || c === void 0 ? void 0 : c.headers)) throw Error("Server did not return an HttpResponse or the returned HttpResponse did not have headers.");
    let s = (h = c === null || c === void 0 ? void 0 : c.headers) === null || h === void 0 ? void 0 : h["x-goog-upload-url"];
    if (s === void 0) throw Error("Failed to get upload url. Server did not return the x-google-upload-url in the headers");
    return s;
  }
}