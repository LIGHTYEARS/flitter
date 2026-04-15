function cSR(T, R) {
  let a = {},
    e = H(T, ["sdkHttpResponse"]);
  if (e != null) Y(a, ["sdkHttpResponse"], e);
  let t = H(T, ["predictions"]);
  if (t != null) {
    let h = t;
    if (Array.isArray(h)) h = h.map(i => {
      return PSR(i);
    });
    Y(a, ["generatedImages"], h);
  }
  let r = H(T, ["positivePromptSafetyAttributes"]);
  if (r != null) Y(a, ["positivePromptSafetyAttributes"], s6T(r));
  return a;
}