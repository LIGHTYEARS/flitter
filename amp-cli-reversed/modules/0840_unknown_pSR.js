function pSR(T, R, a) {
  let e = {},
    t = H(R, ["model"]);
  if (t != null) Y(e, ["_url", "model"], g8(T, t));
  let r = H(R, ["prompt"]);
  if (r != null) Y(e, ["instances[0]", "prompt"], r);
  let h = H(R, ["image"]);
  if (h != null) Y(e, ["instances[0]", "image"], cU(h));
  let i = H(R, ["video"]);
  if (i != null) Y(e, ["instances[0]", "video"], l6T(i));
  let c = H(R, ["source"]);
  if (c != null) uSR(c, e);
  let s = H(R, ["config"]);
  if (s != null) oSR(s, e);
  return e;
}