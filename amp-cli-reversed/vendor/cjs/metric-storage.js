// Module: metric-storage
// Original: F$T
// Type: CJS (RT wrapper)
// Exports: MetricStorage
// Category: util

// Module: f$T (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.NOOP_LOGGER_PROVIDER = T.NoopLoggerProvider = void 0));
  var R = oZ();
  class a {
    getLogger(e, t, r) {
      return new R.NoopLogger();
    }
  }
  ((T.NoopLoggerProvider = a), (T.NOOP_LOGGER_PROVIDER = new a()));
};
