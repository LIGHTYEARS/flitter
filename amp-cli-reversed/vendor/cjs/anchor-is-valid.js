// Module: anchor-is-valid
// Original: H9T
// Type: CJS (RT wrapper)
// Exports: anchorIsValid, anchorNames, createNodeAnchors, findNewAnchor
// Category: util

// Module: H9T (CJS)
(T) => {
  var R = x8(),
    a = EN();
  function e(i) {
    if (/[\x00-\x19\s,[\]{}]/.test(i)) {
      let c = `Anchor must not contain whitespace or control characters: ${JSON.stringify(i)}`;
      throw Error(c);
    }
    return !0;
  }
  function t(i) {
    let c = new Set();
    return (
      a.visit(i, {
        Value(s, A) {
          if (A.anchor) c.add(A.anchor);
        },
      }),
      c
    );
  }
  function r(i, c) {
    for (let s = 1; ; ++s) {
      let A = `${i}${s}`;
      if (!c.has(A)) return A;
    }
  }
  function h(i, c) {
    let s = [],
      A = new Map(),
      l = null;
    return {
      onAnchor: (o) => {
        (s.push(o), l ?? (l = t(i)));
        let n = r(c, l);
        return (l.add(n), n);
      },
      setAnchors: () => {
        for (let o of s) {
          let n = A.get(o);
          if (
            typeof n === "object" &&
            n.anchor &&
            (R.isScalar(n.node) || R.isCollection(n.node))
          )
            n.node.anchor = n.anchor;
          else {
            let p = Error(
              "Failed to resolve repeated object (this should not happen)",
            );
            throw ((p.source = o), p);
          }
        }
      },
      sourceObjects: A,
    };
  }
  ((T.anchorIsValid = e),
    (T.anchorNames = t),
    (T.createNodeAnchors = h),
    (T.findNewAnchor = r));
};
