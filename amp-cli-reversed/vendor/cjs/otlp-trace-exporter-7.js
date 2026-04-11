// Module: otlp-trace-exporter-7
// Original: VhR
// Type: CJS (RT wrapper)
// Exports: OTLPTraceExporter
// Category: util

// Module: vhR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.createOtlpGrpcExportDelegate=void 0;
var R=gn(),a=zB();
function e(t,r,h,i){return(0,R.createOtlpNetworkExportDelegate)(t,r,(0,a.createOtlpGrpcExporterTransport)({address:t.url,compression:t.compression,credentials:t.credentials,metadata:t.metadata,userAgent:t.userAgent,grpcName:h,grpcPath:i}))}T.createOtlpGrpcExportDelegate=e}