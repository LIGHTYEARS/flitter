class BQT {
  _nextId = 0;
  _visibleToasts = [];
  _queuedToasts = [];
  _listeners = new Set();
  _timers = new Map();
  get toasts() {
    return this._visibleToasts;
  }
  get queuedToasts() {
    return this._queuedToasts;
  }
  show(T, R = "success", a = aQ) {
    let e = this._nextId++,
      t = T.replace(/[\r\n]+/g, " ").trim(),
      r = {
        id: e,
        message: t,
        type: R
      };
    if (this._visibleToasts.length < nIT) this._visibleToasts.push(r), this._startTimer(e, a);else this._queuedToasts.push({
      ...r,
      duration: a
    });
    this._notifyListeners();
  }
  _startTimer(T, R) {
    let a = setTimeout(() => {
      this.dismiss(T);
    }, R);
    a.unref(), this._timers.set(T, a);
  }
  _promoteFromQueue() {
    while (this._visibleToasts.length < nIT && this._queuedToasts.length > 0) {
      let T = this._queuedToasts.shift();
      this._visibleToasts.push(T);
      let R = T.duration ?? aQ;
      this._startTimer(T.id, R);
    }
  }
  dismiss(T) {
    let R = this._timers.get(T);
    if (R) clearTimeout(R), this._timers.delete(T);
    let a = this._visibleToasts.findIndex(t => t.id === T);
    if (a !== -1) {
      this._visibleToasts.splice(a, 1), this._promoteFromQueue(), this._notifyListeners();
      return;
    }
    let e = this._queuedToasts.findIndex(t => t.id === T);
    if (e !== -1) this._queuedToasts.splice(e, 1), this._notifyListeners();
  }
  dismissAll() {
    for (let T of this._timers.values()) clearTimeout(T);
    this._timers.clear(), this._visibleToasts = [], this._queuedToasts = [], this._notifyListeners();
  }
  addListener(T) {
    this._listeners.add(T);
  }
  removeListener(T) {
    this._listeners.delete(T);
  }
  _notifyListeners() {
    for (let T of this._listeners) T();
  }
  dispose() {
    for (let T of this._timers.values()) clearTimeout(T);
    this._timers.clear(), this._listeners.clear();
  }
}