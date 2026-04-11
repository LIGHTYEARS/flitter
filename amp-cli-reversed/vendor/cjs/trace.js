// Module: trace
// Original: IaR
// Type: CJS (RT wrapper)
// Exports: trace
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
