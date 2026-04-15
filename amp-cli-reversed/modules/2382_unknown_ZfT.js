function MF(T, R) {
  if (typeof R !== "function") throw TypeError("Cannot `" + T + "` without `parser`");
}
function DF(T, R) {
  if (typeof R !== "function") throw TypeError("Cannot `" + T + "` without `compiler`");
}
function wF(T, R) {
  if (R) throw Error("Cannot call `" + T + "` on a frozen processor.\nCreate a new processor first, by calling it: use `processor()` instead of `processor`.");
}
function YfT(T) {
  if (!QY(T) || typeof T.type !== "string") throw TypeError("Expected node, got `" + T + "`");
}
function QfT(T, R, a) {
  if (!a) throw Error("`" + T + "` finished async. Use `" + R + "` instead");
}
function z4(T) {
  return pS0(T) ? T : new Jw(T);
}
function pS0(T) {
  return Boolean(T && typeof T === "object" && "message" in T && "messages" in T);
}
function _S0(T) {
  return typeof T === "string" || bS0(T);
}
function bS0(T) {
  return Boolean(T && typeof T === "object" && "byteLength" in T && "byteOffset" in T);
}
function ZfT(T, R) {
  let a = String(T);
  if (typeof R !== "string") throw TypeError("Expected character");
  let e = 0,
    t = a.indexOf(R);
  while (t !== -1) e++, t = a.indexOf(R, t + R.length);
  return e;
}