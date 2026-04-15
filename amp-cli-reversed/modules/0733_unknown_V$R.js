function V$R(T, R, a) {
  let e = {},
    t = H(R, ["systemInstruction"]);
  if (a !== void 0 && t != null) Y(a, ["systemInstruction"], t6T(it(t)));
  let r = H(R, ["temperature"]);
  if (r != null) Y(e, ["temperature"], r);
  let h = H(R, ["topP"]);
  if (h != null) Y(e, ["topP"], h);
  let i = H(R, ["topK"]);
  if (i != null) Y(e, ["topK"], i);
  let c = H(R, ["candidateCount"]);
  if (c != null) Y(e, ["candidateCount"], c);
  let s = H(R, ["maxOutputTokens"]);
  if (s != null) Y(e, ["maxOutputTokens"], s);
  let A = H(R, ["stopSequences"]);
  if (A != null) Y(e, ["stopSequences"], A);
  let l = H(R, ["responseLogprobs"]);
  if (l != null) Y(e, ["responseLogprobs"], l);
  let o = H(R, ["logprobs"]);
  if (o != null) Y(e, ["logprobs"], o);
  let n = H(R, ["presencePenalty"]);
  if (n != null) Y(e, ["presencePenalty"], n);
  let p = H(R, ["frequencyPenalty"]);
  if (p != null) Y(e, ["frequencyPenalty"], p);
  let _ = H(R, ["seed"]);
  if (_ != null) Y(e, ["seed"], _);
  let m = H(R, ["responseMimeType"]);
  if (m != null) Y(e, ["responseMimeType"], m);
  let b = H(R, ["responseSchema"]);
  if (b != null) Y(e, ["responseSchema"], H8T(b));
  let y = H(R, ["responseJsonSchema"]);
  if (y != null) Y(e, ["responseJsonSchema"], y);
  if (H(R, ["routingConfig"]) !== void 0) throw Error("routingConfig parameter is not supported in Gemini API.");
  if (H(R, ["modelSelectionConfig"]) !== void 0) throw Error("modelSelectionConfig parameter is not supported in Gemini API.");
  let u = H(R, ["safetySettings"]);
  if (a !== void 0 && u != null) {
    let j = u;
    if (Array.isArray(j)) j = j.map(d => {
      return ovR(d);
    });
    Y(a, ["safetySettings"], j);
  }
  let P = H(R, ["tools"]);
  if (a !== void 0 && P != null) {
    let j = Dx(P);
    if (Array.isArray(j)) j = j.map(d => {
      return lvR(Mx(d));
    });
    Y(a, ["tools"], j);
  }
  let k = H(R, ["toolConfig"]);
  if (a !== void 0 && k != null) Y(a, ["toolConfig"], nvR(k));
  if (H(R, ["labels"]) !== void 0) throw Error("labels parameter is not supported in Gemini API.");
  let x = H(R, ["cachedContent"]);
  if (a !== void 0 && x != null) Y(a, ["cachedContent"], Cn(T, x));
  let f = H(R, ["responseModalities"]);
  if (f != null) Y(e, ["responseModalities"], f);
  let v = H(R, ["mediaResolution"]);
  if (v != null) Y(e, ["mediaResolution"], v);
  let g = H(R, ["speechConfig"]);
  if (g != null) Y(e, ["speechConfig"], W8T(g));
  if (H(R, ["audioTimestamp"]) !== void 0) throw Error("audioTimestamp parameter is not supported in Gemini API.");
  let I = H(R, ["thinkingConfig"]);
  if (I != null) Y(e, ["thinkingConfig"], I);
  let S = H(R, ["imageConfig"]);
  if (S != null) Y(e, ["imageConfig"], TvR(S));
  let O = H(R, ["enableEnhancedCivicAnswers"]);
  if (O != null) Y(e, ["enableEnhancedCivicAnswers"], O);
  if (H(R, ["modelArmorConfig"]) !== void 0) throw Error("modelArmorConfig parameter is not supported in Gemini API.");
  return e;
}