// Module: identity
// Original: deR
// Type: CJS (RT wrapper)
// Exports: identity, isPromiseLike
// Category: util

// Module: deR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.identity=T.isPromiseLike=void 0;
var R=(e)=>{return e!==null&&typeof e==="object"&&typeof e.then==="function"};
T.isPromiseLike=R;
function a(e){return e}T.identity=a}