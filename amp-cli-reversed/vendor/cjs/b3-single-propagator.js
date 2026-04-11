// Module: b3-single-propagator
// Original: siR
// Type: CJS (RT wrapper)
// Exports: B3SinglePropagator
// Category: util

// Module: siR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.B3SinglePropagator = void 0));
  var R = n0(),
    a = $9(),
    e = UvT(),
    t = FB(),
    r =
      /((?:[0-9a-f]{16}){1,2})-([0-9a-f]{16})(?:-([01d](?![0-9a-f])))?(?:-([0-9a-f]{16}))?/,
    h = "0".repeat(16),
    i = new Set(["d", "1"]),
    c = "d";
  function s(o) {
    return o.length === 32 ? o : `${h}${o}`;
  }
  function A(o) {
    if (o && i.has(o)) return R.TraceFlags.SAMPLED;
    return R.TraceFlags.NONE;
  }
  class l {
    inject(o, n, p) {
      let _ = R.trace.getSpanContext(o);
      if (!_ || !(0, R.isSpanContextValid)(_) || (0, a.isTracingSuppressed)(o))
        return;
      let m = o.getValue(e.B3_DEBUG_FLAG_KEY) || _.traceFlags & 1,
        b = `${_.traceId}-${_.spanId}-${m}`;
      p.set(n, t.B3_CONTEXT_HEADER, b);
    }
    extract(o, n, p) {
      let _ = p.get(n, t.B3_CONTEXT_HEADER),
        m = Array.isArray(_) ? _[0] : _;
      if (typeof m !== "string") return o;
      let b = m.match(r);
      if (!b) return o;
      let [, y, u, P] = b,
        k = s(y);
      if (!(0, R.isValidTraceId)(k) || !(0, R.isValidSpanId)(u)) return o;
      let x = A(P);
      if (P === c) o = o.setValue(e.B3_DEBUG_FLAG_KEY, P);
      return R.trace.setSpanContext(o, {
        traceId: k,
        spanId: u,
        isRemote: !0,
        traceFlags: x,
      });
    }
    fields() {
      return [t.B3_CONTEXT_HEADER];
    }
  }
  T.B3SinglePropagator = l;
};
