function cw(T) {
  return T.filter(R => !R.startsWith("-"))[0];
}
function sw(T) {
  let R = T.filter(a => !a.startsWith("-"));
  if (R.length <= 1) return;
  return R[R.length - 1];
}
function nM(T) {
  let R = T.filter(a => !a.startsWith("-"));
  if (R.length === 0) return ".";
  return R[R.length - 1];
}
function vzR(T) {
  let R = T[0];
  if (!R || R.startsWith("-")) return ".";
  return R;
}
function jzR(T) {
  if (T.length !== 2) return;
  let [R, a] = T;
  if (!R || !a) return;
  let e = vA(R.program),
    t = vA(a.program);
  if (!e || !t) return;
  if (!mzT.has(e) || !AzT.has(t)) return;
  let r = qb(R),
    h = qb(a);
  if (!r || !h) return;
  if (yzT(e, r)) return {
    kind: "command",
    program: e,
    isWriteLike: !0
  };
  let i = cw(r);
  if (!i) return {
    kind: "command",
    program: e,
    isWriteLike: !1
  };
  return {
    kind: "search",
    program: e,
    query: i,
    path: sw(r),
    isWriteLike: !1
  };
}