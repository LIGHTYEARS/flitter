function SvR(T) {
  let R = {};
  if (H(T, ["excludeDomains"]) !== void 0) throw Error("excludeDomains parameter is not supported in Gemini API.");
  if (H(T, ["blockingConfidence"]) !== void 0) throw Error("blockingConfidence parameter is not supported in Gemini API.");
  let a = H(T, ["timeRangeFilter"]);
  if (a != null) Y(R, ["timeRangeFilter"], a);
  return R;
}