function Tx(T, R, a, e, t) {
  var r,
    h,
    i,
    c,
    s = 1,
    A = T.precision,
    l = Math.ceil(A / s9);
  g9 = !1, c = a.times(a), i = new T(e);
  for (;;) {
    if (h = c3(i.times(c), new T(R++ * R++), A, 1), i = t ? e.plus(h) : e.minus(h), e = c3(h.times(c), new T(R++ * R++), A, 1), h = i.plus(e), h.d[l] !== void 0) {
      for (r = l; h.d[r] === i.d[r] && r--;);
      if (r == -1) break;
    }
    r = i, i = e, e = h, h = r, s++;
  }
  return g9 = !0, h.d.length = l + 1, h;
}