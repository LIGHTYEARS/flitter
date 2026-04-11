// Module: get-http-configuration-defaults
// Original: $rR
// Type: CJS (RT wrapper)
// Exports: getHttpConfigurationDefaults, mergeOtlpHttpConfigurationWithDefaults
// Category: util

// Module: $rR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.getHttpConfigurationDefaults = T.mergeOtlpHttpConfigurationWithDefaults =
      void 0));
  var R = UB(),
    a = grR();
  function e(i, c, s) {
    return async () => {
      let A = { ...(await s()) },
        l = {};
      if (c != null) Object.assign(l, await c());
      if (i != null)
        Object.assign(l, (0, a.validateAndNormalizeHeaders)(await i()));
      return Object.assign(l, A);
    };
  }
  function t(i) {
    if (i == null) return;
    try {
      let c = globalThis.location?.href;
      return new URL(i, c).href;
    } catch {
      throw Error(
        `Configuration: Could not parse user-provided export URL: '${i}'`,
      );
    }
  }
  function r(i, c, s) {
    return {
      ...(0, R.mergeOtlpSharedConfigurationWithDefaults)(i, c, s),
      headers: e(i.headers, c.headers, s.headers),
      url: t(i.url) ?? c.url ?? s.url,
    };
  }
  T.mergeOtlpHttpConfigurationWithDefaults = r;
  function h(i, c) {
    return {
      ...(0, R.getSharedConfigurationDefaults)(),
      headers: async () => i,
      url: "http://localhost:4318/" + c,
    };
  }
  T.getHttpConfigurationDefaults = h;
};
