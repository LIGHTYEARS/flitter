// Module: get-otlp-grpc-configuration-from-env
// Original: ghR
// Type: CJS (RT wrapper)
// Exports: getOtlpGrpcConfigurationFromEnv
// Category: util

// Module: ghR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.getOtlpGrpcConfigurationFromEnv = void 0));
  var R = $9(),
    a = zB(),
    e = UA(),
    t = qT("fs"),
    r = qT("path"),
    h = n0();
  function i(u, P) {
    if (u != null && u !== "") return u;
    if (P != null && P !== "") return P;
    return;
  }
  function c(u) {
    let P = process.env[`OTEL_EXPORTER_OTLP_${u}_HEADERS`]?.trim(),
      k = process.env.OTEL_EXPORTER_OTLP_HEADERS?.trim(),
      x = (0, R.parseKeyPairsIntoRecord)(P),
      f = (0, R.parseKeyPairsIntoRecord)(k);
    if (Object.keys(x).length === 0 && Object.keys(f).length === 0) return;
    let v = Object.assign({}, f, x),
      g = (0, a.createEmptyMetadata)();
    for (let [I, S] of Object.entries(v)) g.set(I, S);
    return g;
  }
  function s(u) {
    let P = c(u);
    if (P == null) return;
    return () => P;
  }
  function A(u) {
    let P = process.env[`OTEL_EXPORTER_OTLP_${u}_ENDPOINT`]?.trim(),
      k = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();
    return i(P, k);
  }
  function l(u) {
    let P = process.env[`OTEL_EXPORTER_OTLP_${u}_INSECURE`]
        ?.toLowerCase()
        .trim(),
      k = process.env.OTEL_EXPORTER_OTLP_INSECURE?.toLowerCase().trim();
    return i(P, k) === "true";
  }
  function o(u, P, k) {
    let x = process.env[u]?.trim(),
      f = process.env[P]?.trim(),
      v = i(x, f);
    if (v != null)
      try {
        return t.readFileSync(r.resolve(process.cwd(), v));
      } catch {
        h.diag.warn(k);
        return;
      }
    else return;
  }
  function n(u) {
    return o(
      `OTEL_EXPORTER_OTLP_${u}_CLIENT_CERTIFICATE`,
      "OTEL_EXPORTER_OTLP_CLIENT_CERTIFICATE",
      "Failed to read client certificate chain file",
    );
  }
  function p(u) {
    return o(
      `OTEL_EXPORTER_OTLP_${u}_CLIENT_KEY`,
      "OTEL_EXPORTER_OTLP_CLIENT_KEY",
      "Failed to read client certificate private key file",
    );
  }
  function _(u) {
    return o(
      `OTEL_EXPORTER_OTLP_${u}_CERTIFICATE`,
      "OTEL_EXPORTER_OTLP_CERTIFICATE",
      "Failed to read root certificate file",
    );
  }
  function m(u) {
    let P = p(u),
      k = n(u),
      x = _(u),
      f = P != null && k != null;
    if (x != null && !f)
      return (
        h.diag.warn(
          "Client key and certificate must both be provided, but one was missing - attempting to create credentials from just the root certificate",
        ),
        (0, a.createSslCredentials)(_(u))
      );
    return (0, a.createSslCredentials)(x, P, k);
  }
  function b(u) {
    if (l(u)) return (0, a.createInsecureCredentials)();
    return m(u);
  }
  function y(u) {
    return {
      ...(0, e.getSharedConfigurationFromEnvironment)(u),
      metadata: s(u),
      url: A(u),
      credentials: (P) => {
        if (P.startsWith("http://"))
          return () => {
            return (0, a.createInsecureCredentials)();
          };
        else if (P.startsWith("https://"))
          return () => {
            return m(u);
          };
        return () => {
          return b(u);
        };
      },
    };
  }
  T.getOtlpGrpcConfigurationFromEnv = y;
};
