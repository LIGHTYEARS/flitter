// Module: opentelemetry-noop-metrics
// Original: _$T
// Type: CJS (RT wrapper)
// Exports: NOOP_COUNTER_METRIC, NOOP_GAUGE_METRIC, NOOP_HISTOGRAM_METRIC, NOOP_METER, NOOP_OBSERVABLE_COUNTER_METRIC, NOOP_OBSERVABLE_GAUGE_METRIC, NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC, NOOP_UP_DOWN_COUNTER_METRIC, NoopCounterMetric, NoopGaugeMetric, NoopHistogramMetric, NoopMeter, NoopMetric, NoopObservableCounterMetric, NoopObservableGaugeMetric, NoopObservableMetric, NoopObservableUpDownCounterMetric, NoopUpDownCounterMetric, createNoopMeter
// Category: npm-pkg

// Module: _$T (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.createNoopMeter =
      T.NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC =
      T.NOOP_OBSERVABLE_GAUGE_METRIC =
      T.NOOP_OBSERVABLE_COUNTER_METRIC =
      T.NOOP_UP_DOWN_COUNTER_METRIC =
      T.NOOP_HISTOGRAM_METRIC =
      T.NOOP_GAUGE_METRIC =
      T.NOOP_COUNTER_METRIC =
      T.NOOP_METER =
      T.NoopObservableUpDownCounterMetric =
      T.NoopObservableGaugeMetric =
      T.NoopObservableCounterMetric =
      T.NoopObservableMetric =
      T.NoopHistogramMetric =
      T.NoopGaugeMetric =
      T.NoopUpDownCounterMetric =
      T.NoopCounterMetric =
      T.NoopMetric =
      T.NoopMeter =
        void 0));
  class R {
    constructor() {}
    createGauge(o, n) {
      return T.NOOP_GAUGE_METRIC;
    }
    createHistogram(o, n) {
      return T.NOOP_HISTOGRAM_METRIC;
    }
    createCounter(o, n) {
      return T.NOOP_COUNTER_METRIC;
    }
    createUpDownCounter(o, n) {
      return T.NOOP_UP_DOWN_COUNTER_METRIC;
    }
    createObservableGauge(o, n) {
      return T.NOOP_OBSERVABLE_GAUGE_METRIC;
    }
    createObservableCounter(o, n) {
      return T.NOOP_OBSERVABLE_COUNTER_METRIC;
    }
    createObservableUpDownCounter(o, n) {
      return T.NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC;
    }
    addBatchObservableCallback(o, n) {}
    removeBatchObservableCallback(o) {}
  }
  T.NoopMeter = R;
  class a {}
  T.NoopMetric = a;
  class e extends a {
    add(o, n) {}
  }
  T.NoopCounterMetric = e;
  class t extends a {
    add(o, n) {}
  }
  T.NoopUpDownCounterMetric = t;
  class r extends a {
    record(o, n) {}
  }
  T.NoopGaugeMetric = r;
  class h extends a {
    record(o, n) {}
  }
  T.NoopHistogramMetric = h;
  class i {
    addCallback(o) {}
    removeCallback(o) {}
  }
  T.NoopObservableMetric = i;
  class c extends i {}
  T.NoopObservableCounterMetric = c;
  class s extends i {}
  T.NoopObservableGaugeMetric = s;
  class A extends i {}
  ((T.NoopObservableUpDownCounterMetric = A),
    (T.NOOP_METER = new R()),
    (T.NOOP_COUNTER_METRIC = new e()),
    (T.NOOP_GAUGE_METRIC = new r()),
    (T.NOOP_HISTOGRAM_METRIC = new h()),
    (T.NOOP_UP_DOWN_COUNTER_METRIC = new t()),
    (T.NOOP_OBSERVABLE_COUNTER_METRIC = new c()),
    (T.NOOP_OBSERVABLE_GAUGE_METRIC = new s()),
    (T.NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC = new A()));
  function l() {
    return T.NOOP_METER;
  }
  T.createNoopMeter = l;
};
