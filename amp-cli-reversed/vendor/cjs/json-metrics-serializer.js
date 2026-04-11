// Module: json-metrics-serializer
// Original: krR
// Type: CJS (RT wrapper)
// Exports: JsonMetricsSerializer
// Category: util

// Module: krR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.JsonMetricsSerializer=void 0;
var R=cvT();
T.JsonMetricsSerializer={serializeRequest:(a)=>{let e=(0,R.createExportMetricsServiceRequest)([a],{useLongBits:!1});
return new TextEncoder().encode(JSON.stringify(e))},deserializeResponse:(a)=>{if(a.length===0)return{};
return JSON.parse(new TextDecoder().decode(a))}}}