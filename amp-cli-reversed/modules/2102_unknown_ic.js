class ic {
  static _instance = null;
  _rootScope;
  _primaryFocus = null;
  _cachedFocusableNodes = null;
  _primaryFocusStack = [];
  constructor() {
    this._rootScope = new l8({
      debugLabel: "Root Focus Scope",
      canRequestFocus: !1
    });
    let T = R => this.requestFocus(R);
    T.__focusManager = this, l8.setRequestFocusCallback(T);
  }
  static get instance() {
    if (!ic._instance) ic._instance = new ic();
    return ic._instance;
  }
  get primaryFocus() {
    return this._primaryFocus;
  }
  get rootScope() {
    return this._rootScope;
  }
  requestFocus(T) {
    if (this._primaryFocus === T) return !0;
    if (T && !T.canRequestFocus) return !1;
    if (T && !T.parent) return !1;
    if (this._primaryFocus) this._primaryFocus._setFocus(!1);
    if (T === null) {
      let R = this._primaryFocus;
      if (R) this._popFromFocusStack(R);
      let a = this._findPreviousFocusableNode();
      if (this._primaryFocus = a, a) a._setFocus(!0);
      return !0;
    }
    return this._primaryFocus = T, T._setFocus(!0), this._pushToFocusStack(T), !0;
  }
  handleKeyEvent(T) {
    if (!this._primaryFocus) return !1;
    let R = void 0,
      a = this._primaryFocus;
    while (a) {
      let e = a._handleKeyEvent(T) === "handled";
      if (R) R.push({
        id: a.debugId,
        debugLabel: a.debugLabel,
        handled: e
      });
      if (e) {
        if (R) aA.recordKeystroke(this.formatKeyEvent(T), R, !0);
        return !0;
      }
      a = a.parent;
    }
    if (R) aA.recordKeystroke(this.formatKeyEvent(T), R, !1);
    return !1;
  }
  formatKeyEvent(T) {
    let R = [];
    if (T.ctrlKey) R.push("Ctrl");
    if (T.altKey) R.push("Alt");
    if (T.shiftKey) R.push("Shift");
    if (T.metaKey) R.push("Meta");
    if (T.key) R.push(T.key);
    return R.join("+");
  }
  handlePasteEvent(T) {
    if (!this._primaryFocus) return !1;
    let R = this._primaryFocus;
    while (R) {
      if (R._handlePasteEvent(T) === "handled") return !0;
      R = R.parent;
    }
    return !1;
  }
  registerNode(T, R = null) {
    e8(T !== R, "Focus node cannot be its own parent"), this._invalidateFocusableNodesCache();
    let a = R ?? this._rootScope;
    T._attach(a);
  }
  unregisterNode(T) {
    if (this._invalidateFocusableNodesCache(), this._popFromFocusStack(T), this._primaryFocus === T) this.requestFocus(null);
    T._detach();
  }
  findNearestFocusableAncestor(T) {
    let R = T.parent;
    while (R) {
      if (R.canRequestFocus && !R.skipTraversal) return R;
      R = R.parent;
    }
    return null;
  }
  findAllFocusableNodes() {
    if (this._cachedFocusableNodes !== null) return this._cachedFocusableNodes;
    let T = [],
      R = a => {
        if (a.canRequestFocus && !a.skipTraversal) T.push(a);
        for (let e of a.children) R(e);
      };
    return R(this._rootScope), this._cachedFocusableNodes = T, T;
  }
  _invalidateFocusableNodesCache() {
    this._cachedFocusableNodes = null;
  }
  _pushToFocusStack(T) {
    let R = this._primaryFocusStack.indexOf(T);
    if (R !== -1) this._primaryFocusStack.splice(R, 1);
    this._primaryFocusStack.push(T);
  }
  _popFromFocusStack(T) {
    let R = this._primaryFocusStack.indexOf(T);
    while (R !== -1) this._primaryFocusStack.splice(R, 1), R = this._primaryFocusStack.indexOf(T);
  }
  _findPreviousFocusableNode() {
    while (this._primaryFocusStack.length > 0) {
      let T = this._primaryFocusStack[this._primaryFocusStack.length - 1];
      if (T.parent && T.canRequestFocus && !T.skipTraversal) return T;else this._primaryFocusStack.pop();
    }
    return null;
  }
  focusNext() {
    let T = this.findAllFocusableNodes();
    if (T.length === 0) return !1;
    if (!this._primaryFocus) return this.requestFocus(T[0] ?? null);
    let R = T.indexOf(this._primaryFocus);
    if (R === -1) return this.requestFocus(T[0] ?? null);
    let a = (R + 1) % T.length;
    return this.requestFocus(T[a] ?? null);
  }
  focusPrevious() {
    let T = this.findAllFocusableNodes();
    if (T.length === 0) return !1;
    if (!this._primaryFocus) return this.requestFocus(T[T.length - 1] ?? null);
    let R = T.indexOf(this._primaryFocus);
    if (R === -1) return this.requestFocus(T[T.length - 1] ?? null);
    let a = R === 0 ? T.length - 1 : R - 1;
    return this.requestFocus(T[a] ?? null);
  }
  _focusNodeToDebugInfo(T) {
    return {
      id: T.debugId,
      debugLabel: T.debugLabel,
      hasPrimaryFocus: T.hasPrimaryFocus,
      hasFocus: T.hasFocus,
      canRequestFocus: T.canRequestFocus,
      skipTraversal: T.skipTraversal,
      isPrimaryFocus: this._primaryFocus === T,
      children: Array.from(T.children).map(R => this._focusNodeToDebugInfo(R))
    };
  }
  debugDumpFocusTree() {
    return null;
  }
  dispose() {
    this._primaryFocus = null, this._cachedFocusableNodes = null, this._primaryFocusStack = [], this._rootScope.dispose(), ic._instance = null;
  }
}