function LSR(T, R, a) {
  let e = {},
    t = H(R, ["config"]);
  if (t != null) ESR(T, t, e);
  return e;
}
function MSR(T, R, a) {
  let e = {},
    t = H(R, ["config"]);
  if (t != null) CSR(T, t, e);
  return e;
}
function DSR(T, R) {
  let a = {},
    e = H(T, ["sdkHttpResponse"]);
  if (e != null) Y(a, ["sdkHttpResponse"], e);
  let t = H(T, ["nextPageToken"]);
  if (t != null) Y(a, ["nextPageToken"], t);
  let r = H(T, ["_self"]);
  if (r != null) {
    let h = T6T(r);
    if (Array.isArray(h)) h = h.map(i => {
      return CK(i);
    });
    Y(a, ["models"], h);
  }
  return a;
}