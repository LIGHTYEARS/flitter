// Module: bind-once-future
// Original: $eR
// Type: CJS (RT wrapper)
// Exports: BindOnceFuture
// Category: util

// Module: $eR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.BindOnceFuture = void 0));
  var R = geR();
  class a {
    _callback;
    _that;
    _isCalled = !1;
    _deferred = new R.Deferred();
    constructor(e, t) {
      ((this._callback = e), (this._that = t));
    }
    get isCalled() {
      return this._isCalled;
    }
    get promise() {
      return this._deferred.promise;
    }
    call(...e) {
      if (!this._isCalled) {
        this._isCalled = !0;
        try {
          Promise.resolve(this._callback.call(this._that, ...e)).then(
            (t) => this._deferred.resolve(t),
            (t) => this._deferred.reject(t),
          );
        } catch (t) {
          this._deferred.reject(t);
        }
      }
      return this._deferred.promise;
    }
  }
  T.BindOnceFuture = a;
};
