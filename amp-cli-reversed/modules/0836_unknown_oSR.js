function oSR(T, R, a) {
  let e = {},
    t = H(T, ["numberOfVideos"]);
  if (R !== void 0 && t != null) Y(R, ["parameters", "sampleCount"], t);
  if (H(T, ["outputGcsUri"]) !== void 0) throw Error("outputGcsUri parameter is not supported in Gemini API.");
  if (H(T, ["fps"]) !== void 0) throw Error("fps parameter is not supported in Gemini API.");
  let r = H(T, ["durationSeconds"]);
  if (R !== void 0 && r != null) Y(R, ["parameters", "durationSeconds"], r);
  if (H(T, ["seed"]) !== void 0) throw Error("seed parameter is not supported in Gemini API.");
  let h = H(T, ["aspectRatio"]);
  if (R !== void 0 && h != null) Y(R, ["parameters", "aspectRatio"], h);
  let i = H(T, ["resolution"]);
  if (R !== void 0 && i != null) Y(R, ["parameters", "resolution"], i);
  let c = H(T, ["personGeneration"]);
  if (R !== void 0 && c != null) Y(R, ["parameters", "personGeneration"], c);
  if (H(T, ["pubsubTopic"]) !== void 0) throw Error("pubsubTopic parameter is not supported in Gemini API.");
  let s = H(T, ["negativePrompt"]);
  if (R !== void 0 && s != null) Y(R, ["parameters", "negativePrompt"], s);
  let A = H(T, ["enhancePrompt"]);
  if (R !== void 0 && A != null) Y(R, ["parameters", "enhancePrompt"], A);
  if (H(T, ["generateAudio"]) !== void 0) throw Error("generateAudio parameter is not supported in Gemini API.");
  let l = H(T, ["lastFrame"]);
  if (R !== void 0 && l != null) Y(R, ["instances[0]", "lastFrame"], cU(l));
  let o = H(T, ["referenceImages"]);
  if (R !== void 0 && o != null) {
    let n = o;
    if (Array.isArray(n)) n = n.map(p => {
      return lOR(p);
    });
    Y(R, ["instances[0]", "referenceImages"], n);
  }
  if (H(T, ["mask"]) !== void 0) throw Error("mask parameter is not supported in Gemini API.");
  if (H(T, ["compressionQuality"]) !== void 0) throw Error("compressionQuality parameter is not supported in Gemini API.");
  return e;
}