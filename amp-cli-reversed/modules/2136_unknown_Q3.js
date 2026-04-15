class Q3 {
  _offset = 0;
  _listeners = [];
  _disposed = !1;
  _maxScrollExtent = 0;
  _hasInitialOffset = !1;
  _animationTimer = null;
  _animationTarget = null;
  _animationStartTime = 0;
  _animationDuration = 0;
  _animationCurve = "linear";
  _followMode = !0;
  get offset() {
    return this._offset;
  }
  get currentLine() {
    return this._offset;
  }
  get maxScrollExtent() {
    return this._maxScrollExtent;
  }
  get atTop() {
    return this._offset <= 0;
  }
  get atBottom() {
    return this._offset >= this._maxScrollExtent;
  }
  get atEdge() {
    return this.atTop || this.atBottom;
  }
  get followMode() {
    return this._followMode;
  }
  set followMode(T) {
    this._followMode = T;
  }
  get isDisposed() {
    return this._disposed;
  }
  get hasInitialOffset() {
    return this._hasInitialOffset;
  }
  addListener(T) {
    if (this._disposed) throw Error("ScrollController is disposed");
    this._listeners.push(T);
  }
  removeListener(T) {
    let R = this._listeners.indexOf(T);
    if (R !== -1) this._listeners.splice(R, 1);
  }
  updateMaxScrollExtent(T) {
    if (this._disposed) return;
    let R = this._maxScrollExtent;
    if (this._maxScrollExtent = T, R !== T) this._notifyListeners();
  }
  updateOffset(T) {
    if (this._disposed) return;
    if (this._offset !== T) this._offset = T, this._hasInitialOffset = !0, this._notifyListeners();
  }
  animateTo(T, R = 150) {
    if (this._disposed) return;
    let {
        duration: a,
        curve: e
      } = this._resolveAnimationOptions(R),
      t = Math.max(0, Math.min(this._maxScrollExtent, T));
    if (a <= 0 || Math.abs(this._offset - t) <= 1) {
      this.jumpTo(t);
      return;
    }
    if (this._animationTimer && this._animationTarget !== null) {
      this._animationTarget = t;
      return;
    }
    this._animationTarget = t, this._animationStartTime = Date.now(), this._animationDuration = Math.max(1, a), this._animationCurve = e;
    let r = this._offset,
      h = 16;
    this._animationTimer = setInterval(() => {
      let i = Date.now() - this._animationStartTime,
        c = this._animationTarget,
        s = c - r,
        A = Math.min(i / this._animationDuration, 1),
        l = this._applyAnimationCurve(A, this._animationCurve);
      if (A >= 1) {
        if (this._animationTimer) clearInterval(this._animationTimer), this._animationTimer = null, this._animationTarget = null;
        this.updateOffset(c);
      } else {
        let o = r + s * l;
        this.updateOffset(Math.round(o));
      }
    }, h);
  }
  jumpTo(T) {
    if (this._disposed) return;
    let R = Math.max(0, Math.min(this._maxScrollExtent, T));
    this.updateOffset(R);
  }
  animateToLine(T, R) {
    this.animateTo(T, R);
  }
  jumpToLine(T) {
    this.jumpTo(T);
  }
  scrollToTop() {
    this.jumpTo(0);
  }
  scrollToBottom() {
    this.jumpTo(this._maxScrollExtent);
  }
  animateToBottom(T = 150) {
    this.animateTo(this._maxScrollExtent, T);
  }
  enableFollowMode() {
    this._followMode = !0;
  }
  disableFollowMode() {
    this._followMode = !1;
  }
  toggleFollowMode() {
    this._followMode = !this._followMode;
  }
  scrollUp(T) {
    if (this._disposed) return;
    let R = Math.max(0, this._offset - T);
    this.jumpTo(R);
  }
  scrollDown(T) {
    if (this._disposed) return;
    let R = Math.min(this._maxScrollExtent, this._offset + T);
    this.jumpTo(R);
  }
  animateScrollUp(T, R) {
    if (this._disposed) return;
    let a = this._animationTarget ?? this._offset,
      e = Math.max(0, a - T);
    this.animateTo(e, R);
  }
  animateScrollDown(T, R) {
    if (this._disposed) return;
    let a = (this._animationTarget ?? this._offset) + T;
    this.animateTo(a, R);
  }
  scrollPageUp(T) {
    let R = Math.max(1, Math.floor(T / 2));
    this.scrollUp(R);
  }
  scrollPageDown(T) {
    let R = Math.max(1, Math.floor(T / 2));
    this.scrollDown(R);
  }
  animatePageUp(T, R) {
    let a = Math.max(1, T);
    this.animateScrollUp(a, this._resolveAnimationOptions(R, 100));
  }
  animatePageDown(T, R) {
    let a = Math.max(1, T);
    this.animateScrollDown(a, this._resolveAnimationOptions(R, 100));
  }
  dispose() {
    if (this._disposed) return;
    if (this._animationTimer) clearInterval(this._animationTimer), this._animationTimer = null, this._animationTarget = null;
    this._listeners.length = 0, this._disposed = !0;
  }
  _resolveAnimationOptions(T, R = 150) {
    if (typeof T === "number") return {
      duration: T,
      curve: "linear"
    };
    return {
      duration: T?.duration ?? R,
      curve: T?.curve ?? "linear"
    };
  }
  _applyAnimationCurve(T, R) {
    switch (R) {
      case "easeOutCubic":
        return 1 - (1 - T) ** 3;
      case "easeInOutCubic":
        return T < 0.5 ? 4 * T ** 3 : 1 - (-2 * T + 2) ** 3 / 2;
      case "linear":
      default:
        return T;
    }
  }
  _notifyListeners() {
    let T = [...this._listeners];
    for (let R of T) try {
      R();
    } catch (a) {
      J.error("Error in scroll listener:", a);
    }
  }
}