function $jR(T, R) {
  let a = {},
    e = H(T, ["citationSources"]);
  if (e != null) {
    let t = e;
    if (Array.isArray(t)) t = t.map(r => {
      return r;
    });
    Y(a, ["citations"], t);
  }
  return a;
}