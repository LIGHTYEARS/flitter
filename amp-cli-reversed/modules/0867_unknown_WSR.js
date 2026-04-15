function WSR(T, R, a) {
  let e = {},
    t = H(R, ["model"]);
  if (t != null) Y(e, ["_url", "model"], g8(T, t));
  let r = H(R, ["source"]);
  if (r != null) zSR(r, e);
  let h = H(R, ["config"]);
  if (h != null) HSR(h, e);
  return e;
}