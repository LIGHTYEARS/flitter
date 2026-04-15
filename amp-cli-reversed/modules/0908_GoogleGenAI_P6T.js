class P6T {
  constructor(T, R, a) {
    this.apiClient = T, this.auth = R, this.webSocketFactory = a, this.music = new u6T(this.apiClient, this.auth, this.webSocketFactory);
  }
  async connect(T) {
    var R, a, e, t, r, h;
    if (T.config && T.config.httpOptions) throw Error("The Live module does not support httpOptions at request-level in LiveConnectConfig yet. Please use the client-level httpOptions configuration instead.");
    let i = this.apiClient.getWebsocketBaseUrl(),
      c = this.apiClient.getApiVersion(),
      s,
      A = this.apiClient.getHeaders();
    if (T.config && T.config.tools && b6T(T.config.tools)) m6T(A);
    let l = DOR(A);
    if (this.apiClient.isVertexAI()) {
      let v = this.apiClient.getProject(),
        g = this.apiClient.getLocation(),
        I = this.apiClient.getApiKey(),
        S = !!v && !!g || !!I;
      if (this.apiClient.getCustomBaseUrl() && !S) s = i;else s = `${i}/ws/google.cloud.aiplatform.${c}.LlmBidiService/BidiGenerateContent`, await this.auth.addAuthHeaders(l, s);
    } else {
      let v = this.apiClient.getApiKey(),
        g = "BidiGenerateContent",
        I = "key";
      if (v === null || v === void 0 ? void 0 : v.startsWith("auth_tokens/")) {
        if (console.warn("Warning: Ephemeral token support is experimental and may change in future versions."), c !== "v1alpha") console.warn("Warning: The SDK's ephemeral token support is in v1alpha only. Please use const ai = new GoogleGenAI({apiKey: token.name, httpOptions: { apiVersion: 'v1alpha' }}); before session connection.");
        g = "BidiGenerateContentConstrained", I = "access_token";
      }
      s = `${i}/ws/google.ai.generativelanguage.${c}.GenerativeService.${g}?${I}=${v}`;
    }
    let o = () => {},
      n = new Promise(v => {
        o = v;
      }),
      p = T.callbacks,
      _ = function () {
        var v;
        (v = p === null || p === void 0 ? void 0 : p.onopen) === null || v === void 0 || v.call(p), o({});
      },
      m = this.apiClient,
      b = {
        onopen: _,
        onmessage: v => {
          LOR(m, p.onmessage, v);
        },
        onerror: (R = p === null || p === void 0 ? void 0 : p.onerror) !== null && R !== void 0 ? R : function (v) {},
        onclose: (a = p === null || p === void 0 ? void 0 : p.onclose) !== null && a !== void 0 ? a : function (v) {}
      },
      y = this.webSocketFactory.create(s, MOR(l), b);
    y.connect(), await n;
    let u = g8(this.apiClient, T.model);
    if (this.apiClient.isVertexAI() && u.startsWith("publishers/")) {
      let v = this.apiClient.getProject(),
        g = this.apiClient.getLocation();
      if (v && g) u = `projects/${v}/locations/${g}/` + u;
    }
    let P = {};
    if (this.apiClient.isVertexAI() && ((e = T.config) === null || e === void 0 ? void 0 : e.responseModalities) === void 0) if (T.config === void 0) T.config = {
      responseModalities: [m7.AUDIO]
    };else T.config.responseModalities = [m7.AUDIO];
    if ((t = T.config) === null || t === void 0 ? void 0 : t.generationConfig) console.warn("Setting `LiveConnectConfig.generation_config` is deprecated, please set the fields on `LiveConnectConfig` directly. This will become an error in a future version (not before Q3 2025).");
    let k = (h = (r = T.config) === null || r === void 0 ? void 0 : r.tools) !== null && h !== void 0 ? h : [],
      x = [];
    for (let v of k) if (this.isCallableTool(v)) {
      let g = v;
      x.push(await g.tool());
    } else x.push(v);
    if (x.length > 0) T.config.tools = x;
    let f = {
      model: u,
      config: T.config,
      callbacks: T.callbacks
    };
    if (this.apiClient.isVertexAI()) P = ljR(this.apiClient, f);else P = njR(this.apiClient, f);
    return delete P.config, y.send(JSON.stringify(P)), new k6T(y, this.apiClient);
  }
  isCallableTool(T) {
    return "callTool" in T && typeof T.callTool === "function";
  }
}