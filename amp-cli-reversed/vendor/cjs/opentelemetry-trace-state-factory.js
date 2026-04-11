// Module: opentelemetry-trace-state-factory
// Original: AaR
// Type: CJS (RT wrapper)
// Exports: createTraceState
// Category: npm-pkg

// Module: aaR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.BaggageImpl = void 0));
  class R {
    constructor(a) {
      this._entries = a ? new Map(a) : new Map();
    }
    getEntry(a) {
      let e = this._entries.get(a);
      if (!e) return;
      return Object.assign({}, e);
    }
    getAllEntries() {
      return Array.from(this._entries.entries()).map(([a, e]) => [a, e]);
    }
    setEntry(a, e) {
      let t = new R(this._entries);
      return (t._entries.set(a, e), t);
    }
    removeEntry(a) {
      let e = new R(this._entries);
      return (e._entries.delete(a), e);
    }
    removeEntries(...a) {
      let e = new R(this._entries);
      for (let t of a) e._entries.delete(t);
      return e;
    }
    clear() {
      return new R();
    }
  }
  T.BaggageImpl = R;
};
