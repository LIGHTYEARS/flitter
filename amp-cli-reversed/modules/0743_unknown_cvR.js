function cvR(T) {
  let R = {},
    a = H(T, ["sdkHttpResponse"]);
  if (a != null) Y(R, ["sdkHttpResponse"], a);
  let e = H(T, ["nextPageToken"]);
  if (e != null) Y(R, ["nextPageToken"], e);
  let t = H(T, ["batchPredictionJobs"]);
  if (t != null) {
    let r = t;
    if (Array.isArray(r)) r = r.map(h => {
      return EK(h);
    });
    Y(R, ["batchJobs"], r);
  }
  return R;
}