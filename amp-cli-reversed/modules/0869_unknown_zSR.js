function zSR(T, R, a) {
  let e = {},
    t = H(T, ["prompt"]);
  if (R !== void 0 && t != null) Y(R, ["instances[0]", "prompt"], t);
  let r = H(T, ["personImage"]);
  if (R !== void 0 && r != null) Y(R, ["instances[0]", "personImage", "image"], Cc(r));
  let h = H(T, ["productImages"]);
  if (R !== void 0 && h != null) {
    let i = h;
    if (Array.isArray(i)) i = i.map(c => {
      return USR(c);
    });
    Y(R, ["instances[0]", "productImages"], i);
  }
  return e;
}