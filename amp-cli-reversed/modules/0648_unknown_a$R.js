function a$R(T) {
  let R = {},
    a = H(T, ["name"]);
  if (a != null) Y(R, ["name"], a);
  let e = H(T, ["metadata"]);
  if (e != null) Y(R, ["metadata"], e);
  let t = H(T, ["done"]);
  if (t != null) Y(R, ["done"], t);
  let r = H(T, ["error"]);
  if (r != null) Y(R, ["error"], r);
  let h = H(T, ["response", "generateVideoResponse"]);
  if (h != null) Y(R, ["response"], t$R(h));
  return R;
}