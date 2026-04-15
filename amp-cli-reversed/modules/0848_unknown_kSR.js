function kSR(T, R) {
  let a = {},
    e = H(T, ["_self"]);
  if (e != null) Y(a, ["mask"], c6T(e));
  let t = H(T, ["labels"]);
  if (t != null) {
    let r = t;
    if (Array.isArray(r)) r = r.map(h => {
      return h;
    });
    Y(a, ["labels"], r);
  }
  return a;
}