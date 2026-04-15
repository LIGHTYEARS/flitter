function hA(T, R) {
  var a,
    e,
    t,
    r,
    h,
    i,
    c,
    s,
    A,
    l,
    o,
    n = 1,
    p = 10,
    _ = T,
    m = _.d,
    b = _.constructor,
    y = b.rounding,
    u = b.precision;
  if (_.s < 0 || !m || !m[0] || !_.e && m[0] == 1 && m.length == 1) return new b(m && !m[0] ? -1 / 0 : _.s != 1 ? NaN : m ? 0 : _);
  if (R == null) g9 = !1, A = u;else A = R;
  if (b.precision = A += p, a = We(m), e = a.charAt(0), Math.abs(r = _.e) < 1500000000000000) {
    while (e < 7 && e != 1 || e == 1 && a.charAt(1) > 3) _ = _.times(T), a = We(_.d), e = a.charAt(0), n++;
    if (r = _.e, e > 1) _ = new b("0." + a), r++;else _ = new b(e + "." + a.slice(1));
  } else return s = nB(b, A + 2, u).times(r + ""), _ = hA(new b(e + "." + a.slice(1)), A - p).plus(s), b.precision = u, R == null ? Q0(_, u, y, g9 = !0) : _;
  l = _, c = h = _ = c3(_.minus(1), _.plus(1), A, 1), o = Q0(_.times(_), A, 1), t = 3;
  for (;;) {
    if (h = Q0(h.times(o), A, 1), s = c.plus(c3(h, new b(t), A, 1)), We(s.d).slice(0, A) === We(c.d).slice(0, A)) {
      if (c = c.times(2), r !== 0) c = c.plus(nB(b, A + 2, u).times(r + ""));
      if (c = c3(c, new b(n), A, 1), R == null) {
        if (IS(c.d, A - p, y, i)) b.precision = A += p, s = h = _ = c3(l.minus(1), l.plus(1), A, 1), o = Q0(_.times(_), A, 1), t = i = 1;else return Q0(c, b.precision = u, y, g9 = !0);
      } else return b.precision = u, c;
    }
    c = s, t += 2;
  }
}