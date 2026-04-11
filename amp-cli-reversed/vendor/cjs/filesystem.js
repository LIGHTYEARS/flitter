// Module: filesystem
// Original: VrR
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: util

// Module: vrR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.parseRetryAfterToMills=T.isExportRetryable=void 0;
function R(e){return[429,502,503,504].includes(e)}T.isExportRetryable=R;
function a(e){if(e==null)return;
let t=Number.parseInt(e,10);
if(Number.isInteger(t))return t>0?t*1000:-1;
let r=new Date(e).getTime()-Date.now();
if(r>=0)return r;
return 0}T.parseRetryAfterToMills=a}