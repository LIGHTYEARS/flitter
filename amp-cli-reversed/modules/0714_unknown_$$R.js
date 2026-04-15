function $$R(T, R) {
  let a = {};
  if (H(R, ["format"]) !== void 0) throw Error("format parameter is not supported in Gemini API.");
  if (H(R, ["gcsUri"]) !== void 0) throw Error("gcsUri parameter is not supported in Gemini API.");
  if (H(R, ["bigqueryUri"]) !== void 0) throw Error("bigqueryUri parameter is not supported in Gemini API.");
  let e = H(R, ["fileName"]);
  if (e != null) Y(a, ["fileName"], e);
  let t = H(R, ["inlinedRequests"]);
  if (t != null) {
    let r = t;
    if (Array.isArray(r)) r = r.map(h => {
      return RvR(T, h);
    });
    Y(a, ["requests", "requests"], r);
  }
  return a;
}