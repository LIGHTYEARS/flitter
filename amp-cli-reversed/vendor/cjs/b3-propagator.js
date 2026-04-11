// Module: b3-propagator
// Original: oiR
// Type: CJS (RT wrapper)
// Exports: B3Propagator
// Category: util

// Module: oiR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.B3Propagator = void 0));
  var R = $9(),
    a = ciR(),
    e = siR(),
    t = FB(),
    r = HvT();
  class h {
    _b3MultiPropagator = new a.B3MultiPropagator();
    _b3SinglePropagator = new e.B3SinglePropagator();
    _inject;
    _fields;
    constructor(i = {}) {
      if (i.injectEncoding === r.B3InjectEncoding.MULTI_HEADER)
        ((this._inject = this._b3MultiPropagator.inject),
          (this._fields = this._b3MultiPropagator.fields()));
      else
        ((this._inject = this._b3SinglePropagator.inject),
          (this._fields = this._b3SinglePropagator.fields()));
    }
    inject(i, c, s) {
      if ((0, R.isTracingSuppressed)(i)) return;
      this._inject(i, c, s);
    }
    extract(i, c, s) {
      let A = s.get(c, t.B3_CONTEXT_HEADER);
      if (Array.isArray(A) ? A[0] : A)
        return this._b3SinglePropagator.extract(i, c, s);
      else return this._b3MultiPropagator.extract(i, c, s);
    }
    fields() {
      return this._fields;
    }
  }
  T.B3Propagator = h;
};
