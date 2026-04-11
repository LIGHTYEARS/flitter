// Module: tracer
// Original: ztR
// Type: CJS (RT wrapper)
// Exports: Tracer
// Category: util

// Module: ztR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }), (T.Tracer = void 0));
  var R = n0(),
    a = $9(),
    e = NtR(),
    t = Q$T(),
    r = Z$T();
  class h {
    _sampler;
    _generalLimits;
    _spanLimits;
    _idGenerator;
    instrumentationScope;
    _resource;
    _spanProcessor;
    constructor(i, c, s, A) {
      let l = (0, t.mergeConfig)(c);
      ((this._sampler = l.sampler),
        (this._generalLimits = l.generalLimits),
        (this._spanLimits = l.spanLimits),
        (this._idGenerator = c.idGenerator || new r.RandomIdGenerator()),
        (this._resource = s),
        (this._spanProcessor = A),
        (this.instrumentationScope = i));
    }
    startSpan(i, c = {}, s = R.context.active()) {
      if (c.root) s = R.trace.deleteSpan(s);
      let A = R.trace.getSpan(s);
      if ((0, a.isTracingSuppressed)(s))
        return (
          R.diag.debug("Instrumentation suppressed, returning Noop Span"),
          R.trace.wrapSpanContext(R.INVALID_SPAN_CONTEXT)
        );
      let l = A?.spanContext(),
        o = this._idGenerator.generateSpanId(),
        n,
        p,
        _;
      if (!l || !R.trace.isSpanContextValid(l))
        p = this._idGenerator.generateTraceId();
      else ((p = l.traceId), (_ = l.traceState), (n = l));
      let m = c.kind ?? R.SpanKind.INTERNAL,
        b = (c.links ?? []).map((f) => {
          return {
            context: f.context,
            attributes: (0, a.sanitizeAttributes)(f.attributes),
          };
        }),
        y = (0, a.sanitizeAttributes)(c.attributes),
        u = this._sampler.shouldSample(s, p, i, m, y, b);
      _ = u.traceState ?? _;
      let P =
          u.decision === R.SamplingDecision.RECORD_AND_SAMPLED
            ? R.TraceFlags.SAMPLED
            : R.TraceFlags.NONE,
        k = { traceId: p, spanId: o, traceFlags: P, traceState: _ };
      if (u.decision === R.SamplingDecision.NOT_RECORD)
        return (
          R.diag.debug(
            "Recording is off, propagating context in a non-recording span",
          ),
          R.trace.wrapSpanContext(k)
        );
      let x = (0, a.sanitizeAttributes)(Object.assign(y, u.attributes));
      return new e.SpanImpl({
        resource: this._resource,
        scope: this.instrumentationScope,
        context: s,
        spanContext: k,
        name: i,
        kind: m,
        links: b,
        parentSpanContext: n,
        attributes: x,
        startTime: c.startTime,
        spanProcessor: this._spanProcessor,
        spanLimits: this._spanLimits,
      });
    }
    startActiveSpan(i, c, s, A) {
      let l, o, n;
      if (arguments.length < 2) return;
      else if (arguments.length === 2) n = c;
      else if (arguments.length === 3) ((l = c), (n = s));
      else ((l = c), (o = s), (n = A));
      let p = o ?? R.context.active(),
        _ = this.startSpan(i, l, p),
        m = R.trace.setSpan(p, _);
      return R.context.with(m, n, void 0, _);
    }
    getGeneralLimits() {
      return this._generalLimits;
    }
    getSpanLimits() {
      return this._spanLimits;
    }
  }
  T.Tracer = h;
};
