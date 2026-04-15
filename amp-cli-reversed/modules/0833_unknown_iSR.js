function iSR(T, R, a) {
  let e = {},
    t = H(R, ["model"]);
  if (t != null) Y(e, ["_url", "model"], g8(T, t));
  let r = H(R, ["prompt"]);
  if (r != null) Y(e, ["instances[0]", "prompt"], r);
  let h = H(R, ["config"]);
  if (h != null) rSR(h, e);
  return e;
}