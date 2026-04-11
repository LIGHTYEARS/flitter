// Module: sum-accumulation
// Original: btR
// Type: CJS (RT wrapper)
// Exports: SumAccumulation, SumAggregator
// Category: util

// Module: btR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.SumAggregator = T.SumAccumulation = void 0));
  var R = ES(),
    a = tm();
  class e {
    startTime;
    monotonic;
    _current;
    reset;
    constructor(r, h, i = 0, c = !1) {
      ((this.startTime = r),
        (this.monotonic = h),
        (this._current = i),
        (this.reset = c));
    }
    record(r) {
      if (this.monotonic && r < 0) return;
      this._current += r;
    }
    setStartTime(r) {
      this.startTime = r;
    }
    toPointValue() {
      return this._current;
    }
  }
  T.SumAccumulation = e;
  class t {
    monotonic;
    kind = R.AggregatorKind.SUM;
    constructor(r) {
      this.monotonic = r;
    }
    createAccumulation(r) {
      return new e(r, this.monotonic);
    }
    merge(r, h) {
      let i = r.toPointValue(),
        c = h.toPointValue();
      if (h.reset) return new e(h.startTime, this.monotonic, c, h.reset);
      return new e(r.startTime, this.monotonic, i + c);
    }
    diff(r, h) {
      let i = r.toPointValue(),
        c = h.toPointValue();
      if (this.monotonic && i > c)
        return new e(h.startTime, this.monotonic, c, !0);
      return new e(h.startTime, this.monotonic, c - i);
    }
    toMetricData(r, h, i, c) {
      return {
        descriptor: r,
        aggregationTemporality: h,
        dataPointType: a.DataPointType.SUM,
        dataPoints: i.map(([s, A]) => {
          return {
            attributes: s,
            startTime: A.startTime,
            endTime: c,
            value: A.toPointValue(),
          };
        }),
        isMonotonic: this.monotonic,
      };
    }
  }
  T.SumAggregator = t;
};
