function YAT(T, R) {
  let a = {},
    e = H(T, ["sdkHttpResponse"]);
  if (e != null) Y(a, ["sdkHttpResponse"], e);
  let t = H(T, ["candidates"]);
  if (t != null) {
    let A = t;
    if (Array.isArray(A)) A = A.map(l => {
      return l;
    });
    Y(a, ["candidates"], A);
  }
  let r = H(T, ["createTime"]);
  if (r != null) Y(a, ["createTime"], r);
  let h = H(T, ["modelVersion"]);
  if (h != null) Y(a, ["modelVersion"], h);
  let i = H(T, ["promptFeedback"]);
  if (i != null) Y(a, ["promptFeedback"], i);
  let c = H(T, ["responseId"]);
  if (c != null) Y(a, ["responseId"], c);
  let s = H(T, ["usageMetadata"]);
  if (s != null) Y(a, ["usageMetadata"], s);
  return a;
}