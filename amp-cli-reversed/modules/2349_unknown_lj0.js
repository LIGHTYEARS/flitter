function nj0(T, R, a) {
  return a.options.emphasis || "*";
}
function lj0(T) {
  let R = [],
    a = -1;
  while (++a < T.length) R[a] = qH(T[a]);
  return zH(e);
  function e(...t) {
    let r = -1;
    while (++r < R.length) if (R[r].apply(this, t)) return !0;
    return !1;
  }
}