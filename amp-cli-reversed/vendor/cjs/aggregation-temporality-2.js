// Module: aggregation-temporality-2
// Original: ox
// Type: CJS (RT wrapper)
// Exports: AggregationTemporality, AggregationType, ConsoleMetricExporter, DataPointType, InMemoryMetricExporter, InstrumentType, MeterProvider, MetricReader, PeriodicExportingMetricReader, TimeoutError, createAllowListAttributesProcessor, createDenyListAttributesProcessor
// Category: util

// Module: ox (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.TimeoutError =
      T.createDenyListAttributesProcessor =
      T.createAllowListAttributesProcessor =
      T.AggregationType =
      T.MeterProvider =
      T.ConsoleMetricExporter =
      T.InMemoryMetricExporter =
      T.PeriodicExportingMetricReader =
      T.MetricReader =
      T.InstrumentType =
      T.DataPointType =
      T.AggregationTemporality =
        void 0));
  var R = AZ();
  Object.defineProperty(T, "AggregationTemporality", {
    enumerable: !0,
    get: function () {
      return R.AggregationTemporality;
    },
  });
  var a = tm();
  (Object.defineProperty(T, "DataPointType", {
    enumerable: !0,
    get: function () {
      return a.DataPointType;
    },
  }),
    Object.defineProperty(T, "InstrumentType", {
      enumerable: !0,
      get: function () {
        return a.InstrumentType;
      },
    }));
  var e = z$T();
  Object.defineProperty(T, "MetricReader", {
    enumerable: !0,
    get: function () {
      return e.MetricReader;
    },
  });
  var t = ytR();
  Object.defineProperty(T, "PeriodicExportingMetricReader", {
    enumerable: !0,
    get: function () {
      return t.PeriodicExportingMetricReader;
    },
  });
  var r = PtR();
  Object.defineProperty(T, "InMemoryMetricExporter", {
    enumerable: !0,
    get: function () {
      return r.InMemoryMetricExporter;
    },
  });
  var h = ktR();
  Object.defineProperty(T, "ConsoleMetricExporter", {
    enumerable: !0,
    get: function () {
      return h.ConsoleMetricExporter;
    },
  });
  var i = wtR();
  Object.defineProperty(T, "MeterProvider", {
    enumerable: !0,
    get: function () {
      return i.MeterProvider;
    },
  });
  var c = DB();
  Object.defineProperty(T, "AggregationType", {
    enumerable: !0,
    get: function () {
      return c.AggregationType;
    },
  });
  var s = mZ();
  (Object.defineProperty(T, "createAllowListAttributesProcessor", {
    enumerable: !0,
    get: function () {
      return s.createAllowListAttributesProcessor;
    },
  }),
    Object.defineProperty(T, "createDenyListAttributesProcessor", {
      enumerable: !0,
      get: function () {
        return s.createDenyListAttributesProcessor;
      },
    }));
  var A = Fs();
  Object.defineProperty(T, "TimeoutError", {
    enumerable: !0,
    get: function () {
      return A.TimeoutError;
    },
  });
};
