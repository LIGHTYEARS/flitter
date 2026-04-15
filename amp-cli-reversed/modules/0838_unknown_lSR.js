function lSR(T, R) {
  let a = {},
    e = H(T, ["name"]);
  if (e != null) Y(a, ["name"], e);
  let t = H(T, ["metadata"]);
  if (t != null) Y(a, ["metadata"], t);
  let r = H(T, ["done"]);
  if (r != null) Y(a, ["done"], r);
  let h = H(T, ["error"]);
  if (h != null) Y(a, ["error"], h);
  let i = H(T, ["response", "generateVideoResponse"]);
  if (i != null) Y(a, ["response"], bSR(i));
  return a;
}