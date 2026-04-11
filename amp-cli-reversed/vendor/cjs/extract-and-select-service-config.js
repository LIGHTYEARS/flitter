// Module: extract-and-select-service-config
// Original: AvT
// Type: CJS (RT wrapper)
// Exports: extractAndSelectServiceConfig, validateRetryThrottling, validateServiceConfig
// Category: util

// Module: avT (CJS)
(T, R) => {
  R.exports = a;
  function a(e, t) {
    var r = Array(arguments.length - 1),
      h = 0,
      i = 2,
      c = !0;
    while (i < arguments.length) r[h++] = arguments[i++];
    return new Promise(function (s, A) {
      r[h] = function (l) {
        if (c)
          if (((c = !1), l)) A(l);
          else {
            var o = Array(arguments.length - 1),
              n = 0;
            while (n < o.length) o[n++] = arguments[n];
            s.apply(null, o);
          }
      };
      try {
        e.apply(t || null, r);
      } catch (l) {
        if (c) ((c = !1), A(l));
      }
    });
  }
};
