// Module: debug-2
// Original: SDT
// Type: CJS (RT wrapper)
// Exports: debug, warn
// Category: util

// Module: SDT (CJS)
(T)=>{var R=qT("process");
function a(t,...r){if(t==="debug")console.log(...r)}function e(t,r){if(t==="debug"||t==="warn")if(typeof R.emitWarning==="function")R.emitWarning(r);
else console.warn(r)}T.debug=a,T.warn=e}