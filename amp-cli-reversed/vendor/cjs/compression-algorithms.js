// Module: compression-algorithms
// Original: SvT
// Type: CJS (RT wrapper)
// Exports: CompressionAlgorithms
// Category: util

// Module: svT (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.createExportTraceServiceRequest=T.toOtlpSpanEvent=T.toOtlpLink=T.sdkSpanToOtlpSpan=void 0;
var R=$Z(),a=gZ(),e=256,t=512;
function r(o,n){let p=o&255|e;
if(n)p|=t;
return p}function h(o,n){let p=o.spanContext(),_=o.status,m=o.parentSpanContext?.spanId?n.encodeSpanContext(o.parentSpanContext?.spanId):void 0;
return{traceId:n.encodeSpanContext(p.traceId),spanId:n.encodeSpanContext(p.spanId),parentSpanId:m,traceState:p.traceState?.serialize(),name:o.name,kind:o.kind==null?0:o.kind+1,startTimeUnixNano:n.encodeHrTime(o.startTime),endTimeUnixNano:n.encodeHrTime(o.endTime),attributes:(0,R.toAttributes)(o.attributes),droppedAttributesCount:o.droppedAttributesCount,events:o.events.map((b)=>c(b,n)),droppedEventsCount:o.droppedEventsCount,status:{code:_.code,message:_.message},links:o.links.map((b)=>i(b,n)),droppedLinksCount:o.droppedLinksCount,flags:r(p.traceFlags,o.parentSpanContext?.isRemote)}}T.sdkSpanToOtlpSpan=h;
function i(o,n){return{attributes:o.attributes?(0,R.toAttributes)(o.attributes):[],spanId:n.encodeSpanContext(o.context.spanId),traceId:n.encodeSpanContext(o.context.traceId),traceState:o.context.traceState?.serialize(),droppedAttributesCount:o.droppedAttributesCount||0,flags:r(o.context.traceFlags,o.context.isRemote)}}T.toOtlpLink=i;
function c(o,n){return{attributes:o.attributes?(0,R.toAttributes)(o.attributes):[],name:o.name,timeUnixNano:n.encodeHrTime(o.time),droppedAttributesCount:o.droppedAttributesCount||0}}T.toOtlpSpanEvent=c;
function s(o,n){let p=(0,a.getOtlpEncoder)(n);
return{resourceSpans:l(o,p)}}T.createExportTraceServiceRequest=s;
function A(o){let n=new Map;
for(let p of o){let _=n.get(p.resource);
if(!_)_=new Map,n.set(p.resource,_);
let m=`${p.instrumentationScope.name}@${p.instrumentationScope.version||""}:${p.instrumentationScope.schemaUrl||""}`,b=_.get(m);if(!b)b=[],_.set(m,b);b.push(p)}return n}function l(o,n){let p=A(o),_=[],m=p.entries(),b=m.next();while(!b.done){let[y,u]=b.value,P=[],k=u.values(),x=k.next();while(!x.done){let g=x.value;if(g.length>0){let I=g.map((S)=>h(S,n));P.push({scope:(0,R.createInstrumentationScope)(g[0].instrumentationScope),spans:I,schemaUrl:g[0].instrumentationScope.schemaUrl})}x=k.next()}let f=(0,R.createResource)(y),v={resource:f,scopeSpans:P,schemaUrl:f.schemaUrl};_.push(v),b=m.next()}return _}}