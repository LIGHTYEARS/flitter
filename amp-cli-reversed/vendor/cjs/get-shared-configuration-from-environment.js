// Module: get-shared-configuration-from-environment
// Original: ovT
// Type: CJS (RT wrapper)
// Exports: getSharedConfigurationFromEnvironment
// Category: util

// Module: ovT (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.getSharedConfigurationFromEnvironment=void 0;
var R=$9(),a=n0();
function e(c){let s=(0,R.getNumberFromEnv)(c);
if(s!=null){if(Number.isFinite(s)&&s>0)return s;
a.diag.warn(`Configuration: ${c} is invalid, expected number greater than 0 (actual: ${s})`)}return}function t(c){let s=e(`OTEL_EXPORTER_OTLP_${c}_TIMEOUT`),A=e("OTEL_EXPORTER_OTLP_TIMEOUT");return s??A}function r(c){let s=(0,R.getStringFromEnv)(c)?.trim();if(s==null||s==="none"||s==="gzip")return s;a.diag.warn(`Configuration: ${c} is invalid, expected 'none' or 'gzip' (actual: '${s}')`);return}function h(c){let s=r(`OTEL_EXPORTER_OTLP_${c}_COMPRESSION`),A=r("OTEL_EXPORTER_OTLP_COMPRESSION");return s??A}function i(c){return{timeoutMillis:t(c),compression:h(c)}}T.getSharedConfigurationFromEnvironment=i}