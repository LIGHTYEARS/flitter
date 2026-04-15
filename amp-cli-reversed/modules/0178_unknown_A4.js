function n4() {
  return !0;
}
function Ty(T, R) {
  if (T === R) return !1;
  return T.length !== R.length || T.some((a, e) => R[e] !== a);
}
function l4(T, R) {
  if (T === R) return !1;
  if (T.size !== R.size) return !0;
  for (let a of T) if (!R.has(a)) return !0;
  return !1;
}
function A4(T, R) {
  if (T === R) return !1;
  if (T.size !== R.size) return !0;
  for (let [a, e] of T) {
    let t = R.get(a);
    if (t !== e || t === void 0 && !R.has(a)) return !0;
  }
  return !1;
}