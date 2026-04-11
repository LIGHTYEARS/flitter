// Module: default-port
// Original: IvT
// Type: CJS (RT wrapper)
// Exports: DEFAULT_PORT, setup
// Category: util

// Module: ivT (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.toLogAttributes=T.createExportLogsServiceRequest=void 0;
var R=gZ(),a=$Z();
function e(s,A){let l=(0,R.getOtlpEncoder)(A);
return{resourceLogs:r(s,l)}}T.createExportLogsServiceRequest=e;
function t(s){let A=new Map;
for(let l of s){let{resource:o,instrumentationScope:{name:n,version:p="",schemaUrl:_=""}}=l,m=A.get(o);
if(!m)m=new Map,A.set(o,m);
let b=`${n}@${p}:${_}`,y=m.get(b);if(!y)y=[],m.set(b,y);y.push(l)}return A}function r(s,A){let l=t(s);return Array.from(l,([o,n])=>{let p=(0,a.createResource)(o);return{resource:p,scopeLogs:Array.from(n,([,_])=>{return{scope:(0,a.createInstrumentationScope)(_[0].instrumentationScope),logRecords:_.map((m)=>h(m,A)),schemaUrl:_[0].instrumentationScope.schemaUrl}}),schemaUrl:p.schemaUrl}})}function h(s,A){return{timeUnixNano:A.encodeHrTime(s.hrTime),observedTimeUnixNano:A.encodeHrTime(s.hrTimeObserved),severityNumber:i(s.severityNumber),severityText:s.severityText,body:(0,a.toAnyValue)(s.body),eventName:s.eventName,attributes:c(s.attributes),droppedAttributesCount:s.droppedAttributesCount,flags:s.spanContext?.traceFlags,traceId:A.encodeOptionalSpanContext(s.spanContext?.traceId),spanId:A.encodeOptionalSpanContext(s.spanContext?.spanId)}}function i(s){return s}function c(s){return Object.keys(s).map((A)=>(0,a.toKeyValue)(A,s[A]))}T.toLogAttributes=c}