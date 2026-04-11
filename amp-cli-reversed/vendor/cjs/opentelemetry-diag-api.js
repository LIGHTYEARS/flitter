// Module: opentelemetry-diag-api
// Original: cx
// Type: CJS (RT wrapper)
// Exports: DiagAPI
// Category: npm-pkg

// Module: cx (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.DiagAPI=void 0;
var R=TaR(),a=RaR(),e=rZ(),t=ix(),r="diag";
class h{constructor(){function i(A){return function(...l){let o=(0,t.getGlobal)("diag");
if(!o)return;
return o[A](...l)}}let c=this,s=(A,l={logLevel:e.DiagLogLevel.INFO})=>{var o,n,p;
if(A===c){let b=Error("Cannot use diag as the logger for itself. Please use a DiagLogger implementation like ConsoleDiagLogger or a custom implementation");
return c.error((o=b.stack)!==null&&o!==void 0?o:b.message),!1}if(typeof l==="number")l={logLevel:l};
let _=(0,t.getGlobal)("diag"),m=(0,a.createLogLevelDiagLogger)((n=l.logLevel)!==null&&n!==void 0?n:e.DiagLogLevel.INFO,A);
if(_&&!l.suppressOverrideMessage){let b=(p=Error().stack)!==null&&p!==void 0?p:"<failed to generate stacktrace>";
_.warn(`Current logger will be overwritten from ${b}`),m.warn(`Current logger will overwrite one already registered from ${b}`)}return(0,t.registerGlobal)("diag",m,c,!0)};c.setLogger=s,c.disable=()=>{(0,t.unregisterGlobal)(r,c)},c.createComponentLogger=(A)=>{return new R.DiagComponentLogger(A)},c.verbose=i("verbose"),c.debug=i("debug"),c.info=i("info"),c.warn=i("warn"),c.error=i("error")}static instance(){if(!this._instance)this._instance=new h;return this._instance}}T.DiagAPI=h}