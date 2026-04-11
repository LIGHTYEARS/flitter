// Module: console-log-record-exporter
// Original: RtR
// Type: CJS (RT wrapper)
// Exports: ConsoleLogRecordExporter
// Category: util

// Module: RtR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.ConsoleLogRecordExporter=void 0;
var R=$9();
class a{export(e,t){this._sendLogRecords(e,t)}shutdown(){return Promise.resolve()}_exportInfo(e){return{resource:{attributes:e.resource.attributes},instrumentationScope:e.instrumentationScope,timestamp:(0,R.hrTimeToMicroseconds)(e.hrTime),traceId:e.spanContext?.traceId,spanId:e.spanContext?.spanId,traceFlags:e.spanContext?.traceFlags,severityText:e.severityText,severityNumber:e.severityNumber,body:e.body,attributes:e.attributes}}_sendLogRecords(e,t){for(let r of e)console.dir(this._exportInfo(r),{depth:3});
t?.({code:R.ExportResultCode.SUCCESS})}}T.ConsoleLogRecordExporter=a}