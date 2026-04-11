// Module: logging-error-handler
// Original: L$T
// Type: CJS (RT wrapper)
// Exports: loggingErrorHandler
// Category: util

// Module: L$T (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.loggingErrorHandler=void 0;
var R=n0();
function a(){return(r)=>{R.diag.error(e(r))}}T.loggingErrorHandler=a;
function e(r){if(typeof r==="string")return r;
else return JSON.stringify(t(r))}function t(r){let h={},i=r;
while(i!==null)Object.getOwnPropertyNames(i).forEach((c)=>{if(h[c])return;
let s=i[c];
if(s)h[c]=String(s)}),i=Object.getPrototypeOf(i);
return h}}