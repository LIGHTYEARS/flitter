function v$R(T) {
  let R = {},
    a = H(T, ["format"]);
  if (a != null) Y(R, ["instancesFormat"], a);
  let e = H(T, ["gcsUri"]);
  if (e != null) Y(R, ["gcsSource", "uris"], e);
  let t = H(T, ["bigqueryUri"]);
  if (t != null) Y(R, ["bigquerySource", "inputUri"], t);
  if (H(T, ["fileName"]) !== void 0) throw Error("fileName parameter is not supported in Vertex AI.");
  if (H(T, ["inlinedRequests"]) !== void 0) throw Error("inlinedRequests parameter is not supported in Vertex AI.");
  return R;
}