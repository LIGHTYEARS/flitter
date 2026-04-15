function nSR(T, R, a) {
  let e = {},
    t = H(T, ["numberOfVideos"]);
  if (R !== void 0 && t != null) Y(R, ["parameters", "sampleCount"], t);
  let r = H(T, ["outputGcsUri"]);
  if (R !== void 0 && r != null) Y(R, ["parameters", "storageUri"], r);
  let h = H(T, ["fps"]);
  if (R !== void 0 && h != null) Y(R, ["parameters", "fps"], h);
  let i = H(T, ["durationSeconds"]);
  if (R !== void 0 && i != null) Y(R, ["parameters", "durationSeconds"], i);
  let c = H(T, ["seed"]);
  if (R !== void 0 && c != null) Y(R, ["parameters", "seed"], c);
  let s = H(T, ["aspectRatio"]);
  if (R !== void 0 && s != null) Y(R, ["parameters", "aspectRatio"], s);
  let A = H(T, ["resolution"]);
  if (R !== void 0 && A != null) Y(R, ["parameters", "resolution"], A);
  let l = H(T, ["personGeneration"]);
  if (R !== void 0 && l != null) Y(R, ["parameters", "personGeneration"], l);
  let o = H(T, ["pubsubTopic"]);
  if (R !== void 0 && o != null) Y(R, ["parameters", "pubsubTopic"], o);
  let n = H(T, ["negativePrompt"]);
  if (R !== void 0 && n != null) Y(R, ["parameters", "negativePrompt"], n);
  let p = H(T, ["enhancePrompt"]);
  if (R !== void 0 && p != null) Y(R, ["parameters", "enhancePrompt"], p);
  let _ = H(T, ["generateAudio"]);
  if (R !== void 0 && _ != null) Y(R, ["parameters", "generateAudio"], _);
  let m = H(T, ["lastFrame"]);
  if (R !== void 0 && m != null) Y(R, ["instances[0]", "lastFrame"], Cc(m));
  let b = H(T, ["referenceImages"]);
  if (R !== void 0 && b != null) {
    let P = b;
    if (Array.isArray(P)) P = P.map(k => {
      return AOR(k);
    });
    Y(R, ["instances[0]", "referenceImages"], P);
  }
  let y = H(T, ["mask"]);
  if (R !== void 0 && y != null) Y(R, ["instances[0]", "mask"], nOR(y));
  let u = H(T, ["compressionQuality"]);
  if (R !== void 0 && u != null) Y(R, ["parameters", "compressionQuality"], u);
  return e;
}