// Module: duration-to-ms
// Original: LvT
// Type: CJS (RT wrapper)
// Exports: durationToMs, isDuration, msToDuration, parseDuration
// Category: util

// Module: lvT (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.CIPHER_SUITES = void 0),
    (T.getDefaultRootsData = t));
  var R = qT("fs");
  T.CIPHER_SUITES = process.env.GRPC_SSL_CIPHER_SUITES;
  var a = process.env.GRPC_DEFAULT_SSL_ROOTS_FILE_PATH,
    e = null;
  function t() {
    if (a) {
      if (e === null) e = R.readFileSync(a);
      return e;
    }
    return null;
  }
};
