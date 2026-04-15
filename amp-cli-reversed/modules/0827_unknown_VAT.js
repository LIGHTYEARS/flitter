function VAT(T, R, a) {
  let e = {},
    t = H(R, ["model"]);
  if (t != null) Y(e, ["_url", "model"], g8(T, t));
  let r = H(R, ["contents"]);
  if (r != null) {
    let i = ui(r);
    if (Array.isArray(i)) i = i.map(c => {
      return c;
    });
    Y(e, ["contents"], i);
  }
  let h = H(R, ["config"]);
  if (h != null) Y(e, ["generationConfig"], eSR(T, h, e));
  return e;
}