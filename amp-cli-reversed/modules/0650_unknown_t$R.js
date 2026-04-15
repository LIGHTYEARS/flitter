function t$R(T) {
  let R = {},
    a = H(T, ["generatedSamples"]);
  if (a != null) {
    let r = a;
    if (Array.isArray(r)) r = r.map(h => {
      return h$R(h);
    });
    Y(R, ["generatedVideos"], r);
  }
  let e = H(T, ["raiMediaFilteredCount"]);
  if (e != null) Y(R, ["raiMediaFilteredCount"], e);
  let t = H(T, ["raiMediaFilteredReasons"]);
  if (t != null) Y(R, ["raiMediaFilteredReasons"], t);
  return R;
}