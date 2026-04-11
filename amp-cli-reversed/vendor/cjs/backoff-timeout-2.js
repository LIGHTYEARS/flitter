// Module: backoff-timeout-2
// Original: WB
// Type: CJS (RT wrapper)
// Exports: BackoffTimeout
// Category: util

// Module: wB (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.isValidName=T.isDescriptorCompatibleWith=T.createInstrumentDescriptorWithView=T.createInstrumentDescriptor=void 0;
var R=n0(),a=Fs();
function e(c,s,A){if(!i(c))R.diag.warn(`Invalid metric name: "${c}". The metric name should be a ASCII string with a length no greater than 255 characters.`);return{name:c,type:s,description:A?.description??"",unit:A?.unit??"",valueType:A?.valueType??R.ValueType.DOUBLE,advice:A?.advice??{}}}T.createInstrumentDescriptor=e;function t(c,s){return{name:c.name??s.name,description:c.description??s.description,type:s.type,unit:s.unit,valueType:s.valueType,advice:s.advice}}T.createInstrumentDescriptorWithView=t;function r(c,s){return(0,a.equalsCaseInsensitive)(c.name,s.name)&&c.unit===s.unit&&c.type===s.type&&c.valueType===s.valueType}T.isDescriptorCompatibleWith=r;var h=/^[a-z][a-z0-9_.\-/]{0,254}$/i;function i(c){return c.match(h)!=null}T.isValidName=i}