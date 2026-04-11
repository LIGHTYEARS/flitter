// Module: unknown-GrR
// Original: GrR
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: grR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.validateAndNormalizeHeaders=void 0;
var R=n0();
function a(e){let t={};
return Object.entries(e??{}).forEach(([r,h])=>{if(typeof h<"u")t[r]=String(h);
else R.diag.warn(`Header "${r}" has invalid value (${h}) and will be ignored`)}),t}T.validateAndNormalizeHeaders=a}