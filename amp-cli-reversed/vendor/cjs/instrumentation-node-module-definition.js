// Module: instrumentation-node-module-definition
// Original: KaR
// Type: CJS (RT wrapper)
// Exports: InstrumentationNodeModuleDefinition
// Category: util

// Module: kaR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.PropagationAPI=void 0;
var R=ix(),a=yaR(),e=b$T(),t=PaR(),r=p$T(),h=cx(),i="propagation",c=new a.NoopTextMapPropagator;
class s{constructor(){this.createBaggage=r.createBaggage,this.getBaggage=t.getBaggage,this.getActiveBaggage=t.getActiveBaggage,this.setBaggage=t.setBaggage,this.deleteBaggage=t.deleteBaggage}static getInstance(){if(!this._instance)this._instance=new s;
return this._instance}setGlobalPropagator(A){return(0,R.registerGlobal)(i,A,h.DiagAPI.instance())}inject(A,l,o=e.defaultTextMapSetter){return this._getGlobalPropagator().inject(A,l,o)}extract(A,l,o=e.defaultTextMapGetter){return this._getGlobalPropagator().extract(A,l,o)}fields(){return this._getGlobalPropagator().fields()}disable(){(0,R.unregisterGlobal)(i,h.DiagAPI.instance())}_getGlobalPropagator(){return(0,R.getGlobal)(i)||c}}T.PropagationAPI=s}