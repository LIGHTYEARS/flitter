// Module: view
// Original: DtR
// Type: CJS (RT wrapper)
// Exports: View
// Category: util

// Module: dtR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.MeterSharedState=void 0;
var R=wB(),a=ftR(),e=Fs(),t=ItR(),r=$tR(),h=vtR(),i=StR(),c=OtR(),s=mZ();
class A{_meterProviderSharedState;
_instrumentationScope;
metricStorageRegistry=new r.MetricStorageRegistry;
observableRegistry=new i.ObservableRegistry;
meter;
constructor(l,o){this._meterProviderSharedState=l,this._instrumentationScope=o,this.meter=new a.Meter(this)}registerMetricStorage(l){let o=this._registerMetricStorage(l,c.SyncMetricStorage);
if(o.length===1)return o[0];
return new h.MultiMetricStorage(o)}registerAsyncMetricStorage(l){return this._registerMetricStorage(l,t.AsyncMetricStorage)}async collect(l,o,n){let p=await this.observableRegistry.observe(o,n?.timeoutMillis),_=this.metricStorageRegistry.getStorages(l);
if(_.length===0)return null;
let m=_.map((b)=>{return b.collect(l,o)}).filter(e.isNotNullish);
if(m.length===0)return{errors:p};
return{scopeMetrics:{scope:this._instrumentationScope,metrics:m},errors:p}}_registerMetricStorage(l,o){let n=this._meterProviderSharedState.viewRegistry.findViews(l,this._instrumentationScope).map((p)=>{let _=(0,R.createInstrumentDescriptorWithView)(p,l),m=this.metricStorageRegistry.findOrUpdateCompatibleStorage(_);
if(m!=null)return m;
let b=p.aggregation.createAggregator(_),y=new o(_,b,p.attributesProcessor,this._meterProviderSharedState.metricCollectors,p.aggregationCardinalityLimit);
return this.metricStorageRegistry.register(y),y});
if(n.length===0){let p=this._meterProviderSharedState.selectAggregations(l.type).map(([_,m])=>{let b=this.metricStorageRegistry.findOrUpdateCompatibleCollectorStorage(_,l);
if(b!=null)return b;
let y=m.createAggregator(l),u=_.selectCardinalityLimit(l.type),P=new o(l,y,(0,s.createNoopAttributesProcessor)(),[_],u);
return this.metricStorageRegistry.registerForCollector(_,P),P});
n=n.concat(p)}return n}}T.MeterSharedState=A}