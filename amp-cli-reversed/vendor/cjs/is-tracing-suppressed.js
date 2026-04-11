// Module: is-tracing-suppressed
// Original: LB
// Type: CJS (RT wrapper)
// Exports: isTracingSuppressed, suppressTracing, unsuppressTracing
// Category: util

// Module: LB (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.isTracingSuppressed=T.unsuppressTracing=T.suppressTracing=void 0;
var R=n0(),a=(0,R.createContextKey)("OpenTelemetry SDK Context Key SUPPRESS_TRACING");
function e(h){return h.setValue(a,!0)}T.suppressTracing=e;
function t(h){return h.deleteValue(a)}T.unsuppressTracing=t;
function r(h){return h.getValue(a)===!0}T.isTracingSuppressed=r}