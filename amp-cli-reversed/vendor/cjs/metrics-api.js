// Module: metrics-api
// Original: maR
// Type: CJS (RT wrapper)
// Exports: MetricsAPI
// Category: util

// Module: maR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.MetricsAPI = void 0));
  var R = baR(),
    a = ix(),
    e = cx(),
    t = "metrics";
  class r {
    constructor() {}
    static getInstance() {
      if (!this._instance) this._instance = new r();
      return this._instance;
    }
    setGlobalMeterProvider(h) {
      return (0, a.registerGlobal)(t, h, e.DiagAPI.instance());
    }
    getMeterProvider() {
      return (0, a.getGlobal)(t) || R.NOOP_METER_PROVIDER;
    }
    getMeter(h, i, c) {
      return this.getMeterProvider().getMeter(h, i, c);
    }
    disable() {
      (0, a.unregisterGlobal)(t, e.DiagAPI.instance());
    }
  }
  T.MetricsAPI = r;
};
