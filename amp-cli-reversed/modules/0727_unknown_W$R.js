function W$R(T, R) {
  let a = {},
    e = H(R, ["contents"]);
  if (e != null) {
    let r = U8T(T, e);
    if (Array.isArray(r)) r = r.map(h => {
      return h;
    });
    Y(a, ["requests[]", "request", "content"], r);
  }
  let t = H(R, ["config"]);
  if (t != null) Y(a, ["_self"], q$R(t, a)), T$R(a, {
    "requests[].*": "requests[].request.*"
  });
  return a;
}