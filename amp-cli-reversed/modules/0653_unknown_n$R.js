function n$R(T) {
  let R = {},
    a = H(T, ["sdkHttpResponse"]);
  if (a != null) Y(R, ["sdkHttpResponse"], a);
  let e = H(T, ["parent"]);
  if (e != null) Y(R, ["parent"], e);
  let t = H(T, ["documentName"]);
  if (t != null) Y(R, ["documentName"], t);
  return R;
}