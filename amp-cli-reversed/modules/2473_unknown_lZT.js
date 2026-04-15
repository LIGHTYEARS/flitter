function jE0(T, R) {
  let a = () => {
    R();
  };
  return T.addListener(a), {
    dispose: () => T.removeListener(a)
  };
}
class lZT {
  builder;
  maintainState;
  _overlayState;
  _needsBuild = !0;
  constructor(T, R = !1) {
    this.builder = T, this.maintainState = R;
  }
  get mounted() {
    return this._overlayState !== void 0;
  }
  remove() {
    if (this._overlayState) this._overlayState.remove(this);
  }
  markNeedsBuild() {
    if (this._needsBuild = !0, this._overlayState) this._overlayState._markNeedsRebuild();
  }
  _setOverlayState(T) {
    this._overlayState = T;
  }
  _needsRebuild() {
    return this._needsBuild;
  }
  _clearNeedsRebuild() {
    this._needsBuild = !1;
  }
}