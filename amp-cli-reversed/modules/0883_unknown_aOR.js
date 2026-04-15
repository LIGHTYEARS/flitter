function aOR(T, R, a) {
  let e = {},
    t = H(T, ["displayName"]);
  if (R !== void 0 && t != null) Y(R, ["displayName"], t);
  let r = H(T, ["description"]);
  if (R !== void 0 && r != null) Y(R, ["description"], r);
  let h = H(T, ["defaultCheckpointId"]);
  if (R !== void 0 && h != null) Y(R, ["defaultCheckpointId"], h);
  return e;
}