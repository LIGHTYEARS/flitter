function $vR(T, R) {
  let a = {},
    e = H(R, ["name"]);
  if (e != null) Y(a, ["_url", "name"], Cn(T, e));
  return a;
}
function vvR(T, R) {
  let a = {},
    e = H(R, ["name"]);
  if (e != null) Y(a, ["_url", "name"], Cn(T, e));
  return a;
}
function jvR(T) {
  let R = {};
  if (H(T, ["authConfig"]) !== void 0) throw Error("authConfig parameter is not supported in Gemini API.");
  let a = H(T, ["enableWidget"]);
  if (a != null) Y(R, ["enableWidget"], a);
  return R;
}