// Module: proxy-logger-provider
// Original: I$T
// Type: CJS (RT wrapper)
// Exports: ProxyLoggerProvider
// Category: util

// Module: I$T (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.ProxyLoggerProvider=void 0;
var R=f$T(),a=jaR();
class e{getLogger(t,r,h){var i;
return(i=this._getDelegateLogger(t,r,h))!==null&&i!==void 0?i:new a.ProxyLogger(this,t,r,h)}_getDelegate(){var t;
return(t=this._delegate)!==null&&t!==void 0?t:R.NOOP_LOGGER_PROVIDER}_setDelegate(t){this._delegate=t}_getDelegateLogger(t,r,h){var i;
return(i=this._delegate)===null||i===void 0?void 0:i.getLogger(t,r,h)}}T.ProxyLoggerProvider=e}