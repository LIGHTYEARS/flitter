class l8 {
  static _nextDebugId = 0;
  _debugId;
  _parent = null;
  _children = new Set();
  _hasPrimaryFocus = !1;
  _canRequestFocus = !0;
  _skipTraversal = !1;
  _keyHandlers = [];
  _onPasteCallback = null;
  _listeners = new Set();
  _debugLabel = null;
  static _requestFocusCallback = null;
  constructor(T = {}) {
    if (this._debugId = `focus-${l8._nextDebugId++}`, this._debugLabel = T.debugLabel ?? null, this._canRequestFocus = T.canRequestFocus ?? !0, this._skipTraversal = T.skipTraversal ?? !1, T.onKey) this._keyHandlers.push(T.onKey);
    this._onPasteCallback = T.onPaste ?? null;
  }
  get debugId() {
    return this._debugId;
  }
  get hasPrimaryFocus() {
    return this._hasPrimaryFocus;
  }
  get hasFocus() {
    let T = ic.instance.primaryFocus;
    return this._hasPrimaryFocus || (T?._isDecendantOf(this) ?? !1);
  }
  get canRequestFocus() {
    return this._canRequestFocus;
  }
  set canRequestFocus(T) {
    if (this._canRequestFocus !== T) {
      if (this._canRequestFocus = T, !T && this._hasPrimaryFocus) this.unfocus();
    }
  }
  get skipTraversal() {
    return this._skipTraversal;
  }
  set skipTraversal(T) {
    this._skipTraversal = T;
  }
  get parent() {
    return this._parent;
  }
  get children() {
    return this._children;
  }
  get debugLabel() {
    return this._debugLabel;
  }
  get onPaste() {
    return this._onPasteCallback;
  }
  set onPaste(T) {
    this._onPasteCallback = T;
  }
  static setRequestFocusCallback(T) {
    l8._requestFocusCallback = T;
  }
  requestFocus() {
    if (!this._canRequestFocus) return !1;
    if (l8._requestFocusCallback) return l8._requestFocusCallback(this);
    return !1;
  }
  unfocus() {
    if (this._hasPrimaryFocus) {
      if (l8._requestFocusCallback) l8._requestFocusCallback(null);
    }
  }
  _isDecendantOf(T) {
    if (T === null) return !1;
    if (this._parent === T) return !0;
    return this._parent?._isDecendantOf(T) ?? !1;
  }
  _isAncestorTo(T) {
    return T?._isDecendantOf(this) ?? !1;
  }
  _attach(T) {
    if (this._parent === T) return;
    if (this._parent) this._parent._children.delete(this);
    if (this._parent = T, T) T._children.add(this);
    if (l8._requestFocusCallback) {
      let R = l8._requestFocusCallback.__focusManager;
      if (R && R._invalidateFocusableNodesCache) R._invalidateFocusableNodesCache();
    }
  }
  _detach() {
    if (this._parent) this._parent._children.delete(this), this._parent = null;
    if (l8._requestFocusCallback) {
      let T = l8._requestFocusCallback.__focusManager;
      if (T && T._invalidateFocusableNodesCache) T._invalidateFocusableNodesCache();
    }
    if (this._hasPrimaryFocus) this.unfocus();
  }
  _setFocus(T) {
    if (this._hasPrimaryFocus === T) return;
    let R = this.hasFocus;
    this._hasPrimaryFocus = T;
    let a = this.hasFocus;
    if (this._notifyListeners(), R !== a) this._notifyAncestorListeners();
  }
  addListener(T) {
    this._listeners.add(T);
  }
  removeListener(T) {
    this._listeners.delete(T);
  }
  _notifyListeners() {
    for (let T of this._listeners) T(this);
  }
  _notifyAncestorListeners() {
    let T = this._parent;
    while (T) T._notifyListeners(), T = T._parent;
  }
  _handleKeyEvent(T) {
    return this.handleKeyEvent(T);
  }
  _handlePasteEvent(T) {
    if (this._onPasteCallback) return this._onPasteCallback(T);
    return "ignored";
  }
  toStringShort() {
    let T = this._debugLabel ? `"${this._debugLabel}"` : "",
      R = this._hasPrimaryFocus ? " FOCUSED" : "",
      a = this._canRequestFocus ? "" : " (can't focus)";
    return `FocusNode${T}${R}${a}`;
  }
  toStringDeep(T = "", R = !0) {
    let a = T + this.toStringShort();
    if (R && this._children.size > 0) {
      let e = T + "  ";
      for (let t of this._children) a += `
` + t.toStringDeep(e, !0);
    }
    return a;
  }
  addKeyHandler(T) {
    this._keyHandlers.push(T);
  }
  removeKeyHandler(T) {
    let R = this._keyHandlers.indexOf(T);
    if (R !== -1) this._keyHandlers.splice(R, 1);
  }
  handleKeyEvent(T) {
    for (let R of this._keyHandlers) if (R(T) === "handled") return "handled";
    return "ignored";
  }
  dispose() {
    this._detach(), this._children.clear(), this._keyHandlers = [];
  }
}