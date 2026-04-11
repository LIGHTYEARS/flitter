// Module: create-otlp-network-export-delegate
// Original: RrR
// Type: CJS (RT wrapper)
// Exports: createOtlpNetworkExportDelegate
// Category: util

// Module: RrR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.createOtlpNetworkExportDelegate = void 0));
  var R = TvT(),
    a = RvT();
  function e(t, r, h) {
    return (0, a.createOtlpExportDelegate)(
      {
        transport: h,
        serializer: r,
        promiseHandler: (0, R.createBoundedQueueExportPromiseHandler)(t),
      },
      { timeout: t.timeoutMillis },
    );
  }
  T.createOtlpNetworkExportDelegate = e;
};
