function TvR(T) {
  let R = {},
    a = H(T, ["aspectRatio"]);
  if (a != null) Y(R, ["aspectRatio"], a);
  let e = H(T, ["imageSize"]);
  if (e != null) Y(R, ["imageSize"], e);
  if (H(T, ["personGeneration"]) !== void 0) throw Error("personGeneration parameter is not supported in Gemini API.");
  if (H(T, ["outputMimeType"]) !== void 0) throw Error("outputMimeType parameter is not supported in Gemini API.");
  if (H(T, ["outputCompressionQuality"]) !== void 0) throw Error("outputCompressionQuality parameter is not supported in Gemini API.");
  return R;
}