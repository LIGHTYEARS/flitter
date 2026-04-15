function KjR(T, R, a) {
  let e = {},
    t = H(R, ["model"]);
  if (t != null) Y(e, ["_url", "model"], g8(T, t));
  let r = H(R, ["contents"]);
  if (r != null) {
    let c = U8T(T, r);
    if (Array.isArray(c)) c = c.map(s => {
      return s;
    });
    Y(e, ["requests[]", "content"], c);
  }
  let h = H(R, ["config"]);
  if (h != null) FjR(h, e);
  let i = H(R, ["model"]);
  if (i !== void 0) Y(e, ["requests[]", "model"], g8(T, i));
  return e;
}