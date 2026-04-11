// Module: meter
// Original: ftR
// Type: CJS (RT wrapper)
// Exports: Meter
// Category: util

// Module: ftR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.Meter=void 0;
var R=wB(),a=bZ(),e=tm();
class t{_meterSharedState;
constructor(r){this._meterSharedState=r}createGauge(r,h){let i=(0,R.createInstrumentDescriptor)(r,e.InstrumentType.GAUGE,h),c=this._meterSharedState.registerMetricStorage(i);
return new a.GaugeInstrument(c,i)}createHistogram(r,h){let i=(0,R.createInstrumentDescriptor)(r,e.InstrumentType.HISTOGRAM,h),c=this._meterSharedState.registerMetricStorage(i);
return new a.HistogramInstrument(c,i)}createCounter(r,h){let i=(0,R.createInstrumentDescriptor)(r,e.InstrumentType.COUNTER,h),c=this._meterSharedState.registerMetricStorage(i);
return new a.CounterInstrument(c,i)}createUpDownCounter(r,h){let i=(0,R.createInstrumentDescriptor)(r,e.InstrumentType.UP_DOWN_COUNTER,h),c=this._meterSharedState.registerMetricStorage(i);
return new a.UpDownCounterInstrument(c,i)}createObservableGauge(r,h){let i=(0,R.createInstrumentDescriptor)(r,e.InstrumentType.OBSERVABLE_GAUGE,h),c=this._meterSharedState.registerAsyncMetricStorage(i);
return new a.ObservableGaugeInstrument(i,c,this._meterSharedState.observableRegistry)}createObservableCounter(r,h){let i=(0,R.createInstrumentDescriptor)(r,e.InstrumentType.OBSERVABLE_COUNTER,h),c=this._meterSharedState.registerAsyncMetricStorage(i);
return new a.ObservableCounterInstrument(i,c,this._meterSharedState.observableRegistry)}createObservableUpDownCounter(r,h){let i=(0,R.createInstrumentDescriptor)(r,e.InstrumentType.OBSERVABLE_UP_DOWN_COUNTER,h),c=this._meterSharedState.registerAsyncMetricStorage(i);
return new a.ObservableUpDownCounterInstrument(i,c,this._meterSharedState.observableRegistry)}addBatchObservableCallback(r,h){this._meterSharedState.observableRegistry.addBatchCallback(r,h)}removeBatchObservableCallback(r,h){this._meterSharedState.observableRegistry.removeBatchCallback(r,h)}}T.Meter=t}