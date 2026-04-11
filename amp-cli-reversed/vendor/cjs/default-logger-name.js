// Module: default-logger-name
// Original: TtR
// Type: CJS (RT wrapper)
// Exports: DEFAULT_LOGGER_NAME, LoggerProvider
// Category: util

// Module: TtR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.LoggerProvider=T.DEFAULT_LOGGER_NAME=void 0;
var R=n0(),a=EB(),e=sx(),t=$9(),r=XeR(),h=YeR(),i=JeR();
T.DEFAULT_LOGGER_NAME="unknown";
class c{_shutdownOnce;
_sharedState;
constructor(s={}){let A=(0,t.merge)({},(0,h.loadDefaultConfig)(),s),l=s.resource??(0,e.defaultResource)();
this._sharedState=new i.LoggerProviderSharedState(l,A.forceFlushTimeoutMillis,(0,h.reconfigureLimits)(A.logRecordLimits),s?.processors??[]),this._shutdownOnce=new t.BindOnceFuture(this._shutdown,this)}getLogger(s,A,l){if(this._shutdownOnce.isCalled)return R.diag.warn("A shutdown LoggerProvider cannot provide a Logger"),a.NOOP_LOGGER;
if(!s)R.diag.warn("Logger requested without instrumentation scope name.");
let o=s||T.DEFAULT_LOGGER_NAME,n=`${o}@${A||""}:${l?.schemaUrl||""}`;if(!this._sharedState.loggers.has(n))this._sharedState.loggers.set(n,new r.Logger({name:o,version:A,schemaUrl:l?.schemaUrl},this._sharedState));return this._sharedState.loggers.get(n)}forceFlush(){if(this._shutdownOnce.isCalled)return R.diag.warn("invalid attempt to force flush after LoggerProvider shutdown"),this._shutdownOnce.promise;return this._sharedState.activeProcessor.forceFlush()}shutdown(){if(this._shutdownOnce.isCalled)return R.diag.warn("shutdown may only be called once per LoggerProvider"),this._shutdownOnce.promise;return this._shutdownOnce.call()}_shutdown(){return this._sharedState.activeProcessor.shutdown()}}T.LoggerProvider=c}