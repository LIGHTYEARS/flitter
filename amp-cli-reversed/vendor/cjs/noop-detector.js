// Module: noop-detector
// Original: GeR
// Type: CJS (RT wrapper)
// Exports: NoopDetector, noopDetector
// Category: util

// Module: geR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.Deferred = void 0));
  class R {
    _promise;
    _resolve;
    _reject;
    constructor() {
      this._promise = new Promise((a, e) => {
        ((this._resolve = a), (this._reject = e));
      });
    }
    get promise() {
      return this._promise;
    }
    resolve(a) {
      this._resolve(a);
    }
    reject(a) {
      this._reject(a);
    }
  }
  T.Deferred = R;
};
