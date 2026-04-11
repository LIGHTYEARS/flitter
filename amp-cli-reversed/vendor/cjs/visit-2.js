// Module: visit-2
// Original: akR
// Type: CJS (RT wrapper)
// Exports: visit
// Category: util

// Module: akR (CJS)
(T) => {
  var R = Symbol("break visit"),
    a = Symbol("skip children"),
    e = Symbol("remove item");
  function t(h, i) {
    if ("type" in h && h.type === "document")
      h = { start: h.start, value: h.value };
    r(Object.freeze([]), h, i);
  }
  ((t.BREAK = R),
    (t.SKIP = a),
    (t.REMOVE = e),
    (t.itemAtPath = (h, i) => {
      let c = h;
      for (let [s, A] of i) {
        let l = c?.[s];
        if (l && "items" in l) c = l.items[A];
        else return;
      }
      return c;
    }),
    (t.parentCollection = (h, i) => {
      let c = t.itemAtPath(h, i.slice(0, -1)),
        s = i[i.length - 1][0],
        A = c?.[s];
      if (A && "items" in A) return A;
      throw Error("Parent collection not found");
    }));
  function r(h, i, c) {
    let s = c(i, h);
    if (typeof s === "symbol") return s;
    for (let A of ["key", "value"]) {
      let l = i[A];
      if (l && "items" in l) {
        for (let o = 0; o < l.items.length; ++o) {
          let n = r(Object.freeze(h.concat([[A, o]])), l.items[o], c);
          if (typeof n === "number") o = n - 1;
          else if (n === R) return R;
          else if (n === e) (l.items.splice(o, 1), (o -= 1));
        }
        if (typeof s === "function" && A === "key") s = s(i, h);
      }
    }
    return typeof s === "function" ? s(i, h) : s;
  }
  T.visit = t;
};
