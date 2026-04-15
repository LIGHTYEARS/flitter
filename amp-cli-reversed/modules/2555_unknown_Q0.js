function Q0(T, R, a, e) {
  var t,
    r,
    h,
    i,
    c,
    s,
    A,
    l,
    o,
    n = T.constructor;
  T: if (R != null) {
    if (l = T.d, !l) return T;
    for (t = 1, i = l[0]; i >= 10; i /= 10) t++;
    if (r = R - t, r < 0) r += s9, h = R, A = l[o = 0], c = A / Ka(10, t - h - 1) % 10 | 0;else if (o = Math.ceil((r + 1) / s9), i = l.length, o >= i) {
      if (e) {
        for (; i++ <= o;) l.push(0);
        A = c = 0, t = 1, r %= s9, h = r - s9 + 1;
      } else break T;
    } else {
      A = i = l[o];
      for (t = 1; i >= 10; i /= 10) t++;
      r %= s9, h = r - s9 + t, c = h < 0 ? 0 : A / Ka(10, t - h - 1) % 10 | 0;
    }
    if (e = e || R < 0 || l[o + 1] !== void 0 || (h < 0 ? A : A % Ka(10, t - h - 1)), s = a < 4 ? (c || e) && (a == 0 || a == (T.s < 0 ? 3 : 2)) : c > 5 || c == 5 && (a == 4 || e || a == 6 && (r > 0 ? h > 0 ? A / Ka(10, t - h) : 0 : l[o - 1]) % 10 & 1 || a == (T.s < 0 ? 8 : 7)), R < 1 || !l[0]) {
      if (l.length = 0, s) R -= T.e + 1, l[0] = Ka(10, (s9 - R % s9) % s9), T.e = -R || 0;else l[0] = T.e = 0;
      return T;
    }
    if (r == 0) l.length = o, i = 1, o--;else l.length = o + 1, i = Ka(10, s9 - r), l[o] = h > 0 ? (A / Ka(10, t - h) % Ka(10, h) | 0) * i : 0;
    if (s) for (;;) if (o == 0) {
      for (r = 1, h = l[0]; h >= 10; h /= 10) r++;
      h = l[0] += i;
      for (i = 1; h >= 10; h /= 10) i++;
      if (r != i) {
        if (T.e++, l[0] == bc) l[0] = 1;
      }
      break;
    } else {
      if (l[o] += i, l[o] != bc) break;
      l[o--] = 0, i = 1;
    }
    for (r = l.length; l[--r] === 0;) l.pop();
  }
  if (g9) {
    if (T.e > n.maxE) T.d = null, T.e = NaN;else if (T.e < n.minE) T.e = 0, T.d = [0];
  }
  return T;
}