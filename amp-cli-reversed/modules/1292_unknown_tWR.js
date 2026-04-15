function aWR(T) {
  if (T === void 0) return TWR;
  return Math.max(0, Math.min(T, RWR));
}
function eWR(T, R) {
  let a = UU.relative(T, R);
  return a.length > 0 && a !== ".." && !a.startsWith(`..${UU.sep}`);
}
function tWR(T, R) {
  let a = T.split(`
`).map(e => e.trim()).filter(Boolean);
  if (a.length === 0) return !1;
  for (let e of a) {
    let t = /^(?:rg: )?(.+): No such file or directory \(os error 2\)$/.exec(e);
    if (!t) return !1;
    let r = t[1];
    if (!r || !eWR(R, r)) return !1;
  }
  return !0;
}