function jjR(T, R) {
  let a = {},
    e = H(T, ["sdkHttpResponse"]);
  if (e != null) Y(a, ["sdkHttpResponse"], e);
  let t = H(T, ["tokensInfo"]);
  if (t != null) {
    let r = t;
    if (Array.isArray(r)) r = r.map(h => {
      return h;
    });
    Y(a, ["tokensInfo"], r);
  }
  return a;
}