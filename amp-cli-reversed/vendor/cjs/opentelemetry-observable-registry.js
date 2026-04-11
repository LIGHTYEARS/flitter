// Module: opentelemetry-observable-registry
// Original: StR
// Type: CJS (RT wrapper)
// Exports: ObservableRegistry
// Category: npm-pkg

// Module: stR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.HistogramAggregator = T.HistogramAccumulation = void 0));
  var R = ES(),
    a = tm(),
    e = Fs();
  function t(i) {
    let c = i.map(() => 0);
    return (
      c.push(0),
      {
        buckets: { boundaries: i, counts: c },
        sum: 0,
        count: 0,
        hasMinMax: !1,
        min: 1 / 0,
        max: -1 / 0,
      }
    );
  }
  class r {
    startTime;
    _boundaries;
    _recordMinMax;
    _current;
    constructor(i, c, s = !0, A = t(c)) {
      ((this.startTime = i),
        (this._boundaries = c),
        (this._recordMinMax = s),
        (this._current = A));
    }
    record(i) {
      if (Number.isNaN(i)) return;
      if (
        ((this._current.count += 1),
        (this._current.sum += i),
        this._recordMinMax)
      )
        ((this._current.min = Math.min(i, this._current.min)),
          (this._current.max = Math.max(i, this._current.max)),
          (this._current.hasMinMax = !0));
      let c = (0, e.binarySearchUB)(this._boundaries, i);
      this._current.buckets.counts[c] += 1;
    }
    setStartTime(i) {
      this.startTime = i;
    }
    toPointValue() {
      return this._current;
    }
  }
  T.HistogramAccumulation = r;
  class h {
    _boundaries;
    _recordMinMax;
    kind = R.AggregatorKind.HISTOGRAM;
    constructor(i, c) {
      ((this._boundaries = i), (this._recordMinMax = c));
    }
    createAccumulation(i) {
      return new r(i, this._boundaries, this._recordMinMax);
    }
    merge(i, c) {
      let s = i.toPointValue(),
        A = c.toPointValue(),
        l = s.buckets.counts,
        o = A.buckets.counts,
        n = Array(l.length);
      for (let m = 0; m < l.length; m++) n[m] = l[m] + o[m];
      let p = 1 / 0,
        _ = -1 / 0;
      if (this._recordMinMax) {
        if (s.hasMinMax && A.hasMinMax)
          ((p = Math.min(s.min, A.min)), (_ = Math.max(s.max, A.max)));
        else if (s.hasMinMax) ((p = s.min), (_ = s.max));
        else if (A.hasMinMax) ((p = A.min), (_ = A.max));
      }
      return new r(i.startTime, s.buckets.boundaries, this._recordMinMax, {
        buckets: { boundaries: s.buckets.boundaries, counts: n },
        count: s.count + A.count,
        sum: s.sum + A.sum,
        hasMinMax: this._recordMinMax && (s.hasMinMax || A.hasMinMax),
        min: p,
        max: _,
      });
    }
    diff(i, c) {
      let s = i.toPointValue(),
        A = c.toPointValue(),
        l = s.buckets.counts,
        o = A.buckets.counts,
        n = Array(l.length);
      for (let p = 0; p < l.length; p++) n[p] = o[p] - l[p];
      return new r(c.startTime, s.buckets.boundaries, this._recordMinMax, {
        buckets: { boundaries: s.buckets.boundaries, counts: n },
        count: A.count - s.count,
        sum: A.sum - s.sum,
        hasMinMax: !1,
        min: 1 / 0,
        max: -1 / 0,
      });
    }
    toMetricData(i, c, s, A) {
      return {
        descriptor: i,
        aggregationTemporality: c,
        dataPointType: a.DataPointType.HISTOGRAM,
        dataPoints: s.map(([l, o]) => {
          let n = o.toPointValue(),
            p =
              i.type === a.InstrumentType.GAUGE ||
              i.type === a.InstrumentType.UP_DOWN_COUNTER ||
              i.type === a.InstrumentType.OBSERVABLE_GAUGE ||
              i.type === a.InstrumentType.OBSERVABLE_UP_DOWN_COUNTER;
          return {
            attributes: l,
            startTime: o.startTime,
            endTime: A,
            value: {
              min: n.hasMinMax ? n.min : void 0,
              max: n.hasMinMax ? n.max : void 0,
              sum: !p ? n.sum : void 0,
              buckets: n.buckets,
              count: n.count,
            },
          };
        }),
      };
    }
  }
  T.HistogramAggregator = h;
};
