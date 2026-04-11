// Module: opentelemetry-trace-state-impl
// Original: laR
// Type: CJS (RT wrapper)
// Exports: TraceStateImpl
// Category: npm-pkg

// Module: laR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.TraceStateImpl = void 0));
  var R = naR(),
    a = 32,
    e = 512,
    t = ",",
    r = "=";
  class h {
    constructor(i) {
      if (((this._internalState = new Map()), i)) this._parse(i);
    }
    set(i, c) {
      let s = this._clone();
      if (s._internalState.has(i)) s._internalState.delete(i);
      return (s._internalState.set(i, c), s);
    }
    unset(i) {
      let c = this._clone();
      return (c._internalState.delete(i), c);
    }
    get(i) {
      return this._internalState.get(i);
    }
    serialize() {
      return this._keys()
        .reduce((i, c) => {
          return (i.push(c + r + this.get(c)), i);
        }, [])
        .join(t);
    }
    _parse(i) {
      if (i.length > e) return;
      if (
        ((this._internalState = i
          .split(t)
          .reverse()
          .reduce((c, s) => {
            let A = s.trim(),
              l = A.indexOf(r);
            if (l !== -1) {
              let o = A.slice(0, l),
                n = A.slice(l + 1, s.length);
              if ((0, R.validateKey)(o) && (0, R.validateValue)(n)) c.set(o, n);
            }
            return c;
          }, new Map())),
        this._internalState.size > a)
      )
        this._internalState = new Map(
          Array.from(this._internalState.entries()).reverse().slice(0, a),
        );
    }
    _keys() {
      return Array.from(this._internalState.keys()).reverse();
    }
    _clone() {
      let i = new h();
      return ((i._internalState = new Map(this._internalState)), i);
    }
  }
  T.TraceStateImpl = h;
};
