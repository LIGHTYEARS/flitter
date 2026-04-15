function $nR() {
  return !1;
}
function VdT(T) {
  return T.trim().toLowerCase();
}
function vnR(T) {
  if (!T.endsWith("@sourcegraph.com")) return !1;
  if ($nR()) return !0;
  return YdT.has(T);
}
function XdT(T) {
  let R = VdT(T);
  if (R.length === 0) return !1;
  return R.endsWith("@sourcegraph.com") || R.endsWith("@ampcode.com") || R === "auth-bypass-user@example.com";
}
function Ns(T) {
  let R = VdT(T);
  if (R.length === 0) return !1;
  return vnR(R) || R.endsWith("@ampcode.com") || R === "auth-bypass-user@example.com";
}
function o9(T, R, a = R + "s") {
  return T === 1 ? R : a;
}
function u0T(T) {
  return Cg[T] ?? 0;
}
function jnR(T) {
  return typeof T === "number" && Number.isInteger(T) && T >= 1 && T <= 3600;
}
function SnR(T) {
  let R = T.settings["tools.inactivityTimeout"],
    a = T.settings["tools.stopTimeout"],
    e = R;
  if (e === void 0 && a !== void 0) e = a;
  if (e === void 0) e = u0T("amp.tools.inactivityTimeout");
  if (!jnR(e)) return null;
  return e * 1000;
}