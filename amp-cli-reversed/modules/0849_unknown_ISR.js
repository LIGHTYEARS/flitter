function xSR(T, R) {
  let a = {},
    e = H(T, ["video"]);
  if (e != null) Y(a, ["video"], sOR(e));
  return a;
}
function fSR(T, R) {
  let a = {},
    e = H(T, ["_self"]);
  if (e != null) Y(a, ["video"], oOR(e));
  return a;
}
function ISR(T, R) {
  let a = {},
    e = H(T, ["modelSelectionConfig"]);
  if (e != null) Y(a, ["modelConfig"], e);
  let t = H(T, ["responseJsonSchema"]);
  if (t != null) Y(a, ["responseJsonSchema"], t);
  let r = H(T, ["audioTimestamp"]);
  if (r != null) Y(a, ["audioTimestamp"], r);
  let h = H(T, ["candidateCount"]);
  if (h != null) Y(a, ["candidateCount"], h);
  let i = H(T, ["enableAffectiveDialog"]);
  if (i != null) Y(a, ["enableAffectiveDialog"], i);
  let c = H(T, ["frequencyPenalty"]);
  if (c != null) Y(a, ["frequencyPenalty"], c);
  let s = H(T, ["logprobs"]);
  if (s != null) Y(a, ["logprobs"], s);
  let A = H(T, ["maxOutputTokens"]);
  if (A != null) Y(a, ["maxOutputTokens"], A);
  let l = H(T, ["mediaResolution"]);
  if (l != null) Y(a, ["mediaResolution"], l);
  let o = H(T, ["presencePenalty"]);
  if (o != null) Y(a, ["presencePenalty"], o);
  let n = H(T, ["responseLogprobs"]);
  if (n != null) Y(a, ["responseLogprobs"], n);
  let p = H(T, ["responseMimeType"]);
  if (p != null) Y(a, ["responseMimeType"], p);
  let _ = H(T, ["responseModalities"]);
  if (_ != null) Y(a, ["responseModalities"], _);
  let m = H(T, ["responseSchema"]);
  if (m != null) Y(a, ["responseSchema"], m);
  let b = H(T, ["routingConfig"]);
  if (b != null) Y(a, ["routingConfig"], b);
  let y = H(T, ["seed"]);
  if (y != null) Y(a, ["seed"], y);
  let u = H(T, ["speechConfig"]);
  if (u != null) Y(a, ["speechConfig"], u);
  let P = H(T, ["stopSequences"]);
  if (P != null) Y(a, ["stopSequences"], P);
  let k = H(T, ["temperature"]);
  if (k != null) Y(a, ["temperature"], k);
  let x = H(T, ["thinkingConfig"]);
  if (x != null) Y(a, ["thinkingConfig"], x);
  let f = H(T, ["topK"]);
  if (f != null) Y(a, ["topK"], f);
  let v = H(T, ["topP"]);
  if (v != null) Y(a, ["topP"], v);
  if (H(T, ["enableEnhancedCivicAnswers"]) !== void 0) throw Error("enableEnhancedCivicAnswers parameter is not supported in Vertex AI.");
  return a;
}