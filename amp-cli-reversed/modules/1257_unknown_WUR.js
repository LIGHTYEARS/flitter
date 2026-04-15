async function WUR() {
  let [T, R, a, e, t, r] = await Promise.all([Promise.resolve().then(() => c0(n0(), 1)), Promise.resolve().then(() => c0(sZ(), 1)), Promise.resolve().then(() => c0(d$T(), 1)), Promise.resolve().then(() => c0(biR(), 1)), Promise.resolve().then(() => c0(nx(), 1)), Promise.resolve().then(() => c0(em(), 1))]);
  class h extends a.InstrumentationBase {
    originalFetch;
    constructor(i = {}) {
      super("fetch-instrumentation", "1.0.0", i);
    }
    init() {}
    enable() {
      this.originalFetch = globalThis.fetch;
      let i = this.tracer,
        c = this.originalFetch;
      globalThis.fetch = async (s, A) => {
        let l = typeof s === "string" ? new URL(s) : s instanceof URL ? s : new URL(s.url),
          o = A?.method || "GET";
        return i.startActiveSpan(`fetch ${l.pathname}${l.searchParams.size > 0 ? "?" + l.searchParams.toString() : ""}`, {
          kind: T.SpanKind.CLIENT,
          attributes: {
            [r.ATTR_HTTP_REQUEST_METHOD]: o,
            [r.ATTR_URL_FULL]: l.toString()
          }
        }, async n => {
          try {
            let p = await c.call(globalThis, s, A);
            if (n.setAttribute("http.response.status_code", p.status), p.status >= 400) n.setStatus({
              code: T.SpanStatusCode.ERROR,
              message: `HTTP ${p.status}`
            });
            return n.end(), p;
          } catch (p) {
            throw n.recordException(p instanceof Error ? p : Error(String(p))), n.setStatus({
              code: T.SpanStatusCode.ERROR,
              message: p instanceof Error ? p.message : String(p)
            }), n.end(), p;
          }
        });
      };
    }
    disable() {
      if (this.originalFetch) globalThis.fetch = this.originalFetch;
    }
  }
  new e.NodeSDK({
    serviceName: "amp.cli",
    sampler: new t.AlwaysOnSampler(),
    contextManager: new R.AsyncLocalStorageContextManager(),
    instrumentations: [new h()],
    metricReader: void 0
  }).start();
}