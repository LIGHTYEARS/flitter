// Module: context-api
// Original: dB
// Type: CJS (RT wrapper)
// Exports: ContextAPI
// Category: util

// Module: dB (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.ContextAPI=void 0;
var R=haR(),a=ix(),e=cx(),t="context",r=new R.NoopContextManager;
class h{constructor(){}static getInstance(){if(!this._instance)this._instance=new h;
return this._instance}setGlobalContextManager(i){return(0,a.registerGlobal)(t,i,e.DiagAPI.instance())}active(){return this._getContextManager().active()}with(i,c,s,...A){return this._getContextManager().with(i,c,s,...A)}bind(i,c){return this._getContextManager().bind(i,c)}_getContextManager(){return(0,a.getGlobal)(t)||r}disable(){this._getContextManager().disable(),(0,a.unregisterGlobal)(t,e.DiagAPI.instance())}}T.ContextAPI=h}