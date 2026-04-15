function zdR(T, R) {
  let a = {},
    e = H(T, ["sdkHttpResponse"]);
  if (e != null) Y(a, ["sdkHttpResponse"], e);
  let t = H(T, ["name"]);
  if (t != null) Y(a, ["name"], t);
  let r = H(T, ["metadata"]);
  if (r != null) Y(a, ["metadata"], r);
  let h = H(T, ["done"]);
  if (h != null) Y(a, ["done"], h);
  let i = H(T, ["error"]);
  if (i != null) Y(a, ["error"], i);
  return a;
}