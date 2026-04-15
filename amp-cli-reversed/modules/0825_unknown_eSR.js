function eSR(T, R, a, e) {
  let t = {},
    r = H(R, ["systemInstruction"]);
  if (a !== void 0 && r != null) Y(a, ["systemInstruction"], it(r));
  let h = H(R, ["temperature"]);
  if (h != null) Y(t, ["temperature"], h);
  let i = H(R, ["topP"]);
  if (i != null) Y(t, ["topP"], i);
  let c = H(R, ["topK"]);
  if (c != null) Y(t, ["topK"], c);
  let s = H(R, ["candidateCount"]);
  if (s != null) Y(t, ["candidateCount"], s);
  let A = H(R, ["maxOutputTokens"]);
  if (A != null) Y(t, ["maxOutputTokens"], A);
  let l = H(R, ["stopSequences"]);
  if (l != null) Y(t, ["stopSequences"], l);
  let o = H(R, ["responseLogprobs"]);
  if (o != null) Y(t, ["responseLogprobs"], o);
  let n = H(R, ["logprobs"]);
  if (n != null) Y(t, ["logprobs"], n);
  let p = H(R, ["presencePenalty"]);
  if (p != null) Y(t, ["presencePenalty"], p);
  let _ = H(R, ["frequencyPenalty"]);
  if (_ != null) Y(t, ["frequencyPenalty"], _);
  let m = H(R, ["seed"]);
  if (m != null) Y(t, ["seed"], m);
  let b = H(R, ["responseMimeType"]);
  if (b != null) Y(t, ["responseMimeType"], b);
  let y = H(R, ["responseSchema"]);
  if (y != null) Y(t, ["responseSchema"], H8T(y));
  let u = H(R, ["responseJsonSchema"]);
  if (u != null) Y(t, ["responseJsonSchema"], u);
  let P = H(R, ["routingConfig"]);
  if (P != null) Y(t, ["routingConfig"], P);
  let k = H(R, ["modelSelectionConfig"]);
  if (k != null) Y(t, ["modelConfig"], k);
  let x = H(R, ["safetySettings"]);
  if (a !== void 0 && x != null) {
    let D = x;
    if (Array.isArray(D)) D = D.map(B => {
      return B;
    });
    Y(a, ["safetySettings"], D);
  }
  let f = H(R, ["tools"]);
  if (a !== void 0 && f != null) {
    let D = Dx(f);
    if (Array.isArray(D)) D = D.map(B => {
      return n6T(Mx(B));
    });
    Y(a, ["tools"], D);
  }
  let v = H(R, ["toolConfig"]);
  if (a !== void 0 && v != null) Y(a, ["toolConfig"], v);
  let g = H(R, ["labels"]);
  if (a !== void 0 && g != null) Y(a, ["labels"], g);
  let I = H(R, ["cachedContent"]);
  if (a !== void 0 && I != null) Y(a, ["cachedContent"], Cn(T, I));
  let S = H(R, ["responseModalities"]);
  if (S != null) Y(t, ["responseModalities"], S);
  let O = H(R, ["mediaResolution"]);
  if (O != null) Y(t, ["mediaResolution"], O);
  let j = H(R, ["speechConfig"]);
  if (j != null) Y(t, ["speechConfig"], W8T(j));
  let d = H(R, ["audioTimestamp"]);
  if (d != null) Y(t, ["audioTimestamp"], d);
  let C = H(R, ["thinkingConfig"]);
  if (C != null) Y(t, ["thinkingConfig"], C);
  let L = H(R, ["imageConfig"]);
  if (L != null) Y(t, ["imageConfig"], OSR(L));
  if (H(R, ["enableEnhancedCivicAnswers"]) !== void 0) throw Error("enableEnhancedCivicAnswers parameter is not supported in Vertex AI.");
  let w = H(R, ["modelArmorConfig"]);
  if (a !== void 0 && w != null) Y(a, ["modelArmorConfig"], w);
  return t;
}