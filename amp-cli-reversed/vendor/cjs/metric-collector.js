// Module: metric-collector
// Original: CtR
// Type: CJS (RT wrapper)
// Exports: MetricCollector
// Category: util

// Module: ctR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.DropAggregator = void 0));
  var R = ES();
  class a {
    kind = R.AggregatorKind.DROP;
    createAccumulation() {
      return;
    }
    merge(e, t) {
      return;
    }
    diff(e, t) {
      return;
    }
    toMetricData(e, t, r, h) {
      return;
    }
  }
  T.DropAggregator = a;
};
