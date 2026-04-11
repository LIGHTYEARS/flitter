// Module: grpc-server-intercepting-call
// Original: CvT
// Type: CJS (RT wrapper)
// Exports: BaseServerInterceptingCall, ResponderBuilder, ServerInterceptingCall, ServerListenerBuilder, getServerInterceptingCall, isInterceptingServerListener
// Category: npm-pkg

// Module: cvT (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.createExportMetricsServiceRequest=T.toMetric=T.toScopeMetrics=T.toResourceMetrics=void 0;
var R=n0(),a=ox(),e=prR(),t=gZ(),r=$Z();
function h(_,m){let b=(0,t.getOtlpEncoder)(m),y=(0,r.createResource)(_.resource);
return{resource:y,schemaUrl:y.schemaUrl,scopeMetrics:i(_.scopeMetrics,b)}}T.toResourceMetrics=h;
function i(_,m){return Array.from(_.map((b)=>({scope:(0,r.createInstrumentationScope)(b.scope),metrics:b.metrics.map((y)=>c(y,m)),schemaUrl:b.scope.schemaUrl})))}T.toScopeMetrics=i;
function c(_,m){let b={name:_.descriptor.name,description:_.descriptor.description,unit:_.descriptor.unit},y=n(_.aggregationTemporality);
switch(_.dataPointType){case a.DataPointType.SUM:b.sum={aggregationTemporality:y,isMonotonic:_.isMonotonic,dataPoints:A(_,m)};
break;
case a.DataPointType.GAUGE:b.gauge={dataPoints:A(_,m)};
break;
case a.DataPointType.HISTOGRAM:b.histogram={aggregationTemporality:y,dataPoints:l(_,m)};
break;
case a.DataPointType.EXPONENTIAL_HISTOGRAM:b.exponentialHistogram={aggregationTemporality:y,dataPoints:o(_,m)};
break}return b}T.toMetric=c;
function s(_,m,b){let y={attributes:(0,r.toAttributes)(_.attributes),startTimeUnixNano:b.encodeHrTime(_.startTime),timeUnixNano:b.encodeHrTime(_.endTime)};
switch(m){case R.ValueType.INT:y.asInt=_.value;
break;
case R.ValueType.DOUBLE:y.asDouble=_.value;
break}return y}function A(_,m){return _.dataPoints.map((b)=>{return s(b,_.descriptor.valueType,m)})}function l(_,m){return _.dataPoints.map((b)=>{let y=b.value;
return{attributes:(0,r.toAttributes)(b.attributes),bucketCounts:y.buckets.counts,explicitBounds:y.buckets.boundaries,count:y.count,sum:y.sum,min:y.min,max:y.max,startTimeUnixNano:m.encodeHrTime(b.startTime),timeUnixNano:m.encodeHrTime(b.endTime)}})}function o(_,m){return _.dataPoints.map((b)=>{let y=b.value;
return{attributes:(0,r.toAttributes)(b.attributes),count:y.count,min:y.min,max:y.max,sum:y.sum,positive:{offset:y.positive.offset,bucketCounts:y.positive.bucketCounts},negative:{offset:y.negative.offset,bucketCounts:y.negative.bucketCounts},scale:y.scale,zeroCount:y.zeroCount,startTimeUnixNano:m.encodeHrTime(b.startTime),timeUnixNano:m.encodeHrTime(b.endTime)}})}function n(_){switch(_){case a.AggregationTemporality.DELTA:return e.EAggregationTemporality.AGGREGATION_TEMPORALITY_DELTA;
case a.AggregationTemporality.CUMULATIVE:return e.EAggregationTemporality.AGGREGATION_TEMPORALITY_CUMULATIVE}}function p(_,m){return{resourceMetrics:_.map((b)=>h(b,m))}}T.createExportMetricsServiceRequest=p}