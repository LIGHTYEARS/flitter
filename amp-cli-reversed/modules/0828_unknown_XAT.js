function XAT(T, R) {
  let a = {},
    e = H(T, ["sdkHttpResponse"]);
  if (e != null) Y(a, ["sdkHttpResponse"], e);
  let t = H(T, ["candidates"]);
  if (t != null) {
    let s = t;
    if (Array.isArray(s)) s = s.map(A => {
      return gjR(A);
    });
    Y(a, ["candidates"], s);
  }
  let r = H(T, ["modelVersion"]);
  if (r != null) Y(a, ["modelVersion"], r);
  let h = H(T, ["promptFeedback"]);
  if (h != null) Y(a, ["promptFeedback"], h);
  let i = H(T, ["responseId"]);
  if (i != null) Y(a, ["responseId"], i);
  let c = H(T, ["usageMetadata"]);
  if (c != null) Y(a, ["usageMetadata"], c);
  return a;
}