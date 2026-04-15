function edR(T) {
  let R = {},
    a = H(T, ["parent"]);
  if (a != null) Y(R, ["_url", "parent"], a);
  let e = H(T, ["config"]);
  if (e != null) adR(e, R);
  return R;
}
function tdR(T) {
  let R = {},
    a = H(T, ["sdkHttpResponse"]);
  if (a != null) Y(R, ["sdkHttpResponse"], a);
  let e = H(T, ["nextPageToken"]);
  if (e != null) Y(R, ["nextPageToken"], e);
  let t = H(T, ["documents"]);
  if (t != null) {
    let r = t;
    if (Array.isArray(r)) r = r.map(h => {
      return h;
    });
    Y(R, ["documents"], r);
  }
  return R;
}