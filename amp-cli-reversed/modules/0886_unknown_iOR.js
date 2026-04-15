function iOR(T, R, a) {
  let e = {},
    t = H(R, ["model"]);
  if (t != null) Y(e, ["_url", "model"], g8(T, t));
  let r = H(R, ["image"]);
  if (r != null) Y(e, ["instances[0]", "image"], Cc(r));
  let h = H(R, ["upscaleFactor"]);
  if (h != null) Y(e, ["parameters", "upscaleConfig", "upscaleFactor"], h);
  let i = H(R, ["config"]);
  if (i != null) hOR(i, e);
  return e;
}