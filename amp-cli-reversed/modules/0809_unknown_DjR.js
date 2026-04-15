function DjR(T, R) {
  let a = {},
    e = H(T, ["sdkHttpResponse"]);
  if (e != null) Y(a, ["sdkHttpResponse"], e);
  let t = H(T, ["totalTokens"]);
  if (t != null) Y(a, ["totalTokens"], t);
  let r = H(T, ["cachedContentTokenCount"]);
  if (r != null) Y(a, ["cachedContentTokenCount"], r);
  return a;
}