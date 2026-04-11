// Module: periodic-exporting-metric-reader
// Original: ytR
// Type: CJS (RT wrapper)
// Exports: PeriodicExportingMetricReader
// Category: util

// Module: ytR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.PeriodicExportingMetricReader=void 0;
var R=n0(),a=$9(),e=z$T(),t=Fs();
class r extends e.MetricReader{_interval;
_exporter;
_exportInterval;
_exportTimeout;
constructor(h){super({aggregationSelector:h.exporter.selectAggregation?.bind(h.exporter),aggregationTemporalitySelector:h.exporter.selectAggregationTemporality?.bind(h.exporter),metricProducers:h.metricProducers});
if(h.exportIntervalMillis!==void 0&&h.exportIntervalMillis<=0)throw Error("exportIntervalMillis must be greater than 0");
if(h.exportTimeoutMillis!==void 0&&h.exportTimeoutMillis<=0)throw Error("exportTimeoutMillis must be greater than 0");
if(h.exportTimeoutMillis!==void 0&&h.exportIntervalMillis!==void 0&&h.exportIntervalMillis<h.exportTimeoutMillis)throw Error("exportIntervalMillis must be greater than or equal to exportTimeoutMillis");
this._exportInterval=h.exportIntervalMillis??60000,this._exportTimeout=h.exportTimeoutMillis??30000,this._exporter=h.exporter}async _runOnce(){try{await(0,t.callWithTimeout)(this._doRun(),this._exportTimeout)}catch(h){if(h instanceof t.TimeoutError){R.diag.error("Export took longer than %s milliseconds and timed out.",this._exportTimeout);
return}(0,a.globalErrorHandler)(h)}}async _doRun(){let{resourceMetrics:h,errors:i}=await this.collect({timeoutMillis:this._exportTimeout});
if(i.length>0)R.diag.error("PeriodicExportingMetricReader: metrics collection errors",...i);
if(h.resource.asyncAttributesPending)try{await h.resource.waitForAsyncAttributes?.()}catch(s){R.diag.debug("Error while resolving async portion of resource: ",s),(0,a.globalErrorHandler)(s)}if(h.scopeMetrics.length===0)return;
let c=await a.internal._export(this._exporter,h);
if(c.code!==a.ExportResultCode.SUCCESS)throw Error(`PeriodicExportingMetricReader: metrics export failed (error ${c.error})`)}onInitialized(){if(this._interval=setInterval(()=>{this._runOnce()},this._exportInterval),typeof this._interval!=="number")this._interval.unref()}async onForceFlush(){await this._runOnce(),await this._exporter.forceFlush()}async onShutdown(){if(this._interval)clearInterval(this._interval);await this.onForceFlush(),await this._exporter.shutdown()}}T.PeriodicExportingMetricReader=r}