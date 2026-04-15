function VjR(T, R, a) {
  let e = {},
    t = H(R, ["model"]);
  if (t != null) Y(e, ["_url", "model"], g8(T, t));
  let r = H(R, ["contents"]);
  if (r != null) {
    let i = U8T(T, r);
    if (Array.isArray(i)) i = i.map(c => {
      return c;
    });
    Y(e, ["instances[]", "content"], i);
  }
  let h = H(R, ["config"]);
  if (h != null) GjR(h, e);
  return e;
}