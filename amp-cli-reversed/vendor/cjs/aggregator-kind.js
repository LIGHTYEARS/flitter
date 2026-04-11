// Module: aggregator-kind
// Original: ES
// Type: CJS (RT wrapper)
// Exports: AggregatorKind
// Category: util

// Module: ES (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.AggregatorKind = void 0));
  var R;
  (function (a) {
    ((a[(a.DROP = 0)] = "DROP"),
      (a[(a.SUM = 1)] = "SUM"),
      (a[(a.LAST_VALUE = 2)] = "LAST_VALUE"),
      (a[(a.HISTOGRAM = 3)] = "HISTOGRAM"),
      (a[(a.EXPONENTIAL_HISTOGRAM = 4)] = "EXPONENTIAL_HISTOGRAM"));
  })((R = T.AggregatorKind || (T.AggregatorKind = {})));
};
