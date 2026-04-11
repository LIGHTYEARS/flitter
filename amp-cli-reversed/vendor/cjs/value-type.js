// Module: value-type
// Original: raR
// Type: CJS (RT wrapper)
// Exports: ValueType
// Category: util

// Module: RaR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.createLogLevelDiagLogger = void 0));
  var R = rZ();
  function a(e, t) {
    if (e < R.DiagLogLevel.NONE) e = R.DiagLogLevel.NONE;
    else if (e > R.DiagLogLevel.ALL) e = R.DiagLogLevel.ALL;
    t = t || {};
    function r(h, i) {
      let c = t[h];
      if (typeof c === "function" && e >= i) return c.bind(t);
      return function () {};
    }
    return {
      error: r("error", R.DiagLogLevel.ERROR),
      warn: r("warn", R.DiagLogLevel.WARN),
      info: r("info", R.DiagLogLevel.INFO),
      debug: r("debug", R.DiagLogLevel.DEBUG),
      verbose: r("verbose", R.DiagLogLevel.VERBOSE),
    };
  }
  T.createLogLevelDiagLogger = a;
};
