function O50(T) {
  return T?.status === "error" && T.error !== null && typeof T.error === "object" && "message" in T.error;
}
function d50(T) {
  return T?.status === "done" && typeof T.result === "object";
}
function E50(T) {
  return T?.status === "error" && typeof T.error === "object" && "message" in T.error;
}
function KgT(T, R) {
  if (T === R) return !0;
  let a = Object.entries(T),
    e = Object.entries(R);
  if (a.length !== e.length) return !1;
  for (let [t, r] of a) {
    if (!Object.hasOwn(R, t)) return !1;
    if (!Object.is(r, R[t])) return !1;
  }
  return !0;
}