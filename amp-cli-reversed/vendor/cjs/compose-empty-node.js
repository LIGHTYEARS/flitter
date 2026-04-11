// Module: compose-empty-node
// Original: ZPR
// Type: CJS (RT wrapper)
// Exports: composeEmptyNode, composeNode
// Category: util

// Module: zPR (CJS)
(T) => {
  var R = nO(),
    a = F9T(),
    e = lO(),
    t = BN(),
    r = EDT(),
    h = CDT(),
    i = LDT(),
    c = BPR(),
    s = NPR(),
    A = MDT(),
    l = z9T(),
    o = DDT(),
    n = G9T(),
    p = qPR(),
    _ = wDT(),
    m = BDT(),
    b = new Map([
      ["core", c.schema],
      ["failsafe", [R.map, e.seq, t.string]],
      ["json", s.schema],
      ["yaml11", p.schema],
      ["yaml-1.1", p.schema],
    ]),
    y = {
      binary: A.binary,
      bool: r.boolTag,
      float: h.float,
      floatExp: h.floatExp,
      floatNaN: h.floatNaN,
      floatTime: m.floatTime,
      int: i.int,
      intHex: i.intHex,
      intOct: i.intOct,
      intTime: m.intTime,
      map: R.map,
      merge: l.merge,
      null: a.nullTag,
      omap: o.omap,
      pairs: n.pairs,
      seq: e.seq,
      set: _.set,
      timestamp: m.timestamp,
    },
    u = {
      "tag:yaml.org,2002:binary": A.binary,
      "tag:yaml.org,2002:merge": l.merge,
      "tag:yaml.org,2002:omap": o.omap,
      "tag:yaml.org,2002:pairs": n.pairs,
      "tag:yaml.org,2002:set": _.set,
      "tag:yaml.org,2002:timestamp": m.timestamp,
    };
  function P(k, x, f) {
    let v = b.get(x);
    if (v && !k)
      return f && !v.includes(l.merge) ? v.concat(l.merge) : v.slice();
    let g = v;
    if (!g)
      if (Array.isArray(k)) g = [];
      else {
        let I = Array.from(b.keys())
          .filter((S) => S !== "yaml11")
          .map((S) => JSON.stringify(S))
          .join(", ");
        throw Error(
          `Unknown schema "${x}"; use one of ${I} or define customTags array`,
        );
      }
    if (Array.isArray(k)) for (let I of k) g = g.concat(I);
    else if (typeof k === "function") g = k(g.slice());
    if (f) g = g.concat(l.merge);
    return g.reduce((I, S) => {
      let O = typeof S === "string" ? y[S] : S;
      if (!O) {
        let j = JSON.stringify(S),
          d = Object.keys(y)
            .map((C) => JSON.stringify(C))
            .join(", ");
        throw Error(`Unknown custom tag ${j}; use one of ${d}`);
      }
      if (!I.includes(O)) I.push(O);
      return I;
    }, []);
  }
  ((T.coreKnownTags = u), (T.getTags = P));
};
