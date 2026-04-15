function LWT(T) {
  if (!T || !Array.isArray(T)) return [];
  return T.filter(R => {
    if (R.compatibilityDate !== "2025-05-13") return !1;
    let a = b7R(R);
    if (a) return J.warn(`Hook "${R.id}" is invalid: ${a}`), !1;
    return !0;
  });
}