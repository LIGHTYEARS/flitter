// Module: proxy-tracer-provider
// Original: k$T
// Type: CJS (RT wrapper)
// Exports: ProxyTracerProvider
// Category: util

// Module: k$T (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.ProxyTracerProvider = void 0));
  var R = P$T(),
    a = iaR(),
    e = new a.NoopTracerProvider();
  class t {
    getTracer(r, h, i) {
      var c;
      return (c = this.getDelegateTracer(r, h, i)) !== null && c !== void 0
        ? c
        : new R.ProxyTracer(this, r, h, i);
    }
    getDelegate() {
      var r;
      return (r = this._delegate) !== null && r !== void 0 ? r : e;
    }
    setDelegate(r) {
      this._delegate = r;
    }
    getDelegateTracer(r, h, i) {
      var c;
      return (c = this._delegate) === null || c === void 0
        ? void 0
        : c.getTracer(r, h, i);
    }
  }
  T.ProxyTracerProvider = t;
};
