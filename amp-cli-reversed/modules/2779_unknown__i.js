class _i {
  static _instance = null;
  _allExpanded = !1;
  _listeners = new Set();
  static get instance() {
    if (!_i._instance) _i._instance = new _i();
    return _i._instance;
  }
  get allExpanded() {
    return this._allExpanded;
  }
  setAllExpanded(T) {
    if (this._allExpanded === T) return;
    this._allExpanded = T, this._notifyListeners();
  }
  toggleAll() {
    this.setAllExpanded(!this._allExpanded);
  }
  addListener(T) {
    return this._listeners.add(T), () => this.removeListener(T);
  }
  removeListener(T) {
    this._listeners.delete(T);
  }
  _notifyListeners() {
    for (let T of this._listeners) T();
  }
}