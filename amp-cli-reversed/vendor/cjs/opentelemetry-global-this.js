// Module: opentelemetry-global-this
// Original: $9
// Type: CJS (RT wrapper)
// Exports: AnchoredClock, BindOnceFuture, CompositePropagator, ExportResultCode, RPCType, SDK_INFO, TRACE_PARENT_HEADER, TRACE_STATE_HEADER, TimeoutError, TraceState, W3CBaggagePropagator, W3CTraceContextPropagator, _globalThis, addHrTimes, callWithTimeout, deleteRPCMetadata, diagLogLevelFromString, getBooleanFromEnv, getNumberFromEnv, getRPCMetadata, getStringFromEnv, getStringListFromEnv, getTimeOrigin, globalErrorHandler, hrTime, hrTimeDuration, hrTimeToMicroseconds, hrTimeToMilliseconds, hrTimeToNanoseconds, hrTimeToTimeStamp, internal, isAttributeValue, isTimeInput, isTimeInputHrTime, isTracingSuppressed, isUrlIgnored, loggingErrorHandler, merge, millisToHrTime, otperformance, parseKeyPairsIntoRecord, parseTraceParent, sanitizeAttributes, setGlobalErrorHandler, setRPCMetadata, suppressTracing, timeInputToHrTime, unrefTimer, unsuppressTracing, urlMatches
// Category: npm-pkg

