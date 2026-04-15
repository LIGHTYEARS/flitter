function RH0(T) {
  return T.spec.meta?.skillNames ? Array.from(T.spec.meta.skillNames) : [];
}
function aH0(T) {
  let R = new YRR({
    pluginService: T.pluginService,
    cwd: process.cwd()
  });
  return new et(R, "Plugins", "info", "default", {
    width: 100,
    height: 30
  });
}
class Ut {
  static _instance = null;
  _allExpanded = !1;
  _listeners = new Set();
  static get instance() {
    if (!Ut._instance) Ut._instance = new Ut();
    return Ut._instance;
  }
  get allExpanded() {
    return this._allExpanded;
  }
  toggleAll() {
    this._allExpanded = !this._allExpanded, this._notifyListeners();
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