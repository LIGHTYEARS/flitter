function QSR(T, R, a) {
  let e = {},
    t = H(T, ["prompt"]);
  if (R !== void 0 && t != null) Y(R, ["instances[0]", "prompt"], t);
  let r = H(T, ["image"]);
  if (R !== void 0 && r != null) Y(R, ["instances[0]", "image"], Cc(r));
  let h = H(T, ["scribbleImage"]);
  if (R !== void 0 && h != null) Y(R, ["instances[0]", "scribble"], KSR(h));
  return e;
}