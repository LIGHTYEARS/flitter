function I$R(T) {
  let R = {},
    a = H(T, ["format"]);
  if (a != null) Y(R, ["predictionsFormat"], a);
  let e = H(T, ["gcsUri"]);
  if (e != null) Y(R, ["gcsDestination", "outputUriPrefix"], e);
  let t = H(T, ["bigqueryUri"]);
  if (t != null) Y(R, ["bigqueryDestination", "outputUri"], t);
  if (H(T, ["fileName"]) !== void 0) throw Error("fileName parameter is not supported in Vertex AI.");
  if (H(T, ["inlinedResponses"]) !== void 0) throw Error("inlinedResponses parameter is not supported in Vertex AI.");
  if (H(T, ["inlinedEmbedContentResponses"]) !== void 0) throw Error("inlinedEmbedContentResponses parameter is not supported in Vertex AI.");
  return R;
}