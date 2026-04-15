function C$R(T, R) {
  let a = {},
    e = H(T, ["displayName"]);
  if (R !== void 0 && e != null) Y(R, ["batch", "displayName"], e);
  if (H(T, ["dest"]) !== void 0) throw Error("dest parameter is not supported in Gemini API.");
  return a;
}