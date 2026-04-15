function KSR(T, R) {
  let a = {},
    e = H(T, ["image"]);
  if (e != null) Y(a, ["image"], Cc(e));
  return a;
}
function VSR(T, R, a) {
  let e = {},
    t = H(T, ["mode"]);
  if (R !== void 0 && t != null) Y(R, ["parameters", "mode"], t);
  let r = H(T, ["maxPredictions"]);
  if (R !== void 0 && r != null) Y(R, ["parameters", "maxPredictions"], r);
  let h = H(T, ["confidenceThreshold"]);
  if (R !== void 0 && h != null) Y(R, ["parameters", "confidenceThreshold"], h);
  let i = H(T, ["maskDilation"]);
  if (R !== void 0 && i != null) Y(R, ["parameters", "maskDilation"], i);
  let c = H(T, ["binaryColorThreshold"]);
  if (R !== void 0 && c != null) Y(R, ["parameters", "binaryColorThreshold"], c);
  let s = H(T, ["labels"]);
  if (R !== void 0 && s != null) Y(R, ["labels"], s);
  return e;
}