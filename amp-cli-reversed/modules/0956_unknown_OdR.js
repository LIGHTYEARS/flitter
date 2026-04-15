function OdR(T, R, a) {
  let e = {},
    t = H(a, ["config", "method"]);
  if (t === void 0) t = "SUPERVISED_FINE_TUNING";
  if (t === "SUPERVISED_FINE_TUNING") {
    let k = H(T, ["validationDataset"]);
    if (R !== void 0 && k != null) Y(R, ["supervisedTuningSpec"], _5(k));
  } else if (t === "PREFERENCE_TUNING") {
    let k = H(T, ["validationDataset"]);
    if (R !== void 0 && k != null) Y(R, ["preferenceOptimizationSpec"], _5(k));
  } else if (t === "DISTILLATION") {
    let k = H(T, ["validationDataset"]);
    if (R !== void 0 && k != null) Y(R, ["distillationSpec"], _5(k));
  }
  let r = H(T, ["tunedModelDisplayName"]);
  if (R !== void 0 && r != null) Y(R, ["tunedModelDisplayName"], r);
  let h = H(T, ["description"]);
  if (R !== void 0 && h != null) Y(R, ["description"], h);
  let i = H(a, ["config", "method"]);
  if (i === void 0) i = "SUPERVISED_FINE_TUNING";
  if (i === "SUPERVISED_FINE_TUNING") {
    let k = H(T, ["epochCount"]);
    if (R !== void 0 && k != null) Y(R, ["supervisedTuningSpec", "hyperParameters", "epochCount"], k);
  } else if (i === "PREFERENCE_TUNING") {
    let k = H(T, ["epochCount"]);
    if (R !== void 0 && k != null) Y(R, ["preferenceOptimizationSpec", "hyperParameters", "epochCount"], k);
  } else if (i === "DISTILLATION") {
    let k = H(T, ["epochCount"]);
    if (R !== void 0 && k != null) Y(R, ["distillationSpec", "hyperParameters", "epochCount"], k);
  }
  let c = H(a, ["config", "method"]);
  if (c === void 0) c = "SUPERVISED_FINE_TUNING";
  if (c === "SUPERVISED_FINE_TUNING") {
    let k = H(T, ["learningRateMultiplier"]);
    if (R !== void 0 && k != null) Y(R, ["supervisedTuningSpec", "hyperParameters", "learningRateMultiplier"], k);
  } else if (c === "PREFERENCE_TUNING") {
    let k = H(T, ["learningRateMultiplier"]);
    if (R !== void 0 && k != null) Y(R, ["preferenceOptimizationSpec", "hyperParameters", "learningRateMultiplier"], k);
  } else if (c === "DISTILLATION") {
    let k = H(T, ["learningRateMultiplier"]);
    if (R !== void 0 && k != null) Y(R, ["distillationSpec", "hyperParameters", "learningRateMultiplier"], k);
  }
  let s = H(a, ["config", "method"]);
  if (s === void 0) s = "SUPERVISED_FINE_TUNING";
  if (s === "SUPERVISED_FINE_TUNING") {
    let k = H(T, ["exportLastCheckpointOnly"]);
    if (R !== void 0 && k != null) Y(R, ["supervisedTuningSpec", "exportLastCheckpointOnly"], k);
  } else if (s === "PREFERENCE_TUNING") {
    let k = H(T, ["exportLastCheckpointOnly"]);
    if (R !== void 0 && k != null) Y(R, ["preferenceOptimizationSpec", "exportLastCheckpointOnly"], k);
  } else if (s === "DISTILLATION") {
    let k = H(T, ["exportLastCheckpointOnly"]);
    if (R !== void 0 && k != null) Y(R, ["distillationSpec", "exportLastCheckpointOnly"], k);
  }
  let A = H(a, ["config", "method"]);
  if (A === void 0) A = "SUPERVISED_FINE_TUNING";
  if (A === "SUPERVISED_FINE_TUNING") {
    let k = H(T, ["adapterSize"]);
    if (R !== void 0 && k != null) Y(R, ["supervisedTuningSpec", "hyperParameters", "adapterSize"], k);
  } else if (A === "PREFERENCE_TUNING") {
    let k = H(T, ["adapterSize"]);
    if (R !== void 0 && k != null) Y(R, ["preferenceOptimizationSpec", "hyperParameters", "adapterSize"], k);
  } else if (A === "DISTILLATION") {
    let k = H(T, ["adapterSize"]);
    if (R !== void 0 && k != null) Y(R, ["distillationSpec", "hyperParameters", "adapterSize"], k);
  }
  let l = H(a, ["config", "method"]);
  if (l === void 0) l = "SUPERVISED_FINE_TUNING";
  if (l === "SUPERVISED_FINE_TUNING") {
    let k = H(T, ["tuningMode"]);
    if (R !== void 0 && k != null) Y(R, ["supervisedTuningSpec", "tuningMode"], k);
  }
  let o = H(T, ["customBaseModel"]);
  if (R !== void 0 && o != null) Y(R, ["customBaseModel"], o);
  let n = H(a, ["config", "method"]);
  if (n === void 0) n = "SUPERVISED_FINE_TUNING";
  if (n === "SUPERVISED_FINE_TUNING") {
    let k = H(T, ["batchSize"]);
    if (R !== void 0 && k != null) Y(R, ["supervisedTuningSpec", "hyperParameters", "batchSize"], k);
  }
  let p = H(a, ["config", "method"]);
  if (p === void 0) p = "SUPERVISED_FINE_TUNING";
  if (p === "SUPERVISED_FINE_TUNING") {
    let k = H(T, ["learningRate"]);
    if (R !== void 0 && k != null) Y(R, ["supervisedTuningSpec", "hyperParameters", "learningRate"], k);
  }
  let _ = H(T, ["labels"]);
  if (R !== void 0 && _ != null) Y(R, ["labels"], _);
  let m = H(T, ["beta"]);
  if (R !== void 0 && m != null) Y(R, ["preferenceOptimizationSpec", "hyperParameters", "beta"], m);
  let b = H(T, ["baseTeacherModel"]);
  if (R !== void 0 && b != null) Y(R, ["distillationSpec", "baseTeacherModel"], b);
  let y = H(T, ["tunedTeacherModelSource"]);
  if (R !== void 0 && y != null) Y(R, ["distillationSpec", "tunedTeacherModelSource"], y);
  let u = H(T, ["sftLossWeightMultiplier"]);
  if (R !== void 0 && u != null) Y(R, ["distillationSpec", "hyperParameters", "sftLossWeightMultiplier"], u);
  let P = H(T, ["outputUri"]);
  if (R !== void 0 && P != null) Y(R, ["outputUri"], P);
  return e;
}