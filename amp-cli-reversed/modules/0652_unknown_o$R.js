function h$R(T) {
  let R = {},
    a = H(T, ["video"]);
  if (a != null) Y(R, ["video"], A$R(a));
  return R;
}
function i$R(T) {
  let R = {},
    a = H(T, ["_self"]);
  if (a != null) Y(R, ["video"], p$R(a));
  return R;
}
function c$R(T) {
  let R = {},
    a = H(T, ["operationName"]);
  if (a != null) Y(R, ["_url", "operationName"], a);
  return R;
}
function s$R(T) {
  let R = {},
    a = H(T, ["operationName"]);
  if (a != null) Y(R, ["_url", "operationName"], a);
  return R;
}
function o$R(T) {
  let R = {},
    a = H(T, ["name"]);
  if (a != null) Y(R, ["name"], a);
  let e = H(T, ["metadata"]);
  if (e != null) Y(R, ["metadata"], e);
  let t = H(T, ["done"]);
  if (t != null) Y(R, ["done"], t);
  let r = H(T, ["error"]);
  if (r != null) Y(R, ["error"], r);
  let h = H(T, ["response"]);
  if (h != null) Y(R, ["response"], n$R(h));
  return R;
}