function gSR(T, R, a) {
  let e = {},
    t = H(R, ["model"]);
  if (t != null) Y(e, ["_url", "name"], g8(T, t));
  return e;
}
function $SR(T, R, a) {
  let e = {},
    t = H(R, ["model"]);
  if (t != null) Y(e, ["_url", "name"], g8(T, t));
  return e;
}
function vSR(T, R) {
  let a = {};
  if (H(T, ["authConfig"]) !== void 0) throw Error("authConfig parameter is not supported in Gemini API.");
  let e = H(T, ["enableWidget"]);
  if (e != null) Y(a, ["enableWidget"], e);
  return a;
}