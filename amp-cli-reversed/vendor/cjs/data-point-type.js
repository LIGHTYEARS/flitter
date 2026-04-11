// Module: data-point-type
// Original: tm
// Type: CJS (RT wrapper)
// Exports: DataPointType, InstrumentType
// Category: util

// Module: tm (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.DataPointType = T.InstrumentType = void 0));
  var R;
  (function (e) {
    ((e.COUNTER = "COUNTER"),
      (e.GAUGE = "GAUGE"),
      (e.HISTOGRAM = "HISTOGRAM"),
      (e.UP_DOWN_COUNTER = "UP_DOWN_COUNTER"),
      (e.OBSERVABLE_COUNTER = "OBSERVABLE_COUNTER"),
      (e.OBSERVABLE_GAUGE = "OBSERVABLE_GAUGE"),
      (e.OBSERVABLE_UP_DOWN_COUNTER = "OBSERVABLE_UP_DOWN_COUNTER"));
  })((R = T.InstrumentType || (T.InstrumentType = {})));
  var a;
  (function (e) {
    ((e[(e.HISTOGRAM = 0)] = "HISTOGRAM"),
      (e[(e.EXPONENTIAL_HISTOGRAM = 1)] = "EXPONENTIAL_HISTOGRAM"),
      (e[(e.GAUGE = 2)] = "GAUGE"),
      (e[(e.SUM = 3)] = "SUM"));
  })((a = T.DataPointType || (T.DataPointType = {})));
};
