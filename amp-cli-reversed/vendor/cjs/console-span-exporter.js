// Module: console-span-exporter
// Original: KtR
// Type: CJS (RT wrapper)
// Exports: ConsoleSpanExporter
// Category: util

// Module: ktR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.ConsoleMetricExporter=void 0;
var R=$9(),a=q$T();
class e{_shutdown=!1;
_temporalitySelector;
constructor(t){this._temporalitySelector=t?.temporalitySelector??a.DEFAULT_AGGREGATION_TEMPORALITY_SELECTOR}export(t,r){if(this._shutdown){setImmediate(r,{code:R.ExportResultCode.FAILED});
return}return e._sendMetrics(t,r)}forceFlush(){return Promise.resolve()}selectAggregationTemporality(t){return this._temporalitySelector(t)}shutdown(){return this._shutdown=!0,Promise.resolve()}static _sendMetrics(t,r){for(let h of t.scopeMetrics)for(let i of h.metrics)console.dir({descriptor:i.descriptor,dataPointType:i.dataPointType,dataPoints:i.dataPoints},{depth:null});
r({code:R.ExportResultCode.SUCCESS})}}T.ConsoleMetricExporter=e}