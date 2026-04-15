function hB(T, R, a, e, t, r, h) {
  if (r === R.length) {
    if (t === T.length) return 1;
    return 0.99;
  }
  let i = `${t},${r}`;
  if (h[i] !== void 0) return h[i];
  let c = e.charAt(r),
    s = a.indexOf(c, t),
    A = 0,
    l,
    o,
    n,
    p;
  while (s >= 0) {
    if (l = hB(T, R, a, e, s + 1, r + 1, h), l > A) {
      if (s === t) l *= 1;else if (zE0.test(T.charAt(s - 1))) {
        if (l *= 0.9, p = T.slice(t, s - 1).match(DZT), p && t > 0) l *= 0.999 ** p.length;
      } else if (WE0.test(T.charAt(s - 1))) {
        if (l *= 0.8, n = T.slice(t, s - 1).match(qE0), n && t > 0) l *= 0.999 ** n.length;
      } else if (l *= 0.3, t > 0) l *= 0.999 ** (s - t);
      if (T.charAt(s) !== R.charAt(r)) l *= 0.9999;
    }
    if (l < 0.1 && (a.charAt(s - 1) === e.charAt(r + 1) || e.charAt(r + 1) === e.charAt(r) && a.charAt(s - 1) !== e.charAt(r))) {
      if (o = hB(T, R, a, e, s + 1, r + 2, h), o * 0.1 > l) l = o * 0.1;
    }
    if (l > A) A = l;
    s = a.indexOf(c, s + 1);
  }
  return h[i] = A, A;
}