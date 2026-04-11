// Module: b3-multi-propagator
// Original: ciR
// Type: CJS (RT wrapper)
// Exports: B3MultiPropagator
// Category: util

// Module: ciR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.B3MultiPropagator = void 0));
  var R = n0(),
    a = $9(),
    e = UvT(),
    t = FB(),
    r = new Set([!0, "true", "True", "1", 1]),
    h = new Set([!1, "false", "False", "0", 0]);
  function i(_) {
    return _ === R.TraceFlags.SAMPLED || _ === R.TraceFlags.NONE;
  }
  function c(_) {
    return Array.isArray(_) ? _[0] : _;
  }
  function s(_, m, b) {
    let y = m.get(_, b);
    return c(y);
  }
  function A(_, m) {
    let b = s(_, m, t.X_B3_TRACE_ID);
    if (typeof b === "string") return b.padStart(32, "0");
    return "";
  }
  function l(_, m) {
    let b = s(_, m, t.X_B3_SPAN_ID);
    if (typeof b === "string") return b;
    return "";
  }
  function o(_, m) {
    return s(_, m, t.X_B3_FLAGS) === "1" ? "1" : void 0;
  }
  function n(_, m) {
    let b = s(_, m, t.X_B3_SAMPLED);
    if (o(_, m) === "1" || r.has(b)) return R.TraceFlags.SAMPLED;
    if (b === void 0 || h.has(b)) return R.TraceFlags.NONE;
    return;
  }
  class p {
    inject(_, m, b) {
      let y = R.trace.getSpanContext(_);
      if (!y || !(0, R.isSpanContextValid)(y) || (0, a.isTracingSuppressed)(_))
        return;
      let u = _.getValue(e.B3_DEBUG_FLAG_KEY);
      if (
        (b.set(m, t.X_B3_TRACE_ID, y.traceId),
        b.set(m, t.X_B3_SPAN_ID, y.spanId),
        u === "1")
      )
        b.set(m, t.X_B3_FLAGS, u);
      else if (y.traceFlags !== void 0)
        b.set(
          m,
          t.X_B3_SAMPLED,
          (R.TraceFlags.SAMPLED & y.traceFlags) === R.TraceFlags.SAMPLED
            ? "1"
            : "0",
        );
    }
    extract(_, m, b) {
      let y = A(m, b),
        u = l(m, b),
        P = n(m, b),
        k = o(m, b);
      if ((0, R.isValidTraceId)(y) && (0, R.isValidSpanId)(u) && i(P))
        return (
          (_ = _.setValue(e.B3_DEBUG_FLAG_KEY, k)),
          R.trace.setSpanContext(_, {
            traceId: y,
            spanId: u,
            isRemote: !0,
            traceFlags: P,
          })
        );
      return _;
    }
    fields() {
      return [
        t.X_B3_TRACE_ID,
        t.X_B3_SPAN_ID,
        t.X_B3_FLAGS,
        t.X_B3_SAMPLED,
        t.X_B3_PARENT_SPAN_ID,
      ];
    }
  }
  T.B3MultiPropagator = p;
};
