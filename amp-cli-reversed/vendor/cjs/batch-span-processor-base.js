// Module: batch-span-processor-base
// Original: UtR
// Type: CJS (RT wrapper)
// Exports: BatchSpanProcessorBase
// Category: util

// Module: utR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.DEFAULT_AGGREGATION =
      T.EXPONENTIAL_HISTOGRAM_AGGREGATION =
      T.HISTOGRAM_AGGREGATION =
      T.LAST_VALUE_AGGREGATION =
      T.SUM_AGGREGATION =
      T.DROP_AGGREGATION =
      T.DefaultAggregation =
      T.ExponentialHistogramAggregation =
      T.ExplicitBucketHistogramAggregation =
      T.HistogramAggregation =
      T.LastValueAggregation =
      T.SumAggregation =
      T.DropAggregation =
        void 0));
  var R = n0(),
    a = mtR(),
    e = tm();
  class t {
    static DEFAULT_INSTANCE = new a.DropAggregator();
    createAggregator(l) {
      return t.DEFAULT_INSTANCE;
    }
  }
  T.DropAggregation = t;
  class r {
    static MONOTONIC_INSTANCE = new a.SumAggregator(!0);
    static NON_MONOTONIC_INSTANCE = new a.SumAggregator(!1);
    createAggregator(l) {
      switch (l.type) {
        case e.InstrumentType.COUNTER:
        case e.InstrumentType.OBSERVABLE_COUNTER:
        case e.InstrumentType.HISTOGRAM:
          return r.MONOTONIC_INSTANCE;
        default:
          return r.NON_MONOTONIC_INSTANCE;
      }
    }
  }
  T.SumAggregation = r;
  class h {
    static DEFAULT_INSTANCE = new a.LastValueAggregator();
    createAggregator(l) {
      return h.DEFAULT_INSTANCE;
    }
  }
  T.LastValueAggregation = h;
  class i {
    static DEFAULT_INSTANCE = new a.HistogramAggregator(
      [0, 5, 10, 25, 50, 75, 100, 250, 500, 750, 1000, 2500, 5000, 7500, 1e4],
      !0,
    );
    createAggregator(l) {
      return i.DEFAULT_INSTANCE;
    }
  }
  T.HistogramAggregation = i;
  class c {
    _recordMinMax;
    _boundaries;
    constructor(l, o = !0) {
      if (((this._recordMinMax = o), l == null))
        throw Error(
          "ExplicitBucketHistogramAggregation should be created with explicit boundaries, if a single bucket histogram is required, please pass an empty array",
        );
      ((l = l.concat()), (l = l.sort((_, m) => _ - m)));
      let n = l.lastIndexOf(-1 / 0),
        p = l.indexOf(1 / 0);
      if (p === -1) p = void 0;
      this._boundaries = l.slice(n + 1, p);
    }
    createAggregator(l) {
      return new a.HistogramAggregator(this._boundaries, this._recordMinMax);
    }
  }
  T.ExplicitBucketHistogramAggregation = c;
  class s {
    _maxSize;
    _recordMinMax;
    constructor(l = 160, o = !0) {
      ((this._maxSize = l), (this._recordMinMax = o));
    }
    createAggregator(l) {
      return new a.ExponentialHistogramAggregator(
        this._maxSize,
        this._recordMinMax,
      );
    }
  }
  T.ExponentialHistogramAggregation = s;
  class A {
    _resolve(l) {
      switch (l.type) {
        case e.InstrumentType.COUNTER:
        case e.InstrumentType.UP_DOWN_COUNTER:
        case e.InstrumentType.OBSERVABLE_COUNTER:
        case e.InstrumentType.OBSERVABLE_UP_DOWN_COUNTER:
          return T.SUM_AGGREGATION;
        case e.InstrumentType.GAUGE:
        case e.InstrumentType.OBSERVABLE_GAUGE:
          return T.LAST_VALUE_AGGREGATION;
        case e.InstrumentType.HISTOGRAM: {
          if (l.advice.explicitBucketBoundaries)
            return new c(l.advice.explicitBucketBoundaries);
          return T.HISTOGRAM_AGGREGATION;
        }
      }
      return (
        R.diag.warn(`Unable to recognize instrument type: ${l.type}`),
        T.DROP_AGGREGATION
      );
    }
    createAggregator(l) {
      return this._resolve(l).createAggregator(l);
    }
  }
  ((T.DefaultAggregation = A),
    (T.DROP_AGGREGATION = new t()),
    (T.SUM_AGGREGATION = new r()),
    (T.LAST_VALUE_AGGREGATION = new h()),
    (T.HISTOGRAM_AGGREGATION = new i()),
    (T.EXPONENTIAL_HISTOGRAM_AGGREGATION = new s()),
    (T.DEFAULT_AGGREGATION = new A()));
};
