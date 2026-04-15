function _Q(T, R) {
  var a,
    e,
    t,
    r,
    h,
    i,
    c,
    s = 0,
    A = 0,
    l = 0,
    o = T.constructor,
    n = o.rounding,
    p = o.precision;
  if (!T.d || !T.d[0] || T.e > 17) return new o(T.d ? !T.d[0] ? 1 : T.s < 0 ? 0 : 1 / 0 : T.s ? T.s < 0 ? 0 : T : NaN);
  if (R == null) g9 = !1, c = p;else c = R;
  i = new o(0.03125);
  while (T.e > -2) T = T.times(i), l += 5;
  e = Math.log(Ka(2, l)) / Math.LN10 * 2 + 5 | 0, c += e, a = r = h = new o(1), o.precision = c;
  for (;;) {
    if (r = Q0(r.times(T), c, 1), a = a.times(++A), i = h.plus(c3(r, a, c, 1)), We(i.d).slice(0, c) === We(h.d).slice(0, c)) {
      t = l;
      while (t--) h = Q0(h.times(h), c, 1);
      if (R == null) {
        if (s < 3 && IS(h.d, c - e, n, s)) o.precision = c += 10, a = r = i = new o(1), A = 0, s++;else return Q0(h, o.precision = p, n, g9 = !0);
      } else return o.precision = p, h;
    }
    h = i;
  }
}