// Module: protobuf-metrics-serializer
// Original: _rR
// Type: CJS (RT wrapper)
// Exports: ProtobufMetricsSerializer
// Category: util

// Module: _rR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.ProtobufMetricsSerializer = void 0));
  var R = IZ(),
    a = cvT(),
    e = R.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse,
    t = R.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;
  T.ProtobufMetricsSerializer = {
    serializeRequest: (r) => {
      let h = (0, a.createExportMetricsServiceRequest)([r]);
      return t.encode(h).finish();
    },
    deserializeResponse: (r) => {
      return e.decode(r);
    },
  };
};
