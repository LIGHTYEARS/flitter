// Module: e-aggregation-temporality
// Original: prR
// Type: CJS (RT wrapper)
// Exports: EAggregationTemporality
// Category: util

// Module: prR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.EAggregationTemporality = void 0));
  var R;
  (function (a) {
    ((a[(a.AGGREGATION_TEMPORALITY_UNSPECIFIED = 0)] =
      "AGGREGATION_TEMPORALITY_UNSPECIFIED"),
      (a[(a.AGGREGATION_TEMPORALITY_DELTA = 1)] =
        "AGGREGATION_TEMPORALITY_DELTA"),
      (a[(a.AGGREGATION_TEMPORALITY_CUMULATIVE = 2)] =
        "AGGREGATION_TEMPORALITY_CUMULATIVE"));
  })((R = T.EAggregationTemporality || (T.EAggregationTemporality = {})));
};
