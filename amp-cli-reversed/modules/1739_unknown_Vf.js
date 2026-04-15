function Vf(T, R) {
  for (let a of R) {
    if (a === "") continue;
    if (a.length === 1) {
      if (a === "*") return !0;
      if (a === T) return !0;
      continue;
    }
    if (T === a) return !0;
    if (a.includes("*") || a.includes("?") || a.includes("[") || a.includes("{")) try {
      if (g9T.default(a, {
        dot: !0
      })(T)) return !0;
    } catch (e) {}
  }
  return !1;
}