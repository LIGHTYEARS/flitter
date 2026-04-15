function Y$R(T, R) {
  let a = {},
    e = H(R, ["name"]);
  if (e != null) Y(a, ["_url", "name"], wx(T, e));
  return a;
}
function Q$R(T, R) {
  let a = {},
    e = H(R, ["name"]);
  if (e != null) Y(a, ["_url", "name"], wx(T, e));
  return a;
}
function Z$R(T) {
  let R = {};
  if (H(T, ["authConfig"]) !== void 0) throw Error("authConfig parameter is not supported in Gemini API.");
  let a = H(T, ["enableWidget"]);
  if (a != null) Y(R, ["enableWidget"], a);
  return R;
}