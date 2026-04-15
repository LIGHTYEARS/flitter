function XOR(T) {
  let R = {},
    a = H(T, ["handle"]);
  if (a != null) Y(R, ["handle"], a);
  if (H(T, ["transparent"]) !== void 0) throw Error("transparent parameter is not supported in Gemini API.");
  return R;
}