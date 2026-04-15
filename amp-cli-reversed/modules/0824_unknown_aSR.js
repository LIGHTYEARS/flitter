function aSR(T, R, a, e) {
  let t = {},
    r = H(R, ["systemInstruction"]);
  if (a !== void 0 && r != null) Y(a, ["systemInstruction"], hU(it(r)));
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
  if (H(R, ["routingConfig"]) !== void 0) throw Error("routingConfig parameter is not supported in Gemini API.");
  if (H(R, ["modelSelectionConfig"]) !== void 0) throw Error("modelSelectionConfig parameter is not supported in Gemini API.");
  let P = H(R, ["safetySettings"]);
  if (a !== void 0 && P != null) {
    let d = P;
    if (Array.isArray(d)) d = d.map(C => {
      return GSR(C);
    });
    Y(a, ["safetySettings"], d);
  }
  let k = H(R, ["tools"]);
  if (a !== void 0 && k != null) {
    let d = Dx(k);
    if (Array.isArray(d)) d = d.map(C => {
      return JSR(Mx(C));
    });
    Y(a, ["tools"], d);
  }
  let x = H(R, ["toolConfig"]);
  if (a !== void 0 && x != null) Y(a, ["toolConfig"], ZSR(x));
  if (H(R, ["labels"]) !== void 0) throw Error("labels parameter is not supported in Gemini API.");
  let f = H(R, ["cachedContent"]);
  if (a !== void 0 && f != null) Y(a, ["cachedContent"], Cn(T, f));
  let v = H(R, ["responseModalities"]);
  if (v != null) Y(t, ["responseModalities"], v);
  let g = H(R, ["mediaResolution"]);
  if (g != null) Y(t, ["mediaResolution"], g);
  let I = H(R, ["speechConfig"]);
  if (I != null) Y(t, ["speechConfig"], W8T(I));
  if (H(R, ["audioTimestamp"]) !== void 0) throw Error("audioTimestamp parameter is not supported in Gemini API.");
  let S = H(R, ["thinkingConfig"]);
  if (S != null) Y(t, ["thinkingConfig"], S);
  let O = H(R, ["imageConfig"]);
  if (O != null) Y(t, ["imageConfig"], SSR(O));
  let j = H(R, ["enableEnhancedCivicAnswers"]);
  if (j != null) Y(t, ["enableEnhancedCivicAnswers"], j);
  if (H(R, ["modelArmorConfig"]) !== void 0) throw Error("modelArmorConfig parameter is not supported in Gemini API.");
  return t;
}