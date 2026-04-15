function H$R(T) {
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