class qm {
  widget;
  parent;
  _children = [];
  _inheritedDependencies = new Set();
  _dirty = !1;
  _cachedDepth;
  _mounted = !1;
  constructor(T) {
    this.widget = T;
  }
  get children() {
    return this._children;
  }
  get depth() {
    if (this._cachedDepth !== void 0) return this._cachedDepth;
    let T = 0,
      R = this.parent;
    while (R) T++, R = R.parent;
    return this._cachedDepth = T, T;
  }
  _invalidateDepth() {
    this._cachedDepth = void 0;
    for (let T of this._children) T._invalidateDepth();
  }
  get dirty() {
    return this._dirty;
  }
  get mounted() {
    return this._mounted;
  }
  get renderObject() {
    return;
  }
  update(T) {
    this.widget = T;
  }
  addChild(T) {
    T.parent = this, T._invalidateDepth(), this._children.push(T);
  }
  removeChild(T) {
    let R = this._children.indexOf(T);
    if (R !== -1) this._children.splice(R, 1), T.parent = void 0, T._invalidateDepth();
  }
  removeAllChildren() {
    for (let T of this._children) T.parent = void 0, T._invalidateDepth();
    this._children.length = 0;
  }
  markMounted() {
    if (this._mounted = !0, this.widget.key instanceof ph) this.widget.key._setElement(this);
  }
  unmount() {
    if (this.widget.key instanceof ph) this.widget.key._clearElement();
    this._mounted = !1, this._dirty = !1, this._cachedDepth = void 0;
    for (let T of this._inheritedDependencies) if ("removeDependent" in T) T.removeDependent(this);
    this._inheritedDependencies.clear();
  }
  markNeedsRebuild() {
    if (!this._mounted) return;
    this._dirty = !0, My0().scheduleBuildFor(this);
  }
  dependOnInheritedWidgetOfExactType(T) {
    let R = this.parent;
    while (R) {
      if (R.widget.constructor === T) {
        if ("addDependent" in R && "removeDependent" in R) {
          let a = R;
          a.addDependent(this), this._inheritedDependencies.add(a);
        }
        return R;
      }
      R = R.parent;
    }
    return null;
  }
  findAncestorElementOfType(T) {
    let R = this.parent;
    while (R) {
      if (R instanceof T) return R;
      R = R.parent;
    }
    return null;
  }
  findAncestorWidgetOfType(T) {
    let R = this.parent;
    while (R) {
      if (R.widget instanceof T) return R.widget;
      R = R.parent;
    }
    return null;
  }
}