function tOR(T, R, a) {
  let e = {},
    t = H(R, ["model"]);
  if (t != null) Y(e, ["_url", "name"], g8(T, t));
  let r = H(R, ["config"]);
  if (r != null) aOR(r, e);
  return e;
}
function rOR(T, R, a) {
  let e = {},
    t = H(R, ["model"]);
  if (t != null) Y(e, ["_url", "model"], g8(T, t));
  let r = H(R, ["config"]);
  if (r != null) eOR(r, e);
  return e;
}
function hOR(T, R, a) {
  let e = {},
    t = H(T, ["outputGcsUri"]);
  if (R !== void 0 && t != null) Y(R, ["parameters", "storageUri"], t);
  let r = H(T, ["safetyFilterLevel"]);
  if (R !== void 0 && r != null) Y(R, ["parameters", "safetySetting"], r);
  let h = H(T, ["personGeneration"]);
  if (R !== void 0 && h != null) Y(R, ["parameters", "personGeneration"], h);
  let i = H(T, ["includeRaiReason"]);
  if (R !== void 0 && i != null) Y(R, ["parameters", "includeRaiReason"], i);
  let c = H(T, ["outputMimeType"]);
  if (R !== void 0 && c != null) Y(R, ["parameters", "outputOptions", "mimeType"], c);
  let s = H(T, ["outputCompressionQuality"]);
  if (R !== void 0 && s != null) Y(R, ["parameters", "outputOptions", "compressionQuality"], s);
  let A = H(T, ["enhanceInputImage"]);
  if (R !== void 0 && A != null) Y(R, ["parameters", "upscaleConfig", "enhanceInputImage"], A);
  let l = H(T, ["imagePreservationFactor"]);
  if (R !== void 0 && l != null) Y(R, ["parameters", "upscaleConfig", "imagePreservationFactor"], l);
  let o = H(T, ["labels"]);
  if (R !== void 0 && o != null) Y(R, ["labels"], o);
  let n = H(T, ["numberOfImages"]);
  if (R !== void 0 && n != null) Y(R, ["parameters", "sampleCount"], n);
  let p = H(T, ["mode"]);
  if (R !== void 0 && p != null) Y(R, ["parameters", "mode"], p);
  return e;
}