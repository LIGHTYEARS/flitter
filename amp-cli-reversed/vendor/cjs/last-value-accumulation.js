// Module: last-value-accumulation
// Original: _tR
// Type: CJS (RT wrapper)
// Exports: LastValueAccumulation, LastValueAggregator
// Category: util

// Module: _tR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.LastValueAggregator = T.LastValueAccumulation = void 0));
  var R = ES(),
    a = $9(),
    e = tm();
  class t {
    startTime;
    _current;
    sampleTime;
    constructor(h, i = 0, c = [0, 0]) {
      ((this.startTime = h), (this._current = i), (this.sampleTime = c));
    }
    record(h) {
      ((this._current = h),
        (this.sampleTime = (0, a.millisToHrTime)(Date.now())));
    }
    setStartTime(h) {
      this.startTime = h;
    }
    toPointValue() {
      return this._current;
    }
  }
  T.LastValueAccumulation = t;
  class r {
    kind = R.AggregatorKind.LAST_VALUE;
    createAccumulation(h) {
      return new t(h);
    }
    merge(h, i) {
      let c =
        (0, a.hrTimeToMicroseconds)(i.sampleTime) >=
        (0, a.hrTimeToMicroseconds)(h.sampleTime)
          ? i
          : h;
      return new t(h.startTime, c.toPointValue(), c.sampleTime);
    }
    diff(h, i) {
      let c =
        (0, a.hrTimeToMicroseconds)(i.sampleTime) >=
        (0, a.hrTimeToMicroseconds)(h.sampleTime)
          ? i
          : h;
      return new t(i.startTime, c.toPointValue(), c.sampleTime);
    }
    toMetricData(h, i, c, s) {
      return {
        descriptor: h,
        aggregationTemporality: i,
        dataPointType: e.DataPointType.GAUGE,
        dataPoints: c.map(([A, l]) => {
          return {
            attributes: A,
            startTime: l.startTime,
            endTime: s,
            value: l.toPointValue(),
          };
        }),
      };
    }
  }
  T.LastValueAggregator = r;
};
