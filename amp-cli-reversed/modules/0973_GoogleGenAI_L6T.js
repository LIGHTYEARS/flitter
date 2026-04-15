class L6T {
  get interactions() {
    if (this._interactions !== void 0) return this._interactions;
    console.warn("GoogleGenAI.interactions: Interactions usage is experimental and may change in future versions.");
    let T = this.httpOptions;
    if (T === null || T === void 0 ? void 0 : T.extraBody) console.warn("GoogleGenAI.interactions: Client level httpOptions.extraBody is not supported by the interactions client and will be ignored.");
    let R = new Ua({
      baseURL: this.apiClient.getBaseUrl(),
      apiKey: this.apiKey,
      apiVersion: this.apiClient.getApiVersion(),
      clientAdapter: this.apiClient,
      defaultHeaders: this.apiClient.getDefaultHeaders(),
      timeout: T === null || T === void 0 ? void 0 : T.timeout
    });
    return this._interactions = R.interactions, this._interactions;
  }
  constructor(T) {
    var R, a, e, t, r, h;
    if ((T.project || T.location) && T.apiKey) throw Error("Project/location and API key are mutually exclusive in the client initializer.");
    this.vertexai = (a = (R = T.vertexai) !== null && R !== void 0 ? R : VdR("GOOGLE_GENAI_USE_VERTEXAI")) !== null && a !== void 0 ? a : !1;
    let i = YdR(),
      c = Z_("GOOGLE_CLOUD_PROJECT"),
      s = Z_("GOOGLE_CLOUD_LOCATION");
    if (this.apiKey = (e = T.apiKey) !== null && e !== void 0 ? e : i, this.project = (t = T.project) !== null && t !== void 0 ? t : c, this.location = (r = T.location) !== null && r !== void 0 ? r : s, !this.vertexai && !this.apiKey) throw Error("API key must be set when using the Gemini API.");
    if (T.vertexai) {
      if ((h = T.googleAuthOptions) === null || h === void 0 ? void 0 : h.credentials) console.debug("The user provided Google Cloud credentials will take precedence over the API key from the environment variable."), this.apiKey = void 0;
      if ((c || s) && T.apiKey) console.debug("The user provided Vertex AI API key will take precedence over the project/location from the environment variables."), this.project = void 0, this.location = void 0;else if ((T.project || T.location) && i) console.debug("The user provided project/location will take precedence over the API key from the environment variables."), this.apiKey = void 0;else if ((c || s) && i) console.debug("The project/location from the environment variables will take precedence over the API key from the environment variables."), this.apiKey = void 0;
      if (!this.location && !this.apiKey) this.location = "global";
    }
    let A = JgR(T.httpOptions, T.vertexai, Z_("GOOGLE_VERTEX_BASE_URL"), Z_("GOOGLE_GEMINI_BASE_URL"));
    if (A) if (T.httpOptions) T.httpOptions.baseUrl = A;else T.httpOptions = {
      baseUrl: A
    };
    this.apiVersion = T.apiVersion, this.httpOptions = T.httpOptions;
    let l = new $6T({
      apiKey: this.apiKey,
      googleAuthOptions: T.googleAuthOptions
    });
    this.apiClient = new _6T({
      auth: l,
      project: this.project,
      location: this.location,
      apiVersion: this.apiVersion,
      apiKey: this.apiKey,
      vertexai: this.vertexai,
      httpOptions: this.httpOptions,
      userAgentExtra: PER + process.version,
      uploader: new C6T(),
      downloader: new v6T()
    }), this.models = new U6T(this.apiClient), this.live = new P6T(this.apiClient, l, new j6T()), this.batches = new D6T(this.apiClient), this.chats = new h6T(this.models, this.apiClient), this.caches = new w6T(this.apiClient), this.files = new aNT(this.apiClient), this.operations = new H6T(this.apiClient), this.authTokens = new W6T(this.apiClient), this.tunings = new Q6T(this.apiClient), this.fileSearchStores = new q6T(this.apiClient);
  }
}