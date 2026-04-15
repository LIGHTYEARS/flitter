function PQ(T, R, a = "=") {
  let e = R - 1,
    t = [],
    r = T.indexOf(a, R);
  if (r < 0) throw new A8("incomplete key-value: cannot find end of key", {
    toml: T,
    ptr: R
  });
  do {
    let h = T[R = ++e];
    if (h !== " " && h !== "\t") if (h === '"' || h === "'") {
      if (h === T[R + 1] && h === T[R + 2]) throw new A8("multiline strings are not allowed in keys", {
        toml: T,
        ptr: R
      });
      let i = VJT(T, R);
      if (i < 0) throw new A8("unfinished string encountered", {
        toml: T,
        ptr: R
      });
      e = T.indexOf(".", i);
      let c = T.slice(i, e < 0 || e > r ? r : e),
        s = yQ(c);
      if (s > -1) throw new A8("newlines are not allowed in keys", {
        toml: T,
        ptr: R + e + s
      });
      if (c.trimStart()) throw new A8("found extra tokens after the string part", {
        toml: T,
        ptr: i
      });
      if (r < i) {
        if (r = T.indexOf(a, i), r < 0) throw new A8("incomplete key-value: cannot find end of key", {
          toml: T,
          ptr: R
        });
      }
      t.push(XJT(T, R, i));
    } else {
      e = T.indexOf(".", R);
      let i = T.slice(R, e < 0 || e > r ? r : e);
      if (!t70.test(i)) throw new A8("only letter, numbers, dashes and underscores are allowed in keys", {
        toml: T,
        ptr: R
      });
      t.push(i.trimEnd());
    }
  } while (e + 1 && e < r);
  return [t, ws(T, r + 1, !0, !0)];
}