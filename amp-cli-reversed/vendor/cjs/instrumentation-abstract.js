// Module: instrumentation-abstract
// Original: waR
// Type: CJS (RT wrapper)
// Exports: InstrumentationAbstract
// Category: util

// Module: waR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.InstrumentationAbstract = void 0));
  var R = n0(),
    a = EB(),
    e = g$T();
  class t {
    instrumentationName;
    instrumentationVersion;
    _config = {};
    _tracer;
    _meter;
    _logger;
    _diag;
    constructor(r, h, i) {
      ((this.instrumentationName = r),
        (this.instrumentationVersion = h),
        this.setConfig(i),
        (this._diag = R.diag.createComponentLogger({ namespace: r })),
        (this._tracer = R.trace.getTracer(r, h)),
        (this._meter = R.metrics.getMeter(r, h)),
        (this._logger = a.logs.getLogger(r, h)),
        this._updateMetricInstruments());
    }
    _wrap = e.wrap;
    _unwrap = e.unwrap;
    _massWrap = e.massWrap;
    _massUnwrap = e.massUnwrap;
    get meter() {
      return this._meter;
    }
    setMeterProvider(r) {
      ((this._meter = r.getMeter(
        this.instrumentationName,
        this.instrumentationVersion,
      )),
        this._updateMetricInstruments());
    }
    get logger() {
      return this._logger;
    }
    setLoggerProvider(r) {
      this._logger = r.getLogger(
        this.instrumentationName,
        this.instrumentationVersion,
      );
    }
    getModuleDefinitions() {
      let r = this.init() ?? [];
      if (!Array.isArray(r)) return [r];
      return r;
    }
    _updateMetricInstruments() {
      return;
    }
    getConfig() {
      return this._config;
    }
    setConfig(r) {
      this._config = { enabled: !0, ...r };
    }
    setTracerProvider(r) {
      this._tracer = r.getTracer(
        this.instrumentationName,
        this.instrumentationVersion,
      );
    }
    get tracer() {
      return this._tracer;
    }
    _runSpanCustomizationHook(r, h, i, c) {
      if (!r) return;
      try {
        r(i, c);
      } catch (s) {
        this._diag.error(
          "Error running span customization hook due to exception in handler",
          { triggerName: h },
          s,
        );
      }
    }
  }
  T.InstrumentationAbstract = t;
};
