class Mn {
  key;
  _debugData = {};
  constructor({
    key: T
  } = {}) {
    if (this.constructor === Mn) throw Error("Widget is abstract and cannot be instantiated directly");
    this.key = T;
  }
  sendDebugData(T) {
    this._debugData = {
      ...this._debugData,
      ...T
    };
  }
  get debugData() {
    return this._debugData;
  }
  canUpdate(T) {
    if (this.constructor !== T.constructor) return !1;
    if (this.key === void 0 && T.key === void 0) return !0;
    if (this.key === void 0 || T.key === void 0) return !1;
    return this.key.equals(T.key);
  }
}