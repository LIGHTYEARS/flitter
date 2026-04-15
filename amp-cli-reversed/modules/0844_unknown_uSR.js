function uSR(T, R, a) {
  let e = {},
    t = H(T, ["prompt"]);
  if (R !== void 0 && t != null) Y(R, ["instances[0]", "prompt"], t);
  let r = H(T, ["image"]);
  if (R !== void 0 && r != null) Y(R, ["instances[0]", "image"], cU(r));
  let h = H(T, ["video"]);
  if (R !== void 0 && h != null) Y(R, ["instances[0]", "video"], l6T(h));
  return e;
}