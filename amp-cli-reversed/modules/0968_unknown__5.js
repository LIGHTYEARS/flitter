function _5(T, R) {
  let a = {},
    e = H(T, ["gcsUri"]);
  if (e != null) Y(a, ["validationDatasetUri"], e);
  let t = H(T, ["vertexDatasetResource"]);
  if (t != null) Y(a, ["validationDatasetUri"], t);
  return a;
}