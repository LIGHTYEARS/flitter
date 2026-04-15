function aET(T) {
  return T && typeof T.subscribe === "function" && typeof T[Symbol.observable] === "function";
}
function eET(T) {
  if (aET(T)) return T;
  return AR.of(T);
}
function f2(T, R) {
  if (T === R) return !0;
  if (T == null || R == null || typeof T !== "object" || typeof R !== "object") return !1;
  let a = Array.isArray(T),
    e = Array.isArray(R);
  if (a !== e) return !1;
  if (a && e) return T.length === R.length && T.every((r, h) => f2(r, R[h]));
  let t = new Set([...Object.keys(T), ...Object.keys(R)]);
  for (let r of t) if (!f2(T[r], R[r])) return !1;
  return !0;
}