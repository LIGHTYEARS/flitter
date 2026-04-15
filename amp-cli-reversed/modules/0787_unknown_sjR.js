function sjR(T, R) {
  let a = {},
    e = H(T, ["generationConfig"]);
  if (R !== void 0 && e != null) Y(R, ["setup", "generationConfig"], e);
  let t = H(T, ["responseModalities"]);
  if (R !== void 0 && t != null) Y(R, ["setup", "generationConfig", "responseModalities"], t);
  let r = H(T, ["temperature"]);
  if (R !== void 0 && r != null) Y(R, ["setup", "generationConfig", "temperature"], r);
  let h = H(T, ["topP"]);
  if (R !== void 0 && h != null) Y(R, ["setup", "generationConfig", "topP"], h);
  let i = H(T, ["topK"]);
  if (R !== void 0 && i != null) Y(R, ["setup", "generationConfig", "topK"], i);
  let c = H(T, ["maxOutputTokens"]);
  if (R !== void 0 && c != null) Y(R, ["setup", "generationConfig", "maxOutputTokens"], c);
  let s = H(T, ["mediaResolution"]);
  if (R !== void 0 && s != null) Y(R, ["setup", "generationConfig", "mediaResolution"], s);
  let A = H(T, ["seed"]);
  if (R !== void 0 && A != null) Y(R, ["setup", "generationConfig", "seed"], A);
  let l = H(T, ["speechConfig"]);
  if (R !== void 0 && l != null) Y(R, ["setup", "generationConfig", "speechConfig"], q8T(l));
  let o = H(T, ["thinkingConfig"]);
  if (R !== void 0 && o != null) Y(R, ["setup", "generationConfig", "thinkingConfig"], o);
  let n = H(T, ["enableAffectiveDialog"]);
  if (R !== void 0 && n != null) Y(R, ["setup", "generationConfig", "enableAffectiveDialog"], n);
  let p = H(T, ["systemInstruction"]);
  if (R !== void 0 && p != null) Y(R, ["setup", "systemInstruction"], ajR(it(p)));
  let _ = H(T, ["tools"]);
  if (R !== void 0 && _ != null) {
    let x = Dx(_);
    if (Array.isArray(x)) x = x.map(f => {
      return PjR(Mx(f));
    });
    Y(R, ["setup", "tools"], x);
  }
  let m = H(T, ["sessionResumption"]);
  if (R !== void 0 && m != null) Y(R, ["setup", "sessionResumption"], yjR(m));
  let b = H(T, ["inputAudioTranscription"]);
  if (R !== void 0 && b != null) Y(R, ["setup", "inputAudioTranscription"], b);
  let y = H(T, ["outputAudioTranscription"]);
  if (R !== void 0 && y != null) Y(R, ["setup", "outputAudioTranscription"], y);
  let u = H(T, ["realtimeInputConfig"]);
  if (R !== void 0 && u != null) Y(R, ["setup", "realtimeInputConfig"], u);
  let P = H(T, ["contextWindowCompression"]);
  if (R !== void 0 && P != null) Y(R, ["setup", "contextWindowCompression"], P);
  let k = H(T, ["proactivity"]);
  if (R !== void 0 && k != null) Y(R, ["setup", "proactivity"], k);
  if (H(T, ["explicitVadSignal"]) !== void 0) throw Error("explicitVadSignal parameter is not supported in Gemini API.");
  return a;
}