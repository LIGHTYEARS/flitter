function vE0(T, R, a) {
  return {
    type: "image",
    source: {
      type: "base64",
      data: T.toString("base64"),
      mediaType: R
    },
    sourcePath: a
  };
}
class ArT {
  _listeners = new Set();
  _disposed = !1;
  addListener(T) {
    if (this._disposed) throw Error("Cannot add listener to disposed ChangeNotifier");
    this._listeners.add(T);
  }
  removeListener(T) {
    this._listeners.delete(T);
  }
  notifyListeners() {
    if (this._disposed) return;
    let T = Array.from(this._listeners);
    for (let R of T) try {
      R();
    } catch (a) {}
  }
  dispose() {
    this._disposed = !0, this._listeners.clear();
  }
  get disposed() {
    return this._disposed;
  }
  get hasListeners() {
    return this._listeners.size > 0;
  }
}