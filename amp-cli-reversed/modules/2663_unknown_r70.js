function r70(T, R, a, e) {
  let t = {},
    r = new Set(),
    h;
  R++;
  while ((h = T[R++]) !== "}" && h) if (h === ",") throw new A8("expected value, found comma", {
    toml: T,
    ptr: R - 1
  });else if (h === "#") R = eW(T, R);else if (h !== " " && h !== "\t" && h !== `
` && h !== "\r") {
    let i,
      c = t,
      s = !1,
      [A, l] = PQ(T, R - 1);
    for (let p = 0; p < A.length; p++) {
      if (p) c = s ? c[i] : c[i] = {};
      if (i = A[p], (s = Object.hasOwn(c, i)) && (typeof c[i] !== "object" || r.has(c[i]))) throw new A8("trying to redefine an already defined value", {
        toml: T,
        ptr: R
      });
      if (!s && i === "__proto__") Object.defineProperty(c, i, {
        enumerable: !0,
        configurable: !0,
        writable: !0
      });
    }
    if (s) throw new A8("trying to redefine an already defined value", {
      toml: T,
      ptr: R
    });
    let [o, n] = ErT(T, l, "}", a - 1, e);
    r.add(o), c[i] = o, R = n;
  }
  if (!h) throw new A8("unfinished table encountered", {
    toml: T,
    ptr: R
  });
  return [t, R];
}