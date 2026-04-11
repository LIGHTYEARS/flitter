// Module: pair
// Original: Pm
// Type: CJS (RT wrapper)
// Exports: Pair, createPair
// Category: util

// Module: Pm (CJS)
(T) => {
  var R = LN(),
    a = wPR(),
    e = ODT(),
    t = x8();
  function r(i, c, s) {
    let A = R.createNode(i, void 0, s),
      l = R.createNode(c, void 0, s);
    return new h(A, l);
  }
  class h {
    constructor(i, c = null) {
      (Object.defineProperty(this, t.NODE_TYPE, { value: t.PAIR }),
        (this.key = i),
        (this.value = c));
    }
    clone(i) {
      let { key: c, value: s } = this;
      if (t.isNode(c)) c = c.clone(i);
      if (t.isNode(s)) s = s.clone(i);
      return new h(c, s);
    }
    toJSON(i, c) {
      let s = c?.mapAsMap ? new Map() : {};
      return e.addPairToJSMap(c, s, this);
    }
    toString(i, c, s) {
      return i?.doc ? a.stringifyPair(this, i, c, s) : JSON.stringify(this);
    }
  }
  ((T.Pair = h), (T.createPair = r));
};
