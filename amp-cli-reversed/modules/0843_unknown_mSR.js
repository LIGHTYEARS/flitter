function mSR(T, R) {
  let a = {},
    e = H(T, ["videos"]);
  if (e != null) {
    let h = e;
    if (Array.isArray(h)) h = h.map(i => {
      return fSR(i);
    });
    Y(a, ["generatedVideos"], h);
  }
  let t = H(T, ["raiMediaFilteredCount"]);
  if (t != null) Y(a, ["raiMediaFilteredCount"], t);
  let r = H(T, ["raiMediaFilteredReasons"]);
  if (r != null) Y(a, ["raiMediaFilteredReasons"], r);
  return a;
}