// Module: create-bounded-queue-export-promise-handler
// Original: TvT
// Type: CJS (RT wrapper)
// Exports: createBoundedQueueExportPromiseHandler
// Category: util

// Module: TvT (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.createBoundedQueueExportPromiseHandler = void 0));
  class R {
    _concurrencyLimit;
    _sendingPromises = [];
    constructor(e) {
      this._concurrencyLimit = e;
    }
    pushPromise(e) {
      if (this.hasReachedLimit()) throw Error("Concurrency Limit reached");
      this._sendingPromises.push(e);
      let t = () => {
        let r = this._sendingPromises.indexOf(e);
        this._sendingPromises.splice(r, 1);
      };
      e.then(t, t);
    }
    hasReachedLimit() {
      return this._sendingPromises.length >= this._concurrencyLimit;
    }
    async awaitAll() {
      await Promise.all(this._sendingPromises);
    }
  }
  function a(e) {
    return new R(e.concurrencyLimit);
  }
  T.createBoundedQueueExportPromiseHandler = a;
};
