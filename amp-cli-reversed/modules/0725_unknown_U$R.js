function B$R(T, R) {
  let a = {},
    e = H(R, ["name"]);
  if (e != null) Y(a, ["_url", "name"], wx(T, e));
  return a;
}
function N$R(T, R) {
  let a = {},
    e = H(R, ["name"]);
  if (e != null) Y(a, ["_url", "name"], wx(T, e));
  return a;
}
function U$R(T) {
  let R = {},
    a = H(T, ["sdkHttpResponse"]);
  if (a != null) Y(R, ["sdkHttpResponse"], a);
  let e = H(T, ["name"]);
  if (e != null) Y(R, ["name"], e);
  let t = H(T, ["done"]);
  if (t != null) Y(R, ["done"], t);
  let r = H(T, ["error"]);
  if (r != null) Y(R, ["error"], r);
  return R;
}