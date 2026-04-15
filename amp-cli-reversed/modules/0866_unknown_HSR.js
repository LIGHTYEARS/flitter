function USR(T, R) {
  let a = {},
    e = H(T, ["productImage"]);
  if (e != null) Y(a, ["image"], Cc(e));
  return a;
}
function HSR(T, R, a) {
  let e = {},
    t = H(T, ["numberOfImages"]);
  if (R !== void 0 && t != null) Y(R, ["parameters", "sampleCount"], t);
  let r = H(T, ["baseSteps"]);
  if (R !== void 0 && r != null) Y(R, ["parameters", "baseSteps"], r);
  let h = H(T, ["outputGcsUri"]);
  if (R !== void 0 && h != null) Y(R, ["parameters", "storageUri"], h);
  let i = H(T, ["seed"]);
  if (R !== void 0 && i != null) Y(R, ["parameters", "seed"], i);
  let c = H(T, ["safetyFilterLevel"]);
  if (R !== void 0 && c != null) Y(R, ["parameters", "safetySetting"], c);
  let s = H(T, ["personGeneration"]);
  if (R !== void 0 && s != null) Y(R, ["parameters", "personGeneration"], s);
  let A = H(T, ["addWatermark"]);
  if (R !== void 0 && A != null) Y(R, ["parameters", "addWatermark"], A);
  let l = H(T, ["outputMimeType"]);
  if (R !== void 0 && l != null) Y(R, ["parameters", "outputOptions", "mimeType"], l);
  let o = H(T, ["outputCompressionQuality"]);
  if (R !== void 0 && o != null) Y(R, ["parameters", "outputOptions", "compressionQuality"], o);
  let n = H(T, ["enhancePrompt"]);
  if (R !== void 0 && n != null) Y(R, ["parameters", "enhancePrompt"], n);
  let p = H(T, ["labels"]);
  if (R !== void 0 && p != null) Y(R, ["labels"], p);
  return e;
}