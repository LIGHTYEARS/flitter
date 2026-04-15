function rvR(T) {
  let R = {},
    a = H(T, ["config"]);
  if (a != null) evR(a, R);
  return R;
}
function hvR(T) {
  let R = {},
    a = H(T, ["config"]);
  if (a != null) tvR(a, R);
  return R;
}
function ivR(T) {
  let R = {},
    a = H(T, ["sdkHttpResponse"]);
  if (a != null) Y(R, ["sdkHttpResponse"], a);
  let e = H(T, ["nextPageToken"]);
  if (e != null) Y(R, ["nextPageToken"], e);
  let t = H(T, ["operations"]);
  if (t != null) {
    let r = t;
    if (Array.isArray(r)) r = r.map(h => {
      return WL(h);
    });
    Y(R, ["batchJobs"], r);
  }
  return R;
}