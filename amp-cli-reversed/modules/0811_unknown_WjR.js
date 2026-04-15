function BjR(T, R, a) {
  let e = {},
    t = H(R, ["model"]);
  if (t != null) Y(e, ["_url", "name"], g8(T, t));
  return e;
}
function NjR(T, R, a) {
  let e = {},
    t = H(R, ["model"]);
  if (t != null) Y(e, ["_url", "name"], g8(T, t));
  return e;
}
function UjR(T, R) {
  let a = {},
    e = H(T, ["sdkHttpResponse"]);
  if (e != null) Y(a, ["sdkHttpResponse"], e);
  return a;
}
function HjR(T, R) {
  let a = {},
    e = H(T, ["sdkHttpResponse"]);
  if (e != null) Y(a, ["sdkHttpResponse"], e);
  return a;
}
function WjR(T, R, a) {
  let e = {},
    t = H(T, ["outputGcsUri"]);
  if (R !== void 0 && t != null) Y(R, ["parameters", "storageUri"], t);
  let r = H(T, ["negativePrompt"]);
  if (R !== void 0 && r != null) Y(R, ["parameters", "negativePrompt"], r);
  let h = H(T, ["numberOfImages"]);
  if (R !== void 0 && h != null) Y(R, ["parameters", "sampleCount"], h);
  let i = H(T, ["aspectRatio"]);
  if (R !== void 0 && i != null) Y(R, ["parameters", "aspectRatio"], i);
  let c = H(T, ["guidanceScale"]);
  if (R !== void 0 && c != null) Y(R, ["parameters", "guidanceScale"], c);
  let s = H(T, ["seed"]);
  if (R !== void 0 && s != null) Y(R, ["parameters", "seed"], s);
  let A = H(T, ["safetyFilterLevel"]);
  if (R !== void 0 && A != null) Y(R, ["parameters", "safetySetting"], A);
  let l = H(T, ["personGeneration"]);
  if (R !== void 0 && l != null) Y(R, ["parameters", "personGeneration"], l);
  let o = H(T, ["includeSafetyAttributes"]);
  if (R !== void 0 && o != null) Y(R, ["parameters", "includeSafetyAttributes"], o);
  let n = H(T, ["includeRaiReason"]);
  if (R !== void 0 && n != null) Y(R, ["parameters", "includeRaiReason"], n);
  let p = H(T, ["language"]);
  if (R !== void 0 && p != null) Y(R, ["parameters", "language"], p);
  let _ = H(T, ["outputMimeType"]);
  if (R !== void 0 && _ != null) Y(R, ["parameters", "outputOptions", "mimeType"], _);
  let m = H(T, ["outputCompressionQuality"]);
  if (R !== void 0 && m != null) Y(R, ["parameters", "outputOptions", "compressionQuality"], m);
  let b = H(T, ["addWatermark"]);
  if (R !== void 0 && b != null) Y(R, ["parameters", "addWatermark"], b);
  let y = H(T, ["labels"]);
  if (R !== void 0 && y != null) Y(R, ["labels"], y);
  let u = H(T, ["editMode"]);
  if (R !== void 0 && u != null) Y(R, ["parameters", "editMode"], u);
  let P = H(T, ["baseSteps"]);
  if (R !== void 0 && P != null) Y(R, ["parameters", "editConfig", "baseSteps"], P);
  return e;
}