// Module: view-registry
// Original: xtR
// Type: CJS (RT wrapper)
// Exports: ViewRegistry
// Category: util

// Module: xtR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.ViewRegistry = void 0));
  class R {
    _registeredViews = [];
    addView(a) {
      this._registeredViews.push(a);
    }
    findViews(a, e) {
      return this._registeredViews.filter((t) => {
        return (
          this._matchInstrument(t.instrumentSelector, a) &&
          this._matchMeter(t.meterSelector, e)
        );
      });
    }
    _matchInstrument(a, e) {
      return (
        (a.getType() === void 0 || e.type === a.getType()) &&
        a.getNameFilter().match(e.name) &&
        a.getUnitFilter().match(e.unit)
      );
    }
    _matchMeter(a, e) {
      return (
        a.getNameFilter().match(e.name) &&
        (e.version === void 0 || a.getVersionFilter().match(e.version)) &&
        (e.schemaUrl === void 0 || a.getSchemaUrlFilter().match(e.schemaUrl))
      );
    }
  }
  T.ViewRegistry = R;
};
