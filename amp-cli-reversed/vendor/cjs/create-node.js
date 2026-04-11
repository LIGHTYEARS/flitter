// Module: create-node
// Original: LN
// Type: CJS (RT wrapper)
// Exports: createNode
// Category: util

// Module: LN (CJS)
(T) => {
  var R = CN(),
    a = x8(),
    e = Qa(),
    t = "tag:yaml.org,2002:";
  function r(i, c, s) {
    if (c) {
      let A = s.filter((o) => o.tag === c),
        l = A.find((o) => !o.format) ?? A[0];
      if (!l) throw Error(`Tag ${c} not found`);
      return l;
    }
    return s.find((A) => A.identify?.(i) && !A.format);
  }
  function h(i, c, s) {
    if (a.isDocument(i)) i = i.contents;
    if (a.isNode(i)) return i;
    if (a.isPair(i)) {
      let y = s.schema[a.MAP].createNode?.(s.schema, null, s);
      return (y.items.push(i), y);
    }
    if (
      i instanceof String ||
      i instanceof Number ||
      i instanceof Boolean ||
      (typeof BigInt < "u" && i instanceof BigInt)
    )
      i = i.valueOf();
    let {
        aliasDuplicateObjects: A,
        onAnchor: l,
        onTagObj: o,
        schema: n,
        sourceObjects: p,
      } = s,
      _ = void 0;
    if (A && i && typeof i === "object")
      if (((_ = p.get(i)), _))
        return (_.anchor ?? (_.anchor = l(i)), new R.Alias(_.anchor));
      else ((_ = { anchor: null, node: null }), p.set(i, _));
    if (c?.startsWith("!!")) c = t + c.slice(2);
    let m = r(i, c, n.tags);
    if (!m) {
      if (i && typeof i.toJSON === "function") i = i.toJSON();
      if (!i || typeof i !== "object") {
        let y = new e.Scalar(i);
        if (_) _.node = y;
        return y;
      }
      m =
        i instanceof Map
          ? n[a.MAP]
          : Symbol.iterator in Object(i)
            ? n[a.SEQ]
            : n[a.MAP];
    }
    if (o) (o(m), delete s.onTagObj);
    let b = m?.createNode
      ? m.createNode(s.schema, i, s)
      : typeof m?.nodeClass?.from === "function"
        ? m.nodeClass.from(s.schema, i, s)
        : new e.Scalar(i);
    if (c) b.tag = c;
    else if (!m.default) b.tag = m.tag;
    if (_) _.node = b;
    return b;
  }
  T.createNode = h;
};
