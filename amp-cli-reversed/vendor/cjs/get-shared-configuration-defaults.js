// Module: get-shared-configuration-defaults
// Original: UB
// Type: CJS (RT wrapper)
// Exports: getSharedConfigurationDefaults, mergeOtlpSharedConfigurationWithDefaults, validateTimeoutMillis, wrapStaticHeadersInFunction
// Category: util

// Module: UB (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.getSharedConfigurationDefaults=T.mergeOtlpSharedConfigurationWithDefaults=T.wrapStaticHeadersInFunction=T.validateTimeoutMillis=void 0;
function R(r){if(Number.isFinite(r)&&r>0)return r;
throw Error(`Configuration: timeoutMillis is invalid, expected number greater than 0 (actual: '${r}')`)}T.validateTimeoutMillis=R;function a(r){if(r==null)return;return async()=>r}T.wrapStaticHeadersInFunction=a;function e(r,h,i){return{timeoutMillis:R(r.timeoutMillis??h.timeoutMillis??i.timeoutMillis),concurrencyLimit:r.concurrencyLimit??h.concurrencyLimit??i.concurrencyLimit,compression:r.compression??h.compression??i.compression}}T.mergeOtlpSharedConfigurationWithDefaults=e;function t(){return{timeoutMillis:1e4,concurrencyLimit:30,compression:"none"}}T.getSharedConfigurationDefaults=t}