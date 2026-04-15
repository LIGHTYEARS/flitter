function avR(T) {
  let R = {},
    a = H(T, ["response"]);
  if (a != null) Y(R, ["response"], X$R(a));
  let e = H(T, ["metadata"]);
  if (e != null) Y(R, ["metadata"], e);
  let t = H(T, ["error"]);
  if (t != null) Y(R, ["error"], t);
  return R;
}