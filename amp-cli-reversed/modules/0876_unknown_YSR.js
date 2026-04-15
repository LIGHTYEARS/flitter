function YSR(T, R) {
  let a = {},
    e = H(T, ["predictions"]);
  if (e != null) {
    let t = e;
    if (Array.isArray(t)) t = t.map(r => {
      return kSR(r);
    });
    Y(a, ["generatedMasks"], t);
  }
  return a;
}