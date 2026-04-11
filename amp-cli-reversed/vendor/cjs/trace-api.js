// Module: trace-api
// Original: faR
// Type: CJS (RT wrapper)
// Exports: TraceAPI
// Category: util

// Module: faR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.TraceAPI=void 0;
var R=ix(),a=k$T(),e=cZ(),t=u$T(),r=cx(),h="trace";
class i{constructor(){this._proxyTracerProvider=new a.ProxyTracerProvider,this.wrapSpanContext=e.wrapSpanContext,this.isSpanContextValid=e.isSpanContextValid,this.deleteSpan=t.deleteSpan,this.getSpan=t.getSpan,this.getActiveSpan=t.getActiveSpan,this.getSpanContext=t.getSpanContext,this.setSpan=t.setSpan,this.setSpanContext=t.setSpanContext}static getInstance(){if(!this._instance)this._instance=new i;
return this._instance}setGlobalTracerProvider(c){let s=(0,R.registerGlobal)(h,this._proxyTracerProvider,r.DiagAPI.instance());
if(s)this._proxyTracerProvider.setDelegate(c);
return s}getTracerProvider(){return(0,R.getGlobal)(h)||this._proxyTracerProvider}getTracer(c,s){return this.getTracerProvider().getTracer(c,s)}disable(){(0,R.unregisterGlobal)(h,r.DiagAPI.instance()),this._proxyTracerProvider=new a.ProxyTracerProvider}}T.TraceAPI=i}