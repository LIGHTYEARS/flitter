function sSR(T, R) {
  let a = {},
    e = H(T, ["sdkHttpResponse"]);
  if (e != null) Y(a, ["sdkHttpResponse"], e);
  let t = H(T, ["predictions"]);
  if (t != null) {
    let h = t;
    if (Array.isArray(h)) h = h.map(i => {
      return iU(i);
    });
    Y(a, ["generatedImages"], h);
  }
  let r = H(T, ["positivePromptSafetyAttributes"]);
  if (r != null) Y(a, ["positivePromptSafetyAttributes"], o6T(r));
  return a;
}