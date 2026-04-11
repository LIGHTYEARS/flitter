// Module: diag-log-level-from-string
// Original: veR
// Type: CJS (RT wrapper)
// Exports: diagLogLevelFromString
// Category: util

// Module: veR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.diagLogLevelFromString = void 0));
  var R = n0(),
    a = {
      ALL: R.DiagLogLevel.ALL,
      VERBOSE: R.DiagLogLevel.VERBOSE,
      DEBUG: R.DiagLogLevel.DEBUG,
      INFO: R.DiagLogLevel.INFO,
      WARN: R.DiagLogLevel.WARN,
      ERROR: R.DiagLogLevel.ERROR,
      NONE: R.DiagLogLevel.NONE,
    };
  function e(t) {
    if (t == null) return;
    let r = a[t.toUpperCase()];
    if (r == null)
      return (
        R.diag.warn(
          `Unknown log level "${t}", expected one of ${Object.keys(a)}, using default`,
        ),
        R.DiagLogLevel.INFO
      );
    return r;
  }
  T.diagLogLevelFromString = e;
};
