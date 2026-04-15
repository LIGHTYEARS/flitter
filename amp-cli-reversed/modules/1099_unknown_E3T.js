function J_(T) {
  return !!At(T) && !!Object.prototype.hasOwnProperty.call(T, "_readRequests") && T instanceof Ml;
}
function ZUT(T, R) {
  let a = T._readRequests;
  T._readRequests = new Dh(), a.forEach(e => {
    e._errorSteps(R);
  });
}
function MC(T) {
  return TypeError(`ReadableStreamDefaultReader.prototype.${T} can only be used on a ReadableStreamDefaultReader`);
}
class E3T {
  constructor(T, R) {
    this._ongoingPromise = void 0, this._isFinished = !1, this._reader = T, this._preventCancel = R;
  }
  next() {
    let T = () => this._nextSteps();
    return this._ongoingPromise = this._ongoingPromise ? hc(this._ongoingPromise, T, T) : T(), this._ongoingPromise;
  }
  return(T) {
    let R = () => this._returnSteps(T);
    return this._ongoingPromise ? hc(this._ongoingPromise, R, R) : R();
  }
  _nextSteps() {
    if (this._isFinished) return Promise.resolve({
      value: void 0,
      done: !0
    });
    let T = this._reader;
    return T === void 0 ? m9(jk("iterate")) : rn(T.read(), R => {
      var a;
      return this._ongoingPromise = void 0, R.done && (this._isFinished = !0, (a = this._reader) === null || a === void 0 || a.releaseLock(), this._reader = void 0), R;
    }, R => {
      var a;
      throw this._ongoingPromise = void 0, this._isFinished = !0, (a = this._reader) === null || a === void 0 || a.releaseLock(), this._reader = void 0, R;
    });
  }
  _returnSteps(T) {
    if (this._isFinished) return Promise.resolve({
      value: T,
      done: !0
    });
    this._isFinished = !0;
    let R = this._reader;
    if (R === void 0) return m9(jk("finish iterating"));
    if (this._reader = void 0, !this._preventCancel) {
      let a = R.cancel(T);
      return R.releaseLock(), hc(a, () => ({
        value: T,
        done: !0
      }));
    }
    return R.releaseLock(), E8({
      value: T,
      done: !0
    });
  }
}