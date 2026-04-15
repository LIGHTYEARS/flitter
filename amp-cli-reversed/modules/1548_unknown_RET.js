class RET {
  _subscription;
  constructor(T) {
    this._subscription = T;
  }
  get closed() {
    return this._subscription._state === "closed";
  }
  next(T) {
    MW(this._subscription, "next", T);
  }
  error(T) {
    MW(this._subscription, "error", T);
  }
  complete() {
    MW(this._subscription, "complete");
  }
}