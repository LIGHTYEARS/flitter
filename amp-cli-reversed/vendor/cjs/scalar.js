// Module: scalar
// Original: Qa
// Type: CJS (RT wrapper)
// Exports: Scalar, isScalarValue
// Category: util

// Module: Qa (CJS)
(T) => {
  var R = x8(),
    a = W9T(),
    e = ym(),
    t = (h) => !h || (typeof h !== "function" && typeof h !== "object");
  class r extends a.NodeBase {
    constructor(h) {
      super(R.SCALAR);
      this.value = h;
    }
    toJSON(h, i) {
      return i?.keep ? this.value : e.toJS(this.value, h, i);
    }
    toString() {
      return String(this.value);
    }
  }
  ((r.BLOCK_FOLDED = "BLOCK_FOLDED"),
    (r.BLOCK_LITERAL = "BLOCK_LITERAL"),
    (r.PLAIN = "PLAIN"),
    (r.QUOTE_DOUBLE = "QUOTE_DOUBLE"),
    (r.QUOTE_SINGLE = "QUOTE_SINGLE"),
    (T.Scalar = r),
    (T.isScalarValue = t));
};
