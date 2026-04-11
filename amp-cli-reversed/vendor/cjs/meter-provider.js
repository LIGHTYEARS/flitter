// Module: meter-provider
// Original: wtR
// Type: CJS (RT wrapper)
// Exports: MeterProvider
// Category: util

// Module: wtR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.MeterProvider=void 0;
var R=n0(),a=sx(),e=EtR(),t=CtR(),r=DtR();
class h{_sharedState;
_shutdown=!1;
constructor(i){if(this._sharedState=new e.MeterProviderSharedState(i?.resource??(0,a.defaultResource)()),i?.views!=null&&i.views.length>0)for(let c of i.views)this._sharedState.viewRegistry.addView(new r.View(c));
if(i?.readers!=null&&i.readers.length>0)for(let c of i.readers){let s=new t.MetricCollector(this._sharedState,c);
c.setMetricProducer(s),this._sharedState.metricCollectors.push(s)}}getMeter(i,c="",s={}){if(this._shutdown)return R.diag.warn("A shutdown MeterProvider cannot provide a Meter"),(0,R.createNoopMeter)();
return this._sharedState.getMeterSharedState({name:i,version:c,schemaUrl:s.schemaUrl}).meter}async shutdown(i){if(this._shutdown){R.diag.warn("shutdown may only be called once per MeterProvider");
return}this._shutdown=!0,await Promise.all(this._sharedState.metricCollectors.map((c)=>{return c.shutdown(i)}))}async forceFlush(i){if(this._shutdown){R.diag.warn("invalid attempt to force flush after MeterProvider shutdown");
return}await Promise.all(this._sharedState.metricCollectors.map((c)=>{return c.forceFlush(i)}))}}T.MeterProvider=h}