class CZT {
  _state = null;
  _attach(T) {
    this._state = T;
  }
  _detach() {
    this._state = null;
  }
  push(T) {
    this._state?.push(T);
  }
  pop() {
    return this._state?.pop() ?? !1;
  }
  get canPop() {
    return this._state?.canPop ?? !1;
  }
}