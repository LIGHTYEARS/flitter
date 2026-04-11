// Module: resolving-load-balancer
// Original: HrR
// Type: CJS (RT wrapper)
// Exports: ResolvingLoadBalancer
// Category: util

// Module: hrR (CJS)
(T, R) => {
  R.exports = a;
  function a(e, t, r) {
    var h = r || 8192,
      i = h >>> 1,
      c = null,
      s = h;
    return function (A) {
      if (A < 1 || A > i) return e(A);
      if (s + A > h) ((c = e(h)), (s = 0));
      var l = t.call(c, s, (s += A));
      if (s & 7) s = (s | 7) + 1;
      return l;
    };
  }
};
