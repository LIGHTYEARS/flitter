class $6T {
  constructor(T) {
    if (T.apiKey !== void 0) {
      this.apiKey = T.apiKey;
      return;
    }
    let R = fdR(T.googleAuthOptions);
    this.googleAuth = new M6T.GoogleAuth(R);
  }
  async addAuthHeaders(T, R) {
    if (this.apiKey !== void 0) {
      if (this.apiKey.startsWith("auth_tokens/")) throw Error("Ephemeral tokens are only supported by the live API.");
      this.addKeyHeader(T);
      return;
    }
    return this.addGoogleAuthHeaders(T, R);
  }
  addKeyHeader(T) {
    if (T.get(h_T) !== null) return;
    if (this.apiKey === void 0) throw Error("Trying to set API key header but apiKey is not set");
    T.append(h_T, this.apiKey);
  }
  async addGoogleAuthHeaders(T, R) {
    if (this.googleAuth === void 0) throw Error("Trying to set google-auth headers but googleAuth is unset");
    let a = await this.googleAuth.getRequestHeaders(R);
    for (let [e, t] of a) {
      if (T.get(e) !== null) continue;
      T.append(e, t);
    }
  }
}