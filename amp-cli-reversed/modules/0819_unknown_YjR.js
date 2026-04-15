function YjR(T, R) {
  let a = {},
    e = H(T, ["sdkHttpResponse"]);
  if (e != null) Y(a, ["sdkHttpResponse"], e);
  let t = H(T, ["predictions[]", "embeddings"]);
  if (t != null) {
    let h = t;
    if (Array.isArray(h)) h = h.map(i => {
      return SjR(i);
    });
    Y(a, ["embeddings"], h);
  }
  let r = H(T, ["metadata"]);
  if (r != null) Y(a, ["metadata"], r);
  return a;
}