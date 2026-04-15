function IOR(T) {
  let R = {},
    a = H(T, ["config"]);
  if (a != null) fOR(a, R);
  return R;
}
function gOR(T) {
  let R = {},
    a = H(T, ["sdkHttpResponse"]);
  if (a != null) Y(R, ["sdkHttpResponse"], a);
  let e = H(T, ["nextPageToken"]);
  if (e != null) Y(R, ["nextPageToken"], e);
  let t = H(T, ["fileSearchStores"]);
  if (t != null) {
    let r = t;
    if (Array.isArray(r)) r = r.map(h => {
      return h;
    });
    Y(R, ["fileSearchStores"], r);
  }
  return R;
}