function FjR(T, R, a) {
  let e = {},
    t = H(T, ["taskType"]);
  if (R !== void 0 && t != null) Y(R, ["requests[]", "taskType"], t);
  let r = H(T, ["title"]);
  if (R !== void 0 && r != null) Y(R, ["requests[]", "title"], r);
  let h = H(T, ["outputDimensionality"]);
  if (R !== void 0 && h != null) Y(R, ["requests[]", "outputDimensionality"], h);
  if (H(T, ["mimeType"]) !== void 0) throw Error("mimeType parameter is not supported in Gemini API.");
  if (H(T, ["autoTruncate"]) !== void 0) throw Error("autoTruncate parameter is not supported in Gemini API.");
  return e;
}