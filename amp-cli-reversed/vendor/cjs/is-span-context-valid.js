// Module: is-span-context-valid
// Original: cZ
// Type: CJS (RT wrapper)
// Exports: isSpanContextValid, isValidSpanId, isValidTraceId, wrapSpanContext
// Category: util

// Module: cZ (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.wrapSpanContext =
      T.isSpanContextValid =
      T.isValidSpanId =
      T.isValidTraceId =
        void 0));
  var R = hZ(),
    a = iZ(),
    e = /^([0-9a-f]{32})$/i,
    t = /^[0-9a-f]{16}$/i;
  function r(s) {
    return e.test(s) && s !== R.INVALID_TRACEID;
  }
  T.isValidTraceId = r;
  function h(s) {
    return t.test(s) && s !== R.INVALID_SPANID;
  }
  T.isValidSpanId = h;
  function i(s) {
    return r(s.traceId) && h(s.spanId);
  }
  T.isSpanContextValid = i;
  function c(s) {
    return new a.NonRecordingSpan(s);
  }
  T.wrapSpanContext = c;
};
