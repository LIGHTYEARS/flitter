function R6T(T, R) {
  let a;
  if (typeof R === "string") {
    if (T.isVertexAI()) {
      if (R.startsWith("gs://")) a = {
        format: "jsonl",
        gcsUri: [R]
      };else if (R.startsWith("bq://")) a = {
        format: "bigquery",
        bigqueryUri: R
      };else throw Error(`Unsupported string source for Vertex AI: ${R}`);
    } else if (R.startsWith("files/")) a = {
      fileName: R
    };else throw Error(`Unsupported string source for Gemini API: ${R}`);
  } else if (Array.isArray(R)) {
    if (T.isVertexAI()) throw Error("InlinedRequest[] is not supported in Vertex AI.");
    a = {
      inlinedRequests: R
    };
  } else a = R;
  let e = [a.gcsUri, a.bigqueryUri].filter(Boolean).length,
    t = [a.inlinedRequests, a.fileName].filter(Boolean).length;
  if (T.isVertexAI()) {
    if (t > 0 || e !== 1) throw Error("Exactly one of `gcsUri` or `bigqueryUri` must be set for Vertex AI.");
  } else if (e > 0 || t !== 1) throw Error("Exactly one of `inlinedRequests`, `fileName`, must be set for Gemini API.");
  return a;
}