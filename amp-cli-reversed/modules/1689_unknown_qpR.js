function qpR(T, R) {
  if (Object.keys(R).length === 0) return typeof T === "object" && T !== null;
  if (typeof T !== "object" || T === null) return !1;
  for (let [a, e] of Object.entries(R)) {
    let t = C2(T, a);
    if (!r9T(t, e)) return !1;
  }
  return !0;
}