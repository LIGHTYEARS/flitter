function bSR(T, R) {
  let a = {},
    e = H(T, ["generatedSamples"]);
  if (e != null) {
    let h = e;
    if (Array.isArray(h)) h = h.map(i => {
      return xSR(i);
    });
    Y(a, ["generatedVideos"], h);
  }
  let t = H(T, ["raiMediaFilteredCount"]);
  if (t != null) Y(a, ["raiMediaFilteredCount"], t);
  let r = H(T, ["raiMediaFilteredReasons"]);
  if (r != null) Y(a, ["raiMediaFilteredReasons"], r);
  return a;
}