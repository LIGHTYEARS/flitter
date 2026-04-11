// Module: global-error-handler
// Original: JaR
// Type: CJS (RT wrapper)
// Exports: globalErrorHandler, setGlobalErrorHandler
// Category: util

// Module: jaR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.ProxyLogger=void 0;
var R=oZ();
class a{constructor(e,t,r,h){this._provider=e,this.name=t,this.version=r,this.options=h}emit(e){this._getLogger().emit(e)}_getLogger(){if(this._delegate)return this._delegate;
let e=this._provider._getDelegateLogger(this.name,this.version,this.options);
if(!e)return R.NOOP_LOGGER;
return this._delegate=e,this._delegate}}T.ProxyLogger=a}