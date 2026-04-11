// Module: build-sampler-from-env
// Original: Y$T
// Type: CJS (RT wrapper)
// Exports: buildSamplerFromEnv, loadDefaultConfig
// Category: util

// Module: y$T (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.NoopTracer = void 0));
  var R = dB(),
    a = u$T(),
    e = iZ(),
    t = cZ(),
    r = R.ContextAPI.getInstance();
  class h {
    startSpan(c, s, A = r.active()) {
      if (Boolean(s === null || s === void 0 ? void 0 : s.root))
        return new e.NonRecordingSpan();
      let l = A && (0, a.getSpanContext)(A);
      if (i(l) && (0, t.isSpanContextValid)(l))
        return new e.NonRecordingSpan(l);
      else return new e.NonRecordingSpan();
    }
    startActiveSpan(c, s, A, l) {
      let o, n, p;
      if (arguments.length < 2) return;
      else if (arguments.length === 2) p = s;
      else if (arguments.length === 3) ((o = s), (p = A));
      else ((o = s), (n = A), (p = l));
      let _ = n !== null && n !== void 0 ? n : r.active(),
        m = this.startSpan(c, o, _),
        b = (0, a.setSpan)(_, m);
      return r.with(b, p, void 0, m);
    }
  }
  T.NoopTracer = h;
  function i(c) {
    return (
      typeof c === "object" &&
      typeof c.spanId === "string" &&
      typeof c.traceId === "string" &&
      typeof c.traceFlags === "number"
    );
  }
};
