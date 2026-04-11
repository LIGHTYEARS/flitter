// Module: create-pairs
// Original: G9T
// Type: CJS (RT wrapper)
// Exports: createPairs, pairs, resolvePairs
// Category: util

// Module: G9T (CJS)
(T) => {
  var R = x8(),
    a = Pm(),
    e = Qa(),
    t = xm();
  function r(c, s) {
    if (R.isSeq(c))
      for (let A = 0; A < c.items.length; ++A) {
        let l = c.items[A];
        if (R.isPair(l)) continue;
        else if (R.isMap(l)) {
          if (l.items.length > 1)
            s("Each pair must have its own sequence indicator");
          let o = l.items[0] || new a.Pair(new e.Scalar(null));
          if (l.commentBefore)
            o.key.commentBefore = o.key.commentBefore
              ? `${l.commentBefore}
${o.key.commentBefore}`
              : l.commentBefore;
          if (l.comment) {
            let n = o.value ?? o.key;
            n.comment = n.comment
              ? `${l.comment}
${n.comment}`
              : l.comment;
          }
          l = o;
        }
        c.items[A] = R.isPair(l) ? l : new a.Pair(l);
      }
    else s("Expected a sequence for this tag");
    return c;
  }
  function h(c, s, A) {
    let { replacer: l } = A,
      o = new t.YAMLSeq(c);
    o.tag = "tag:yaml.org,2002:pairs";
    let n = 0;
    if (s && Symbol.iterator in Object(s))
      for (let p of s) {
        if (typeof l === "function") p = l.call(s, String(n++), p);
        let _, m;
        if (Array.isArray(p))
          if (p.length === 2) ((_ = p[0]), (m = p[1]));
          else throw TypeError(`Expected [key, value] tuple: ${p}`);
        else if (p && p instanceof Object) {
          let b = Object.keys(p);
          if (b.length === 1) ((_ = b[0]), (m = p[_]));
          else
            throw TypeError(
              `Expected tuple with one key, not ${b.length} keys`,
            );
        } else _ = p;
        o.items.push(a.createPair(_, m, A));
      }
    return o;
  }
  var i = {
    collection: "seq",
    default: !1,
    tag: "tag:yaml.org,2002:pairs",
    resolve: r,
    createNode: h,
  };
  ((T.createPairs = h), (T.pairs = i), (T.resolvePairs = r));
};
