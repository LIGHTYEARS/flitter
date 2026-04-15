function q$R(T, R) {
  let a = {},
    e = H(T, ["taskType"]);
  if (R !== void 0 && e != null) Y(R, ["requests[]", "taskType"], e);
  let t = H(T, ["title"]);
  if (R !== void 0 && t != null) Y(R, ["requests[]", "title"], t);
  let r = H(T, ["outputDimensionality"]);
  if (R !== void 0 && r != null) Y(R, ["requests[]", "outputDimensionality"], r);
  if (H(T, ["mimeType"]) !== void 0) throw Error("mimeType parameter is not supported in Gemini API.");
  if (H(T, ["autoTruncate"]) !== void 0) throw Error("autoTruncate parameter is not supported in Gemini API.");
  return a;
}