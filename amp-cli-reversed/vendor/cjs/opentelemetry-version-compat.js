// Module: opentelemetry-version-compat
// Original: J3R
// Type: CJS (RT wrapper)
// Exports: _makeCompatibilityCheck, isCompatible
// Category: npm-pkg

// Module: J3R (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.isCompatible = T._makeCompatibilityCheck = void 0));
  var R = A$T(),
    a = /^(\d+)\.(\d+)\.(\d+)(-(.+))?$/;
  function e(t) {
    let r = new Set([t]),
      h = new Set(),
      i = t.match(a);
    if (!i) return () => !1;
    let c = { major: +i[1], minor: +i[2], patch: +i[3], prerelease: i[4] };
    if (c.prerelease != null)
      return function (l) {
        return l === t;
      };
    function s(l) {
      return (h.add(l), !1);
    }
    function A(l) {
      return (r.add(l), !0);
    }
    return function (l) {
      if (r.has(l)) return !0;
      if (h.has(l)) return !1;
      let o = l.match(a);
      if (!o) return s(l);
      let n = { major: +o[1], minor: +o[2], patch: +o[3], prerelease: o[4] };
      if (n.prerelease != null) return s(l);
      if (c.major !== n.major) return s(l);
      if (c.major === 0) {
        if (c.minor === n.minor && c.patch <= n.patch) return A(l);
        return s(l);
      }
      if (c.minor <= n.minor) return A(l);
      return s(l);
    };
  }
  ((T._makeCompatibilityCheck = e), (T.isCompatible = e(R.VERSION)));
};
