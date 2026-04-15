function SSR(T, R) {
  let a = {},
    e = H(T, ["aspectRatio"]);
  if (e != null) Y(a, ["aspectRatio"], e);
  let t = H(T, ["imageSize"]);
  if (t != null) Y(a, ["imageSize"], t);
  if (H(T, ["personGeneration"]) !== void 0) throw Error("personGeneration parameter is not supported in Gemini API.");
  if (H(T, ["outputMimeType"]) !== void 0) throw Error("outputMimeType parameter is not supported in Gemini API.");
  if (H(T, ["outputCompressionQuality"]) !== void 0) throw Error("outputCompressionQuality parameter is not supported in Gemini API.");
  return a;
}