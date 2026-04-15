function qdR(T, R, a) {
  let e = {},
    t = H(a, ["config", "method"]);
  if (t === void 0) t = "SUPERVISED_FINE_TUNING";
  if (t === "SUPERVISED_FINE_TUNING") {
    let h = H(T, ["gcsUri"]);
    if (R !== void 0 && h != null) Y(R, ["supervisedTuningSpec", "trainingDatasetUri"], h);
  } else if (t === "PREFERENCE_TUNING") {
    let h = H(T, ["gcsUri"]);
    if (R !== void 0 && h != null) Y(R, ["preferenceOptimizationSpec", "trainingDatasetUri"], h);
  } else if (t === "DISTILLATION") {
    let h = H(T, ["gcsUri"]);
    if (R !== void 0 && h != null) Y(R, ["distillationSpec", "promptDatasetUri"], h);
  }
  let r = H(a, ["config", "method"]);
  if (r === void 0) r = "SUPERVISED_FINE_TUNING";
  if (r === "SUPERVISED_FINE_TUNING") {
    let h = H(T, ["vertexDatasetResource"]);
    if (R !== void 0 && h != null) Y(R, ["supervisedTuningSpec", "trainingDatasetUri"], h);
  } else if (r === "PREFERENCE_TUNING") {
    let h = H(T, ["vertexDatasetResource"]);
    if (R !== void 0 && h != null) Y(R, ["preferenceOptimizationSpec", "trainingDatasetUri"], h);
  } else if (r === "DISTILLATION") {
    let h = H(T, ["vertexDatasetResource"]);
    if (R !== void 0 && h != null) Y(R, ["distillationSpec", "promptDatasetUri"], h);
  }
  if (H(T, ["examples"]) !== void 0) throw Error("examples parameter is not supported in Vertex AI.");
  return e;
}