class yn {
  constructor(T, R, a, e) {
    this._path = R, this._isChanged = !1, this._clonedCache = new Set(), this._hasOnValidate = e, this._changes = e ? [] : null, this.clone = R === void 0 ? T : this._shallowClone(T);
  }
  static isHandledMethod(T) {
    return N2T.has(T);
  }
  _shallowClone(T) {
    let R = T;
    if (mw(T)) R = {
      ...T
    };else if (pv(T) || ArrayBuffer.isView(T)) R = [...T];else if (T instanceof Date) R = new Date(T);else if (T instanceof Set) R = new Set([...T].map(a => this._shallowClone(a)));else if (T instanceof Map) {
      R = new Map();
      for (let [a, e] of T.entries()) R.set(a, this._shallowClone(e));
    }
    return this._clonedCache.add(R), R;
  }
  preferredThisArg(T, R, a, e) {
    if (T) {
      if (pv(e)) this._onIsChanged = U2T[R];else if (e instanceof Set) this._onIsChanged = q2T[R];else if (e instanceof Map) this._onIsChanged = z2T[R];
      return e;
    }
    return a;
  }
  update(T, R, a) {
    let e = Ot.after(T, this._path);
    if (R !== "length") {
      let t = this.clone;
      if (Ot.walk(e, r => {
        if (t?.[r]) {
          if (!this._clonedCache.has(t[r])) t[r] = this._shallowClone(t[r]);
          t = t[r];
        }
      }), this._hasOnValidate) this._changes.push({
        path: e,
        property: R,
        previous: a
      });
      if (t?.[R]) t[R] = a;
    }
    this._isChanged = !0;
  }
  undo(T) {
    let R;
    for (let a = this._changes.length - 1; a !== -1; a--) R = this._changes[a], Ot.get(T, R.path)[R.property] = R.previous;
  }
  isChanged(T, R) {
    return this._onIsChanged === void 0 ? this._isChanged : this._onIsChanged(this.clone, T);
  }
  isPathApplicable(T) {
    return Ot.isRootPath(this._path) || Ot.isSubPath(T, this._path);
  }
}