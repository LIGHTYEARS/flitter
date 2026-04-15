function xO0(T, R, a) {
  let e, t, r;
  return h;
  function h(s) {
    if (s === 46 || s === 95) return T.check(gQT, c, i)(s);
    if (s === null || o3(s) || Qb(s) || s !== 45 && HH(s)) return c(s);
    return r = !0, T.consume(s), h;
  }
  function i(s) {
    if (s === 95) e = !0;else t = e, e = void 0;
    return T.consume(s), h;
  }
  function c(s) {
    if (t || e || !r) return a(s);
    return R(s);
  }
}