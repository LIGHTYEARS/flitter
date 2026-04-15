function qjR(T, R, a) {
  let e = {},
    t = H(R, ["model"]);
  if (t != null) Y(e, ["_url", "model"], g8(T, t));
  let r = H(R, ["prompt"]);
  if (r != null) Y(e, ["instances[0]", "prompt"], r);
  let h = H(R, ["referenceImages"]);
  if (h != null) {
    let c = h;
    if (Array.isArray(c)) c = c.map(s => {
      return FSR(s);
    });
    Y(e, ["instances[0]", "referenceImages"], c);
  }
  let i = H(R, ["config"]);
  if (i != null) WjR(i, e);
  return e;
}