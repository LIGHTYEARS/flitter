class wR {
  widget;
  context;
  _mounted = !1;
  get mounted() {
    return this._mounted;
  }
  initState() {}
  didUpdateWidget(T) {}
  dispose() {}
  setState(T) {
    if (!this._mounted) throw Error("setState() called after dispose()");
    if (T) T();
    this._markNeedsBuild();
  }
  _mount(T, R) {
    this.widget = T, this.context = R, this._mounted = !0, this.initState();
  }
  _update(T) {
    let R = this.widget;
    this.widget = T, this.didUpdateWidget(R);
  }
  _unmount() {
    this._mounted = !1, this.dispose();
  }
  _markNeedsBuild() {
    let T = this.context.element;
    if ("markNeedsBuild" in T && typeof T.markNeedsBuild === "function") T.markNeedsBuild();
  }
}