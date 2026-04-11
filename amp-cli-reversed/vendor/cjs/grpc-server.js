// Module: grpc-server
// Original: arR
// Type: CJS (RT wrapper)
// Exports: AggregationTemporalityPreference, B3InjectEncoding, B3MultiPropagator, B3Propagator, B3SinglePropagator, B3_CONTEXT_HEADER, B3_DEBUG_FLAG_KEY, BackoffTimeout, BaseFilter, BaseServerInterceptingCall, BaseSubchannelWrapper, CIPHER_SUITES, CallCredentials, Channel, ChannelCredentials, ChannelImplementation, ChannelzCallTracker, ChannelzCallTrackerStub, ChannelzChildrenTracker, ChannelzChildrenTrackerStub, ChannelzTrace, ChannelzTraceStub, ChildLoadBalancerHandler, Client, ClientDuplexStreamImpl, ClientReadableStreamImpl, ClientUnaryCallImpl, ClientWritableStreamImpl, CompressionAlgorithms, CompressionFilter, CompressionFilterFactory, ConnectivityState, CumulativeTemporalitySelector, DEFAULT_MAX_RECEIVE_MESSAGE_LENGTH, DEFAULT_MAX_SEND_MESSAGE_LENGTH, DEFAULT_PORT, DeltaTemporalitySelector, EAggregationTemporality, EndpointMap, FileWatcherCertificateProvider, FilterStack, FilterStackFactory, GRPC_NODE_USE_ALTERNATIVE_RESOLVER, GrpcExporterTransport, Http2SubchannelCall, Http2SubchannelConnector, IdempotencyLevel, InterceptingCall, InterceptingListenerImpl, InterceptorConfigurationError, InternalChannel, JaegerPropagator, JsonLogsSerializer, JsonMetricsSerializer, JsonTraceSerializer, LeafLoadBalancer, ListenerBuilder, LoadBalancingCall, LogVerbosity, Long, LowMemoryTemporalitySelector, MessageBufferTracker, Metadata, NodeSDK, OTLPLogExporter, OTLPMetricExporter, OTLPMetricExporterBase, OTLPTraceExporter, OrderedMap, OutlierDetectionLoadBalancer, OutlierDetectionLoadBalancingConfig, PickFirstLoadBalancer, PickFirstLoadBalancingConfig, PickResultType, PrometheusExporter, PrometheusSerializer, Propagate, ProtobufLogsSerializer, ProtobufMetricsSerializer, ProtobufTraceSerializer, QueuePicker, RequesterBuilder, ResolvingCall, ResolvingLoadBalancer, ResponderBuilder, RetryThrottler, RetryingCall, RoundRobinLoadBalancer, SUBCHANNEL_ARGS_EXCLUDE_KEY_PREFIX, Server, ServerCredentials, ServerDuplexStreamImpl, ServerInterceptingCall, ServerListenerBuilder, ServerReadableStreamImpl, ServerUnaryCallImpl, ServerWritableStreamImpl, SpanKind, Status, StatusBuilder, StreamDecoder, Subchannel, SubchannelPool, UBER_BAGGAGE_HEADER_PREFIX, UBER_TRACE_ID_HEADER, UnavailablePicker, VERSION, X_B3_FLAGS, X_B3_PARENT_SPAN_ID, X_B3_SAMPLED, X_B3_SPAN_ID, X_B3_TRACE_ID, ZipkinExporter, _def, _edition, _toZipkinAnnotations, _toZipkinTags, _zod, action, addAdminServicesToServer, addCommonProtos, and, api, apply, applyPatch, array, base64, base64url, basename, brand, calcPatch, calcSlices, callErrorFromStatus, catch, catchall, channelOptionsEqual, check, cidrv4, cidrv6, clone, closeClient, combineHostPort, comment, compressAndSend, compressionAlgorithms, connectivityState, contextBase, convertLegacyHeaders, convertLegacyHttpOptions, convertLegacyOtlpGrpcOptions, core, createCertificateProviderChannelCredentials, createCertificateProviderServerCredentials, createChildChannelControlHelper, createEmptyMetadata, createExportLogsServiceRequest, createExportMetricsServiceRequest, createExportTraceServiceRequest, createHttpExporterTransport, createInsecureCredentials, createInstrumentationScope, createLoadBalancer, createOtlpGrpcExportDelegate, createOtlpGrpcExporterTransport, createOtlpHttpExportDelegate, createResolver, createResource, createRetryingTransport, createServerCredentialsWithInterceptors, createServiceClientConstructor, createSslCredentials, credentials, cuid, cuid2, date, datetime, deadlineToString, decode, decodeAsync, def, default, defaultStatusCodeTagName, defaultStatusErrorTagName, describe, description, diff, diff_core, duration, durationToMs, e164, element, email, emoji, encode, encodeAsLongBits, encodeAsString, encodeAsync, endpointEqual, endpointHasAddress, endpointToString, endsWith, enum, escapeLast, escapeRegex, exactOptional, exclude, experimental, extend, extract, extractAndSelectServiceConfig, filename, filterBlanksAndNulls, finite, format, formatDateDifference, fromJSON, getChannelzHandlers, getChannelzServiceDefinition, getClientChannel, getDeadlineTimeoutString, getDefaultAuthority, getDefaultConfig, getDefaultRootsData, getErrorCode, getErrorMessage, getHttpConfigurationDefaults, getInterceptingCall, getLogger, getNextCallNumber, getNodeHttpConfigurationDefaults, getNodeHttpConfigurationFromEnvironment, getOtlpEncoder, getOtlpGrpcConfigurationFromEnv, getOtlpGrpcDefaultConfiguration, getOtlpProtocolFromEnv, getPropagatorFromEnv, getProxiedConnection, getRelativeTimeout, getResourceDetectorsFromEnv, getServerInterceptingCall, getSharedConfigurationFromEnvironment, getSpanProcessorsFromEnv, getSubchannelPool, gt, gte, guid, hasRegexChars, hexToBinary, hrTimeToNanos, httpAgentFactoryFromOptions, implement, implementAsync, in, includes, input, int, ipv4, ipv6, isAnyExtension, isDuration, isExportRetryable, isFinite, isInt, isInterceptingListener, isInterceptingServerListener, isLoadBalancerNameRegistered, isNullable, isObject, isOptional, isRegexChar, isTcpSubchannelAddress, isTracerEnabled, isWindows, jwt, keyType, keyof, ksuid, l, lcs, length, load, loadFileDescriptorSetFromBuffer, loadFileDescriptorSetFromObject, loadObject, loadPackageDefinition, loadProtosWithOptions, loadProtosWithOptionsSync, loadSync, log, logVerbosity, logs, loose, lowercase, lt, lte, makeClientConstructor, makeGenericClientConstructor, mapProxyName, mapUriDefaultScheme, max, maxDate, maxLength, maxValue, merge, mergeOtlpGrpcConfigurationWithDefaults, mergeOtlpHttpConfigurationWithDefaults, mergeOtlpNodeHttpConfigurationWithDefaults, meta, metrics, mime, min, minDate, minDeadline, minLength, minValue, msToDuration, multipleOf, nanoid, negative, node, nonempty, nonnegative, nonoptional, nonpositive, normalize, nullable, nullish, omit, optional, options, or, out, output, overwrite, parse, parseAsync, parseCIDR, parseDuration, parseLoadBalancingConfig, parseRetryAfterToMills, parseUri, partial, passthrough, pick, pipe, positive, prefault, prepareGetHeaders, prepareSend, propagate, readonly, recognizedOptions, refine, regex, register, registerAdminService, registerChannelzChannel, registerChannelzServer, registerChannelzSocket, registerChannelzSubchannel, registerDefaultLoadBalancerType, registerDefaultScheme, registerLoadBalancerType, registerResolver, removeBackslashes, removeCatch, removeDefault, removePrefix, required, resources, rest, restrictControlPlaneStatusCode, safe, safeDecode, safeDecodeAsync, safeEncode, safeEncodeAsync, safeExtend, safeParse, safeParseAsync, sdkSpanToOtlpSpan, selectLbConfigFromList, sendWithHttp, serverErrorToStatus, setLogVerbosity, setLogger, setLoggerVerbosity, setup, setupContextManager, setupPropagator, shuffled, size, slugify, spa, splitHostPort, startsWith, status, step, strict, stringToSubchannelAddress, strip, subchannelAddressEqual, subchannelAddressToString, superRefine, t, time, toAnyValue, toAttributes, toJSONSchema, toKeyValue, toLogAttributes, toLongBits, toLowerCase, toMetric, toOtlpLink, toOtlpSpanEvent, toPosixSlashes, toResourceMetrics, toScopeMetrics, toUpperCase, toZipkinSpan, trace, tracing, transform, trim, type, ulid, unregisterChannelzRef, unwrap, uppercase, uriToString, url, uuid, uuidv4, uuidv6, uuidv7, validateAndNormalizeHeaders, validateAndNormalizeUrl, validateRetryThrottling, validateServiceConfig, value, valueType, values, waitForClientReady, with, wrapOutput, xid
// Category: npm-pkg

