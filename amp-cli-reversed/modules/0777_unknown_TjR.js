function JvR(T) {
  let R = {},
    a = H(T, ["config"]);
  if (a != null) ZvR(a, R);
  return R;
}
function TjR(T) {
  let R = {},
    a = H(T, ["sdkHttpResponse"]);
  if (a != null) Y(R, ["sdkHttpResponse"], a);
  let e = H(T, ["nextPageToken"]);
  if (e != null) Y(R, ["nextPageToken"], e);
  let t = H(T, ["files"]);
  if (t != null) {
    let r = t;
    if (Array.isArray(r)) r = r.map(h => {
      return h;
    });
    Y(R, ["files"], r);
  }
  return R;
}