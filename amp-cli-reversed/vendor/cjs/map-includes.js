// Module: map-includes
// Original: HDT
// Type: CJS (RT wrapper)
// Exports: mapIncludes
// Category: util

// Module: HDT (CJS)
(T)=>{var R=x8();
function a(e,t,r){let{uniqueKeys:h}=e.options;
if(h===!1)return!1;
let i=typeof h==="function"?h:(c,s)=>c===s||R.isScalar(c)&&R.isScalar(s)&&c.value===s.value;
return t.some((c)=>i(c.key,r))}T.mapIncludes=a}