// Module: server-credentials
// Original: HZ
// Type: CJS (RT wrapper)
// Exports: ServerCredentials, createCertificateProviderServerCredentials, createServerCredentialsWithInterceptors
// Category: util

// Module: hZ (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.INVALID_SPAN_CONTEXT = T.INVALID_TRACEID = T.INVALID_SPANID = void 0));
  var R = m$T();
  ((T.INVALID_SPANID = "0000000000000000"),
    (T.INVALID_TRACEID = "00000000000000000000000000000000"),
    (T.INVALID_SPAN_CONTEXT = {
      traceId: T.INVALID_TRACEID,
      spanId: T.INVALID_SPANID,
      traceFlags: R.TraceFlags.NONE,
    }));
};
