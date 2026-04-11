// Module: opentelemetry-diag-component-logger
// Original: TaR
// Type: CJS (RT wrapper)
// Exports: DiagComponentLogger
// Category: npm-pkg

// Module: TaR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.DiagComponentLogger=void 0;
var R=ix();
class a{constructor(t){this._namespace=t.namespace||"DiagComponentLogger"}debug(...t){return e("debug",this._namespace,t)}error(...t){return e("error",this._namespace,t)}info(...t){return e("info",this._namespace,t)}warn(...t){return e("warn",this._namespace,t)}verbose(...t){return e("verbose",this._namespace,t)}}T.DiagComponentLogger=a;
function e(t,r,h){let i=(0,R.getGlobal)("diag");
if(!i)return;
return h.unshift(r),i[t](...h)}}