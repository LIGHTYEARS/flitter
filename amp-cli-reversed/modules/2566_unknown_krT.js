function krT(T, R, a, e) {
  var t,
    r,
    h,
    i,
    c,
    s,
    A,
    l,
    o,
    n = T.constructor,
    p = a !== void 0;
  if (p) {
    if (wr(a, 1, up), e === void 0) e = n.rounding;else wr(e, 0, 8);
  } else a = n.precision, e = n.rounding;
  if (!T.isFinite()) A = nJT(T);else {
    if (A = zs(T), h = A.indexOf("."), p) {
      if (t = 2, R == 16) a = a * 4 - 3;else if (R == 8) a = a * 3 - 2;
    } else t = R;
    if (h >= 0) A = A.replace(".", ""), o = new n(1), o.e = A.length - h, o.d = KM(zs(o), 10, t), o.e = o.d.length;
    l = KM(A, 10, t), r = c = l.length;
    for (; l[--c] == 0;) l.pop();
    if (!l[0]) A = p ? "0p+0" : "0";else {
      if (h < 0) r--;else T = new n(T), T.d = l, T.e = r, T = c3(T, o, a, e, 0, t), l = T.d, r = T.e, s = eJT;
      if (h = l[a], i = t / 2, s = s || l[a + 1] !== void 0, s = e < 4 ? (h !== void 0 || s) && (e === 0 || e === (T.s < 0 ? 3 : 2)) : h > i || h === i && (e === 4 || s || e === 6 && l[a - 1] & 1 || e === (T.s < 0 ? 8 : 7)), l.length = a, s) {
        for (; ++l[--a] > t - 1;) if (l[a] = 0, !a) ++r, l.unshift(1);
      }
      for (c = l.length; !l[c - 1]; --c);
      for (h = 0, A = ""; h < c; h++) A += lQ.charAt(l[h]);
      if (p) {
        if (c > 1) if (R == 16 || R == 8) {
          h = R == 16 ? 4 : 3;
          for (--c; c % h; c++) A += "0";
          l = KM(A, t, R);
          for (c = l.length; !l[c - 1]; --c);
          for (h = 1, A = "1."; h < c; h++) A += lQ.charAt(l[h]);
        } else A = A.charAt(0) + "." + A.slice(1);
        A = A + (r < 0 ? "p" : "p+") + r;
      } else if (r < 0) {
        for (; ++r;) A = "0" + A;
        A = "0." + A;
      } else if (++r > c) for (r -= c; r--;) A += "0";else if (r < c) A = A.slice(0, r) + "." + A.slice(r);
    }
    A = (R == 16 ? "0x" : R == 2 ? "0b" : R == 8 ? "0o" : "") + A;
  }
  return T.s < 0 ? "-" + A : A;
}