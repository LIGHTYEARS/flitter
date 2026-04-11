// Module: default-aggregation-selector
// Original: q$T
// Type: CJS (RT wrapper)
// Exports: DEFAULT_AGGREGATION_SELECTOR, DEFAULT_AGGREGATION_TEMPORALITY_SELECTOR
// Category: util

// Module: q$T (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.DEFAULT_AGGREGATION_TEMPORALITY_SELECTOR =
      T.DEFAULT_AGGREGATION_SELECTOR =
        void 0));
  var R = AZ(),
    a = DB(),
    e = (r) => {
      return { type: a.AggregationType.DEFAULT };
    };
  T.DEFAULT_AGGREGATION_SELECTOR = e;
  var t = (r) => R.AggregationTemporality.CUMULATIVE;
  T.DEFAULT_AGGREGATION_TEMPORALITY_SELECTOR = t;
};
