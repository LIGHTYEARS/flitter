class vH {
  _parent;
  _children = [];
  _needsLayout = !1;
  _needsPaint = !1;
  _cachedDepth;
  _attached = !1;
  _debugData = {};
  allowHitTestOutsideBounds = !1;
  parentData;
  setupParentData(T) {}
  sendDebugData(T) {
    this._debugData = {
      ...this._debugData,
      ...T
    };
  }
  get debugData() {
    return this._debugData;
  }
  get parent() {
    return this._parent;
  }
  get children() {
    return this._children;
  }
  get depth() {
    if (this._cachedDepth !== void 0) return this._cachedDepth;
    let T = 0,
      R = this._parent;
    while (R) T++, R = R._parent;
    return this._cachedDepth = T, T;
  }
  _invalidateDepth() {
    this._cachedDepth = void 0;
    for (let T of this._children) T._invalidateDepth();
  }
  get needsLayout() {
    return this._needsLayout;
  }
  get needsPaint() {
    return this._needsPaint;
  }
  get attached() {
    return this._attached;
  }
  adoptChild(T) {
    if (T._parent = this, T._invalidateDepth(), this._children.push(T), this.setupParentData(T), this._attached) T.attach();
    this.markNeedsLayout();
  }
  dropChild(T) {
    let R = this._children.indexOf(T);
    if (R !== -1) {
      if (T._attached) T.detach();
      this._children.splice(R, 1), T._parent = void 0, T._invalidateDepth(), this.markNeedsLayout();
    }
  }
  removeAllChildren() {
    for (let T of this._children) {
      if (T._attached) T.detach();
      T._parent = void 0, T._invalidateDepth();
    }
    this._children.length = 0, this.markNeedsLayout();
  }
  replaceChildren(T) {
    for (let R of T) R._parent = this, R._invalidateDepth(), this.setupParentData(R);
    this._children = T, this.markNeedsLayout();
  }
  attach() {
    if (this._attached) return;
    this._attached = !0;
    for (let T of this._children) T.attach();
  }
  detach() {
    if (!this._attached) return;
    this._attached = !1;
    for (let T of this._children) T.detach();
  }
  markNeedsLayout() {
    if (this._needsLayout) return;
    if (!this._attached) return;
    if (this._needsLayout = !0, this.parent) this.parent.markNeedsLayout();else uF().requestLayout(this);
  }
  markNeedsPaint() {
    if (this._needsPaint) return;
    if (!this._attached) return;
    this._needsPaint = !0, uF().requestPaint(this);
  }
  performLayout() {}
  paint(T, R = 0, a = 0) {
    this._needsPaint = !1;
    for (let e of this.children) if ("offset" in e) {
      let t = e,
        r = R + t.offset.x,
        h = a + t.offset.y;
      e.paint(T, r, h);
    } else e.paint(T, R, a);
  }
  visitChildren(T) {
    for (let R of this._children) T(R);
  }
  dispose() {
    uF().removeFromQueues(this), this._cachedDepth = void 0, this._parent = void 0, this._children.length = 0;
  }
}