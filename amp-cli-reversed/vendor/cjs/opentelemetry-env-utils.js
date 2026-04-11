// Module: opentelemetry-env-utils
// Original: TeR
// Type: CJS (RT wrapper)
// Exports: getBooleanFromEnv, getNumberFromEnv, getStringFromEnv, getStringListFromEnv
// Category: npm-pkg

// Module: TeR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.getStringListFromEnv =
      T.getBooleanFromEnv =
      T.getStringFromEnv =
      T.getNumberFromEnv =
        void 0));
  var R = n0(),
    a = qT("util");
  function e(i) {
    let c = process.env[i];
    if (c == null || c.trim() === "") return;
    let s = Number(c);
    if (isNaN(s)) {
      R.diag.warn(
        `Unknown value ${(0, a.inspect)(c)} for ${i}, expected a number, using defaults`,
      );
      return;
    }
    return s;
  }
  T.getNumberFromEnv = e;
  function t(i) {
    let c = process.env[i];
    if (c == null || c.trim() === "") return;
    return c;
  }
  T.getStringFromEnv = t;
  function r(i) {
    let c = process.env[i]?.trim().toLowerCase();
    if (c == null || c === "") return !1;
    if (c === "true") return !0;
    else if (c === "false") return !1;
    else
      return (
        R.diag.warn(
          `Unknown value ${(0, a.inspect)(c)} for ${i}, expected 'true' or 'false', falling back to 'false' (default)`,
        ),
        !1
      );
  }
  T.getBooleanFromEnv = r;
  function h(i) {
    return t(i)
      ?.split(",")
      .map((c) => c.trim())
      .filter((c) => c !== "");
  }
  T.getStringListFromEnv = h;
};
