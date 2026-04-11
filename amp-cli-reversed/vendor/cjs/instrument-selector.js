// Module: instrument-selector
// Original: LtR
// Type: CJS (RT wrapper)
// Exports: InstrumentSelector
// Category: util

// Module: ltR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.LogarithmMapping = void 0));
  var R = W$T(),
    a = pZ(),
    e = _Z();
  class t {
    _scale;
    _scaleFactor;
    _inverseFactor;
    constructor(r) {
      ((this._scale = r),
        (this._scaleFactor = a.ldexp(Math.LOG2E, r)),
        (this._inverseFactor = a.ldexp(Math.LN2, -r)));
    }
    mapToIndex(r) {
      if (r <= R.MIN_VALUE) return this._minNormalLowerBoundaryIndex() - 1;
      if (R.getSignificand(r) === 0)
        return (R.getNormalBase2(r) << this._scale) - 1;
      let h = Math.floor(Math.log(r) * this._scaleFactor),
        i = this._maxNormalLowerBoundaryIndex();
      if (h >= i) return i;
      return h;
    }
    lowerBoundary(r) {
      let h = this._maxNormalLowerBoundaryIndex();
      if (r >= h) {
        if (r === h)
          return 2 * Math.exp((r - (1 << this._scale)) / this._scaleFactor);
        throw new e.MappingError(
          `overflow: ${r} is > maximum lower boundary: ${h}`,
        );
      }
      let i = this._minNormalLowerBoundaryIndex();
      if (r <= i) {
        if (r === i) return R.MIN_VALUE;
        else if (r === i - 1)
          return Math.exp((r + (1 << this._scale)) / this._scaleFactor) / 2;
        throw new e.MappingError(
          `overflow: ${r} is < minimum lower boundary: ${i}`,
        );
      }
      return Math.exp(r * this._inverseFactor);
    }
    get scale() {
      return this._scale;
    }
    _minNormalLowerBoundaryIndex() {
      return R.MIN_NORMAL_EXPONENT << this._scale;
    }
    _maxNormalLowerBoundaryIndex() {
      return ((R.MAX_NORMAL_EXPONENT + 1) << this._scale) - 1;
    }
  }
  T.LogarithmMapping = t;
};
