function HdR(T, R) {
  let a = {},
    e = H(T, ["name"]);
  if (e != null) Y(a, ["model"], e);
  let t = H(T, ["name"]);
  if (t != null) Y(a, ["endpoint"], t);
  return a;
}
function WdR(T, R) {
  let a = {};
  if (H(T, ["gcsUri"]) !== void 0) throw Error("gcsUri parameter is not supported in Gemini API.");
  if (H(T, ["vertexDatasetResource"]) !== void 0) throw Error("vertexDatasetResource parameter is not supported in Gemini API.");
  let e = H(T, ["examples"]);
  if (e != null) {
    let t = e;
    if (Array.isArray(t)) t = t.map(r => {
      return r;
    });
    Y(a, ["examples", "examples"], t);
  }
  return a;
}