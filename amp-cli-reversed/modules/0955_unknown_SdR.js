function gdR(T, R) {
  let a = {},
    e = H(T, ["name"]);
  if (e != null) Y(a, ["_url", "name"], e);
  return a;
}
function $dR(T, R) {
  let a = {},
    e = H(T, ["name"]);
  if (e != null) Y(a, ["_url", "name"], e);
  return a;
}
function vdR(T, R) {
  let a = {},
    e = H(T, ["sdkHttpResponse"]);
  if (e != null) Y(a, ["sdkHttpResponse"], e);
  return a;
}
function jdR(T, R) {
  let a = {},
    e = H(T, ["sdkHttpResponse"]);
  if (e != null) Y(a, ["sdkHttpResponse"], e);
  return a;
}
function SdR(T, R, a) {
  let e = {};
  if (H(T, ["validationDataset"]) !== void 0) throw Error("validationDataset parameter is not supported in Gemini API.");
  let t = H(T, ["tunedModelDisplayName"]);
  if (R !== void 0 && t != null) Y(R, ["displayName"], t);
  if (H(T, ["description"]) !== void 0) throw Error("description parameter is not supported in Gemini API.");
  let r = H(T, ["epochCount"]);
  if (R !== void 0 && r != null) Y(R, ["tuningTask", "hyperparameters", "epochCount"], r);
  let h = H(T, ["learningRateMultiplier"]);
  if (h != null) Y(e, ["tuningTask", "hyperparameters", "learningRateMultiplier"], h);
  if (H(T, ["exportLastCheckpointOnly"]) !== void 0) throw Error("exportLastCheckpointOnly parameter is not supported in Gemini API.");
  if (H(T, ["preTunedModelCheckpointId"]) !== void 0) throw Error("preTunedModelCheckpointId parameter is not supported in Gemini API.");
  if (H(T, ["adapterSize"]) !== void 0) throw Error("adapterSize parameter is not supported in Gemini API.");
  if (H(T, ["tuningMode"]) !== void 0) throw Error("tuningMode parameter is not supported in Gemini API.");
  if (H(T, ["customBaseModel"]) !== void 0) throw Error("customBaseModel parameter is not supported in Gemini API.");
  let i = H(T, ["batchSize"]);
  if (R !== void 0 && i != null) Y(R, ["tuningTask", "hyperparameters", "batchSize"], i);
  let c = H(T, ["learningRate"]);
  if (R !== void 0 && c != null) Y(R, ["tuningTask", "hyperparameters", "learningRate"], c);
  if (H(T, ["labels"]) !== void 0) throw Error("labels parameter is not supported in Gemini API.");
  if (H(T, ["beta"]) !== void 0) throw Error("beta parameter is not supported in Gemini API.");
  if (H(T, ["baseTeacherModel"]) !== void 0) throw Error("baseTeacherModel parameter is not supported in Gemini API.");
  if (H(T, ["tunedTeacherModelSource"]) !== void 0) throw Error("tunedTeacherModelSource parameter is not supported in Gemini API.");
  if (H(T, ["sftLossWeightMultiplier"]) !== void 0) throw Error("sftLossWeightMultiplier parameter is not supported in Gemini API.");
  if (H(T, ["outputUri"]) !== void 0) throw Error("outputUri parameter is not supported in Gemini API.");
  return e;
}