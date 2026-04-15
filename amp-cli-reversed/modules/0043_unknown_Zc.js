function Zc(T, R, a) {
  a = {
    offset: 0,
    ...a
  };
  for (let [e, t] of R.entries()) if (a.mask) {
    if (t !== (a.mask[e] & T[e + a.offset])) return !1;
  } else if (t !== T[e + a.offset]) return !1;
  return !0;
}