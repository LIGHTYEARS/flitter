function _SR(T, R, a) {
  let e = {},
    t = H(R, ["model"]);
  if (t != null) Y(e, ["_url", "model"], g8(T, t));
  let r = H(R, ["prompt"]);
  if (r != null) Y(e, ["instances[0]", "prompt"], r);
  let h = H(R, ["image"]);
  if (h != null) Y(e, ["instances[0]", "image"], Cc(h));
  let i = H(R, ["video"]);
  if (i != null) Y(e, ["instances[0]", "video"], A6T(i));
  let c = H(R, ["source"]);
  if (c != null) ySR(c, e);
  let s = H(R, ["config"]);
  if (s != null) nSR(s, e);
  return e;
}