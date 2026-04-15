function jSR(T, R) {
  let a = {};
  if (H(T, ["excludeDomains"]) !== void 0) throw Error("excludeDomains parameter is not supported in Gemini API.");
  if (H(T, ["blockingConfidence"]) !== void 0) throw Error("blockingConfidence parameter is not supported in Gemini API.");
  let e = H(T, ["timeRangeFilter"]);
  if (e != null) Y(a, ["timeRangeFilter"], e);
  return a;
}