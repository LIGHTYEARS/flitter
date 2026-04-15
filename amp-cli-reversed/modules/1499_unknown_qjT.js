function JJ(T) {
  if (T === "") return !0;
  if (T.length % 4 !== 0) return !1;
  try {
    return atob(T), !0;
  } catch {
    return !1;
  }
}
function WjT(T) {
  if (!YB.test(T)) return !1;
  let R = T.replace(/[-_]/g, e => e === "-" ? "+" : "/"),
    a = R.padEnd(Math.ceil(R.length / 4) * 4, "=");
  return JJ(a);
}
function qjT(T, R = null) {
  try {
    let a = T.split(".");
    if (a.length !== 3) return !1;
    let [e] = a;
    if (!e) return !1;
    let t = JSON.parse(atob(e));
    if ("typ" in t && t?.typ !== "JWT") return !1;
    if (!t.alg) return !1;
    if (R && (!("alg" in t) || t.alg !== R)) return !1;
    return !0;
  } catch {
    return !1;
  }
}