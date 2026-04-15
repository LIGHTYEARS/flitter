function wST(T, R) {
  if ("_idmap" in T) {
    let e = T,
      t = ak({
        ...R,
        processors: _D
      }),
      r = {};
    for (let c of e._idmap.entries()) {
      let [s, A] = c;
      T3(A, t);
    }
    let h = {},
      i = {
        registry: e,
        uri: R?.uri,
        defs: r
      };
    t.external = i;
    for (let c of e._idmap.entries()) {
      let [s, A] = c;
      ek(t, A), h[s] = tk(t, A);
    }
    if (Object.keys(r).length > 0) {
      let c = t.target === "draft-2020-12" ? "$defs" : "definitions";
      h.__shared = {
        [c]: r
      };
    }
    return {
      schemas: h
    };
  }
  let a = ak({
    ...R,
    processors: _D
  });
  return T3(T, a), ek(a, T), tk(a, T);
}