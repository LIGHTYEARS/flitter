function qSR(T, R) {
  let a = {},
    e = H(T, ["predictions"]);
  if (e != null) {
    let t = e;
    if (Array.isArray(t)) t = t.map(r => {
      return iU(r);
    });
    Y(a, ["generatedImages"], t);
  }
  return a;
}