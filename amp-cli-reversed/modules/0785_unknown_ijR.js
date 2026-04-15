function ijR(T) {
  let R = {};
  if (H(T, ["authConfig"]) !== void 0) throw Error("authConfig parameter is not supported in Gemini API.");
  let a = H(T, ["enableWidget"]);
  if (a != null) Y(R, ["enableWidget"], a);
  return R;
}