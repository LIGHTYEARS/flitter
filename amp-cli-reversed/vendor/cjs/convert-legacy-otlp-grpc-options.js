// Module: convert-legacy-otlp-grpc-options
// Original: $hR
// Type: CJS (RT wrapper)
// Exports: convertLegacyOtlpGrpcOptions
// Category: util

// Module: $hR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.convertLegacyOtlpGrpcOptions = void 0));
  var R = n0(),
    a = IhR(),
    e = zB(),
    t = ghR();
  function r(h, i) {
    if (h.headers) R.diag.warn("Headers cannot be set when using grpc");
    let c = h.credentials;
    return (0, a.mergeOtlpGrpcConfigurationWithDefaults)(
      {
        url: h.url,
        metadata: () => {
          return h.metadata ?? (0, e.createEmptyMetadata)();
        },
        compression: h.compression,
        timeoutMillis: h.timeoutMillis,
        concurrencyLimit: h.concurrencyLimit,
        credentials: c != null ? () => c : void 0,
        userAgent: h.userAgent,
      },
      (0, t.getOtlpGrpcConfigurationFromEnv)(i),
      (0, a.getOtlpGrpcDefaultConfiguration)(),
    );
  }
  T.convertLegacyOtlpGrpcOptions = r;
};
