class Bo {
  constructor(T) {
    this._stack = [], this._hasOnValidate = T;
  }
  static isHandledType(T) {
    return mw(T) || pv(T) || n1(T);
  }
  static isHandledMethod(T, R) {
    if (mw(T)) return yn.isHandledMethod(R);
    if (pv(T)) return l1.isHandledMethod(R);
    if (T instanceof Set) return A1.isHandledMethod(R);
    if (T instanceof Map) return p1.isHandledMethod(R);
    return n1(T);
  }
  get isCloning() {
    return this._stack.length > 0;
  }
  start(T, R, a) {
    let e = yn;
    if (pv(T)) e = l1;else if (T instanceof Date) e = F2T;else if (T instanceof Set) e = A1;else if (T instanceof Map) e = p1;else if (T instanceof WeakSet) e = G2T;else if (T instanceof WeakMap) e = K2T;
    this._stack.push(new e(T, R, a, this._hasOnValidate));
  }
  update(T, R, a) {
    this._stack.at(-1).update(T, R, a);
  }
  preferredThisArg(T, R, a) {
    let {
        name: e
      } = T,
      t = Bo.isHandledMethod(a, e);
    return this._stack.at(-1).preferredThisArg(t, e, R, a);
  }
  isChanged(T, R) {
    return this._stack.at(-1).isChanged(T, R);
  }
  isPartOfClone(T) {
    return this._stack.at(-1).isPathApplicable(T);
  }
  undo(T) {
    if (this._previousClone !== void 0) this._previousClone.undo(T);
  }
  stop() {
    return this._previousClone = this._stack.pop(), this._previousClone.clone;
  }
}