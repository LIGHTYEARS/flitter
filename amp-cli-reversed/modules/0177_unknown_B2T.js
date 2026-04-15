class B2T {
  constructor(T) {
    this._equals = T, this._proxyCache = new WeakMap(), this._pathCache = new WeakMap(), this._allPathsCache = new WeakMap(), this.isUnsubscribed = !1;
  }
  _pathsEqual(T, R) {
    if (!Array.isArray(T) || !Array.isArray(R)) return T === R;
    return T.length === R.length && T.every((a, e) => a === R[e]);
  }
  _getDescriptorCache() {
    if (this._descriptorCache === void 0) this._descriptorCache = new WeakMap();
    return this._descriptorCache;
  }
  _getProperties(T) {
    let R = this._getDescriptorCache(),
      a = R.get(T);
    if (a === void 0) a = {}, R.set(T, a);
    return a;
  }
  _getOwnPropertyDescriptor(T, R) {
    if (this.isUnsubscribed) return Reflect.getOwnPropertyDescriptor(T, R);
    let a = this._getProperties(T),
      e = a[R];
    if (e === void 0) e = Reflect.getOwnPropertyDescriptor(T, R), a[R] = e;
    return e;
  }
  getProxy(T, R, a, e) {
    if (this.isUnsubscribed) return T;
    let t = e === void 0 ? void 0 : T[e],
      r = t ?? T;
    this._pathCache.set(r, R);
    let h = this._allPathsCache.get(r);
    if (!h) h = [], this._allPathsCache.set(r, h);
    if (!h.some(c => this._pathsEqual(c, R))) h.push(R);
    let i = this._proxyCache.get(r);
    if (i === void 0) i = t === void 0 ? new Proxy(T, a) : T, this._proxyCache.set(r, i);
    return i;
  }
  getPath(T) {
    return this.isUnsubscribed ? void 0 : this._pathCache.get(T);
  }
  getAllPaths(T) {
    if (this.isUnsubscribed) return;
    return this._allPathsCache.get(T);
  }
  isDetached(T, R) {
    return !Object.is(T, Ot.get(R, this.getPath(T)));
  }
  defineProperty(T, R, a) {
    if (!Reflect.defineProperty(T, R, a)) return !1;
    if (!this.isUnsubscribed) this._getProperties(T)[R] = a;
    return !0;
  }
  setProperty(T, R, a, e, t) {
    if (!this._equals(t, a) || !(R in T)) {
      let r = !1,
        h = T;
      while (h) {
        let i = Reflect.getOwnPropertyDescriptor(h, R);
        if (i && "set" in i) {
          r = !0;
          break;
        }
        h = Object.getPrototypeOf(h);
      }
      if (r) return Reflect.set(T, R, a, e);
      return Reflect.set(T, R, a);
    }
    return !0;
  }
  deleteProperty(T, R, a) {
    if (Reflect.deleteProperty(T, R)) {
      if (!this.isUnsubscribed) {
        let e = this._getDescriptorCache().get(T);
        if (e) delete e[R], this._pathCache.delete(a);
      }
      return !0;
    }
    return !1;
  }
  isSameDescriptor(T, R, a) {
    let e = this._getOwnPropertyDescriptor(R, a);
    return T !== void 0 && e !== void 0 && Object.is(T.value, e.value) && (T.writable || !1) === (e.writable || !1) && (T.enumerable || !1) === (e.enumerable || !1) && (T.configurable || !1) === (e.configurable || !1) && T.get === e.get && T.set === e.set;
  }
  isGetInvariant(T, R) {
    let a = this._getOwnPropertyDescriptor(T, R);
    return a !== void 0 && a.configurable !== !0 && a.writable !== !0;
  }
  unsubscribe() {
    this._descriptorCache = null, this._pathCache = null, this._proxyCache = null, this._allPathsCache = null, this.isUnsubscribed = !0;
  }
}