// Module: alias-2
// Original: x8
// Type: CJS (RT wrapper)
// Exports: ALIAS, DOC, MAP, NODE_TYPE, PAIR, SCALAR, SEQ, hasAnchor, isAlias, isCollection, isDocument, isMap, isNode, isPair, isScalar, isSeq
// Category: util

// Module: x8 (CJS)
(T) => {
  var R = Symbol.for("yaml.alias"),
    a = Symbol.for("yaml.document"),
    e = Symbol.for("yaml.map"),
    t = Symbol.for("yaml.pair"),
    r = Symbol.for("yaml.scalar"),
    h = Symbol.for("yaml.seq"),
    i = Symbol.for("yaml.node.type"),
    c = (b) => !!b && typeof b === "object" && b[i] === R,
    s = (b) => !!b && typeof b === "object" && b[i] === a,
    A = (b) => !!b && typeof b === "object" && b[i] === e,
    l = (b) => !!b && typeof b === "object" && b[i] === t,
    o = (b) => !!b && typeof b === "object" && b[i] === r,
    n = (b) => !!b && typeof b === "object" && b[i] === h;
  function p(b) {
    if (b && typeof b === "object")
      switch (b[i]) {
        case e:
        case h:
          return !0;
      }
    return !1;
  }
  function _(b) {
    if (b && typeof b === "object")
      switch (b[i]) {
        case R:
        case e:
        case r:
        case h:
          return !0;
      }
    return !1;
  }
  var m = (b) => (o(b) || p(b)) && !!b.anchor;
  ((T.ALIAS = R),
    (T.DOC = a),
    (T.MAP = e),
    (T.NODE_TYPE = i),
    (T.PAIR = t),
    (T.SCALAR = r),
    (T.SEQ = h),
    (T.hasAnchor = m),
    (T.isAlias = c),
    (T.isCollection = p),
    (T.isDocument = s),
    (T.isMap = A),
    (T.isNode = _),
    (T.isPair = l),
    (T.isScalar = o),
    (T.isSeq = n));
};
