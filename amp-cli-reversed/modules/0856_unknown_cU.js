function cU(T, R) {
  let a = {};
  if (H(T, ["gcsUri"]) !== void 0) throw Error("gcsUri parameter is not supported in Gemini API.");
  let e = H(T, ["imageBytes"]);
  if (e != null) Y(a, ["bytesBase64Encoded"], hp(e));
  let t = H(T, ["mimeType"]);
  if (t != null) Y(a, ["mimeType"], t);
  return a;
}