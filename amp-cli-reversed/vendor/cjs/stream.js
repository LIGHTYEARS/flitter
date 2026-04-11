// Module: stream
// Original: LIR
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: util

// Module: liR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.JaegerPropagator =
      T.UBER_BAGGAGE_HEADER_PREFIX =
      T.UBER_TRACE_ID_HEADER =
        void 0));
  var R = n0(),
    a = $9();
  ((T.UBER_TRACE_ID_HEADER = "uber-trace-id"),
    (T.UBER_BAGGAGE_HEADER_PREFIX = "uberctx"));
  class e {
    _jaegerTraceHeader;
    _jaegerBaggageHeaderPrefix;
    constructor(h) {
      if (typeof h === "string")
        ((this._jaegerTraceHeader = h),
          (this._jaegerBaggageHeaderPrefix = T.UBER_BAGGAGE_HEADER_PREFIX));
      else
        ((this._jaegerTraceHeader =
          h?.customTraceHeader || T.UBER_TRACE_ID_HEADER),
          (this._jaegerBaggageHeaderPrefix =
            h?.customBaggageHeaderPrefix || T.UBER_BAGGAGE_HEADER_PREFIX));
    }
    inject(h, i, c) {
      let s = R.trace.getSpanContext(h),
        A = R.propagation.getBaggage(h);
      if (s && (0, a.isTracingSuppressed)(h) === !1) {
        let l = `0${(s.traceFlags || R.TraceFlags.NONE).toString(16)}`;
        c.set(i, this._jaegerTraceHeader, `${s.traceId}:${s.spanId}:0:${l}`);
      }
      if (A)
        for (let [l, o] of A.getAllEntries())
          c.set(
            i,
            `${this._jaegerBaggageHeaderPrefix}-${l}`,
            encodeURIComponent(o.value),
          );
    }
    extract(h, i, c) {
      let s = c.get(i, this._jaegerTraceHeader),
        A = Array.isArray(s) ? s[0] : s,
        l = c
          .keys(i)
          .filter((p) => p.startsWith(`${this._jaegerBaggageHeaderPrefix}-`))
          .map((p) => {
            let _ = c.get(i, p);
            return {
              key: p.substring(this._jaegerBaggageHeaderPrefix.length + 1),
              value: Array.isArray(_) ? _[0] : _,
            };
          }),
        o = h;
      if (typeof A === "string") {
        let p = r(A);
        if (p) o = R.trace.setSpanContext(o, p);
      }
      if (l.length === 0) return o;
      let n = R.propagation.getBaggage(h) ?? R.propagation.createBaggage();
      for (let p of l) {
        if (p.value === void 0) continue;
        n = n.setEntry(p.key, { value: decodeURIComponent(p.value) });
      }
      return ((o = R.propagation.setBaggage(o, n)), o);
    }
    fields() {
      return [this._jaegerTraceHeader];
    }
  }
  T.JaegerPropagator = e;
  var t = /^[0-9a-f]{1,2}$/i;
  function r(h) {
    let i = decodeURIComponent(h).split(":");
    if (i.length !== 4) return null;
    let [c, s, , A] = i,
      l = c.padStart(32, "0"),
      o = s.padStart(16, "0"),
      n = t.test(A) ? parseInt(A, 16) & 1 : 1;
    return { traceId: l, spanId: o, isRemote: !0, traceFlags: n };
  }
};
