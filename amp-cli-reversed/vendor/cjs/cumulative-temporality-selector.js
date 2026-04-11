// Module: cumulative-temporality-selector
// Original: wvT
// Type: CJS (RT wrapper)
// Exports: CumulativeTemporalitySelector, DeltaTemporalitySelector, LowMemoryTemporalitySelector, OTLPMetricExporterBase
// Category: util

// Module: wvT (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.OTLPMetricExporterBase=T.LowMemoryTemporalitySelector=T.DeltaTemporalitySelector=T.CumulativeTemporalitySelector=void 0;
var R=$9(),a=ox(),e=DvT(),t=gn(),r=n0(),h=()=>a.AggregationTemporality.CUMULATIVE;
T.CumulativeTemporalitySelector=h;
var i=(p)=>{switch(p){case a.InstrumentType.COUNTER:case a.InstrumentType.OBSERVABLE_COUNTER:case a.InstrumentType.GAUGE:case a.InstrumentType.HISTOGRAM:case a.InstrumentType.OBSERVABLE_GAUGE:return a.AggregationTemporality.DELTA;
case a.InstrumentType.UP_DOWN_COUNTER:case a.InstrumentType.OBSERVABLE_UP_DOWN_COUNTER:return a.AggregationTemporality.CUMULATIVE}};
T.DeltaTemporalitySelector=i;
var c=(p)=>{switch(p){case a.InstrumentType.COUNTER:case a.InstrumentType.HISTOGRAM:return a.AggregationTemporality.DELTA;
case a.InstrumentType.GAUGE:case a.InstrumentType.UP_DOWN_COUNTER:case a.InstrumentType.OBSERVABLE_UP_DOWN_COUNTER:case a.InstrumentType.OBSERVABLE_COUNTER:case a.InstrumentType.OBSERVABLE_GAUGE:return a.AggregationTemporality.CUMULATIVE}};
T.LowMemoryTemporalitySelector=c;
function s(){let p=((0,R.getStringFromEnv)("OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE")??"cumulative").toLowerCase();
if(p==="cumulative")return T.CumulativeTemporalitySelector;
if(p==="delta")return T.DeltaTemporalitySelector;
if(p==="lowmemory")return T.LowMemoryTemporalitySelector;
return r.diag.warn(`OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE is set to '${p}', but only 'cumulative' and 'delta' are allowed. Using default ('cumulative') instead.`),T.CumulativeTemporalitySelector}function A(p){if(p!=null){if(p===e.AggregationTemporalityPreference.DELTA)return T.DeltaTemporalitySelector;else if(p===e.AggregationTemporalityPreference.LOWMEMORY)return T.LowMemoryTemporalitySelector;return T.CumulativeTemporalitySelector}return s()}var l=Object.freeze({type:a.AggregationType.DEFAULT});function o(p){return p?.aggregationPreference??(()=>l)}class n extends t.OTLPExporterBase{_aggregationTemporalitySelector;_aggregationSelector;constructor(p,_){super(p);this._aggregationSelector=o(_),this._aggregationTemporalitySelector=A(_?.temporalityPreference)}selectAggregation(p){return this._aggregationSelector(p)}selectAggregationTemporality(p){return this._aggregationTemporalitySelector(p)}}T.OTLPMetricExporterBase=n}