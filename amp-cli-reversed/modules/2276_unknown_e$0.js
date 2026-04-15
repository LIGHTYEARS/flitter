function ni(T, R) {
  if (T.length > 0) return vh(T, T.length, 0, R), T;
  return R;
}
function WYT(T) {
  let R = {},
    a = -1;
  while (++a < T.length) e$0(R, T[a]);
  return R;
}
function e$0(T, R) {
  let a;
  for (a in R) {
    let e = (MfT.call(T, a) ? T[a] : void 0) || (T[a] = {}),
      t = R[a],
      r;
    if (t) for (r in t) {
      if (!MfT.call(e, r)) e[r] = [];
      let h = t[r];
      t$0(e[r], Array.isArray(h) ? h : h ? [h] : []);
    }
  }
}