function XSR(T, R, a) {
  let e = {},
    t = H(R, ["model"]);
  if (t != null) Y(e, ["_url", "model"], g8(T, t));
  let r = H(R, ["source"]);
  if (r != null) QSR(r, e);
  let h = H(R, ["config"]);
  if (h != null) VSR(h, e);
  return e;
}