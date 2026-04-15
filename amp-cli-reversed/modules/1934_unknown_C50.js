function C50(T, R) {
  if (T === R) return !0;
  if (!T || !R) return !1;
  if (T.length !== R.length) return !1;
  for (let a = 0; a < T.length; a++) if (!Object.is(T[a], R[a])) return !1;
  return !0;
}