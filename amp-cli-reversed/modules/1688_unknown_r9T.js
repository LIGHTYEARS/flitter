function r9T(T, R) {
  if (typeof R === "string") {
    if (typeof T !== "string") return !1;
    return zpR(T, R);
  }
  if (Array.isArray(R)) return R.some(a => {
    if (typeof a === "string") return typeof T === "string" && L2(T, a);
    return T === a;
  });
  if (typeof R === "object" && R !== null) return qpR(T, R);
  return T === R;
}