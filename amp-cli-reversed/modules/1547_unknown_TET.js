class TET {
  _cleanup;
  _observer;
  _queue;
  _state;
  constructor(T, R) {
    this._cleanup = void 0, this._observer = T, this._queue = void 0, this._state = "initializing";
    let a = new RET(this);
    try {
      this._cleanup = R.call(void 0, a);
    } catch (e) {
      a.error(e);
    }
    if (this._state === "initializing") this._state = "ready";
  }
  get closed() {
    return this._state === "closed";
  }
  unsubscribe() {
    if (this._state !== "closed") x2(this), ZdT(this);
  }
}