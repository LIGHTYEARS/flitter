function U3(T) {
  if (typeof T === "function") T();else if (T && typeof T.unsubscribe === "function") T.unsubscribe();
}
class FS {
  _baseObserver;
  _pendingPromises;
  constructor(T) {
    this._baseObserver = T, this._pendingPromises = new Set();
  }
  complete() {
    Promise.all(this._pendingPromises).then(() => this._baseObserver.complete()).catch(T => this._baseObserver.error(T));
  }
  error(T) {
    this._baseObserver.error(T);
  }
  schedule(T) {
    let R = Promise.all(this._pendingPromises),
      a = [],
      e = r => a.push(r),
      t = Promise.resolve().then(async () => {
        await R, await T(e), this._pendingPromises.delete(t);
        for (let r of a) this._baseObserver.next(r);
      }).catch(r => {
        this._pendingPromises.delete(t), this._baseObserver.error(r);
      });
    this._pendingPromises.add(t);
  }
}