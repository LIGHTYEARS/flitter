function X$R(T) {
  let R = {},
    a = H(T, ["sdkHttpResponse"]);
  if (a != null) Y(R, ["sdkHttpResponse"], a);
  let e = H(T, ["candidates"]);
  if (e != null) {
    let c = e;
    if (Array.isArray(c)) c = c.map(s => {
      return d$R(s);
    });
    Y(R, ["candidates"], c);
  }
  let t = H(T, ["modelVersion"]);
  if (t != null) Y(R, ["modelVersion"], t);
  let r = H(T, ["promptFeedback"]);
  if (r != null) Y(R, ["promptFeedback"], r);
  let h = H(T, ["responseId"]);
  if (h != null) Y(R, ["responseId"], h);
  let i = H(T, ["usageMetadata"]);
  if (i != null) Y(R, ["usageMetadata"], i);
  return R;
}