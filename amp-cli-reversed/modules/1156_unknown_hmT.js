function hWT(T) {
  if (!T) return !0;
  for (let R in T) return !1;
  return !0;
}
function iWT(T, R) {
  return Object.prototype.hasOwnProperty.call(T, R);
}
function hmT(T, R) {
  for (let a in R) {
    if (!iWT(R, a)) continue;
    let e = a.toLowerCase();
    if (!e) continue;
    let t = R[a];
    if (t === null) delete T[e];else if (t !== void 0) T[e] = t;
  }
}