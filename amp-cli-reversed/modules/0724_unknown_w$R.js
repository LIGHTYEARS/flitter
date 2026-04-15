function D$R(T, R) {
  let a = {},
    e = H(T, ["displayName"]);
  if (R !== void 0 && e != null) Y(R, ["batch", "displayName"], e);
  return a;
}
function w$R(T, R) {
  let a = {},
    e = H(R, ["model"]);
  if (e != null) Y(a, ["_url", "model"], g8(T, e));
  let t = H(R, ["src"]);
  if (t != null) Y(a, ["batch", "inputConfig"], z$R(T, t));
  let r = H(R, ["config"]);
  if (r != null) D$R(r, a);
  return a;
}