(T) => {
  var R = T;
  R.length = function (h) {
    var i = h.length;
    if (!i) return 0;
    var c = 0;
    while (--i % 4 > 1 && h.charAt(i) === "=") ++c;
    return Math.ceil(h.length * 3) / 4 - c;
  };
  var a = Array(64),
    e = Array(123);
  for (t = 0; t < 64; )
    e[
      (a[t] =
        t < 26 ? t + 65 : t < 52 ? t + 71 : t < 62 ? t - 4 : (t - 59) | 43)
    ] = t++;
  var t;
  R.encode = function (h, i, c) {
    var s = null,
      A = [],
      l = 0,
      o = 0,
      n;
    while (i < c) {
      var p = h[i++];
      switch (o) {
        case 0:
          ((A[l++] = a[p >> 2]), (n = (p & 3) << 4), (o = 1));
          break;
        case 1:
          ((A[l++] = a[n | (p >> 4)]), (n = (p & 15) << 2), (o = 2));
          break;
        case 2:
          ((A[l++] = a[n | (p >> 6)]), (A[l++] = a[p & 63]), (o = 0));
          break;
      }
      if (l > 8191)
        ((s || (s = [])).push(String.fromCharCode.apply(String, A)), (l = 0));
    }
    if (o) {
      if (((A[l++] = a[n]), (A[l++] = 61), o === 1)) A[l++] = 61;
    }
    if (s) {
      if (l) s.push(String.fromCharCode.apply(String, A.slice(0, l)));
      return s.join("");
    }
    return String.fromCharCode.apply(String, A.slice(0, l));
  };
  var r = "invalid encoding";
  ((R.decode = function (h, i, c) {
    var s = c,
      A = 0,
      l;
    for (var o = 0; o < h.length; ) {
      var n = h.charCodeAt(o++);
      if (n === 61 && A > 1) break;
      if ((n = e[n]) === void 0) throw Error(r);
      switch (A) {
        case 0:
          ((l = n), (A = 1));
          break;
        case 1:
          ((i[c++] = (l << 2) | ((n & 48) >> 4)), (l = n), (A = 2));
          break;
        case 2:
          ((i[c++] = ((l & 15) << 4) | ((n & 60) >> 2)), (l = n), (A = 3));
          break;
        case 3:
          ((i[c++] = ((l & 3) << 6) | n), (A = 0));
          break;
      }
    }
    if (A === 1) throw Error(r);
    return c - s;
  }),
    (R.test = function (h) {
      return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
        h,
      );
    }));
};
