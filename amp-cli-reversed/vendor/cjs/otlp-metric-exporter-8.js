// Module: otlp-metric-exporter-8
// Original: WhR
// Type: CJS (RT wrapper)
// Exports: OTLPMetricExporter
// Category: util

// Module: whR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.OTLPMetricExporter=void 0;
var R=zZ(),a=qZ(),e=vn();
class t extends R.OTLPMetricExporterBase{constructor(r){super((0,a.createOtlpGrpcExportDelegate)((0,a.convertLegacyOtlpGrpcOptions)(r??{},"METRICS"),e.ProtobufMetricsSerializer,"MetricsExportService","/opentelemetry.proto.collector.metrics.v1.MetricsService/Export"),r)}}T.OTLPMetricExporter=t}