// Module: $9 (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.internal=T.diagLogLevelFromString=T.BindOnceFuture=T.urlMatches=T.isUrlIgnored=T.callWithTimeout=T.TimeoutError=T.merge=T.TraceState=T.unsuppressTracing=T.suppressTracing=T.isTracingSuppressed=T.setRPCMetadata=T.getRPCMetadata=T.deleteRPCMetadata=T.RPCType=T.parseTraceParent=T.W3CTraceContextPropagator=T.TRACE_STATE_HEADER=T.TRACE_PARENT_HEADER=T.CompositePropagator=T.otperformance=T.getStringListFromEnv=T.getNumberFromEnv=T.getBooleanFromEnv=T.getStringFromEnv=T._globalThis=T.SDK_INFO=T.parseKeyPairsIntoRecord=T.ExportResultCode=T.unrefTimer=T.timeInputToHrTime=T.millisToHrTime=T.isTimeInputHrTime=T.isTimeInput=T.hrTimeToTimeStamp=T.hrTimeToNanoseconds=T.hrTimeToMilliseconds=T.hrTimeToMicroseconds=T.hrTimeDuration=T.hrTime=T.getTimeOrigin=T.addHrTimes=T.loggingErrorHandler=T.setGlobalErrorHandler=T.globalErrorHandler=T.sanitizeAttributes=T.isAttributeValue=T.AnchoredClock=T.W3CBaggagePropagator=void 0;
var R=YaR();
Object.defineProperty(T,"W3CBaggagePropagator",{enumerable:!0,get:function(){return R.W3CBaggagePropagator}});
var a=QaR();
Object.defineProperty(T,"AnchoredClock",{enumerable:!0,get:function(){return a.AnchoredClock}});
var e=ZaR();
Object.defineProperty(T,"isAttributeValue",{enumerable:!0,get:function(){return e.isAttributeValue}}),Object.defineProperty(T,"sanitizeAttributes",{enumerable:!0,get:function(){return e.sanitizeAttributes}});
var t=JaR();
Object.defineProperty(T,"globalErrorHandler",{enumerable:!0,get:function(){return t.globalErrorHandler}}),Object.defineProperty(T,"setGlobalErrorHandler",{enumerable:!0,get:function(){return t.setGlobalErrorHandler}});
var r=L$T();
Object.defineProperty(T,"loggingErrorHandler",{enumerable:!0,get:function(){return r.loggingErrorHandler}});
var h=peR();
Object.defineProperty(T,"addHrTimes",{enumerable:!0,get:function(){return h.addHrTimes}}),Object.defineProperty(T,"getTimeOrigin",{enumerable:!0,get:function(){return h.getTimeOrigin}}),Object.defineProperty(T,"hrTime",{enumerable:!0,get:function(){return h.hrTime}}),Object.defineProperty(T,"hrTimeDuration",{enumerable:!0,get:function(){return h.hrTimeDuration}}),Object.defineProperty(T,"hrTimeToMicroseconds",{enumerable:!0,get:function(){return h.hrTimeToMicroseconds}}),Object.defineProperty(T,"hrTimeToMilliseconds",{enumerable:!0,get:function(){return h.hrTimeToMilliseconds}}),Object.defineProperty(T,"hrTimeToNanoseconds",{enumerable:!0,get:function(){return h.hrTimeToNanoseconds}}),Object.defineProperty(T,"hrTimeToTimeStamp",{enumerable:!0,get:function(){return h.hrTimeToTimeStamp}}),Object.defineProperty(T,"isTimeInput",{enumerable:!0,get:function(){return h.isTimeInput}}),Object.defineProperty(T,"isTimeInputHrTime",{enumerable:!0,get:function(){return h.isTimeInputHrTime}}),Object.defineProperty(T,"millisToHrTime",{enumerable:!0,get:function(){return h.millisToHrTime}}),Object.defineProperty(T,"timeInputToHrTime",{enumerable:!0,get:function(){return h.timeInputToHrTime}});
var i=_eR();
Object.defineProperty(T,"unrefTimer",{enumerable:!0,get:function(){return i.unrefTimer}});
var c=beR();
Object.defineProperty(T,"ExportResultCode",{enumerable:!0,get:function(){return c.ExportResultCode}});
var s=C$T();
Object.defineProperty(T,"parseKeyPairsIntoRecord",{enumerable:!0,get:function(){return s.parseKeyPairsIntoRecord}});
var A=D$T();
Object.defineProperty(T,"SDK_INFO",{enumerable:!0,get:function(){return A.SDK_INFO}}),Object.defineProperty(T,"_globalThis",{enumerable:!0,get:function(){return A._globalThis}}),Object.defineProperty(T,"getStringFromEnv",{enumerable:!0,get:function(){return A.getStringFromEnv}}),Object.defineProperty(T,"getBooleanFromEnv",{enumerable:!0,get:function(){return A.getBooleanFromEnv}}),Object.defineProperty(T,"getNumberFromEnv",{enumerable:!0,get:function(){return A.getNumberFromEnv}}),Object.defineProperty(T,"getStringListFromEnv",{enumerable:!0,get:function(){return A.getStringListFromEnv}}),Object.defineProperty(T,"otperformance",{enumerable:!0,get:function(){return A.otperformance}});
var l=meR();
Object.defineProperty(T,"CompositePropagator",{enumerable:!0,get:function(){return l.CompositePropagator}});
var o=yeR();
Object.defineProperty(T,"TRACE_PARENT_HEADER",{enumerable:!0,get:function(){return o.TRACE_PARENT_HEADER}}),Object.defineProperty(T,"TRACE_STATE_HEADER",{enumerable:!0,get:function(){return o.TRACE_STATE_HEADER}}),Object.defineProperty(T,"W3CTraceContextPropagator",{enumerable:!0,get:function(){return o.W3CTraceContextPropagator}}),Object.defineProperty(T,"parseTraceParent",{enumerable:!0,get:function(){return o.parseTraceParent}});
var n=PeR();
Object.defineProperty(T,"RPCType",{enumerable:!0,get:function(){return n.RPCType}}),Object.defineProperty(T,"deleteRPCMetadata",{enumerable:!0,get:function(){return n.deleteRPCMetadata}}),Object.defineProperty(T,"getRPCMetadata",{enumerable:!0,get:function(){return n.getRPCMetadata}}),Object.defineProperty(T,"setRPCMetadata",{enumerable:!0,get:function(){return n.setRPCMetadata}});
var p=LB();
Object.defineProperty(T,"isTracingSuppressed",{enumerable:!0,get:function(){return p.isTracingSuppressed}}),Object.defineProperty(T,"suppressTracing",{enumerable:!0,get:function(){return p.suppressTracing}}),Object.defineProperty(T,"unsuppressTracing",{enumerable:!0,get:function(){return p.unsuppressTracing}});
var _=w$T();
Object.defineProperty(T,"TraceState",{enumerable:!0,get:function(){return _.TraceState}});
var m=xeR();
Object.defineProperty(T,"merge",{enumerable:!0,get:function(){return m.merge}});
var b=feR();
Object.defineProperty(T,"TimeoutError",{enumerable:!0,get:function(){return b.TimeoutError}}),Object.defineProperty(T,"callWithTimeout",{enumerable:!0,get:function(){return b.callWithTimeout}});
var y=IeR();
Object.defineProperty(T,"isUrlIgnored",{enumerable:!0,get:function(){return y.isUrlIgnored}}),Object.defineProperty(T,"urlMatches",{enumerable:!0,get:function(){return y.urlMatches}});
var u=$eR();
Object.defineProperty(T,"BindOnceFuture",{enumerable:!0,get:function(){return u.BindOnceFuture}});
var P=veR();
Object.defineProperty(T,"diagLogLevelFromString",{enumerable:!0,get:function(){return P.diagLogLevelFromString}});
var k=jeR();
T.internal={_export:k._export}}