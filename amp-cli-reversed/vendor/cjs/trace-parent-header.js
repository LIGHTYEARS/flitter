// Module: trace-parent-header
// Original: yeR
// Type: CJS (RT wrapper)
// Exports: TRACE_PARENT_HEADER, TRACE_STATE_HEADER, W3CTraceContextPropagator, parseTraceParent
// Category: util

// Module: yeR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.W3CTraceContextPropagator =
      T.parseTraceParent =
      T.TRACE_STATE_HEADER =
      T.TRACE_PARENT_HEADER =
        void 0));
  var R = n0(),
    a = LB(),
    e = w$T();
  ((T.TRACE_PARENT_HEADER = "traceparent"),
    (T.TRACE_STATE_HEADER = "tracestate"));
  var t = "00",
    r = "(?!ff)[\\da-f]{2}",
    h = "(?![0]{32})[\\da-f]{32}",
    i = "(?![0]{16})[\\da-f]{16}",
    c = "[\\da-f]{2}",
    s = new RegExp(`^\\s?(${r})-(${h})-(${i})-(${c})(-.*)?\\s?$`);
  function A(o) {
    let n = s.exec(o);
    if (!n) return null;
    if (n[1] === "00" && n[5]) return null;
    return { traceId: n[2], spanId: n[3], traceFlags: parseInt(n[4], 16) };
  }
  T.parseTraceParent = A;
  class l {
    inject(o, n, p) {
      let _ = R.trace.getSpanContext(o);
      if (!_ || (0, a.isTracingSuppressed)(o) || !(0, R.isSpanContextValid)(_))
        return;
      let m = `${t}-${_.traceId}-${_.spanId}-0${Number(_.traceFlags || R.TraceFlags.NONE).toString(16)}`;
      if ((p.set(n, T.TRACE_PARENT_HEADER, m), _.traceState))
        p.set(n, T.TRACE_STATE_HEADER, _.traceState.serialize());
    }
    extract(o, n, p) {
      let _ = p.get(n, T.TRACE_PARENT_HEADER);
      if (!_) return o;
      let m = Array.isArray(_) ? _[0] : _;
      if (typeof m !== "string") return o;
      let b = A(m);
      if (!b) return o;
      b.isRemote = !0;
      let y = p.get(n, T.TRACE_STATE_HEADER);
      if (y) {
        let u = Array.isArray(y) ? y.join(",") : y;
        b.traceState = new e.TraceState(typeof u === "string" ? u : void 0);
      }
      return R.trace.setSpanContext(o, b);
    }
    fields() {
      return [T.TRACE_PARENT_HEADER, T.TRACE_STATE_HEADER];
    }
  }
  T.W3CTraceContextPropagator = l;
};
