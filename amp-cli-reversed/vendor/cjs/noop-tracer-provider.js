// Module: noop-tracer-provider
// Original: iaR
// Type: CJS (RT wrapper)
// Exports: NoopTracerProvider
// Category: util

// Module: iaR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.NoopTracerProvider = void 0));
  var R = y$T();
  class a {
    getTracer(e, t, r) {
      return new R.NoopTracer();
    }
  }
  T.NoopTracerProvider = a;
};
