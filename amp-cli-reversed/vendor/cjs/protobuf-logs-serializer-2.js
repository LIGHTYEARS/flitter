// Module: protobuf-logs-serializer-2
// Original: lrR
// Type: CJS (RT wrapper)
// Exports: ProtobufLogsSerializer
// Category: util

// Module: lrR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.ProtobufLogsSerializer = void 0));
  var R = IZ(),
    a = ivT(),
    e = R.opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse,
    t = R.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;
  T.ProtobufLogsSerializer = {
    serializeRequest: (r) => {
      let h = (0, a.createExportLogsServiceRequest)(r);
      return t.encode(h).finish();
    },
    deserializeResponse: (r) => {
      return e.decode(r);
    },
  };
};
