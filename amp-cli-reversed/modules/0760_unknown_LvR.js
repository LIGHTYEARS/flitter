function EvR(T) {
  let R = {},
    a = H(T, ["config"]);
  if (a != null) OvR(a, R);
  return R;
}
function CvR(T) {
  let R = {},
    a = H(T, ["config"]);
  if (a != null) dvR(a, R);
  return R;
}
function LvR(T) {
  let R = {},
    a = H(T, ["sdkHttpResponse"]);
  if (a != null) Y(R, ["sdkHttpResponse"], a);
  let e = H(T, ["nextPageToken"]);
  if (e != null) Y(R, ["nextPageToken"], e);
  let t = H(T, ["cachedContents"]);
  if (t != null) {
    let r = t;
    if (Array.isArray(r)) r = r.map(h => {
      return h;
    });
    Y(R, ["cachedContents"], r);
  }
  return R;
}