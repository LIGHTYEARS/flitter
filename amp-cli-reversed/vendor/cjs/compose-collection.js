// Module: compose-collection
// Original: XPR
// Type: CJS (RT wrapper)
// Exports: composeCollection
// Category: util

// Module: XPR (CJS)
(T) => {
  var R = x8(),
    a = Qa(),
    e = km(),
    t = xm(),
    r = GPR(),
    h = KPR(),
    i = VPR();
  function c(A, l, o, n, p, _) {
    let m =
        o.type === "block-map"
          ? r.resolveBlockMap(A, l, o, n, _)
          : o.type === "block-seq"
            ? h.resolveBlockSeq(A, l, o, n, _)
            : i.resolveFlowCollection(A, l, o, n, _),
      b = m.constructor;
    if (p === "!" || p === b.tagName) return ((m.tag = b.tagName), m);
    if (p) m.tag = p;
    return m;
  }
  function s(A, l, o, n, p) {
    let _ = n.tag,
      m = !_
        ? null
        : l.directives.tagName(_.source, (x) => p(_, "TAG_RESOLVE_FAILED", x));
    if (o.type === "block-seq") {
      let { anchor: x, newlineAfterProp: f } = n,
        v = x && _ ? (x.offset > _.offset ? x : _) : (x ?? _);
      if (v && (!f || f.offset < v.offset))
        p(v, "MISSING_CHAR", "Missing newline after block sequence props");
    }
    let b =
      o.type === "block-map"
        ? "map"
        : o.type === "block-seq"
          ? "seq"
          : o.start.source === "{"
            ? "map"
            : "seq";
    if (
      !_ ||
      !m ||
      m === "!" ||
      (m === e.YAMLMap.tagName && b === "map") ||
      (m === t.YAMLSeq.tagName && b === "seq")
    )
      return c(A, l, o, p, m);
    let y = l.schema.tags.find((x) => x.tag === m && x.collection === b);
    if (!y) {
      let x = l.schema.knownTags[m];
      if (x?.collection === b)
        (l.schema.tags.push(Object.assign({}, x, { default: !1 })), (y = x));
      else {
        if (x)
          p(
            _,
            "BAD_COLLECTION_TYPE",
            `${x.tag} used for ${b} collection, but expects ${x.collection ?? "scalar"}`,
            !0,
          );
        else p(_, "TAG_RESOLVE_FAILED", `Unresolved tag: ${m}`, !0);
        return c(A, l, o, p, m);
      }
    }
    let u = c(A, l, o, p, m, y),
      P = y.resolve?.(u, (x) => p(_, "TAG_RESOLVE_FAILED", x), l.options) ?? u,
      k = R.isNode(P) ? P : new a.Scalar(P);
    if (((k.range = u.range), (k.tag = m), y?.format)) k.format = y.format;
    return k;
  }
  T.composeCollection = s;
};
