function NpR(T, R, a, e) {
  if (!Cj(R, T.tool)) return !1;
  if (T.context && T.context !== e) return !1;
  if (!T.matches || Object.keys(T.matches).length === 0) return !0;
  return Object.entries(T.matches).every(([t, r]) => {
    if (r === void 0) {
      if (t.includes(".")) return C2(a, t) === void 0;
      return t in a && a[t] === void 0;
    }
    let h = t.includes(".") ? C2(a, t) : a[t];
    return r9T(h, r);
  });
}