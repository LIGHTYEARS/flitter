function i70(T, {
  maxDepth: R = 1000,
  integersAsBigInt: a
} = {}) {
  let e = {},
    t = {},
    r = e,
    h = t;
  for (let i = ws(T, 0); i < T.length;) {
    if (T[i] === "[") {
      let c = T[++i] === "[",
        s = PQ(T, i += +c, "]");
      if (c) {
        if (T[s[1] - 1] !== "]") throw new A8("expected end of table declaration", {
          toml: T,
          ptr: s[1] - 1
        });
        s[1]++;
      }
      let A = YIT(s[0], e, t, c ? 2 : 1);
      if (!A) throw new A8("trying to redefine an already defined table or value", {
        toml: T,
        ptr: i
      });
      h = A[2], r = A[1], i = s[1];
    } else {
      let c = PQ(T, i),
        s = YIT(c[0], r, h, 0);
      if (!s) throw new A8("trying to redefine an already defined table or value", {
        toml: T,
        ptr: i
      });
      let A = ErT(T, c[1], void 0, R, a);
      s[1][s[0]] = A[0], i = A[1];
    }
    if (i = ws(T, i, !0), T[i] && T[i] !== `
` && T[i] !== "\r") throw new A8("each key-value declaration must be followed by an end-of-line", {
      toml: T,
      ptr: i
    });
    i = ws(T, i);
  }
  return e;
}