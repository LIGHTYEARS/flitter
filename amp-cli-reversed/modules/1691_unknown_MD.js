function MD(T, R) {
  if (T === R) return !0;
  if (T == null || R == null || typeof T !== "object" || typeof R !== "object") return !1;
  let a = Array.isArray(T),
    e = Array.isArray(R);
  if (a !== e) return !1;
  if (a && e) return T.length === R.length && T.every((r, h) => MD(r, R[h]));
  let t = new Set([...Object.keys(T), ...Object.keys(R)]);
  for (let r of t) if (!MD(T[r], R[r])) return !1;
  return !0;
}