// Module: metric-reader
// Original: z$T
// Type: CJS (RT wrapper)
// Exports: MetricReader
// Category: util

// Module: z$T (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.MetricReader=void 0;
var R=n0(),a=Fs(),e=q$T();
class t{_shutdown=!1;
_metricProducers;
_sdkMetricProducer;
_aggregationTemporalitySelector;
_aggregationSelector;
_cardinalitySelector;
constructor(r){this._aggregationSelector=r?.aggregationSelector??e.DEFAULT_AGGREGATION_SELECTOR,this._aggregationTemporalitySelector=r?.aggregationTemporalitySelector??e.DEFAULT_AGGREGATION_TEMPORALITY_SELECTOR,this._metricProducers=r?.metricProducers??[],this._cardinalitySelector=r?.cardinalitySelector}setMetricProducer(r){if(this._sdkMetricProducer)throw Error("MetricReader can not be bound to a MeterProvider again.");
this._sdkMetricProducer=r,this.onInitialized()}selectAggregation(r){return this._aggregationSelector(r)}selectAggregationTemporality(r){return this._aggregationTemporalitySelector(r)}selectCardinalityLimit(r){return this._cardinalitySelector?this._cardinalitySelector(r):2000}onInitialized(){}async collect(r){if(this._sdkMetricProducer===void 0)throw Error("MetricReader is not bound to a MetricProducer");
if(this._shutdown)throw Error("MetricReader is shutdown");
let[h,...i]=await Promise.all([this._sdkMetricProducer.collect({timeoutMillis:r?.timeoutMillis}),...this._metricProducers.map((l)=>l.collect({timeoutMillis:r?.timeoutMillis}))]),c=h.errors.concat((0,a.FlatMap)(i,(l)=>l.errors)),s=h.resourceMetrics.resource,A=h.resourceMetrics.scopeMetrics.concat((0,a.FlatMap)(i,(l)=>l.resourceMetrics.scopeMetrics));
return{resourceMetrics:{resource:s,scopeMetrics:A},errors:c}}async shutdown(r){if(this._shutdown){R.diag.error("Cannot call shutdown twice.");
return}if(r?.timeoutMillis==null)await this.onShutdown();
else await(0,a.callWithTimeout)(this.onShutdown(),r.timeoutMillis);
this._shutdown=!0}async forceFlush(r){if(this._shutdown){R.diag.warn("Cannot forceFlush on already shutdown MetricReader.");
return}if(r?.timeoutMillis==null){await this.onForceFlush();
return}await(0,a.callWithTimeout)(this.onForceFlush(),r.timeoutMillis)}}T.MetricReader=t}