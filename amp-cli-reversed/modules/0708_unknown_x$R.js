function x$R(T) {
  let R = {},
    a = H(T, ["responsesFile"]);
  if (a != null) Y(R, ["fileName"], a);
  let e = H(T, ["inlinedResponses", "inlinedResponses"]);
  if (e != null) {
    let r = e;
    if (Array.isArray(r)) r = r.map(h => {
      return avR(h);
    });
    Y(R, ["inlinedResponses"], r);
  }
  let t = H(T, ["inlinedEmbedContentResponses", "inlinedResponses"]);
  if (t != null) {
    let r = t;
    if (Array.isArray(r)) r = r.map(h => {
      return h;
    });
    Y(R, ["inlinedEmbedContentResponses"], r);
  }
  return R;
}