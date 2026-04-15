function L$R(T, R) {
  let a = {},
    e = H(T, ["displayName"]);
  if (R !== void 0 && e != null) Y(R, ["displayName"], e);
  let t = H(T, ["dest"]);
  if (R !== void 0 && t != null) Y(R, ["outputConfig"], I$R(k$R(t)));
  return a;
}