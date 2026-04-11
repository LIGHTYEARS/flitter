// Module: otlp-log-exporter-9
// Original: jhR
// Type: CJS (RT wrapper)
// Exports: OTLPLogExporter
// Category: util

// Module: jhR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.OTLPLogExporter = void 0));
  var R = qZ(),
    a = vn(),
    e = gn();
  class t extends e.OTLPExporterBase {
    constructor(r = {}) {
      super(
        (0, R.createOtlpGrpcExportDelegate)(
          (0, R.convertLegacyOtlpGrpcOptions)(r, "LOGS"),
          a.ProtobufLogsSerializer,
          "LogsExportService",
          "/opentelemetry.proto.collector.logs.v1.LogsService/Export",
        ),
      );
    }
  }
  T.OTLPLogExporter = t;
};
