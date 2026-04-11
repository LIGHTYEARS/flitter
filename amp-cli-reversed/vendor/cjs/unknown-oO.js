// Module: unknown-oO
// Original: oO
// Type: CJS (RT wrapper)
// Exports: default
// Category: unknown

// Module: oO (CJS)
(T) => {
  Object.defineProperty(T, "__esModule", { value: !0 });
  var R = jN();
  class a extends Error {
    constructor(e, t, r, h) {
      super(h || `can't resolve reference ${r} from id ${t}`);
      ((this.missingRef = (0, R.resolveUrl)(e, t, r)),
        (this.missingSchema = (0, R.normalizeId)(
          (0, R.getFullPath)(e, this.missingRef),
        )));
    }
  }
  T.default = a;
};
