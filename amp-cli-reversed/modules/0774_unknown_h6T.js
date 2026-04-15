class h6T {
  constructor(T, R) {
    this.modelsModule = T, this.apiClient = R;
  }
  create(T) {
    return new i6T(this.apiClient, this.modelsModule, T.model, T.config, structuredClone(T.history));
  }
}