// Module: protobuf-trace-serializer
// Original: mrR
// Type: CJS (RT wrapper)
// Exports: ProtobufTraceSerializer
// Category: util

// Module: mrR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.ProtobufTraceSerializer = void 0));
  var R = IZ(),
    a = svT(),
    e = R.opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse,
    t = R.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest;
  T.ProtobufTraceSerializer = {
    serializeRequest: (r) => {
      let h = (0, a.createExportTraceServiceRequest)(r);
      return t.encode(h).finish();
    },
    deserializeResponse: (r) => {
      return e.decode(r);
    },
  };
};
