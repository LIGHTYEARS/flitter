class JXT {
  _nodesNeedingPaint = new Set();
  _rootRenderObject = null;
  _rootConstraints = null;
  constructor() {}
  requestLayout(T) {
    if (!k8.instance.isFrameInProgress) k8.instance.requestFrame();
  }
  requestPaint(T) {
    if (this._nodesNeedingPaint.has(T)) return;
    if (this._nodesNeedingPaint.add(T), !k8.instance.isFrameInProgress) k8.instance.requestFrame();
  }
  setRootRenderObject(T) {
    this._rootRenderObject = T;
  }
  updateRootConstraints(T) {
    let R = new o0(0, T.width, 0, T.height),
      a = !this._rootConstraints || this._rootConstraints.maxWidth !== R.maxWidth || this._rootConstraints.maxHeight !== R.maxHeight;
    if (this._rootConstraints = R, a && this._rootRenderObject && "markNeedsLayout" in this._rootRenderObject) this._rootRenderObject.markNeedsLayout();
  }
  flushLayout() {
    let T = !1;
    if (this._rootRenderObject && this._rootConstraints && "needsLayout" in this._rootRenderObject && this._rootRenderObject.needsLayout) {
      if ("layout" in this._rootRenderObject && typeof this._rootRenderObject.layout === "function") this._rootRenderObject.layout(this._rootConstraints), T = !0;
    }
    return T;
  }
  flushPaint() {
    if (this._nodesNeedingPaint.size === 0) return;
    try {
      for (let T of this._nodesNeedingPaint) if (T.needsPaint) T._needsPaint = !1;
    } finally {
      this._nodesNeedingPaint.clear();
    }
  }
  get nodesNeedingLayout() {
    return [];
  }
  get nodesNeedingPaint() {
    return Array.from(this._nodesNeedingPaint);
  }
  get hasNodesNeedingLayout() {
    return Boolean(this._rootRenderObject && this._rootRenderObject.needsLayout);
  }
  get hasNodesNeedingPaint() {
    return this._nodesNeedingPaint.size > 0;
  }
  dispose() {
    this._nodesNeedingPaint.clear();
  }
  removeFromQueues(T) {
    this._nodesNeedingPaint.delete(T);
  }
}