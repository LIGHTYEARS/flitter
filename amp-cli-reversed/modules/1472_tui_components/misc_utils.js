x9 = class x9 extends UXT {
  onInvoke;
  constructor(T) {
    super();
    this.onInvoke = T;
  }
  invoke(T) {
    return this.onInvoke(T);
  }
};
kY = class kY extends H8 {
  constructor() {
    super();
  }
};
xY = class xY extends H8 {
  constructor() {
    super();
  }
};
fY = class fY extends H8 {
  constructor() {
    super();
  }
};
WXT = class WXT extends H8 {
  constructor() {
    super();
  }
};
IY = class IY extends H8 {
  constructor() {
    super();
  }
};
gY = class gY extends H8 {
  constructor() {
    super();
  }
};
qXT = class qXT extends H8 {
  constructor() {
    super();
  }
};
$Y = class $Y extends H8 {
  constructor() {
    super();
  }
};
LM = class LM extends H8 {
  constructor() {
    super();
  }
};
vY = class vY extends H8 {
  constructor() {
    super();
  }
};
MM = class MM extends H8 {
  constructor() {
    super();
  }
};
DM = class DM extends H8 {
  direction;
  constructor(T) {
    super();
    this.direction = T;
  }
  toString() {
    return `NavigateToPromptHistoryIntent(direction: ${this.direction})`;
  }
};
jY = class jY extends H8 {
  constructor() {
    super();
  }
};
SY = class SY extends H8 {
  constructor() {
    super();
  }
};
B0 = class B0 extends Mn {
  createElement() {
    return new R1T(this);
  }
};
CA = class CA extends Ve {
  forceDim;
  constructor({
    key: T,
    forceDim: R,
    child: a
  }) {
    super({
      key: T,
      child: a
    });
    this.forceDim = R;
  }
  static maybeOf(T) {
    let R = T.dependOnInheritedWidgetOfExactType(CA);
    if (R) return R.widget;
    return null;
  }
  static shouldForceDim(T) {
    return CA.maybeOf(T)?.forceDim ?? !1;
  }
  updateShouldNotify(T) {
    return this.forceDim !== T.forceDim;
  }
};
Yb = class Yb extends Ve {
  controller;
  constructor({
    key: T,
    controller: R,
    child: a
  }) {
    super({
      key: T,
      child: a
    });
    this.controller = R;
  }
  static of(T) {
    let R = T.dependOnInheritedWidgetOfExactType(Yb);
    if (R) return R.widget.controller;
    return null;
  }
  static require(T) {
    let R = Yb.of(T);
    if (!R) throw Error(`InheritedSelectionArea.require() called with a context that does not contain an InheritedSelectionArea.
No InheritedSelectionArea ancestor could be found starting from the given context. This can happen if the context comes from a widget above the SelectionArea.
The context used was: ` + T.widget.constructor.name);
    return R;
  }
  updateShouldNotify(T) {
    return this.controller !== T.controller;
  }
};
dH = class dH extends _t {
  clipBehavior;
  constructor(T, {
    key: R,
    clipBehavior: a = "antiAlias"
  } = {}) {
    super(R ? {
      child: T,
      key: R
    } : {
      child: T
    });
    this.clipBehavior = a;
  }
  createRenderObject() {
    return new r1T(this.clipBehavior);
  }
  updateRenderObject(T) {
    T.updateClipBehavior(this.clipBehavior);
  }
};
h1T = class h1T extends Tf {
  constructor(T) {
    super(T);
  }
  mount() {
    super.mount(), this._updateForceDim();
  }
  performRebuild() {
    super.performRebuild(), this._updateForceDim();
  }
  _updateForceDim() {
    if (!this.renderObject) return;
    let T = new Ib(this, this.widget),
      R = CA.shouldForceDim(T);
    if (this.renderObject instanceof qw) this.renderObject.setForceDim(R);
  }
};
EH = class EH extends Mn {
  child;
  constructor(T, R) {
    super(R ? {
      key: R
    } : {});
    this.child = T;
  }
  createElement() {
    return new i1T(this);
  }
};
i1T = class i1T extends qm {
  _child;
  constructor(T) {
    super(T);
  }
  get parentDataWidget() {
    return this.widget;
  }
  get child() {
    return this._child;
  }
  get renderObject() {
    return this._child?.renderObject;
  }
  mount() {
    this._child = this.parentDataWidget.child.createElement(), this.addChild(this._child), this._child.mount(), this._applyParentData();
  }
  unmount() {
    if (this._child) this._child.unmount(), this.removeChild(this._child), this._child = void 0;
    super.unmount();
  }
  update(T) {
    super.update(T);
    let R = T;
    if (this._child) {
      if (this._child.widget.canUpdate(R.child)) this._child.update(R.child);else this._child.unmount(), this.removeChild(this._child), this._child = R.child.createElement(), this.addChild(this._child), this._child.mount();
    } else this._child = R.child.createElement(), this.addChild(this._child), this._child.mount();
    this._applyParentData();
  }
  performRebuild() {
    this._applyParentData();
  }
  _applyParentData() {
    let T = this._child;
    if (!T) return;
    let R = T.renderObject;
    if (!R) return;
    if (!this.parentDataWidget.debugIsValidRenderObject(R)) throw Error(`ParentDataWidget ${this.parentDataWidget.constructor.name} provided parent data to ${R.constructor.name}, but ${R.constructor.name} doesn't support this type of parent data.`);
    if (!R.parentData || R.parentData.constructor !== this.parentDataWidget.createParentData().constructor) R.parentData = this.parentDataWidget.createParentData();
    this.parentDataWidget.applyParentData(R);
  }
};
CH = class CH extends MtT {
  flex;
  fit;
  constructor(T = 0, R = "tight") {
    super();
    this.flex = T, this.fit = R;
  }
  toString() {
    return `FlexParentData(flex: ${this.flex}, fit: ${this.fit})`;
  }
};
j0 = class j0 extends EH {
  flex;
  constructor({
    child: T,
    flex: R = 1,
    key: a
  }) {
    super(T, a);
    this.flex = R;
  }
  createParentData() {
    return new CH(this.flex, "tight");
  }
  applyParentData(T) {
    let R = T.parentData;
    if (R) R.flex = this.flex, R.fit = "tight";
  }
  debugIsValidRenderObject(T) {
    return !0;
  }
  toString() {
    return `Expanded(flex: ${this.flex}, child: ${this.child})`;
  }
};
DtT = class DtT extends Dn {
  direction;
  mainAxisAlignment;
  crossAxisAlignment;
  mainAxisSize;
  constructor({
    key: T,
    direction: R,
    children: a = [],
    mainAxisAlignment: e = "start",
    crossAxisAlignment: t = "center",
    mainAxisSize: r = "min"
  }) {
    super({
      ...(T ? {
        key: T
      } : {}),
      children: a
    });
    this.direction = R, this.mainAxisAlignment = e, this.crossAxisAlignment = t, this.mainAxisSize = r;
  }
  createRenderObject() {
    return new s1T(this.direction, this.mainAxisAlignment, this.crossAxisAlignment, this.mainAxisSize);
  }
  updateRenderObject(T) {
    T.updateProperties(this.direction, this.mainAxisAlignment, this.crossAxisAlignment, this.mainAxisSize);
  }
  createElement() {
    return new c1T(this);
  }
};
c1T = class c1T extends gtT {
  constructor(T) {
    super(T);
  }
  get flexWidget() {
    return this.widget;
  }
  mount() {
    super.mount(), this._setupChildParentData();
  }
  update(T) {
    super.update(T), this._setupChildParentData();
  }
  performRebuild() {
    super.performRebuild(), this._setupChildParentData();
  }
  _setupChildParentData() {
    for (let T of this.children) {
      let R = T.renderObject;
      if (R && !R.parentData) R.parentData = new CH(0, "tight");
    }
  }
};
Fm = class Fm extends EH {
  flex;
  fit;
  constructor({
    child: T,
    flex: R = 1,
    fit: a = "loose",
    key: e
  }) {
    super(T, e);
    this.flex = R, this.fit = a;
  }
  createParentData() {
    return new CH(this.flex, this.fit);
  }
  applyParentData(T) {
    let R = T.parentData;
    if (R) R.flex = this.flex, R.fit = this.fit;
  }
  debugIsValidRenderObject(T) {
    return !0;
  }
  toString() {
    return `Flexible(flex: ${this.flex}, fit: ${this.fit}, child: ${this.child})`;
  }
};
Ta = class Ta extends Dn {
  fit;
  constructor({
    key: T,
    fit: R = "loose",
    children: a = []
  } = {}) {
    super({
      ...(T ? {
        key: T
      } : {}),
      children: a
    });
    this.fit = R;
  }
  createRenderObject() {
    return new EY(this.fit);
  }
  updateRenderObject(T) {
    if (T instanceof EY) T.fit = this.fit;
  }
};
ca = class ca extends EH {
  left;
  top;
  right;
  bottom;
  width;
  height;
  constructor({
    key: T,
    left: R,
    top: a,
    right: e,
    bottom: t,
    width: r,
    height: h,
    child: i
  }) {
    if (R !== void 0 && e !== void 0 && r !== void 0) throw Error("Positioned: Only two out of the three horizontal values (left, right, width) can be set");
    if (a !== void 0 && t !== void 0 && h !== void 0) throw Error("Positioned: Only two out of the three vertical values (top, bottom, height) can be set");
    super(i, T);
    this.left = R, this.top = a, this.right = e, this.bottom = t, this.width = r, this.height = h;
  }
  createParentData() {
    return new zw(this.left, this.top, this.right, this.bottom, this.width, this.height);
  }
  applyParentData(T) {
    let R = T.parentData;
    if (R) R.left = this.left, R.top = this.top, R.right = this.right, R.bottom = this.bottom, R.width = this.width, R.height = this.height;
  }
  debugIsValidRenderObject(T) {
    return !0;
  }
  updateParentData(T) {
    let R = T.parentData,
      a = !1;
    if (R.left !== this.left) R.left = this.left, a = !0;
    if (R.top !== this.top) R.top = this.top, a = !0;
    if (R.right !== this.right) R.right = this.right, a = !0;
    if (R.bottom !== this.bottom) R.bottom = this.bottom, a = !0;
    if (R.width !== this.width) R.width = this.width, a = !0;
    if (R.height !== this.height) R.height = this.height, a = !0;
    if (a) {
      let e = T.parent;
      if (e && "markNeedsLayout" in e) e.markNeedsLayout();
    }
  }
};
T0 = class T0 extends DtT {
  constructor({
    key: T,
    children: R = [],
    mainAxisAlignment: a = "start",
    crossAxisAlignment: e = "center",
    mainAxisSize: t = "max"
  } = {}) {
    super({
      ...(T ? {
        key: T
      } : {}),
      direction: "horizontal",
      children: R,
      mainAxisAlignment: a,
      crossAxisAlignment: e,
      mainAxisSize: t
    });
  }
  static start(T) {
    return new T0({
      children: T,
      mainAxisAlignment: "start"
    });
  }
  static center(T) {
    return new T0({
      children: T,
      mainAxisAlignment: "center"
    });
  }
  static end(T) {
    return new T0({
      children: T,
      mainAxisAlignment: "end"
    });
  }
  static spaceBetween(T) {
    return new T0({
      children: T,
      mainAxisAlignment: "spaceBetween"
    });
  }
  static spaceAround(T) {
    return new T0({
      children: T,
      mainAxisAlignment: "spaceAround"
    });
  }
  static spaceEvenly(T) {
    return new T0({
      children: T,
      mainAxisAlignment: "spaceEvenly"
    });
  }
};
XT = class XT extends _t {
  width;
  height;
  constructor({
    key: T,
    width: R,
    height: a,
    child: e
  } = {}) {
    super({
      key: T,
      child: e
    });
    this.width = R, this.height = a;
  }
  createRenderObject() {
    return new o1T(this.width, this.height);
  }
  updateRenderObject(T) {
    T.updateDimensions(this.width, this.height);
  }
  static fromSize(T, R, a) {
    return a ? new XT({
      width: T,
      height: R,
      child: a
    }) : new XT({
      width: T,
      height: R
    });
  }
  static expand(T) {
    return T ? new XT({
      width: 1 / 0,
      height: 1 / 0,
      child: T
    }) : new XT({
      width: 1 / 0,
      height: 1 / 0
    });
  }
  static shrink(T) {
    return T ? new XT({
      width: 0,
      height: 0,
      child: T
    }) : new XT({
      width: 0,
      height: 0
    });
  }
  static height(T, R) {
    return R ? new XT({
      height: T,
      child: R
    }) : new XT({
      height: T
    });
  }
  static width(T, R) {
    return R ? new XT({
      width: T,
      child: R
    }) : new XT({
      width: T
    });
  }
};
wtT = class wtT extends B0 {
  child;
  isTop;
  constructor({
    child: T,
    isTop: R
  }) {
    super();
    this.child = T, this.isTop = R;
  }
  build(T) {
    return new ca({
      top: this.isTop ? 0 : void 0,
      bottom: this.isTop ? void 0 : 0,
      left: 0,
      right: 0,
      child: new T0({
        mainAxisAlignment: "center",
        children: [this.child]
      })
    });
  }
};
N0 = class N0 extends _t {
  widthFactor;
  heightFactor;
  constructor({
    key: T,
    child: R,
    widthFactor: a,
    heightFactor: e
  } = {}) {
    super({
      key: T,
      child: R
    });
    this.widthFactor = a, this.heightFactor = e;
  }
  createRenderObject() {
    return new CY(this.widthFactor, this.heightFactor);
  }
  updateRenderObject(T) {
    if (T instanceof CY) T.widthFactor = this.widthFactor, T.heightFactor = this.heightFactor;
  }
  static child(T) {
    return new N0({
      child: T
    });
  }
};
xR = class xR extends DtT {
  constructor({
    key: T,
    children: R = [],
    mainAxisAlignment: a = "start",
    crossAxisAlignment: e = "center",
    mainAxisSize: t = "max"
  } = {}) {
    super({
      ...(T ? {
        key: T
      } : {}),
      direction: "vertical",
      children: R,
      mainAxisAlignment: a,
      crossAxisAlignment: e,
      mainAxisSize: t
    });
  }
  static start(T) {
    return new xR({
      children: T,
      mainAxisAlignment: "start"
    });
  }
  static center(T) {
    return new xR({
      children: T,
      mainAxisAlignment: "center"
    });
  }
  static end(T) {
    return new xR({
      children: T,
      mainAxisAlignment: "end"
    });
  }
  static spaceBetween(T) {
    return new xR({
      children: T,
      mainAxisAlignment: "spaceBetween"
    });
  }
  static spaceAround(T) {
    return new xR({
      children: T,
      mainAxisAlignment: "spaceAround"
    });
  }
  static spaceEvenly(T) {
    return new xR({
      children: T,
      mainAxisAlignment: "spaceEvenly"
    });
  }
};
BtT = class BtT extends _t {
  constructor(T) {
    super({
      child: T.child
    });
  }
  createRenderObject() {
    return new n1T();
  }
  updateRenderObject(T) {}
};
l1T = class l1T extends Dn {
  overlap;
  crossAxisAlignment;
  constructor({
    key: T,
    overlap: R = 1,
    crossAxisAlignment: a = "stretch",
    children: e = []
  }) {
    super({
      ...(T ? {
        key: T
      } : {}),
      children: e
    });
    e8(R >= 0, "OverlapColumn overlap must be non-negative"), this.overlap = R, this.crossAxisAlignment = a;
  }
  createRenderObject() {
    return new LY(this.overlap, this.crossAxisAlignment);
  }
  updateRenderObject(T) {
    if (T instanceof LY) T.updateProperties(this.overlap, this.crossAxisAlignment);
  }
};
y3 = class y3 extends Mn {
  flex;
  width;
  height;
  constructor({
    key: T,
    flex: R = 1,
    width: a,
    height: e
  } = {}) {
    super(T ? {
      key: T
    } : {});
    this.flex = R, this.width = a, this.height = e;
  }
  createElement() {
    if (this.width !== void 0 || this.height !== void 0) {
      let T = {
        child: new SR()
      };
      if (this.width !== void 0) T.width = this.width;
      if (this.height !== void 0) T.height = this.height;
      return new XT(T).createElement();
    } else return new j0({
      flex: this.flex,
      child: XT.shrink()
    }).createElement();
  }
  static horizontal(T) {
    return new y3({
      width: T
    });
  }
  static vertical(T) {
    return new y3({
      height: T
    });
  }
  static flexible(T = 1) {
    return new y3({
      flex: T
    });
  }
};
u1T = class u1T extends NR {
  child;
  onKeepAliveChange;
  constructor({
    key: T,
    child: R,
    onKeepAliveChange: a
  }) {
    super({
      key: T
    });
    this.child = R, this.onKeepAliveChange = a;
  }
  createState() {
    return new y1T();
  }
};
y1T = class y1T extends wR {
  _controller = new m1T(T => {
    this.widget.onKeepAliveChange(T);
  });
  initState() {
    super.initState(), this._controller.setParent(Yb.require(this.context));
  }
  build(T) {
    return new Yb({
      controller: this._controller,
      child: this.widget.child
    });
  }
  dispose() {
    this._controller.disposeBoundary(), super.dispose();
  }
};
x1T = class x1T extends k1T {
  applyBoundaryConditions(T, R, a) {
    return Math.max(R, Math.min(a, T));
  }
};
Gw = class Gw extends Error {
  constructor(T) {
    super(T);
    this.name = "ArgParseError";
  }
};
DY = class DY extends H8 {};
wY = class wY extends H8 {};
qtT = class qtT extends H8 {};
ztT = class ztT extends H8 {};
BY = class BY extends H8 {};
dv = class dv extends H8 {};
NM = class NM extends _t {
  onSizeChange;
  constructor({
    key: T,
    child: R,
    onSizeChange: a
  }) {
    super({
      key: T,
      child: R
    });
    this.onSizeChange = a;
  }
  createRenderObject() {
    return new N1T(this.onSizeChange);
  }
  updateRenderObject(T) {
    T.updateCallback(this.onSizeChange);
  }
};
N1T = class N1T extends O9 {
  _onSizeChange;
  _lastReportedSize = null;
  _pendingReportedSize = null;
  _reportScheduled = !1;
  constructor(T) {
    super();
    this._onSizeChange = T;
  }
  updateCallback(T) {
    this._onSizeChange = T;
  }
  performLayout() {
    let T = this._lastConstraints;
    if (!T) return;
    let R = this.children[0];
    if (!R) {
      let e = T.constrain(0, 0);
      this.setSize(e.width, e.height), super.performLayout();
      return;
    }
    R.layout(T), R.setOffset(0, 0);
    let a = T.constrain(R.size.width, R.size.height);
    this.setSize(a.width, a.height), this._scheduleSizeReport(a), super.performLayout();
  }
  paint(T, R = 0, a = 0) {
    super.paint(T, R, a);
  }
  _scheduleSizeReport(T) {
    if (this._sizesEqual(this._lastReportedSize, T)) return;
    if (this._pendingReportedSize = T, this._reportScheduled) return;
    this._reportScheduled = !0, k8.instance.addPostFrameCallback(() => {
      if (this._reportScheduled = !1, !this.attached || !this._pendingReportedSize) return;
      let R = this._pendingReportedSize;
      if (this._pendingReportedSize = null, this._sizesEqual(this._lastReportedSize, R)) return;
      this._lastReportedSize = R, this._onSizeChange(R);
    }, "MeasureSize.size-change");
  }
  _sizesEqual(T, R) {
    if (T === null || R === null) return T === R;
    return T.width === R.width && T.height === R.height;
  }
};
q1T = class q1T extends wR {
  _dragStartY = null;
  _dragStartOffset = null;
  _isOverThumb = !1;
  build(T) {
    let R = Z0.of(T),
      a = this.widget.thumbColor ?? R.colorScheme.foreground,
      e = this.widget.trackColor ?? R.colorScheme.selection;
    return new G0({
      onClick: this._handleClick,
      onHover: this._handleHover,
      onDrag: this._handleDrag,
      onRelease: this._handleRelease,
      cursor: this._isOverThumb ? "pointer" : "default",
      child: new z1T({
        controller: this.widget.controller,
        getScrollInfo: this.widget.getScrollInfo,
        thickness: this.widget.thickness,
        trackChar: this.widget.trackChar,
        thumbChar: this.widget.thumbChar,
        showTrack: this.widget.showTrack,
        thumbColor: a,
        trackColor: e
      })
    });
  }
  _handleHover = T => {
    let R = this._isOverThumb;
    if (this._isOverThumb = this._isPositionOverThumb(T.localPosition.y), R !== this._isOverThumb) this.setState();
  };
  _handleDrag = T => {
    let {
        totalContentHeight: R,
        viewportHeight: a,
        scrollOffset: e
      } = this.widget.getScrollInfo(),
      t = this.context.findRenderObject()?.size.height ?? 0;
    if (t === 0 || R <= a) return;
    if (this._dragStartY === null) this._dragStartY = T.localPosition.y, this._dragStartOffset = e;
    let r = T.localPosition.y - this._dragStartY,
      h = Math.min(1, a / R),
      i = Math.max(1, t * h),
      c = t - i;
    if (c <= 0) return;
    let s = R - a,
      A = c / s,
      l = r / A,
      o = Math.round(Math.max(0, Math.min(s, this._dragStartOffset + l)));
    this.widget.controller.jumpTo(o);
  };
  _handleRelease = () => {
    this._dragStartY = null, this._dragStartOffset = null;
  };
  _handleClick = T => {
    if (T.button !== "left") return;
    let R = T.localPosition.y,
      {
        totalContentHeight: a,
        viewportHeight: e,
        scrollOffset: t
      } = this.widget.getScrollInfo(),
      r = this.context.findRenderObject()?.size.height ?? 0;
    if (r === 0 || a <= e) return;
    let h = Math.min(1, e / a),
      i = Math.max(1, r * h),
      c = a - e,
      s = r - i,
      A = Math.max(0, Math.min(1, t / c)),
      l = Math.max(0, s * A),
      o = l + i;
    if (R >= l && R <= o) return;
    if (R < l) this.widget.controller.animatePageUp(e);else this.widget.controller.animatePageDown(e);
  };
  _isPositionOverThumb(T) {
    let {
        totalContentHeight: R,
        viewportHeight: a
      } = this.widget.getScrollInfo(),
      e = this.context.findRenderObject()?.size.height ?? 0;
    if (e === 0 || R <= a) return !1;
    let t = this.widget.getScrollInfo(),
      r = Math.min(1, a / R),
      h = Math.max(1, e * r),
      i = Math.max(0, Math.min(1, t.scrollOffset / (R - a))),
      c = e - h,
      s = Math.max(0, c * i),
      A = s + h;
    return T >= s && T <= A;
  }
};
Ds = class Ds extends NR {
  title;
  child;
  expanded;
  onChanged;
  constructor({
    key: T,
    title: R,
    child: a,
    expanded: e = !1,
    onChanged: t
  }) {
    super({
      key: T
    });
    this.title = R, this.child = a, this.expanded = e, this.onChanged = t;
  }
  createState() {
    return new V1T();
  }
};
V1T = class V1T extends wR {
  get expanded() {
    return this.widget.expanded;
  }
  toggle() {
    this.widget.onChanged?.(!this.expanded);
  }
  initState() {
    super.initState();
  }
  didUpdateWidget(T) {
    if (super.didUpdateWidget(T), T.expanded !== this.widget.expanded) this.setState();
  }
  build(T) {
    let R = Z0.of(T).colorScheme,
      a = new xT({
        text: new G(this.expanded ? "\u25BC" : "\u25B6", new cT({
          color: R.mutedForeground
        }))
      }),
      e = [new G0({
        onClick: this._handleClick.bind(this),
        cursor: "pointer",
        child: new T0({
          mainAxisSize: "min",
          children: [this.widget.title, new XT({
            width: 1
          }), a]
        })
      })];
    if (this.expanded) e.push(this.widget.child);
    return new xR({
      mainAxisSize: "min",
      crossAxisAlignment: "start",
      children: e
    });
  }
  _handleClick(T) {
    this.toggle();
  }
};
$R = class $R extends Ve {
  data;
  constructor({
    key: T,
    data: R,
    child: a
  }) {
    super({
      key: T,
      child: a
    });
    this.data = R;
  }
  static of(T) {
    let R = T.dependOnInheritedWidgetOfExactType($R);
    if (R) return R.widget.data;
    return Xa.default();
  }
  static maybeOf(T) {
    let R = T.dependOnInheritedWidgetOfExactType($R);
    if (R) return R.widget.data;
    return null;
  }
  updateShouldNotify(T) {
    return this.data !== T.data;
  }
};
X1T = class X1T extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new Y1T();
  }
};
MH = class MH extends Tr {
  constructor(T, R, a, e) {
    let t = -1;
    super(T, R);
    if (ofT(this, "space", e), typeof a === "number") while (++t < $F.length) {
      let r = $F[t];
      ofT(this, $F[t], (a & Xw[r]) === Xw[r]);
    }
  }
};
mt = class mt extends Error {
  constructor(T, R, a) {
    super();
    if (typeof R === "string") a = R, R = void 0;
    let e = "",
      t = {},
      r = !1;
    if (R) if ("line" in R && "column" in R) t = {
      place: R
    };else if ("start" in R && "end" in R) t = {
      place: R
    };else if ("type" in R) t = {
      ancestors: [R],
      place: R.position
    };else t = {
      ...R
    };
    if (typeof T === "string") e = T;else if (!t.cause && T) r = !0, e = T.message, t.cause = T;
    if (!t.ruleId && !t.source && typeof a === "string") {
      let i = a.indexOf(":");
      if (i === -1) t.ruleId = a;else t.source = a.slice(0, i), t.ruleId = a.slice(i + 1);
    }
    if (!t.place && t.ancestors && t.ancestors) {
      let i = t.ancestors[t.ancestors.length - 1];
      if (i) t.place = i.position;
    }
    let h = t.place && "start" in t.place ? t.place.start : t.place;
    this.ancestors = t.ancestors || void 0, this.cause = t.cause || void 0, this.column = h ? h.column : void 0, this.fatal = void 0, this.file, this.message = e, this.line = h ? h.line : void 0, this.name = wv(t.place) || "1:1", this.place = t.place || void 0, this.reason = this.message, this.ruleId = t.ruleId || void 0, this.source = t.source || void 0, this.stack = r && t.cause && typeof t.cause.stack === "string" ? t.cause.stack : "", this.actual, this.expected, this.note, this.url;
  }
};
cb = class cb extends Ve {
  controller;
  constructor({
    key: T,
    controller: R,
    child: a
  }) {
    super({
      key: T,
      child: a
    });
    this.controller = R;
  }
  updateShouldNotify(T) {
    return this.controller !== T.controller;
  }
  static maybeOf(T) {
    let R = T.dependOnInheritedWidgetOfExactType(cb);
    if (R) return R.widget.controller;
    return null;
  }
  static show(T, R, a = "success", e = aQ) {
    cb.maybeOf(T)?.show(R, a, e);
  }
  static error(T, R, a) {
    cb.show(T, R, "error", a);
  }
  static success(T, R, a) {
    cb.show(T, R, "success", a);
  }
};
NQT = class NQT extends NR {
  props;
  constructor(T) {
    super(T.key ? {
      key: T.key
    } : {});
    this.props = T;
  }
  createState() {
    return new UQT();
  }
};
UQT = class UQT extends wR {
  _listenerBound = this._onToastsChanged.bind(this);
  initState() {
    super.initState(), this.widget.props.controller.addListener(this._listenerBound);
  }
  didUpdateWidget(T) {
    if (T.props.controller !== this.widget.props.controller) T.props.controller.removeListener(this._listenerBound), this.widget.props.controller.addListener(this._listenerBound);
  }
  dispose() {
    this.widget.props.controller.removeListener(this._listenerBound), super.dispose();
  }
  _onToastsChanged() {
    this.setState(() => {});
  }
  build(T) {
    let R = this.widget.props.controller.toasts,
      a = this.widget.props.controller,
      e = R.map(t => new srT({
        message: t.message,
        type: t.type,
        onDismiss: () => a.dismiss(t.id)
      }));
    return new Ta({
      children: [this.widget.props.child, new ca({
        top: 0,
        left: 0,
        right: 0,
        child: new xR({
          crossAxisAlignment: "center",
          mainAxisSize: "min",
          children: e
        })
      })]
    });
  }
};
fd0 = class fd0 extends wR {
  _listenerBound = this._onToastsChanged.bind(this);
  initState() {
    super.initState(), this.widget.props.controller.addListener(this._listenerBound);
  }
  dispose() {
    this.widget.props.controller.removeListener(this._listenerBound), super.dispose();
  }
  _onToastsChanged() {
    this.setState(() => {});
  }
  build(T) {
    let R = this.widget.props.controller.toasts;
    if (R.length === 0) return new XT({
      width: 0,
      height: 0
    });
    let a = R.map(t => new srT({
        message: t.message,
        type: t.type,
        onDismiss: () => this.widget.props.controller.dismiss(t.id)
      })),
      e = new xR({
        crossAxisAlignment: "center",
        mainAxisSize: "min",
        children: a
      });
    return new Ta({
      children: [new XT({
        height: R.length
      }), new ca({
        top: 0,
        left: 0,
        right: 0,
        child: e
      })]
    });
  }
};
srT = class srT extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new HQT();
  }
};
HQT = class HQT extends wR {
  _visible = !1;
  initState() {
    super.initState(), setTimeout(() => {
      if (this.mounted) this._visible = !0, this.setState(() => {});
    }, xd0);
  }
  build(T) {
    if (!this._visible) return new XT({
      width: 0,
      height: 0
    });
    let {
        message: R,
        type: a
      } = this.widget.props,
      e = Z0.of(T),
      t = $R.of(T),
      r = I9.of(T),
      h = Math.max(Math.floor(r.size.width * kd0), Pd0);
    return Id0(R, a, h, e, t);
  }
};
FH = class FH extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new VQT();
  }
};
VQT = class VQT extends wR {
  imageId = null;
  transmitted = !1;
  transmittedWidth = 0;
  transmittedHeight = 0;
  conversionFailed = !1;
  cachedPngBase64 = null;
  getCapabilities() {
    try {
      return d9.instance.tuiInstance.getCapabilities();
    } catch {
      return null;
    }
  }
  supportsKittyGraphics() {
    return this.getCapabilities()?.kittyGraphics ?? !1;
  }
  initState() {
    if (super.initState(), this.supportsKittyGraphics()) this.imageId = pIT(), this.transmitImage();
  }
  didUpdateWidget(T) {
    super.didUpdateWidget(T);
    let {
      width: R,
      height: a
    } = this.widget.props;
    if (R !== this.transmittedWidth || a !== this.transmittedHeight) {
      if (this.deleteImage(), this.conversionFailed = !1, this.supportsKittyGraphics()) this.imageId = pIT(), this.transmitImage();
    }
  }
  dispose() {
    this.deleteImage(), super.dispose();
  }
  transmitImage() {
    let T = this.widget.props.image;
    if (T.source.type !== "base64" || !this.imageId) return;
    let {
        width: R,
        height: a
      } = this.widget.props,
      e = this.imageId;
    if (!this.cachedPngBase64) {
      let c = Vd0(T.source.data, T.source.mediaType);
      if (!c.success) {
        J.debug("Image format not supported for Kitty preview", {
          mediaType: T.source.mediaType,
          reason: c.reason
        }), this.conversionFailed = !0, this.setState();
        return;
      }
      this.cachedPngBase64 = c.base64Png;
    }
    let t = this.cachedPngBase64,
      r = "",
      h = 4096,
      i = [];
    for (let c = 0; c < t.length; c += h) i.push(t.slice(c, c + h));
    for (let c = 0; c < i.length; c++) {
      let s = i[c],
        A = c === i.length - 1 ? 0 : 1;
      if (c === 0) r += FP(`\x1B_Gq=2,a=T,U=1,f=100,i=${e},c=${R},r=${a},m=${A};${s}\x1B\\`);else r += FP(`\x1B_Gm=${A};${s}\x1B\\`);
    }
    process.stdout.write(r), this.transmitted = !0, this.transmittedWidth = R, this.transmittedHeight = a;
  }
  deleteImage() {
    if (this.imageId !== null && this.transmitted) process.stdout.write(FP(`\x1B_Ga=d,d=I,i=${this.imageId}\x1B\\`)), this.imageId = null, this.transmitted = !1;
  }
  build(T) {
    let {
      width: R,
      height: a,
      backgroundColor: e
    } = this.widget.props;
    if (this.conversionFailed || !this.supportsKittyGraphics() || !this.imageId) return new XT({
      width: R,
      height: a
    });
    return new XQT({
      imageId: this.imageId,
      width: R,
      height: a,
      backgroundColor: e
    });
  }
};
XQT = class XQT extends _t {
  props;
  constructor(T) {
    super({});
    this.props = T;
  }
  createRenderObject() {
    return new YQT(this.props);
  }
  updateRenderObject(T) {
    if (T.props.width !== this.props.width || T.props.height !== this.props.height || T.props.imageId !== this.props.imageId || T.props.backgroundColor !== this.props.backgroundColor) T.props = this.props, T.markNeedsLayout();
  }
};
YQT = class YQT extends O9 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  performLayout() {
    this.setSize(this.props.width, this.props.height);
  }
  getMinIntrinsicWidth(T) {
    return this.props.width;
  }
  getMaxIntrinsicWidth(T) {
    return this.props.width;
  }
  getMinIntrinsicHeight(T) {
    return this.props.height;
  }
  getMaxIntrinsicHeight(T) {
    return this.props.height;
  }
  paint(T, R, a) {
    let {
        imageId: e,
        width: t,
        height: r,
        backgroundColor: h
      } = this.props,
      i = R + this.offset.x,
      c = a + this.offset.y;
    for (let s = 0; s < r; s++) for (let A = 0; A < t; A++) {
      let l = this.createPlaceholder(s, A),
        o = {
          fg: {
            type: "index",
            value: e
          }
        };
      if (h) o.bg = h;
      T.setChar(i + A, c + s, l, o, 1);
    }
  }
  createPlaceholder(T, R) {
    let a = ly[T % ly.length] ?? ly[0],
      e = ly[R % ly.length] ?? ly[0];
    return String.fromCodePoint(1109742) + String.fromCodePoint(a) + String.fromCodePoint(e);
  }
};
qM = class qM extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new QQT();
  }
};
TZT = class TZT extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    return new Z3({
      markdown: this.props.message.text
    });
  }
};
RZT = class RZT extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new aZT();
  }
};
aZT = class aZT extends wR {
  expanded = !1;
  _spinner = new xa();
  _animationTimer;
  get _isActive() {
    return this.widget.props.tool.status === "in-progress";
  }
  initState() {
    if (super.initState(), this._isActive) this._startAnimation();
  }
  didUpdateWidget(T) {
    super.didUpdateWidget(T);
    let R = T.props.tool.status === "in-progress";
    if (!R && this._isActive) this._startAnimation();else if (R && !this._isActive) this._stopAnimation();
  }
  dispose() {
    this._stopAnimation(), super.dispose();
  }
  _startAnimation() {
    if (this._animationTimer) return;
    this._animationTimer = setInterval(() => {
      this.setState(() => {
        this._spinner.step();
      });
    }, 200);
  }
  _stopAnimation() {
    if (!this._animationTimer) return;
    clearInterval(this._animationTimer), this._animationTimer = void 0;
  }
  build(T) {
    let {
        tool: R
      } = this.widget.props,
      a = $R.of(T),
      {
        name: e,
        detail: t
      } = rE0(R),
      r = hE0(e, t, R.status, this._isActive, this._spinner, a),
      h = this.expanded ? iE0(R, a) : new SR();
    return new Ds({
      title: r,
      child: h,
      expanded: this.expanded,
      onChanged: i => {
        this.setState(() => {
          this.expanded = i;
        });
      }
    });
  }
};
eZT = class eZT extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    let {
        message: R,
        isSelected: a,
        onShowImagePreview: e
      } = this.props,
      t = $R.of(T),
      {
        colors: r
      } = t,
      {
        text: h,
        images: i
      } = R,
      c = r.success,
      s = c,
      A = a ? t.app.selectedMessage : c,
      l = new cT({
        color: s,
        italic: !0
      }),
      o = [];
    if (R.role === "user") {
      let p = i,
        _ = nE0(T, p, l, m => {
          let b = p[m];
          if (b) e(b, m);
        });
      if (_) o.push(_);
    }
    if (h) {
      if (o.length > 0) o.push(new XT({
        height: 1
      }));
      o.push(lE0(h, l, !1, r.warning));
    }
    let n;
    if (o.length === 0) n = new SR();else if (o.length === 1) n = o[0];else n = new xR({
      mainAxisSize: "min",
      crossAxisAlignment: "start",
      children: o
    });
    if (a) return new SR({
      decoration: {
        color: r.background,
        border: h9.all(new e9(A, 2, "solid"))
      },
      padding: TR.only({
        left: 1,
        right: 1
      }),
      width: 1 / 0,
      child: n
    });
    return new SR({
      decoration: {
        color: r.background,
        border: new h9(void 0, void 0, void 0, new e9(A, 2, "solid"))
      },
      padding: TR.only({
        left: 1
      }),
      child: n
    });
  }
};
tZT = class tZT extends NR {
  threadController;
  onCopy;
  constructor(T) {
    super();
    this.threadController = T.threadController, this.onCopy = T.onCopy;
  }
  createState() {
    return new rZT();
  }
};
hQ = class hQ extends wR {
  entries = [];
  initState() {
    super.initState();
    let T = this.widget.props.initialEntries || [];
    for (let R of T) this._addEntry(R);
  }
  dispose() {
    for (let T of this.entries) T._setOverlayState(void 0);
    this.entries = [], super.dispose();
  }
  insert(T, R) {
    if (T.mounted) throw Error("OverlayEntry is already mounted in an overlay");
    if (R) {
      let a = this.entries.indexOf(R);
      if (a === -1) throw Error('The "above" entry is not in this overlay');
      this.entries.splice(a + 1, 0, T), T._setOverlayState(this), T.markNeedsBuild();
    } else this._addEntry(T);
    this.setState(() => {});
  }
  remove(T) {
    let R = this.entries.indexOf(T);
    if (R === -1) return;
    this.entries.splice(R, 1), T._setOverlayState(void 0), this.setState(() => {});
  }
  removeAll() {
    for (let T of this.entries) T._setOverlayState(void 0);
    this.entries = [], this.setState(() => {});
  }
  rearrange(T) {
    for (let R of T) if (!this.entries.includes(R)) throw Error("Cannot rearrange: entry is not in this overlay");
    if (T.length !== this.entries.length) throw Error("Cannot rearrange: entry count mismatch");
    this.entries = [...T], this.setState(() => {});
  }
  _markNeedsRebuild() {
    this.setState(() => {});
  }
  _addEntry(T) {
    this.entries.push(T), T._setOverlayState(this), T.markNeedsBuild();
  }
  build(T) {
    let R = [];
    if (this.widget.props.child) R.push(this.widget.props.child);
    for (let a of this.entries) try {
      let e = a.builder(T);
      R.push(e), a._clearNeedsRebuild();
    } catch (e) {
      J.error("Error building overlay entry:", e);
    }
    return new hZT({
      children: R
    });
  }
};
hZT = class hZT extends Dn {
  constructor({
    children: T = []
  } = {}) {
    super({
      children: T
    });
  }
  createRenderObject() {
    return new iZT();
  }
  updateRenderObject(T) {}
};
cZT = class cZT extends NR {
  child;
  durationMs;
  easing;
  constructor({
    child: T,
    durationMs: R = 500,
    easing: a = AE0,
    key: e
  }) {
    super(e ? {
      key: e
    } : {});
    this.child = T, this.durationMs = R, this.easing = a;
  }
  createState() {
    return new sZT();
  }
};
sZT = class sZT extends wR {
  oldSnapshot = null;
  currentSnapshot = {
    cells: [],
    width: 0
  };
  progress = 1;
  animStartTime = 0;
  timer = null;
  initState() {
    this.currentSnapshot = this.captureSnapshot(this.widget.child);
  }
  didUpdateWidget(T) {
    if (T.child === this.widget.child) return;
    let R = this.captureSnapshot(this.widget.child);
    if (this.progress < 1 && this.oldSnapshot) this.oldSnapshot = this.compositeCurrentFrame();else this.oldSnapshot = this.currentSnapshot;
    this.currentSnapshot = R, this.progress = 0, this.animStartTime = Date.now(), this.startTimer();
  }
  dispose() {
    this.stopTimer();
  }
  captureSnapshot(T) {
    let R = T.createRenderObject();
    R.attach(), R.layout(o0.loose(200, 1));
    let a = R.size.width,
      e = Math.max(R.size.height, 1),
      t = new Zx(a, e);
    R.paint(t, 0, 0);
    let r = [];
    for (let h = 0; h < a; h++) {
      let i = t.getCell(h, 0);
      r.push(i ? {
        ...i,
        style: {
          ...i.style
        }
      } : a9());
    }
    return R.detach(), R.dispose(), {
      cells: r,
      width: a
    };
  }
  compositeCurrentFrame() {
    let T = this.oldSnapshot,
      R = this.currentSnapshot,
      a = this.widget.easing(this.progress),
      e = Math.max(T.width, R.width),
      t = Math.round(a * e),
      r = Math.round(T.width + (R.width - T.width) * a),
      h = [];
    for (let i = 0; i < r; i++) if (i < t) h.push(R.cells[i] ?? nP);else h.push(T.cells[i] ?? nP);
    return {
      cells: h,
      width: r
    };
  }
  startTimer() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      let T = Date.now() - this.animStartTime,
        R = Math.min(T / this.widget.durationMs, 1);
      if (this.setState(() => {
        this.progress = R;
      }), R >= 1) this.stopTimer();
    }, 16);
  }
  stopTimer() {
    if (this.timer) clearInterval(this.timer), this.timer = null;
  }
  build(T) {
    if (!this.oldSnapshot || this.progress >= 1) return new iQ({
      cells: this.currentSnapshot.cells,
      width: this.currentSnapshot.width
    });
    let R = this.oldSnapshot,
      a = this.currentSnapshot,
      e = this.widget.easing(this.progress),
      t = Math.max(R.width, a.width),
      r = Math.round(e * t),
      h = Math.round(R.width + (a.width - R.width) * e),
      i = [];
    for (let c = 0; c < h; c++) if (c < r) i.push(a.cells[c] ?? nP);else i.push(R.cells[c] ?? nP);
    return new iQ({
      cells: i,
      width: h
    });
  }
};
iQ = class iQ extends to {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createElement() {
    return new bp(this);
  }
  createRenderObject() {
    return new oZT(this.props);
  }
  updateRenderObject(T) {
    T.update(this.props);
  }
};
oZT = class oZT extends O9 {
  _props;
  constructor(T) {
    super();
    this._props = T;
  }
  update(T) {
    let R = T.width !== this._props.width;
    if (this._props = T, R) this.markNeedsLayout();
    this.markNeedsPaint();
  }
  performLayout() {
    let T = this._lastConstraints.constrain(this._props.width, 1);
    this.setSize(T.width, T.height), super.performLayout();
  }
  paint(T, R = 0, a = 0) {
    let e = Math.floor(R + this.offset.x),
      t = Math.floor(a + this.offset.y),
      {
        cells: r,
        width: h
      } = this._props;
    for (let i = 0; i < this.size.width; i++) {
      let c = i < h ? r[i] ?? nP : nP;
      T.setChar(e + i, t, c.char, c.style, c.width);
    }
    super.paint(T, R, a);
  }
};
nZT = class nZT extends B0 {
  agentMode;
  constructor(T) {
    super();
    this.agentMode = T.agentMode;
  }
  build(T) {
    let R = (xi(this.agentMode)?.displayName ?? this.agentMode).toLowerCase(),
      a = f$(this.agentMode),
      e = new xT({
        text: new G(R, new cT({
          color: a
        })),
        maxLines: 1,
        overflow: "clip"
      });
    return new G0({
      onClick: () => {
        Nt.maybeInvoke(T, new dv());
      },
      cursor: "pointer",
      child: new cZT({
        child: e
      })
    });
  }
};
Nv = class Nv extends ArT {
  _value;
  constructor(T) {
    super();
    this._value = T;
  }
  get value() {
    return this._value;
  }
  set value(T) {
    let R = typeof T === "object" || this._value !== T;
    if (this._value = T, R) this.notifyListeners();
  }
};
AZT = class AZT extends _t {
  link;
  showWhenUnlinked;
  offset;
  constructor({
    key: T,
    link: R,
    showWhenUnlinked: a = !0,
    offset: e = {
      x: 0,
      y: 0
    },
    child: t
  }) {
    super({
      key: T,
      child: t
    });
    this.link = R, this.showWhenUnlinked = a, this.offset = e;
  }
  createElement() {
    return new Tf(this);
  }
  createRenderObject() {
    return new pZT(this.link, this.showWhenUnlinked, this.offset);
  }
  updateRenderObject(T) {
    T.link = this.link, T.showWhenUnlinked = this.showWhenUnlinked, T.setFollowerOffset(this.offset);
  }
};
_ZT = class _ZT extends _t {
  link;
  constructor({
    key: T,
    link: R,
    child: a
  }) {
    super({
      key: T,
      child: a
    });
    this.link = R;
  }
  createElement() {
    return new Tf(this);
  }
  createRenderObject() {
    return new bZT(this.link);
  }
  updateRenderObject(T) {
    T.link = this.link;
  }
};
yZT = class yZT extends NR {
  props;
  constructor(T) {
    super({
      key: T.key
    });
    this.props = T;
  }
  createState() {
    return new PZT(this.props);
  }
};
Td = class Td extends NR {
  props;
  constructor(T) {
    super({
      key: T.key
    });
    this.props = T;
  }
  createState() {
    return new kZT(this.props);
  }
};
xZT = class xZT extends NR {
  color;
  constructor({
    color: T,
    key: R
  }) {
    super(R ? {
      key: R
    } : {});
    this.color = T;
  }
  createState() {
    return new fZT();
  }
};
fZT = class fZT extends wR {
  frame = 0;
  timer = null;
  initState() {
    this.startAnimation();
  }
  dispose() {
    this.stopAnimation();
  }
  startAnimation() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.setState(() => {
        this.frame = (this.frame + 1) % uIT.length;
      });
    }, ME0);
  }
  stopAnimation() {
    if (this.timer) clearInterval(this.timer), this.timer = null;
  }
  build(T) {
    return new xT({
      text: new G(uIT[this.frame], new cT({
        color: this.widget.color
      })),
      textAlign: "left",
      maxLines: 1,
      overflow: "clip"
    });
  }
};
gZT = class gZT extends ArT {
  _mode = "auto";
  _isResizing = !1;
  _isHandleHovered = !1;
  get mode() {
    return this._mode;
  }
  get isResizing() {
    return this._isResizing;
  }
  get isHandleHovered() {
    return this._isHandleHovered;
  }
  _update(T, R, a) {
    let e = this._mode !== T || this._isResizing !== R || this._isHandleHovered !== a;
    if (this._mode = T, this._isResizing = R, this._isHandleHovered = a, e) this.notifyListeners();
  }
};
$ZT = class $ZT extends NR {
  child;
  minRows;
  maxRows;
  initialRows;
  initialMode;
  dragThresholdRows;
  controller;
  constructor({
    key: T,
    child: R,
    minRows: a = 3,
    maxRows: e = 12,
    initialRows: t = null,
    initialMode: r = "auto",
    dragThresholdRows: h = 0,
    controller: i
  }) {
    super(T ? {
      key: T
    } : {});
    if (a > e) throw Error("minRows must be <= maxRows");
    if (h < 0) throw Error("dragThresholdRows must be >= 0");
    this.child = R, this.minRows = a, this.maxRows = e, this.initialRows = t, this.initialMode = r, this.dragThresholdRows = h, this.controller = i;
  }
  createState() {
    return new vZT();
  }
};
vZT = class vZT extends wR {
  _mode = "auto";
  _heightRows = 3;
  _dragSession = null;
  _isHandleHovered = !1;
  initState() {
    super.initState(), this._syncToInitialProps();
  }
  didUpdateWidget(T) {
    if (super.didUpdateWidget(T), T.initialMode !== this.widget.initialMode || T.initialRows !== this.widget.initialRows) {
      this._syncToInitialProps();
      return;
    }
    this._heightRows = this._clampRows(this._heightRows);
  }
  build(T) {
    let R = this._mode === "manual" ? new SR({
      height: this._heightRows,
      child: this.widget.child
    }) : new SR({
      constraints: new o0(0, Number.POSITIVE_INFINITY, this.widget.minRows, this.widget.maxRows),
      child: this.widget.child
    });
    return new Ta({
      children: [R, this._buildHandleOverlay()]
    });
  }
  get _effectiveMinRows() {
    return this.widget.minRows;
  }
  _buildHandleOverlay() {
    return new ca({
      top: 0,
      left: 0,
      right: 0,
      height: 1,
      child: new G0({
        cursor: B3.NS_RESIZE,
        onClick: this._handleHandlePress,
        onDrag: this._handleHandleDrag,
        onRelease: this._handleHandleRelease,
        onEnter: () => this._setHandleHovered(!0),
        onExit: () => this._setHandleHovered(!1),
        child: new XT({
          height: 1
        })
      })
    });
  }
  _notifyController() {
    this.widget.controller?._update(this._mode, !!this._dragSession, this._isHandleHovered);
  }
  _setHandleHovered(T) {
    if (this._isHandleHovered === T) return;
    this.setState(() => {
      this._isHandleHovered = T, this._notifyController();
    });
  }
  _handleHandlePress = T => {
    if (T.button !== "left") return;
    let R = this._currentRenderedHeightRows(),
      a = this._toTerminalRow(T.position.y),
      e = this._mode === "manual" && T.clickCount === 2;
    this.setState(() => {
      this._dragSession = {
        modeAtStart: this._mode,
        baseHeightRows: R,
        startRow: a,
        currentRow: a,
        resetToAutoOnRelease: e
      }, this._notifyController();
    });
  };
  _handleHandleDrag = T => {
    if (T.button !== "left" || !this._dragSession) return;
    let R = this._toTerminalRow(T.position.y),
      a = this._dragSession,
      e = R - a.startRow,
      t = a.modeAtStart === "manual" || Math.abs(e) >= this.widget.dragThresholdRows;
    this.setState(() => {
      if (a.currentRow = R, e !== 0) a.resetToAutoOnRelease = !1;
      if (t) this._mode = "manual", this._heightRows = this._clampRows(a.baseHeightRows - e);
      this._notifyController();
    });
  };
  _handleHandleRelease = T => {
    if (T.button !== "left" || !this._dragSession) return;
    let R = this._dragSession,
      a = R.currentRow - R.startRow,
      e = R.resetToAutoOnRelease && a === 0,
      t = R.modeAtStart === "auto" && this._mode === "auto" && this.widget.dragThresholdRows === 0 && a === 0;
    this.setState(() => {
      if (e) this._mode = "auto";else if (t) this._mode = "manual", this._heightRows = this._clampRows(R.baseHeightRows);
      this._dragSession = null, this._notifyController();
    });
  };
  _syncToInitialProps() {
    this._mode = this.widget.initialMode, this._heightRows = this._resolveInitialRows(), this._dragSession = null, this._notifyController();
  }
  _resolveInitialRows() {
    return this._clampRows(this.widget.initialRows ?? this._effectiveMinRows);
  }
  _clampRows(T) {
    return Math.max(this._effectiveMinRows, Math.min(T, this.widget.maxRows));
  }
  _currentRenderedHeightRows() {
    return this.context.findRenderObject()?.size.height ?? this._heightRows;
  }
  _toTerminalRow(T) {
    return Math.floor(T);
  }
};
jZT = class jZT extends NR {
  childBuilder;
  minBodyRows;
  maxBodyRows;
  initialRows;
  initialMode;
  dragThresholdRows;
  constructor(T) {
    let {
      key: R,
      minBodyRows: a = 3,
      maxBodyRows: e = 12,
      initialRows: t = null,
      initialMode: r = "auto",
      dragThresholdRows: h = 0
    } = T;
    super(R ? {
      key: R
    } : {});
    this.childBuilder = "childBuilder" in T && T.childBuilder ? T.childBuilder : () => T.child, this.minBodyRows = a, this.maxBodyRows = e, this.initialRows = t, this.initialMode = r, this.dragThresholdRows = h;
  }
  createState() {
    return new SZT();
  }
};
SZT = class SZT extends wR {
  _controller = new gZT();
  _onControllerChanged = () => {
    this.setState(() => {});
  };
  initState() {
    super.initState(), this._controller.addListener(this._onControllerChanged);
  }
  dispose() {
    this._controller.removeListener(this._onControllerChanged), this._controller.dispose(), super.dispose();
  }
  build(T) {
    let R = Z0.of(T),
      a = R.colorScheme.border,
      e = this._controller.isResizing || this._controller.isHandleHovered ? 2 : 1;
    return new $ZT({
      controller: this._controller,
      minRows: this.widget.minBodyRows + 2,
      maxRows: this.widget.maxBodyRows + 2,
      initialRows: this.widget.initialRows,
      initialMode: this.widget.initialMode,
      dragThresholdRows: this.widget.dragThresholdRows,
      child: new SR({
        decoration: new p8(R.colorScheme.background, new h9(new e9(a, e, "rounded"), new e9(a, 1, "rounded"), new e9(a, 1, "rounded"), new e9(a, 1, "rounded"))),
        child: this.widget.childBuilder(this._controller.mode)
      })
    });
  }
};
OZT = class OZT extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    let {
        editorController: R,
        queuedMessages: a,
        maxBodyRows: e,
        onSubmitted: t
      } = this.props,
      r = a.length > 0,
      h = Z0.of(T),
      i = [];
    if (r) i.push(new uR({
      padding: TR.horizontal(1),
      child: new prT({
        queuedMessages: a
      })
    }));
    return i.push(new jZT({
      initialRows: 3,
      minBodyRows: 3,
      maxBodyRows: e,
      childBuilder: c => new uR({
        padding: TR.horizontal(1),
        child: new Td({
          controller: R,
          triggers: [new ef()],
          completionBuilder: KH.of(T),
          autoOverlayPosition: !0,
          theme: h.colorScheme,
          imageAttachments: [],
          onSubmitted: t,
          fillAvailableHeight: c === "manual"
        })
      })
    })), new l1T({
      children: i
    });
  }
};
dZT = class dZT extends NR {
  editorController;
  threadController;
  client;
  observer;
  agentMode;
  connectionErrorMessage;
  hints;
  constructor(T) {
    super({
      key: new k3(T.observingClient.client.getThreadId())
    });
    this.editorController = T.editorController, this.threadController = T.threadController, this.client = T.observingClient.client, this.observer = T.observingClient.observer, this.agentMode = T.agentMode, this.connectionErrorMessage = T.connectionErrorMessage, this.hints = T.hints;
  }
  createState() {
    return new EZT();
  }
};
EZT = class EZT extends wR {
  agentState;
  queuedMessages = [];
  runtimeErrorMessage = null;
  agentStateSubscription;
  queuedMessagesSubscription;
  runtimeErrorSubscription;
  cancelHintTimer = new UtT(this, 1000);
  initState() {
    this.agentState = this.widget.observer.agentState().getValue(), this.runtimeErrorMessage = this.widget.observer.errorMessage().getValue(), this.subscribeToThreadClient();
  }
  didUpdateWidget(T) {
    if (T.client !== this.widget.client) this.unsubscribeFromThreadClient(), this.agentState = this.widget.observer.agentState().getValue(), this.queuedMessages = [], this.runtimeErrorMessage = this.widget.observer.errorMessage().getValue(), this.subscribeToThreadClient();
  }
  dispose() {
    this.unsubscribeFromThreadClient(), super.dispose();
  }
  onAgentStateChange = T => {
    if (!this.mounted || this.agentState === T) return;
    this.setState(() => this.agentState = T);
  };
  onQueuedMessagesChange = T => {
    if (!this.mounted || this.queuedMessages === T) return;
    this.setState(() => this.queuedMessages = T);
  };
  onRuntimeErrorChange = T => {
    if (!this.mounted || this.runtimeErrorMessage === T) return;
    this.setState(() => this.runtimeErrorMessage = T);
  };
  subscribeToAgentState() {
    this.agentStateSubscription = this.widget.observer.agentState().subscribe({
      next: this.onAgentStateChange
    });
  }
  subscribeToQueuedMessages() {
    this.queuedMessagesSubscription = this.widget.observer.queuedMessages().subscribe({
      next: this.onQueuedMessagesChange
    });
  }
  subscribeToRuntimeErrors() {
    this.runtimeErrorSubscription = this.widget.observer.errorMessage().subscribe({
      next: this.onRuntimeErrorChange
    });
  }
  subscribeToThreadClient() {
    this.subscribeToAgentState(), this.subscribeToQueuedMessages(), this.subscribeToRuntimeErrors();
  }
  unsubscribeFromThreadClient() {
    this.agentStateSubscription?.unsubscribe(), this.agentStateSubscription = void 0, this.queuedMessagesSubscription?.unsubscribe(), this.queuedMessagesSubscription = void 0, this.runtimeErrorSubscription?.unsubscribe(), this.runtimeErrorSubscription = void 0;
  }
  onEscPressed = () => {
    if (!bo0(this.agentState)) return "ignored";
    if (this.cancelHintTimer.isActive()) this.cancelHintTimer.clear(), this.widget.client.cancelAgentLoop();else this.cancelHintTimer.activate();
    return "handled";
  };
  buildHints() {
    let T = new Set(this.widget.hints);
    if (this.cancelHintTimer.isActive()) T.add(WtT);
    return T;
  }
  build(T) {
    let {
        editorController: R,
        threadController: a,
        client: e
      } = this.widget,
      t = this.widget.agentMode,
      r = this.widget.connectionErrorMessage ?? this.runtimeErrorMessage,
      h = new x9(() => {
        return this.onEscPressed();
      });
    return new Nt({
      actions: new Map([[DY, h]]),
      child: new kc({
        shortcuts: new Map([[x0.key("Escape"), new DY()]]),
        child: new _rT({
          child: new tZT({
            threadController: a
          }),
          editorController: R,
          queuedMessages: this.queuedMessages,
          hints: this.buildHints(),
          agentState: this.agentState,
          agentMode: t,
          statusMessageOverride: r,
          onSubmit: i => {
            e.sendUserMessage(i, t);
          }
        })
      })
    });
  }
};
cQ = class cQ extends _t {
  offstage;
  constructor({
    key: T,
    offstage: R = !0,
    child: a
  }) {
    super({
      key: T,
      child: a
    });
    this.offstage = R;
  }
  createRenderObject() {
    return new sQ(this.offstage);
  }
  updateRenderObject(T) {
    if (T instanceof sQ) T.offstage = this.offstage;
  }
};
LZT = class LZT extends NR {
  root;
  controller;
  constructor(T) {
    super();
    this.root = T.root, this.controller = T.controller;
  }
  createState() {
    return new MZT();
  }
};
MZT = class MZT extends wR {
  entries = [];
  initState() {
    this.widget.controller._attach(this);
  }
  didUpdateWidget(T) {
    if (T.controller !== this.widget.controller) T.controller._detach(), this.widget.controller._attach(this);
  }
  dispose() {
    this.widget.controller._detach(), super.dispose();
  }
  push(T) {
    this.setState(() => {
      this.entries.push({
        key: new ww(),
        widget: T
      });
    });
  }
  pop() {
    if (this.entries.length === 0) return !1;
    return this.setState(() => {
      this.entries.pop();
    }), !0;
  }
  get canPop() {
    return this.entries.length > 0;
  }
  build(T) {
    let R = [];
    R.push(new cQ({
      offstage: this.entries.length > 0,
      child: this.widget.root
    }));
    for (let a = 0; a < this.entries.length; a++) {
      let e = this.entries[a],
        t = a === this.entries.length - 1,
        r = t ? new C8({
          autofocus: !0,
          child: e.widget,
          onKey: h => {
            if (h.key === "Escape") return this.pop(), "handled";
            return "ignored";
          }
        }) : e.widget;
      R.push(new cQ({
        key: e.key,
        offstage: !t,
        child: r
      }));
    }
    return new Ta({
      fit: "expand",
      children: R
    });
  }
};
BZT = class BZT extends wR {
  build(T) {
    return this.widget.onContext(T), this.widget.child;
  }
};
we = class we extends NR {
  props;
  debugLabel = "FuzzyPicker";
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new NZT();
  }
};
UZT = class UZT extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    let R = KE0(this.props.commands);
    return new N0({
      child: new SR({
        constraints: o0.loose(80, 20),
        child: new we({
          items: this.props.commands,
          title: "Command Palette",
          getLabel: a => a.noun ? `${a.noun.toLowerCase()} ${a.verb.toLowerCase()}` : a.verb.toLowerCase(),
          isItemDisabled: a => !a.enabled,
          renderItem: (a, e, t, r) => new HZT({
            command: a,
            isSelected: e,
            isDisabled: t,
            categoryWidth: R,
            buildContext: r
          }),
          onAccept: a => {
            this.props.onAccept(a);
          },
          onDismiss: this.props.onDismiss
        })
      })
    });
  }
};
HZT = class HZT extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    let {
        command: R,
        isSelected: a,
        isDisabled: e,
        categoryWidth: t,
        buildContext: r
      } = this.props,
      h = $R.of(r),
      {
        colors: i,
        app: c
      } = h,
      s = a ? c.selectionBackground : void 0,
      A = a ? c.selectionForeground : i.foreground,
      l = a ? A : i.mutedForeground,
      o = new xT({
        text: new G(R.noun?.toLowerCase() ?? "", new cT({
          color: l,
          dim: e || !a
        })),
        textAlign: "right"
      }),
      n = new xT({
        text: new G(R.verb.toLowerCase(), new cT({
          color: A,
          bold: !0,
          dim: e
        }))
      }),
      p = [{
        child: o,
        fixedWidth: t
      }, {
        child: n,
        expanded: !0
      }];
    if (R.shortcut) p.push({
      child: VE0(R.shortcut, h, e)
    });
    return new WZT({
      columns: p,
      padding: TR.horizontal(1),
      backgroundColor: s
    });
  }
};
WZT = class WZT extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    let {
        columns: R,
        gap: a = 2,
        padding: e,
        backgroundColor: t
      } = this.props,
      r = [];
    for (let i = 0; i < R.length; i++) {
      let c = R[i];
      if (i > 0 && a > 0) r.push(new XT({
        width: a
      }));
      if (c.fixedWidth !== void 0) r.push(new XT({
        width: c.fixedWidth,
        child: c.child
      }));else if (c.expanded) r.push(new j0({
        child: c.child
      }));else r.push(c.child);
    }
    let h = new T0({
      crossAxisAlignment: "start",
      children: r
    });
    if (!e && !t) return h;
    return new SR({
      decoration: t ? {
        color: t
      } : void 0,
      padding: e,
      child: h
    });
  }
};
qZT = class qZT extends NR {
  commands;
  onDismiss;
  constructor(T) {
    super();
    this.commands = T.commands, this.onDismiss = T.onDismiss;
  }
  createState() {
    return new zZT();
  }
};
zZT = class zZT extends wR {
  modalStack = new CZT();
  build(T) {
    let R = new UZT({
      commands: this.widget.commands,
      onAccept: a => {
        a.run(this.modalStack);
      },
      onDismiss: () => {
        if (this.modalStack.canPop) this.modalStack.pop();else this.widget.onDismiss();
      }
    });
    return new LZT({
      root: R,
      controller: this.modalStack
    });
  }
};
FZT = class FZT extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    let R = $R.of(T),
      {
        colors: a
      } = R,
      e = h9.all(new e9(a.foreground, 1, "solid")),
      t = [];
    if (this.props.title) t.push(new SR({
      padding: TR.symmetric(1, 0),
      child: new xT({
        text: new G(this.props.title, new cT({
          color: R.app.command,
          bold: !0
        }))
      })
    }), new XT({
      height: 1
    }));
    return t.push(this.props.child), new N0({
      child: new SR({
        constraints: new o0(80, 80, 0, 20),
        child: new SR({
          decoration: {
            border: e,
            color: a.background
          },
          padding: TR.symmetric(1, 0),
          child: new xR({
            children: t
          })
        })
      })
    });
  }
};
VH = class VH extends Ve {
  onShowImagePreview;
  constructor(T) {
    super({
      child: T.child
    });
    this.onShowImagePreview = T.onShowImagePreview;
  }
  static of(T) {
    let R = T.dependOnInheritedWidgetOfExactType(VH);
    if (R) return R.widget.onShowImagePreview;
    return;
  }
  updateShouldNotify(T) {
    return this.onShowImagePreview !== T.onShowImagePreview;
  }
};
brT = class brT extends NR {
  agentMode;
  mysteriousMessage;
  mysterySequenceProgress;
  onShowMysteryModal;
  onOrbExplode;
  constructor(T = {}) {
    super(T.key ? {
      key: T.key
    } : {});
    this.agentMode = T.agentMode, this.mysteriousMessage = T.mysteriousMessage, this.mysterySequenceProgress = T.mysterySequenceProgress, this.onShowMysteryModal = T.onShowMysteryModal, this.onOrbExplode = T.onOrbExplode;
  }
  createState() {
    return new KZT();
  }
};
KZT = class KZT extends wR {
  _glow;
  _t = 0;
  _timer = null;
  _fps = 0;
  _shockwaves = [];
  _orbClickCount = 0;
  _suggestion;
  _morphStartTime = null;
  _previousHasMystery = !1;
  initState() {
    super.initState(), this._glow = new Xk();
    let T = process.env.NO_SPLASH_QUOTE === "1" ? fIT.filter(R => R.type !== "quote") : fIT;
    this._suggestion = T[Math.floor(Math.random() * T.length)], this._previousHasMystery = !!this.widget.mysteriousMessage;
  }
  getMorphProgress(T) {
    if (this._morphStartTime === null) return null;
    let R = T - this._morphStartTime;
    if (R >= xIT) return null;
    return R / xIT;
  }
  get orbExploded() {
    return this._orbClickCount >= GF;
  }
  handleShockwave = T => {
    if (this.orbExploded) return;
    this._shockwaves.push(T), this.setState(() => {});
  };
  handleOrbClick = T => {
    if (this.orbExploded) return;
    if (this._orbClickCount += 1, this._orbClickCount >= GF) this._orbClickCount = GF, this._shockwaves = [], this.widget.onOrbExplode?.({
      x: T.x,
      y: T.y
    });
    this.setState(() => {});
  };
  dispose() {
    if (this._timer) clearInterval(this._timer), this._timer = null;
    super.dispose();
  }
  startAnimation(T) {
    if (this._timer) clearInterval(this._timer), this._timer = null;
    if (this._fps = T, T > 0) this._timer = setInterval(() => {
      this._t += 1 / T, this._shockwaves = this._shockwaves.filter(R => this._t - R.startTime < Yk), this.setState(() => {});
    }, 1000 / T);
  }
  build(T) {
    let R = Z0.of(T).colorScheme,
      a = $R.of(T).app,
      e = I9.of(T).capabilities.animationSupport,
      t = e === "fast" ? 30 : e === "slow" ? 15 : 0;
    if (t !== this._fps) this.startAnimation(t);
    let r = !!this.widget.mysteriousMessage,
      h = this._suggestion,
      i = e === "disabled" ? 3 : this._t;
    if (r && !this._previousHasMystery && e !== "disabled") this._morphStartTime = i;
    this._previousHasMystery = r;
    let c = this.getMorphProgress(i),
      s = c !== null,
      A = this.orbExploded,
      l = rC0(this.widget.agentMode),
      o = l.colors,
      n = h.type === "quote" || h.type === "news" ? new cT({
        color: R.foreground,
        dim: !0
      }) : h.type === "hint" ? new cT({
        color: R.secondary
      }) : new cT({
        color: h.type === "prompt" || h.type === "note" ? R.primary : R.warning
      }),
      p = new cT({
        color: a.keybind
      }),
      _ = new cT({
        color: a.command
      }),
      m = new cT({
        color: R.foreground,
        dim: !0
      }),
      b = [];
    if (h.type === "hint") {
      let I = h.text.split(/(`[^`]+`)/g);
      for (let S of I) if (S.startsWith("`") && S.endsWith("`")) {
        let O = S.slice(1, -1);
        b.push(new G(O, _));
      } else b.push(new G(S, n));
    } else b.push(new G(h.text, n));
    let y = e === "fast",
      u = y && !A ? new oQ({
        text: "Welcome to Amp",
        baseColor: R.foreground,
        backgroundColor: R.background,
        glow: this._glow,
        time: i,
        agentMode: this.widget.agentMode,
        orbWidth: X4,
        orbHeight: Y4,
        glowIntensity: 1,
        shockwaves: this._shockwaves
      }) : new xT({
        text: new G("Welcome to Amp", new cT({
          color: R.foreground
        }))
      }),
      P = null;
    if (r) {
      let I = 0.3 + (Math.sin(i * 0.5) * 0.5 + 0.5) * 0.4,
        S = new cT({
          color: R.primary,
          italic: !0,
          dim: I < 0.5
        }),
        O = this.widget.mysterySequenceProgress?.matched.length ?? 0,
        j = O > 0 ? "Keep going..." : "A message awaits...",
        d = [];
      for (let C = 0; C < kIT.length; C++) {
        let L = kIT[C],
          w = L === "ctrl+x" ? "Ctrl-X" : L.toUpperCase(),
          D = C < O ? new cT({
            color: R.primary,
            bold: !0
          }) : p;
        if (C > 0) d.push(new G(", ", m));
        d.push(new G(w, D));
      }
      P = new xR({
        crossAxisAlignment: "start",
        mainAxisSize: "min",
        children: [y ? new oQ({
          text: j,
          baseColor: R.primary,
          glow: this._glow,
          time: i,
          agentMode: this.widget.agentMode,
          orbWidth: X4,
          orbHeight: Y4,
          glowIntensity: 0.6,
          shockwaves: this._shockwaves
        }) : new xT({
          text: new G(j, S)
        }), new xT({
          text: new G("", void 0, [...d, new G(" to unlock", m)])
        })]
      });
    }
    let k,
      x = `A message awaits...
Ctrl-X, Y, Z to unlock`;
    if (s) {
      let I = h.text.replace(/`([^`]+)`/g, "$1") + `
`,
        S = eC0(I, x, c),
        O = new cT({
          color: R.primary,
          dim: !0
        }),
        j = S.split(`
`);
      k = new xR({
        crossAxisAlignment: "start",
        mainAxisSize: "min",
        children: [new xT({
          text: new G(j[0] ?? "", O)
        }), new xT({
          text: new G(j[1] ?? " ", O)
        })]
      });
    } else if (r) k = new XT({
      width: 0,
      height: 0
    });else k = new xR({
      crossAxisAlignment: "start",
      mainAxisSize: "min",
      children: [new xT({
        text: new G("", void 0, b)
      }), new xT({
        text: new G(" ")
      })]
    });
    let f = [u, new xT({
      text: new G("", void 0, [new G(`

`), new G("Ctrl+O", p), new G(" for ", m), new G("help", _), new G(`


`, m)])
    }), k];
    if (!r && !s && h.url) {
      let I = h.url.replace(/^https?:\/\//, "");
      f.push(new H3({
        uri: h.url,
        text: I,
        style: new cT({
          color: R.secondary,
          underline: !0
        })
      }));
    }
    if (P && !s) f.push(P);
    let v = new XT({
        width: 50,
        child: new xR({
          crossAxisAlignment: "start",
          mainAxisSize: "min",
          children: f
        })
      }),
      g = A ? new XT({
        width: X4,
        height: Y4
      }) : new uXT({
        width: X4,
        height: Y4,
        agentMode: this.widget.agentMode,
        colorMode: l.colorMode,
        primaryColor: o?.primary,
        secondaryColor: o?.secondary,
        glow: this._glow,
        backgroundColor: R.background,
        t: i,
        fps: 0,
        shockwaves: this._shockwaves,
        onShockwave: this.handleShockwave,
        onClick: this.handleOrbClick,
        ...(e === "disabled" && {
          seed: 42
        })
      });
    return N0.child(new T0({
      mainAxisAlignment: "center",
      crossAxisAlignment: "center",
      mainAxisSize: "min",
      children: [g, new XT({
        width: 2
      }), v]
    }));
  }
};
VZT = class VZT extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new XZT();
  }
};
YZT = class YZT extends NR {
  clientPool;
  completionBuilder;
  initialThreadID;
  constructor(T) {
    super();
    this.clientPool = T.clientPool, this.completionBuilder = T.completionBuilder, this.initialThreadID = T.initialThreadID;
  }
  createState() {
    return new QZT();
  }
};
cB = class cB extends Error {
  cause;
  constructor(T, R) {
    super(T);
    this.cause = R, this.name = "StdinReadError";
  }
};
frT = class frT extends Dn {
  style;
  showTreeCharacters;
  constructor({
    key: T,
    children: R,
    style: a,
    showTreeCharacters: e = !0
  }) {
    super({
      key: T,
      children: R
    });
    this.style = a ?? new JH(), this.showTreeCharacters = e;
  }
  createRenderObject() {
    return new yJT({
      style: this.style,
      showTreeCharacters: this.showTreeCharacters
    });
  }
  updateRenderObject(T) {
    T.updateTreeView({
      style: this.style,
      showTreeCharacters: this.showTreeCharacters
    });
  }
  static flatten(T, R) {
    let a = [],
      e = new Set();
    function t(r, h, i, c) {
      if (e.has(r)) return;
      e.add(r), a.push({
        item: r,
        depth: h,
        isLast: i,
        ancestorsAreLast: c
      });
      let s = R(r);
      if (s) for (let A = 0; A < s.length; A++) {
        let l = s[A],
          o = A === s.length - 1;
        t(l, h + 1, o, [...c, i]);
      }
    }
    for (let r = 0; r < T.length; r++) {
      let h = T[r],
        i = r === T.length - 1;
      t(h, 0, i, []);
    }
    return a;
  }
};
Jb = class Jb extends B0 {
  treeChildren;
  showTreeCharacters;
  constructor({
    key: T,
    children: R,
    showTreeCharacters: a = !0
  }) {
    super({
      key: T
    });
    this.treeChildren = R, this.showTreeCharacters = a;
  }
  build(T) {
    let R = new JH({
      connectorColor: $R.of(T).colors.mutedForeground
    });
    return new frT({
      children: this.treeChildren,
      style: R,
      showTreeCharacters: this.showTreeCharacters
    });
  }
};
yJT = class yJT extends O9 {
  style;
  showTreeCharacters;
  constructor({
    style: T,
    showTreeCharacters: R
  }) {
    super();
    this.style = T, this.showTreeCharacters = R;
  }
  updateTreeView({
    style: T,
    showTreeCharacters: R
  }) {
    this.style = T, this.showTreeCharacters = R, this.markNeedsLayout();
  }
  performLayout() {
    let T = this._lastConstraints;
    if (!T) return;
    let R = this.style.getConnectorText(this.style.tee),
      a = this.showTreeCharacters ? R.length : 0,
      e = Math.max(0, T.maxWidth - a),
      t = 0;
    for (let h of this.children) {
      let i = h,
        c = new o0(e, e, 0, 1 / 0);
      i.layout(c), i.setOffset(a, t), t += i.size.height;
    }
    let r = T.constrain(T.maxWidth, t);
    this.setSize(r.width, r.height);
  }
  paint(T, R, a) {
    if (this.showTreeCharacters) {
      let e = a + this.offset.y;
      for (let t = 0; t < this.children.length; t++) {
        let r = this.children[t],
          h = t === this.children.length - 1,
          i = r.size.height,
          c = h ? this.style.elbow : this.style.tee,
          s = this.style.getConnectorText(c),
          A = R + this.offset.x;
        for (let l of s) this.setConnectorCell(T, A, e, l), A++;
        if (A = R + this.offset.x, !h) for (let l = 1; l < i; l++) this.setConnectorCell(T, R + this.offset.x, e + l, this.style.vertical);
        e += r.size.height;
      }
    }
    super.paint(T, R, a);
  }
  setConnectorCell(T, R, a, e) {
    let t = T.getCell(R, a),
      r = {
        fg: this.style.connectorColor,
        dim: this.style.connectorDim
      };
    if (t?.style.bg) r.bg = t.style.bg;
    T.setCell(R, a, a9(e, r));
  }
};
Rd = class Rd extends NR {
  thinkingBlock;
  expanded;
  onToggle;
  isStreaming;
  isCancelled;
  constructor({
    key: T,
    thinkingBlock: R,
    expanded: a,
    onToggle: e,
    isStreaming: t = !1,
    isCancelled: r = !1
  }) {
    super(T ? {
      key: T
    } : {});
    this.thinkingBlock = R, this.expanded = a, this.onToggle = e, this.isStreaming = t, this.isCancelled = r;
  }
  createState() {
    return new fJT();
  }
};
fJT = class fJT extends wR {
  _animationTimer;
  _spinner = new xa();
  _localExpanded = !1;
  get isComplete() {
    return !this.widget.isStreaming;
  }
  get expanded() {
    return this._localExpanded;
  }
  initState() {
    if (super.initState(), this._localExpanded = this.widget.expanded ?? !1, !this.isComplete) this._startAnimation();
  }
  didUpdateWidget(T) {
    if (super.didUpdateWidget(T), T.isStreaming && !this.widget.isStreaming) this._stopAnimation();else if (!T.isStreaming && this.widget.isStreaming) this._startAnimation();
    if (T.thinkingBlock.thinking !== this.widget.thinkingBlock.thinking) this.setState(() => {});
    if (this.widget.expanded !== void 0 && this.widget.expanded !== T.expanded) this._localExpanded = this.widget.expanded;
  }
  dispose() {
    this._stopAnimation(), super.dispose();
  }
  _startAnimation() {
    this._animationTimer = setInterval(() => {
      this.setState(() => {
        this._spinner.step();
      });
    }, 200);
  }
  _stopAnimation() {
    if (this._animationTimer) clearInterval(this._animationTimer), this._animationTimer = void 0;
  }
  build(T) {
    let R = Z0.of(T).colorScheme,
      a = this.widget.isCancelled,
      e,
      t;
    if (a) e = R.warning, t = "";else if (this.isComplete) e = R.success, t = "\u2713 ";else e = R.accent, t = `${this._spinner.toBraille()} `;
    let r = tf(this.widget.thinkingBlock.thinking),
      h = IrT(r),
      i = xJT(r, h.lineIndex),
      c = i.trim().length > 0,
      s = c ? new xT({
        text: new G(this.expanded ? "\u25BC" : "\u25B6", new cT({
          color: R.foreground,
          dim: !0
        }))
      }) : null,
      A = a ? R.warning : R.foreground,
      l = new cT({
        color: a ? e : R.foreground,
        dim: !a
      }),
      o = [new G(t, l), new G(h.header ?? "Thinking", new cT({
        color: A,
        dim: !a
      }))];
    if (a) o.push(new G(" (interrupted)", new cT({
      color: R.warning,
      italic: !0
    })));
    let n = [new xT({
      text: new G("", void 0, o)
    })];
    if (s) n.push(new XT({
      width: 1
    }), s);
    let p = new T0({
        mainAxisSize: "min",
        children: n
      }),
      _ = {
        ...lrT(T),
        text: new cT({
          color: R.foreground,
          dim: !0,
          italic: !0
        }),
        inlineCode: new cT({
          color: R.foreground,
          dim: !0,
          italic: !0,
          bold: !0
        }),
        codeBlock: new cT({
          color: R.foreground,
          dim: !0,
          italic: !0
        }),
        link: new cT({
          color: R.foreground,
          dim: !0,
          italic: !0,
          underline: !0
        })
      },
      m = () => {
        if (this.isComplete && !this.expanded) return;
        let k = y.map(x => {
          let f = [];
          if (f.push(new xT({
            text: new G(x.header, new cT({
              color: R.foreground,
              dim: !0,
              bold: !0
            }))
          })), this.expanded) f.push(new uR({
            padding: TR.vertical(1),
            child: new Z3({
              markdown: x.content,
              styleScheme: _
            })
          }));
          return new xR({
            crossAxisAlignment: "start",
            children: f
          });
        });
        return new uR({
          padding: TR.only({
            left: 2
          }),
          child: new Jb({
            children: k
          })
        });
      },
      b = () => {
        if (!this.expanded) return;
        return new uR({
          padding: TR.only({
            left: 2
          }),
          child: new Z3({
            markdown: i,
            styleScheme: _
          })
        });
      },
      y = PM0(i),
      u = y.length > 0 && !!y[0]?.header ? m() : b(),
      P = [c ? new G0({
        onClick: this._handleHeaderClick.bind(this),
        cursor: "pointer",
        child: new xR({
          crossAxisAlignment: "start",
          children: [p]
        })
      }) : new xR({
        crossAxisAlignment: "start",
        children: [p]
      })];
    if (u) P.push(u);
    return new xR({
      mainAxisSize: "min",
      crossAxisAlignment: "start",
      children: P
    });
  }
  _handleHeaderClick(T) {
    let R = !this.expanded;
    this.setState(() => {
      this._localExpanded = R;
    }), this.widget.onToggle?.(R);
  }
};
DJT = class DJT extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new wJT();
  }
};
aW = class aW extends Ve {
  showCosts;
  showDetailedCosts;
  constructor({
    showCosts: T,
    showDetailedCosts: R,
    child: a
  }) {
    super({
      child: a
    });
    this.showCosts = T, this.showDetailedCosts = R;
  }
  updateShouldNotify(T) {
    return this.showCosts !== T.showCosts || this.showDetailedCosts !== T.showDetailedCosts;
  }
};
UJT = class UJT extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new HJT();
  }
};
HJT = class HJT extends wR {
  displayPathEnvInfo = null;
  subscription = null;
  constructor() {
    super();
  }
  initState() {
    super.initState(), this.subscription = this.widget.props.configService.displayPathEnvInfo.subscribe(T => {
      AET(T), this.setState(() => {
        this.displayPathEnvInfo = T;
      });
    });
  }
  dispose() {
    this.subscription?.unsubscribe(), super.dispose();
  }
  build(T) {
    return new OrT({
      displayPathEnvInfo: this.displayPathEnvInfo,
      child: this.widget.props.child
    });
  }
};
OrT = class OrT extends Ve {
  displayPathEnvInfo;
  constructor({
    displayPathEnvInfo: T,
    child: R
  }) {
    super({
      child: R
    });
    this.displayPathEnvInfo = T;
  }
  updateShouldNotify(T) {
    return this.displayPathEnvInfo !== T.displayPathEnvInfo;
  }
};
FJT = class FJT extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new GJT();
  }
};
GJT = class GJT extends wR {
  rgbSubscription;
  handleThemeChange = () => {
    this.setState(() => {});
  };
  handleRgbChange = () => {
    if (this.widget.props.controller.themeName === "terminal") this.setState(() => {});
  };
  initState() {
    super.initState(), this.widget.props.controller.addListener(this.handleThemeChange), this.rgbSubscription = d9.instance.onRgbColorsChanged(this.handleRgbChange);
  }
  didUpdateWidget(T) {
    if (T.props.controller !== this.widget.props.controller) T.props.controller.removeListener(this.handleThemeChange), this.widget.props.controller.addListener(this.handleThemeChange);
  }
  dispose() {
    this.widget.props.controller.removeListener(this.handleThemeChange), this.rgbSubscription?.(), super.dispose();
  }
  build(T) {
    let R = IH(),
      a = d9.instance.getRgbColors(),
      e = {
        background: R,
        rgbColors: a
      },
      t = zD0(this.widget.props.controller.themeName),
      r = t.buildBaseTheme(e),
      h = t.buildAppTheme(e, r);
    return new gS({
      controller: this.widget.props.controller,
      child: new Z0({
        data: r,
        child: new $R({
          data: h,
          child: this.widget.props.child
        })
      })
    });
  }
};
/*!
* Copyright (c) Squirrel Chat et al., All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
*
* Redistribution and use in source and binary forms, with or without
* modification, are permitted provided that the following conditions are met:
*
* 1. Redistributions of source code must retain the above copyright notice, this
*    list of conditions and the following disclaimer.
* 2. Redistributions in binary form must reproduce the above copyright notice,
*    this list of conditions and the following disclaimer in the
*    documentation and/or other materials provided with the distribution.
* 3. Neither the name of the copyright holder nor the names of its contributors
*    may be used to endorse or promote products derived from this software without
*    specific prior written permission.
*
* THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
* ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
* WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
* DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
* FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
* DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
* SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
* CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
* OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
* OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
A8 = class A8 extends Error {
  line;
  column;
  codeblock;
  constructor(T, R) {
    let [a, e] = KD0(R.toml, R.ptr),
      t = VD0(R.toml, a, e);
    super(`Invalid TOML document: ${T}

${t}`, R);
    this.line = a, this.column = e, this.codeblock = t;
  }
}; /*!
   * Copyright (c) Squirrel Chat et al., All rights reserved.
   * SPDX-License-Identifier: BSD-3-Clause
   *
   * Redistribution and use in source and binary forms, with or without
   * modification, are permitted provided that the following conditions are met:
   *
   * 1. Redistributions of source code must retain the above copyright notice, this
   *    list of conditions and the following disclaimer.
   * 2. Redistributions in binary form must reproduce the above copyright notice,
   *    this list of conditions and the following disclaimer in the
   *    documentation and/or other materials provided with the distribution.
   * 3. Neither the name of the copyright holder nor the names of its contributors
   *    may be used to endorse or promote products derived from this software without
   *    specific prior written permission.
   *
   * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
   * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
   * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
   * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
   * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
   * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
   * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
   * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
   * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
   * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
   */ /*!
      * Copyright (c) Squirrel Chat et al., All rights reserved.
      * SPDX-License-Identifier: BSD-3-Clause
      *
      * Redistribution and use in source and binary forms, with or without
      * modification, are permitted provided that the following conditions are met:
      *
      * 1. Redistributions of source code must retain the above copyright notice, this
      *    list of conditions and the following disclaimer.
      * 2. Redistributions in binary form must reproduce the above copyright notice,
      *    this list of conditions and the following disclaimer in the
      *    documentation and/or other materials provided with the distribution.
      * 3. Neither the name of the copyright holder nor the names of its contributors
      *    may be used to endorse or promote products derived from this software without
      *    specific prior written permission.
      *
      * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
      * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
      * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
      * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
      * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
      * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
      * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
      * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
      * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
      * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
      */

pP = class pP extends Date {
  #T = !1;
  #R = !1;
  #a = null;
  constructor(T) {
    let R = !0,
      a = !0,
      e = "Z";
    if (typeof T === "string") {
      let t = T.match(QD0);
      if (t) {
        if (!t[1]) R = !1, T = `0000-01-01T${T}`;
        if (a = !!t[2], a && T[10] === " " && (T = T.replace(" ", "T")), t[2] && +t[2] > 23) T = "";else if (e = t[3] || null, T = T.toUpperCase(), !e && a) T += "Z";
      } else T = "";
    }
    super(T);
    if (!isNaN(this.getTime())) this.#T = R, this.#R = a, this.#a = e;
  }
  isDateTime() {
    return this.#T && this.#R;
  }
  isLocal() {
    return !this.#T || !this.#R || !this.#a;
  }
  isDate() {
    return this.#T && !this.#R;
  }
  isTime() {
    return this.#R && !this.#T;
  }
  isValid() {
    return this.#T || this.#R;
  }
  toISOString() {
    let T = super.toISOString();
    if (this.isDate()) return T.slice(0, 10);
    if (this.isTime()) return T.slice(11, 23);
    if (this.#a === null) return T.slice(0, -1);
    if (this.#a === "Z") return T;
    let R = +this.#a.slice(1, 3) * 60 + +this.#a.slice(4, 6);
    return R = this.#a[0] === "-" ? R : -R, new Date(this.getTime() - R * 60000).toISOString().slice(0, -1) + this.#a;
  }
  static wrapAsOffsetDateTime(T, R = "Z") {
    let a = new pP(T);
    return a.#a = R, a;
  }
  static wrapAsLocalDateTime(T) {
    let R = new pP(T);
    return R.#a = null, R;
  }
  static wrapAsLocalDate(T) {
    let R = new pP(T);
    return R.#R = !1, R.#a = null, R;
  }
  static wrapAsLocalTime(T) {
    let R = new pP(T);
    return R.#T = !1, R.#a = null, R;
  }
}; /*!
   * Copyright (c) Squirrel Chat et al., All rights reserved.
   * SPDX-License-Identifier: BSD-3-Clause
   *
   * Redistribution and use in source and binary forms, with or without
   * modification, are permitted provided that the following conditions are met:
   *
   * 1. Redistributions of source code must retain the above copyright notice, this
   *    list of conditions and the following disclaimer.
   * 2. Redistributions in binary form must reproduce the above copyright notice,
   *    this list of conditions and the following disclaimer in the
   *    documentation and/or other materials provided with the distribution.
   * 3. Neither the name of the copyright holder nor the names of its contributors
   *    may be used to endorse or promote products derived from this software without
   *    specific prior written permission.
   *
   * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
   * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
   * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
   * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
   * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
   * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
   * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
   * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
   * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
   * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
   */

QJT = class QJT extends NR {
  dependencies;
  childBuilder;
  constructor(T, R) {
    super();
    this.dependencies = T, this.childBuilder = R;
  }
  createState() {
    return new ZJT();
  }
};
ZJT = class ZJT extends wR {
  debugThreadViewState = process.env.AMP_DEBUG_THREAD_VIEW === "1";
  threadHandleSubscription = null;
  activeThreadStateSubscription = null;
  activeToolProgressSubscription = null;
  recentThreadIDsSubscription = null;
  activeThreadState = XP();
  activeToolProgressByToolUseID = new Map();
  recentThreadIDs = [];
  activeThreadHandle = null;
  initState() {
    this.threadHandleSubscription = this.widget.dependencies.threadPool.threadHandles$.subscribe(T => {
      if (this.activeThreadStateSubscription?.unsubscribe(), this.activeThreadStateSubscription = null, this.activeToolProgressSubscription?.unsubscribe(), this.activeToolProgressSubscription = null, this.activeToolProgressByToolUseID = new Map(), T) this.activeThreadStateSubscription = T.threadState$.subscribe(R => {
        if (this.setState(() => {
          this.activeThreadState = R;
        }), this.debugThreadViewState && R.mainThread) {
          let a = R.mainThread.messages.at(-1);
          J.info("[tui-application] active thread state update", {
            threadID: R.mainThread.id,
            messageCount: R.mainThread.messages.length,
            lastMessageRole: a?.role,
            lastMessageState: a?.role === "assistant" ? a.state?.type : void 0,
            state: R.viewState.state,
            inferenceState: R.viewState.state === "active" ? R.viewState.inferenceState : void 0,
            interactionState: R.viewState.interactionState,
            itemCount: R.items.length
          });
        }
      }), this.activeToolProgressSubscription = T.toolProgressByToolUseID$.subscribe(R => {
        this.setState(() => {
          this.activeToolProgressByToolUseID = R;
        });
      });else this.activeThreadState = XP();
      this.setState(() => {
        this.activeThreadHandle = T;
      });
    }), this.recentThreadIDsSubscription = this.widget.dependencies.threadPool.recentThreadIDs$.subscribe(T => {
      this.setState(() => {
        this.recentThreadIDs = T;
      });
    });
  }
  dispose() {
    this.threadHandleSubscription?.unsubscribe(), this.activeThreadStateSubscription?.unsubscribe(), this.activeToolProgressSubscription?.unsubscribe(), this.recentThreadIDsSubscription?.unsubscribe();
  }
  build() {
    if (!this.activeThreadHandle || !this.activeThreadState.mainThread) return new SR();
    return this.widget.childBuilder({
      ...this.widget.dependencies,
      activeThreadHandle: this.activeThreadHandle,
      threadState: this.activeThreadState,
      toolProgressByToolUseID: this.activeToolProgressByToolUseID,
      recentThreadIDs: this.recentThreadIDs
    });
  }
};
pW = class pW extends Error {
  constructor(T = "Command timed out") {
    super(T);
    this.name = "CommandTimeoutError", Object.setPrototypeOf(this, pW.prototype);
  }
};
FrT = class FrT extends Error {
  constructor(T) {
    let R = `${T.noun}: ${T.verb} command cancelled`;
    super(R);
    this.name = "CommandCancelledError", Object.setPrototypeOf(this, FrT.prototype);
  }
};
bW = class bW extends Ve {
  onShowImagePreview;
  onShowSaveDialog;
  constructor(T) {
    super({
      child: T.child
    });
    this.onShowImagePreview = T.onShowImagePreview, this.onShowSaveDialog = T.onShowSaveDialog;
  }
  static of(T) {
    let R = T.dependOnInheritedWidgetOfExactType(bW);
    if (R) {
      let a = R.widget;
      return {
        onShowImagePreview: a.onShowImagePreview,
        onShowSaveDialog: a.onShowSaveDialog
      };
    }
    return;
  }
  updateShouldNotify(T) {
    return this.onShowImagePreview !== T.onShowImagePreview || this.onShowSaveDialog !== T.onShowSaveDialog;
  }
};
QTR = class QTR extends B0 {
  bashInvocations;
  constructor({
    bashInvocations: T,
    key: R
  }) {
    super(R ? {
      key: R
    } : {});
    this.bashInvocations = T;
  }
  build(T) {
    if (this.bashInvocations.length === 0) return new xR({
      children: []
    });
    let R = $R.of(T),
      a = this.bashInvocations.map(t => {
        let r = t.hidden,
          h = r ? R.app.shellModeHidden : R.app.shellMode,
          i = R.app.command,
          c = R.colors.foreground,
          s = [new xT({
            text: new G("", void 0, [new G(`${r ? "$$" : "$"} `, new cT({
              color: h,
              bold: !0
            })), new G(t.args.cmd, new cT({
              color: i
            }))]),
            selectable: !0
          })];
        if (t.toolRun.status === "in-progress" || t.toolRun.status === "done") {
          let A = t.toolRun.progress;
          if (A?.output) {
            let l = this.getLastOutputLines(A.output);
            s.push(...l.map(o => new xT({
              text: new G(o, new cT({
                color: c,
                dim: !0
              })),
              selectable: !0,
              maxLines: 1
            })));
          }
        }
        if (t.toolRun.status === "blocked-on-user") {
          let A = t.toolRun.reason ? ` (${t.toolRun.reason})` : "";
          s.push(new xT({
            text: new G(`Waiting for confirmation${A}`, new cT({
              color: c,
              italic: !0,
              dim: !0
            })),
            selectable: !0
          }));
        }
        return new xR({
          crossAxisAlignment: "start",
          children: s
        });
      }),
      e = [new XT({
        height: 1
      }), new xT({
        text: new G("Shell Mode:", new cT({
          color: R.app.shellMode,
          bold: !0
        })),
        selectable: !0
      }), new Jb({
        children: a
      })];
    return new xR({
      crossAxisAlignment: "start",
      children: e
    });
  }
  getLastOutputLines(T) {
    if (!T) return [];
    return T.split(`
`).filter(R => R.trim() !== "").slice(-3);
  }
};
JTR = class JTR extends NR {
  threadViewState;
  threadID;
  onFileChangesClick;
  isNarrow;
  constructor({
    threadViewState: T,
    threadID: R,
    onFileChangesClick: a,
    isNarrow: e = !1,
    key: t
  }) {
    super(t ? {
      key: t
    } : {});
    this.threadViewState = T, this.threadID = R, this.onFileChangesClick = a, this.isNarrow = e;
  }
  createState() {
    return new TRR();
  }
};
TRR = class TRR extends wR {
  build(T) {
    let R = $R.of(T).colors;
    if (this.widget.threadViewState.state !== "active") return new XT({
      width: 0,
      height: 0
    });
    let {
        fileChanges: a
      } = this.widget.threadViewState,
      e = dET(a);
    if (e.totalFiles === 0) return new XT({
      width: 0,
      height: 0
    });
    let t = e.totalFiles - e.revertedFiles,
      r;
    if (e.totalAdded > 0 || e.totalModified > 0 || e.totalRemoved > 0) {
      let h = ZTR(e.totalAdded, e.totalModified, e.totalRemoved, R);
      if (this.widget.isNarrow) r = new T0({
        children: h,
        mainAxisSize: "min"
      });else {
        let i = `${t} ${o9(t, "file")} changed`,
          c = new xT({
            text: new G(i, new cT({
              color: R.foreground,
              dim: !0
            })),
            maxLines: 1
          });
        r = new T0({
          children: [c, y3.horizontal(1), ...h],
          mainAxisSize: "min"
        });
      }
    } else {
      if (this.widget.isNarrow) return new XT({
        width: 0,
        height: 0
      });
      let h = `${t} ${o9(t, "file")} changed`;
      r = new xT({
        text: new G(h, new cT({
          color: R.foreground,
          dim: !0
        })),
        maxLines: 1
      });
    }
    return new G0({
      onClick: () => {
        if (this.widget.onFileChangesClick) this.widget.onFileChangesClick();
      },
      cursor: "pointer",
      child: r
    });
  }
};
RRR = class RRR extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new aRR();
  }
};
aRR = class aRR extends wR {
  build(T) {
    let R = Z0.of(T).colorScheme,
      a = $R.of(T).app,
      e = I9.of(T),
      t = this.widget.props.threadData,
      r = t.viewState,
      h = t.mainThread?.id,
      i = !BN0(t.mainThread);
    if (r.state !== "active" || !h) return new XT({
      width: 0,
      height: 0
    });
    let {
        fileChanges: c
      } = r,
      s = dET(c);
    if (s.totalFiles === 0) return new XT({
      width: 0,
      height: 0
    });
    let A = s.totalFiles - s.revertedFiles,
      l = s.allReverted ? `${s.revertedFiles} ${o9(s.revertedFiles, "change")} reverted` : `${A} ${o9(A, "file")} changed`,
      o = new N0({
        child: new xT({
          text: new G(l, new cT({
            color: R.primary,
            bold: !0
          }))
        })
      }),
      n = rf(T),
      p = [];
    for (let O of c.files) {
      let j = zR.parse(O.uri),
        d = Mr(j, n ?? void 0),
        C = O.reverted,
        L = [];
      if (L.push(new j0({
        child: new H3({
          uri: O.uri,
          text: d,
          style: new cT({
            color: a.fileReference,
            dim: C,
            underline: !C
          }),
          maxLines: 1,
          overflow: "ellipsis"
        })
      })), L.push(y3.horizontal(1)), C) L.push(new xT({
        text: new G("Reverted", new cT({
          color: R.foreground,
          dim: !0,
          italic: !0
        }))
      }));else {
        let D = ZTR(O.diffStat.added, O.diffStat.modified, O.diffStat.removed, {
          success: a.diffAdded,
          warning: a.diffChanged,
          destructive: a.diffRemoved
        });
        if (L.push(...D), i) L.push(y3.horizontal(1)), L.push(new G0({
          onClick: async B => {
            try {
              await ct.revertFileChanges(h, O.uri), this.setState(() => {});
            } catch (M) {
              J.error(`Error reverting file ${O.uri} (thread id: ${h}):`, M);
            }
          },
          cursor: "pointer",
          child: new xT({
            text: new G("\u21B6", new cT({
              color: a.button
            }))
          })
        }));
      }
      let w = new T0({
        mainAxisSize: "max",
        crossAxisAlignment: "center",
        children: L
      });
      p.push(new uR({
        padding: TR.only({
          left: 2,
          right: 2,
          top: 0,
          bottom: 0
        }),
        child: w
      }));
    }
    let _ = [];
    _.push(o), _.push(new XT({
      height: 1
    }));
    for (let O of p) _.push(O);
    if (i && !s.allReverted && A > 0) {
      let O = new uR({
        padding: TR.only({
          top: 1,
          left: 2,
          right: 2
        }),
        child: new T0({
          mainAxisSize: "max",
          crossAxisAlignment: "center",
          children: [new j0({
            child: new xT({
              text: new G(`${A} ${o9(A, "file")} changed`, new cT({
                color: R.foreground
              }))
            })
          }), y3.horizontal(1), new G0({
            onClick: async j => {
              try {
                await ct.revertFileChanges(h), this.setState(() => {});
              } catch (d) {
                J.error(`Error reverting all files (thread id: ${h}):`, d);
              }
            },
            cursor: "pointer",
            child: new xT({
              text: new G("Revert All", new cT({
                color: a.button
              }))
            })
          })]
        })
      });
      _.push(O);
    }
    let m = e.size.width,
      b = e.size.height,
      y = m - 4,
      u = b - 4,
      P = Math.min(60, y),
      k = new N0({
        child: new xT({
          text: new G("", new cT({
            color: R.foreground
          }), [new G("Press ", new cT({
            color: R.foreground
          })), new G("Escape", new cT({
            color: a.keybind
          })), new G(" to close", new cT({
            color: R.foreground
          }))])
        })
      }),
      x = [..._, new XT({
        height: 1
      }), k],
      f = i && A > 0 && !s.allReverted ? 2 : 0,
      v = 2 + p.length + f + 1 + 1 + 4 + 2,
      g = Math.min(v, u),
      I = new uR({
        padding: TR.all(1),
        child: new xR({
          crossAxisAlignment: "stretch",
          children: x
        })
      }),
      S = v > u ? new I3({
        autofocus: !0,
        child: I
      }) : I;
    return new N0({
      child: new SR({
        constraints: new o0(P, P, g, g),
        decoration: new p8(R.background, h9.all(new e9(R.primary, 1, "rounded"))),
        child: S
      })
    });
  }
};
tRR = class tRR extends NR {
  mcpServers;
  constructor({
    mcpServers: T,
    key: R
  }) {
    super(R ? {
      key: R
    } : {});
    this.mcpServers = T;
  }
  createState() {
    return new rRR();
  }
};
rRR = class rRR extends wR {
  animationFrame = 0;
  animationTimer = null;
  statusEvents = [];
  previousStatuses = new Map();
  animationFrames = ["\u223F", "\u223E", "\u223D", "\u224B", "\u2248", "\u223C"];
  initState() {
    this.updatePreviousStatuses(), this.startAnimationIfNeeded();
  }
  didUpdateWidget(T) {
    this.detectStatusChanges(), this.updatePreviousStatuses(), this.startAnimationIfNeeded();
  }
  dispose() {
    this.stopAnimation();
  }
  detectStatusChanges() {
    let T = Date.now();
    for (let R of this.widget.mcpServers) {
      let a = this.previousStatuses.get(R.name),
        e = R.status.type;
      if (a && a !== e) {
        if (e === "connected") this.addStatusEvent(R.name, "connected", T);else if (e === "failed" || e === "denied") this.addStatusEvent(R.name, "failed", T);
      }
    }
    this.cleanupOldEvents(T);
  }
  addStatusEvent(T, R, a) {
    let e = this.statusEvents.findIndex(t => t.name === T);
    if (e >= 0) this.statusEvents.splice(e, 1);
    this.statusEvents.push({
      name: T,
      status: R,
      timestamp: a
    });
  }
  cleanupOldEvents(T) {
    this.statusEvents = this.statusEvents.filter(R => T - R.timestamp < UN0);
  }
  updatePreviousStatuses() {
    this.previousStatuses.clear();
    for (let T of this.widget.mcpServers) this.previousStatuses.set(T.name, T.status.type);
  }
  startAnimationIfNeeded() {
    let T = this.hasConnectingServers();
    if (T && !this.animationTimer) this.startAnimation();else if (!T && this.animationTimer) this.stopAnimation();
  }
  startAnimation() {
    if (this.animationTimer) return;
    this.animationTimer = setInterval(() => {
      this.setState(() => {
        this.animationFrame = (this.animationFrame + 1) % this.animationFrames.length, this.cleanupOldEvents(Date.now());
      });
    }, HN0);
  }
  stopAnimation() {
    if (this.animationTimer) clearInterval(this.animationTimer), this.animationTimer = null;
  }
  hasConnectingServers() {
    return this.widget.mcpServers.some(T => T.status.type === "connecting" || T.status.type === "authenticating");
  }
  build(T) {
    let R = this.widget.mcpServers;
    if (R.length === 0) return new XT({
      width: 0,
      height: 0
    });
    let a = $R.of(T),
      e = a.colors,
      t = a.app,
      r = 0,
      h = 0,
      i = 0;
    for (let o of R) switch (o.status.type) {
      case "connected":
        r++;
        break;
      case "connecting":
      case "authenticating":
        i++;
        break;
      case "failed":
      case "denied":
      case "awaiting-approval":
      case "blocked-by-registry":
        h++;
        break;
    }
    let c = R.length,
      s = i === 0;
    if (s && h === 0) return new XT({
      width: 0,
      height: 0
    });
    let A = [];
    if (!s) {
      let o = this.animationFrames[this.animationFrame];
      A.push(new xT({
        text: new G(o, new cT({
          color: e.foreground,
          dim: !0
        })),
        maxLines: 1
      })), A.push(y3.horizontal(1));
    }
    let l = [];
    if (l.push(new G("MCP ", new cT({
      color: e.foreground,
      dim: !0
    }))), s && h > 0) l.push(new G(`${h}`, new cT({
      color: e.destructive
    })), new G(" failed", new cT({
      color: e.destructive
    }))), l.push(new G(" (use command ", new cT({
      color: e.foreground,
      dim: !0
    })), new G("mcp: status", new cT({
      color: t.command
    })), new G(" to see more)", new cT({
      color: e.foreground,
      dim: !0
    })));else if (!s) {
      l.push(new G(`${r}`, new cT({
        color: e.foreground,
        dim: !0
      })), new G(`/${c}`, new cT({
        color: e.foreground,
        dim: !0
      })));
      let o = this.statusEvents[this.statusEvents.length - 1],
        n = R.find(p => p.status.type === "connecting" || p.status.type === "authenticating");
      if (o && o.status === "failed") l.push(new G(" ", new cT({
        color: e.foreground
      })), new G(o.name, new cT({
        color: e.destructive
      })), new G(" \u2717", new cT({
        color: e.destructive
      })));else if (n) l.push(new G(" ", new cT({
        color: e.foreground
      })), new G(n.name, new cT({
        color: e.foreground,
        dim: !0
      })), new G("\u2026", new cT({
        color: e.foreground,
        dim: !0
      })));
      l.push(new G(" (use command ", new cT({
        color: e.foreground,
        dim: !0
      })), new G("mcp: status", new cT({
        color: t.command
      })), new G(" to see more)", new cT({
        color: e.foreground,
        dim: !0
      })));
    }
    return A.push(new xT({
      text: new G(void 0, void 0, l),
      maxLines: 1
    })), new T0({
      children: A,
      mainAxisSize: "min"
    });
  }
};
oRR = class oRR extends B0 {
  hint;
  constructor({
    hint: T,
    key: R
  } = {}) {
    super(R ? {
      key: R
    } : {});
    this.hint = T;
  }
  build(T) {
    if (!this.hint) return new XT({
      width: 0,
      height: 0
    });
    return new xT({
      text: this.hint,
      textAlign: "left",
      maxLines: 1,
      overflow: "clip"
    });
  }
};
lRR = class lRR extends NR {
  manualURL;
  isAuthenticating;
  errorMessage;
  constructor({
    manualURL: T,
    isAuthenticating: R,
    errorMessage: a
  }) {
    super();
    this.manualURL = T, this.isAuthenticating = R, this.errorMessage = a;
  }
  createState() {
    return new ARR();
  }
};
pRR = class pRR extends Dn {
  maxHeight;
  borderColor;
  backgroundColor;
  borderStyle;
  hasBanner;
  userHeight;
  constructor({
    children: T,
    maxHeight: R,
    borderColor: a,
    backgroundColor: e,
    borderStyle: t,
    hasBanner: r,
    userHeight: h
  }) {
    super({
      children: T
    });
    this.maxHeight = R, this.borderColor = a, this.backgroundColor = e, this.borderStyle = t, this.hasBanner = r, this.userHeight = h;
  }
  createRenderObject() {
    return new _RR(this.maxHeight, this.borderColor, this.backgroundColor, this.borderStyle, this.hasBanner, this.userHeight);
  }
  updateRenderObject(T) {
    let R = T.userHeight !== this.userHeight;
    if (T.maxHeight = this.maxHeight, T.borderColor = this.borderColor, T.backgroundColor = this.backgroundColor, T.borderStyle = this.borderStyle, T.hasBanner = this.hasBanner, T.userHeight = this.userHeight, R) T.markNeedsLayout(), T.markNeedsPaint();
  }
};
uRR = class uRR extends O9 {
  chartData;
  highlightIndex;
  showAxes;
  colors;
  constructor({
    chartData: T,
    highlightIndex: R = null,
    showAxes: a = !0,
    colors: e = QrT
  }) {
    super();
    this.chartData = T, this.highlightIndex = R, this.showAxes = a, this.colors = e;
  }
  performLayout() {
    let T = this._lastConstraints;
    if (!T) return;
    let R = T.hasBoundedWidth ? T.maxWidth : 80,
      a = R - (this.showAxes ? ra : 0),
      e = this.computeXAxisHeight(a) + this.getAxisTitleHeight() + this.getLegendHeight(),
      t = this.chartData.chartType === "horizontal-bar" ? this.computeHorizontalBarHeight() : this.computeAutoHeight(R) + e,
      r = T.hasBoundedHeight ? Math.min(T.maxHeight, t) : t;
    this.setSize(R, r);
  }
  paint(T, R = 0, a = 0) {
    let e = R + this.offset.x,
      t = a + this.offset.y,
      r = this.chartData.series;
    if (r.length === 0) return;
    let h = this.computeChartArea();
    if (h.width <= 0 || h.height <= 0) return;
    let i = this.getMaxValue(),
      c = this.chartData.valueFormatter ?? MQ,
      s = this.computeXAxisHeight(h.width),
      A = {
        ...h,
        x: h.x + e,
        y: h.y + t
      },
      l = () => {
        let o = r[0]?.points ?? [];
        if (o.length === 0) return;
        let n = this.chartData.chartType,
          p,
          _;
        if (n === "bar" || n === "stacked-bar") p = Math.max(1, Math.floor(h.width / o.length)), _ = void 0;else {
          let b = o.length > 1 ? h.width / (o.length - 1) : h.width;
          p = Math.max(1, Math.floor(b)), _ = h.width;
        }
        let m = o.map(b => b.label);
        AU0(T, h.x + e, h.y + h.height + t, AgT(m), p, _);
      };
    switch (this.chartData.chartType) {
      case "bar":
        if (this.showAxes) aL(T, e, t + h.y, h.height, i, c);
        if (rU0(T, A, r, this.highlightIndex, this.colors, i), this.showAxes) l();
        break;
      case "stacked-bar":
        if (this.showAxes) aL(T, e, t + h.y, h.height, i, c);
        if (iU0(T, A, r, this.highlightIndex, this.colors, i), this.showAxes) l();
        break;
      case "line":
      case "sparkline":
        if (this.showAxes) aL(T, e, t + h.y, h.height, i, c);
        if (oU0(T, A, r, this.highlightIndex, this.colors, i), this.showAxes) l();
        break;
      case "stacked-area":
        if (this.showAxes) aL(T, e, t + h.y, h.height, i, c);
        if (cU0(T, A, r, this.highlightIndex, this.colors, i), this.showAxes) l();
        break;
      case "horizontal-bar":
        lU0(T, A, r, this.highlightIndex, this.colors, i, this.chartData.valueFormatter ?? MQ);
        break;
    }
    if (this.showAxes && this.chartData.chartType !== "horizontal-bar") pU0(T, e, t, h, s, this.chartData.xAxisLabel, this.chartData.yAxisLabel);
    if (this.showAxes && r.length > 1) {
      let o = t + h.y + h.height + s + this.getAxisTitleHeight();
      _U0(T, e + h.x, o, h.width, r, this.colors);
    }
  }
  getMaxIntrinsicWidth(T) {
    let R = this.chartData.series[0]?.points ?? [];
    if (this.chartData.chartType === "horizontal-bar") return bRR + 3 + 30;
    let a = Math.max(R.length, 10);
    return (this.showAxes ? ra : 0) + a;
  }
  getMaxIntrinsicHeight(T) {
    if (this.chartData.chartType === "horizontal-bar") return this.computeHorizontalBarHeight();
    let R = T > 0 ? T : 80,
      a = R - (this.showAxes ? ra : 0),
      e = this.computeXAxisHeight(a) + this.getAxisTitleHeight() + this.getLegendHeight();
    return this.computeAutoHeight(R) + e;
  }
  computeAutoHeight(T) {
    let R = T - (this.showAxes ? ra : 0),
      a = Math.round(Math.max(0, R) / JN0);
    return Math.max(QN0, Math.min(ZN0, a));
  }
  computeChartArea() {
    let T = this.size.width,
      R = this.size.height;
    if (this.chartData.chartType === "horizontal-bar") return {
      x: 0,
      y: 0,
      width: T,
      height: R
    };
    let a = this.showAxes ? ra : 0,
      e = Math.max(0, T - a),
      t = this.computeXAxisHeight(e) + this.getAxisTitleHeight() + this.getLegendHeight();
    return {
      x: a,
      y: 0,
      width: e,
      height: Math.max(0, R - t)
    };
  }
  getAxisTitleHeight() {
    return this.chartData.xAxisLabel ? TU0 : 0;
  }
  getLegendHeight() {
    return this.showAxes && this.chartData.series.length > 1 ? 1 : 0;
  }
  computeXAxisHeight(T) {
    if (!this.showAxes || this.chartData.chartType === "horizontal-bar") return 0;
    return this.computeLabelLayout(T).staggered ? lgT + 2 : lgT;
  }
  computeHorizontalBarHeight() {
    let T = this.chartData.series[0]?.points ?? [];
    return Math.max(1, T.length);
  }
  computeLabelLayout(T) {
    let R = this.chartData.series[0]?.points ?? [];
    if (R.length === 0) return {
      staggered: !1,
      displayLabels: [],
      spacing: 0
    };
    let a = R.map(h => h.label),
      e = AgT(a),
      t = this.chartData.chartType,
      r;
    if (t === "bar" || t === "stacked-bar") r = Math.max(1, Math.floor(T / R.length));else r = R.length > 1 ? Math.floor(T / (R.length - 1)) : T;
    return {
      staggered: Math.max(...e.map(h => h.length)) + 2 > r && e.length > 1,
      displayLabels: e,
      spacing: r
    };
  }
  getMaxValue() {
    if (this.chartData.chartType === "stacked-bar" || this.chartData.chartType === "stacked-area") return hU0(this.chartData.series);
    let T = 0;
    for (let R of this.chartData.series) for (let a of R.points) if (a.value > T) T = a.value;
    return T || 1;
  }
};
QP = class QP extends Ve {
  enabled;
  constructor({
    key: T,
    enabled: R,
    child: a
  }) {
    super(T !== void 0 ? {
      key: T,
      child: a
    } : {
      child: a
    });
    this.enabled = R;
  }
  updateShouldNotify(T) {
    return this.enabled !== T.enabled;
  }
  static isEnabled(T) {
    let R = T.dependOnInheritedWidgetOfExactType(QP);
    if (!R) return !0;
    return R.widget.enabled;
  }
};
xRR = class xRR extends NR {
  chartData;
  showAxes;
  colors;
  showSourceQuery;
  constructor({
    key: T,
    chartData: R,
    showAxes: a = !0,
    colors: e = QrT,
    showSourceQuery: t = !1
  }) {
    super(T ? {
      key: T
    } : {});
    this.chartData = R, this.showAxes = a, this.colors = e, this.showSourceQuery = t;
  }
  createState() {
    return new fRR();
  }
};
IRR = class IRR extends to {
  chartData;
  highlightIndex;
  showAxes;
  colors;
  constructor({
    key: T,
    chartData: R,
    highlightIndex: a = null,
    showAxes: e = !0,
    colors: t = QrT
  }) {
    super(T ? {
      key: T
    } : {});
    this.chartData = R, this.highlightIndex = a, this.showAxes = e, this.colors = t;
  }
  createRenderObject() {
    return new uRR({
      chartData: this.chartData,
      highlightIndex: this.highlightIndex,
      showAxes: this.showAxes,
      colors: this.colors
    });
  }
  updateRenderObject(T) {
    let R = T;
    R.chartData = this.chartData, R.highlightIndex = this.highlightIndex, R.showAxes = this.showAxes, R.colors = this.colors, R.markNeedsLayout();
  }
};
q_ = class q_ extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new $RR();
  }
};
$RR = class $RR extends wR {
  _state;
  initState() {
    super.initState(), this._state = this.widget.props.initialState;
  }
  build(T) {
    let R = a => {
      this.setState(() => {
        this._state = a(this._state);
      });
    };
    return this.widget.props.builder(T, R, this._state);
  }
};
QM = class QM extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new vRR();
  }
};
SRR = class SRR extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new jRR();
  }
};
ORR = class ORR extends B0 {
  props;
  debugLabel = "NewsFeedPicker";
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    let R = [...this.props.entries].sort((e, t) => t.pubDate.getTime() - e.pubDate.getTime()),
      a = Math.max(0, ...R.map(e => pgT(e.pubDate).length));
    return new we({
      items: R,
      getLabel: e => e.title,
      onAccept: e => this.props.onSelect?.(e),
      onDismiss: this.props.onDismiss,
      title: this.props.title,
      emptyStateText: "No news entries available",
      maxRenderItems: 100,
      renderItem: (e, t, r, h) => {
        let i = $R.of(h),
          {
            colors: c
          } = i,
          s = i.app,
          A = t ? s.selectionBackground : void 0,
          l = t ? s.selectionForeground : c.foreground,
          o = c.mutedForeground,
          n = (p, _) => new XT({
            width: _,
            child: T0.end([new xT({
              text: new G(p, new cT({
                color: o
              }))
            })])
          });
        return new SR({
          decoration: A ? {
            color: A
          } : void 0,
          padding: TR.symmetric(2, 0),
          child: new T0({
            children: [new j0({
              child: new xT({
                text: new G(e.title, new cT({
                  color: l
                })),
                overflow: "ellipsis",
                maxLines: 1
              })
            }), new XT({
              width: 2
            }), n(pgT(e.pubDate), a)]
          })
        });
      }
    });
  }
};
dRR = class dRR extends NR {
  createState() {
    return new ERR();
  }
};
ERR = class ERR extends wR {
  isGreen = !0;
  timer;
  initState() {
    this.timer = setInterval(() => {
      this.isGreen = !this.isGreen, this.setState();
    }, 700);
  }
  dispose() {
    if (this.timer) clearInterval(this.timer);
    super.dispose();
  }
  build(T) {
    let R = $R.of(T).colors;
    return new xT({
      text: new G("\u25CF", new cT({
        color: this.isGreen ? R.success : R.mutedForeground,
        bold: !0
      })),
      maxLines: 1
    });
  }
};
wQ = class wQ extends NR {
  props;
  debugLabel = "ThreadContinuationPicker";
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new CRR();
  }
};
CRR = class CRR extends wR {
  spinner = new xa();
  spinnerInterval = null;
  isSwitchingThread = !1;
  get isBusy() {
    return this.isSwitchingThread || this.widget.props.isLoading === !0;
  }
  updateSpinnerAnimation() {
    if (this.isBusy) {
      if (!this.spinnerInterval) this.spinnerInterval = setInterval(() => {
        this.spinner.step(), this.setState(() => {});
      }, 100);
      return;
    }
    if (this.spinnerInterval) clearInterval(this.spinnerInterval), this.spinnerInterval = null;
  }
  setSwitchingThread(T) {
    if (this.isSwitchingThread === T) return;
    this.setState(() => {
      this.isSwitchingThread = T;
    }), this.updateSpinnerAnimation();
  }
  initState() {
    super.initState(), this.updateSpinnerAnimation();
  }
  didUpdateWidget(T) {
    this.updateSpinnerAnimation();
  }
  dispose() {
    if (this.spinnerInterval) clearInterval(this.spinnerInterval), this.spinnerInterval = null;
    super.dispose();
  }
  build(T) {
    let {
        props: R
      } = this.widget,
      a = this.isBusy,
      e = this.isSwitchingThread ? "Switching thread..." : "Loading threads...",
      t = `${this.spinner.toBraille()} ${e}`,
      r = R.filterByWorkspace && R.currentWorkspaceURI ? R.threads.filter(b => !b.workspaceURI || b.workspaceURI === R.currentWorkspaceURI) : R.threads;
    if (R.excludeCurrentThread && R.currentThreadID) r = r.filter(b => b.id !== R.currentThreadID);
    let h = R.recentThreadIDs || [],
      i = new Set(h),
      c = R.currentThreadID,
      s = [...r].sort((b, y) => {
        if (c) {
          if (b.id === c) return -1;
          if (y.id === c) return 1;
        }
        let u = h.indexOf(b.id),
          P = h.indexOf(y.id);
        if (u !== -1 && P !== -1) return u - P;
        if (u !== -1) return -1;
        if (P !== -1) return 1;
        return 0;
      }),
      A = vU0(s),
      l = Math.max(0, ...A.map(b => b.description.timeAgo.length)),
      o = $R.of(T),
      n = new uR({
        padding: TR.symmetric(0, 1),
        child: new N0({
          child: new xT({
            text: new G("", new cT({
              color: o.colors.foreground,
              dim: !0
            }), [new G("Alt+W/Ctrl+T", new cT({
              color: o.colors.primary,
              dim: !0
            })), new G(R.filterByWorkspace ? " for all workspaces" : " to filter by workspace", new cT({
              color: o.colors.foreground,
              dim: !0
            }))])
          })
        })
      }),
      p = "",
      _ = null,
      m = b => {
        if (b !== p) p = b, _ = mr(b);
        return _;
      };
    return new we({
      items: A,
      getLabel: b => `${b.title} ${b.id}`,
      filterItem: (b, y) => {
        let u = m(y);
        if (u) return b.id.toLowerCase() === u.toLowerCase();
        return !0;
      },
      normalizeQuery: b => m(b) ? "" : b,
      onAccept: async (b, y) => {
        if (!R.onSelect || this.isSwitchingThread) return;
        let u = R.onSelect(b.id, y);
        if (!SU0(u)) return;
        this.setSwitchingThread(!0);
        try {
          await u;
        } finally {
          if (this.mounted) this.setSwitchingThread(!1);
        }
      },
      onDismiss: R.onDismiss,
      onSelectionChange: b => {
        if (R.previewController) {
          if (b) R.previewController.select(b.id);
        }
      },
      title: R.title,
      enabled: !a,
      isLoading: a,
      hidePromptWhenLoading: !0,
      loadingText: t,
      emptyStateText: R.hasError ? "Failed to load threads" : "No threads match your filter",
      maxRenderItems: 200,
      footer: a || R.hasError ? void 0 : n,
      renderItem: (b, y, u, P) => {
        let k = $R.of(P),
          {
            app: x,
            colors: f
          } = k,
          v = y ? x.selectionBackground : void 0,
          g = y ? x.selectionForeground : f.foreground,
          I = f.mutedForeground,
          S = (B, M) => new XT({
            width: M,
            child: T0.end([new xT({
              text: new G(B, new cT({
                color: I
              }))
            })])
          }),
          O = R.threadViewStates[b.id],
          j = [],
          d = b.relationshipType === "handoff",
          C = new JH({
            connectorColor: f.mutedForeground
          });
        if (b.depth > 0) {
          let B = [],
            M = b.ancestorsAreLast.slice(1);
          for (let W of M) B.push(new G(C.getAncestorPrefix(W), new cT({
            color: C.connectorColor,
            dim: C.connectorDim
          })));
          let V = b.isLast ? C.elbow : C.tee,
            Q = C.getConnectorText(V);
          B.push(new G(Q, new cT({
            color: C.connectorColor,
            dim: C.connectorDim
          }))), j.push(new xT({
            text: new G("", void 0, B)
          }));
        }
        let L = [],
          w = c === b.id ? new G("(current) ", new cT({
            color: f.success
          })) : i.has(b.id) ? new G("(visited) ", new cT({
            color: f.foreground,
            dim: !0
          })) : null;
        if (w) L.push(new xT({
          text: w
        }));
        if (N7(O)) L.push(new dRR()), L.push(new XT({
          width: 1
        }));
        let D = b.title;
        if (b.relationshipType === "fork") {
          let B = D.match(/^Forked\((\d+)\): /);
          if (B) D = D.slice(B[0].length);else while (D.startsWith("Forked: ")) D = D.slice(8);
          L.push(new xT({
            text: new G("[fork] ", new cT({
              color: f.primary
            }))
          }));
        } else if (d) L.push(new xT({
          text: new G("[handoff] ", new cT({
            color: f.accent
          }))
        }));
        if (L.push(new j0({
          child: new xT({
            text: new G(D, new cT({
              color: g
            })),
            overflow: "ellipsis",
            maxLines: 1
          })
        })), L.push(new XT({
          width: 2
        })), b.diffStats && (b.diffStats.added > 0 || b.diffStats.changed > 0 || b.diffStats.deleted > 0)) {
          let B = y ? {
            success: I,
            warning: I,
            destructive: I
          } : f;
          L.push(...jU0(b.diffStats.added, b.diffStats.changed, b.diffStats.deleted, B)), L.push(new XT({
            width: 2
          }));
        }
        return L.push(S(b.description.timeAgo, l)), new SR({
          decoration: v ? {
            color: v
          } : void 0,
          padding: TR.symmetric(2, 0),
          child: new T0({
            children: [...j, ...L]
          })
        });
      }
    });
  }
};
NRR = class NRR extends wR {
  labels = [];
  isLoading = !0;
  currentQuery = "";
  initState() {
    this.loadLabels();
  }
  async loadLabels() {
    try {
      let T = await this.widget.props.internalAPIClient.getUserLabels({
        query: ""
      }, {
        config: this.widget.props.configService
      });
      if (!T.ok) {
        J.error("Failed to load labels", T.error), this.isLoading = !1, this.labels = [], this.setState();
        return;
      }
      this.labels = T.result, this.isLoading = !1, this.setState();
    } catch (T) {
      J.error("Failed to load labels", T), this.isLoading = !1, this.labels = [], this.setState();
    }
  }
  getValidationError(T) {
    let R = T.trim().toLowerCase();
    if (R.length === 0) return null;
    if (R.length > 32) return "Label name cannot exceed 32 characters";
    if (!/^[a-z0-9][a-z0-9-]*$/.test(R)) return "Label must be alphanumeric with hyphens, starting with a letter or number";
    return null;
  }
  isValidLabelName(T) {
    return this.getValidationError(T) === null && T.length > 0;
  }
  getAvailableLabels() {
    let T = this.widget.props.currentLabels || [];
    return this.labels.filter(R => !T.includes(R.name));
  }
  shouldShowCreateMarker(T) {
    if (T.length === 0 || this.isLoading) return !1;
    let R = T.trim().toLowerCase();
    if (!this.isValidLabelName(R)) return !1;
    let a = this.widget.props.currentLabels || [],
      e = this.labels.some(r => r.name === R),
      t = a.includes(R);
    return !e && !t;
  }
  build(T) {
    let R = $R.of(T),
      {
        app: a,
        colors: e
      } = R,
      t = this.currentQuery.trim().toLowerCase(),
      r = t.length > 0 ? this.getValidationError(t) : null,
      h = this.getAvailableLabels(),
      i = [{
        id: "__create__",
        name: "__create_placeholder__",
        createdAt: "",
        __isCreateMarker: !0
      }, ...h];
    return new we({
      title: "Add Label",
      items: i,
      getLabel: c => {
        if ("__isCreateMarker" in c) return this.currentQuery.trim().toLowerCase();
        return c.name;
      },
      onAccept: c => {
        if ("__isCreateMarker" in c) this.widget.props.onSelect(this.currentQuery.trim().toLowerCase());else this.widget.props.onSelect(c.name);
      },
      onDismiss: this.widget.props.onDismiss,
      isLoading: this.isLoading,
      loadingText: "Loading labels...",
      emptyStateText: r || "Type to create a new label",
      renderItem: (c, s, A, l) => {
        let o = s ? a.selectionBackground : void 0,
          n = s ? a.selectionForeground : e.foreground;
        if ("__isCreateMarker" in c && c.__isCreateMarker) {
          let p = this.currentQuery.trim().toLowerCase();
          return new SR({
            decoration: o ? {
              color: o
            } : void 0,
            padding: TR.symmetric(2, 0),
            child: new xT({
              text: new G("", void 0, [new G("Create new label: ", new cT({
                color: n
              })), new G(p, new cT({
                color: n,
                bold: !0
              }))])
            })
          });
        }
        return new SR({
          decoration: o ? {
            color: o
          } : void 0,
          padding: TR.symmetric(2, 0),
          child: new xT({
            text: new G(c.name, new cT({
              color: n
            }))
          })
        });
      },
      filterItem: (c, s) => {
        if (this.currentQuery !== s) this.currentQuery = s, setTimeout(() => this.setState(), 0);
        if ("__isCreateMarker" in c && c.__isCreateMarker) return this.shouldShowCreateMarker(s);
        let A = s.trim().toLowerCase();
        return A.length === 0 || c.name.includes(A);
      },
      sortItems: (c, s, A) => {
        let l = "__isCreateMarker" in c.item && c.item.__isCreateMarker,
          o = "__isCreateMarker" in s.item && s.item.__isCreateMarker;
        if (l && !o) return -1;
        if (!l && o) return 1;
        return s.score - c.score;
      }
    });
  }
};
URR = class URR extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new NRR();
  }
};
Ko = class Ko extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new HRR();
  }
};
HRR = class HRR extends wR {
  _spinner = new xa();
  animationInterval = null;
  initState() {
    super.initState(), this.animationInterval = setInterval(() => {
      this._spinner.step(), this.setState(() => {});
    }, 100);
  }
  dispose() {
    if (this.animationInterval) clearInterval(this.animationInterval), this.animationInterval = null;
    super.dispose();
  }
  build(T) {
    let R = $R.of(T),
      {
        colors: a,
        app: e
      } = R,
      t = h9.all(new e9(a.foreground, 1, "solid")),
      r = this._spinner.toBraille(),
      h = new xT({
        textAlign: "center",
        text: new G("", void 0, [new G(r, new cT({
          color: e.processing
        })), new G(" ", void 0), new G(this.widget.props.message, new cT({
          color: a.foreground
        }))])
      }),
      i = [new j0({
        child: new xR({
          mainAxisAlignment: "center",
          crossAxisAlignment: "center",
          children: [h]
        })
      })];
    if (this.widget.props.onAbort) i.push(new XT({
      height: 2,
      child: new SR({
        padding: TR.symmetric(2, 0),
        child: new xT({
          text: new G("", new cT({
            dim: !0
          }), [new G("Press ", new cT({
            color: a.foreground
          })), new G("Esc", new cT({
            color: a.info
          })), new G(" to cancel", new cT({
            color: a.foreground
          }))])
        })
      })
    }));
    let c = new SR({
      decoration: new p8(a.background, t),
      child: new XT({
        width: 60,
        height: 7,
        child: new xR({
          mainAxisAlignment: "start",
          children: i
        })
      })
    });
    if (this.widget.props.onAbort) return new C8({
      debugLabel: "LoadingDialog",
      autofocus: !0,
      onKey: s => {
        if (s.key === "Escape") return this.widget.props.onAbort?.(), "handled";
        return "ignored";
      },
      child: c
    });
    return c;
  }
};
GRR = class GRR extends wR {
  _dragStartY = null;
  _dragStartOffset = null;
  _isOverThumb = !1;
  _isPositionOverThumb(T) {
    let {
        totalContentHeight: R,
        viewportHeight: a
      } = this.widget.getScrollInfo(),
      e = this.context.findRenderObject()?.size.height ?? 0;
    if (e === 0 || R <= a) return !1;
    let t = this.widget.getScrollInfo(),
      r = Math.min(1, a / R),
      h = Math.max(1, e * r),
      i = Math.max(0, Math.min(1, t.scrollOffset / (R - a))),
      c = e - h,
      s = Math.max(0, c * i),
      A = s + h;
    return T >= s && T <= A;
  }
  _handleHover = T => {
    let R = this._isOverThumb;
    if (this._isOverThumb = this._isPositionOverThumb(T.localPosition.y), R !== this._isOverThumb) this.setState();
  };
  _handleDrag = T => {
    let {
        totalContentHeight: R,
        viewportHeight: a,
        scrollOffset: e
      } = this.widget.getScrollInfo(),
      t = this.context.findRenderObject()?.size.height ?? 0;
    if (t === 0 || R <= a) return;
    if (this._dragStartY === null) this._dragStartY = T.localPosition.y, this._dragStartOffset = e;
    let r = T.localPosition.y - this._dragStartY,
      h = Math.min(1, a / R),
      i = Math.max(1, t * h),
      c = t - i;
    if (c <= 0) return;
    let s = R - a,
      A = c / s,
      l = r / A,
      o = Math.max(0, Math.min(s, this._dragStartOffset + l));
    this.widget.controller.jumpTo(o);
  };
  _handleRelease = () => {
    this._dragStartY = null, this._dragStartOffset = null;
  };
  _handleClick = T => {
    if (T.button !== "left") return;
    let R = T.localPosition.y,
      {
        totalContentHeight: a,
        viewportHeight: e,
        scrollOffset: t
      } = this.widget.getScrollInfo(),
      r = this.context.findRenderObject()?.size.height ?? 0;
    if (r === 0 || a <= e) return;
    let h = Math.min(1, e / a),
      i = Math.max(1, r * h),
      c = a - e,
      s = r - i,
      A = Math.max(0, Math.min(1, t / (a - e))),
      l = Math.max(0, s * A),
      o = l + i;
    if (R >= l && R <= o) return;
    if (R < l) this.widget.controller.animateTo(Math.max(0, t - e));else this.widget.controller.animateTo(Math.min(c, t + e));
  };
  build(T) {
    return new G0({
      onClick: this._handleClick,
      onHover: this._handleHover,
      onDrag: this._handleDrag,
      onRelease: this._handleRelease,
      cursor: this._isOverThumb ? B3.POINTER : B3.DEFAULT,
      child: new KRR({
        controller: this.widget.controller,
        getScrollInfo: this.widget.getScrollInfo,
        thickness: this.widget.thickness,
        trackChar: this.widget.trackChar,
        thumbChar: this.widget.thumbChar,
        showTrack: this.widget.showTrack,
        thumbColor: this.widget.thumbColor,
        trackColor: this.widget.trackColor
      })
    });
  }
};
ob = class ob extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new XRR();
  }
};
YRR = class YRR extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new QRR();
  }
};
ZRR = class ZRR extends B0 {
  build(T) {
    let R = $R.of(T),
      {
        colors: a,
        app: e
      } = R;
    return new N0({
      child: new xT({
        text: new G("", void 0, [new G(`\u2713 Thread Shared

`, new cT({
          color: e.toolSuccess,
          bold: !0
        })), new G(`This thread has been shared with Amp support for debugging and bug prioritization.
`, new cT({
          color: a.foreground
        })), new G(`This is not a support request.
`, new cT({
          color: a.foreground,
          dim: !0
        })), new G("If you need a reply, post on X @AmpCode or email amp-devs@ampcode.com.", new cT({
          color: a.foreground,
          dim: !0
        }))]),
        textAlign: "center"
      })
    });
  }
};
JRR = class JRR extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new T0R();
  }
};
R0R = class R0R extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new a0R();
  }
};
r0R = class r0R extends NR {
  props;
  constructor(T) {
    super({
      key: T.key
    });
    this.props = T;
  }
  createState() {
    return new h0R();
  }
};
h0R = class h0R extends wR {
  nounVisible;
  verbVisible;
  delayTimer = null;
  flickerTimer = null;
  step = 0;
  initState() {
    super.initState();
    let T = B9(this.widget.props.noun),
      R = B9(this.widget.props.verb);
    this.nounVisible = Array(T.length).fill(!0), this.verbVisible = Array(R.length).fill(!0), this.delayTimer = setTimeout(() => {
      this.delayTimer = null, this.startFlicker();
    }, tH0), this.delayTimer.unref();
  }
  dispose() {
    this.clearTimers(), super.dispose();
  }
  clearTimers() {
    if (this.delayTimer !== null) clearTimeout(this.delayTimer), this.delayTimer = null;
    if (this.flickerTimer !== null) clearInterval(this.flickerTimer), this.flickerTimer = null;
  }
  startFlicker() {
    this.flickerTimer = setInterval(() => {
      if (this.step++, this.flickerStep(), this.step >= kgT) this.clearTimers(), this.widget.props.onComplete();else this.setState();
    }, t0R), this.flickerTimer.unref();
  }
  flickerStep() {
    let T = this.nounVisible.length + this.verbVisible.length;
    if (T === 0) return;
    let R = this.step / kgT,
      a = Math.ceil(T * R),
      e = [...this.nounVisible.map((h, i) => ({
        arr: this.nounVisible,
        idx: i,
        visible: h
      })), ...this.verbVisible.map((h, i) => ({
        arr: this.verbVisible,
        idx: i,
        visible: h
      }))].filter(h => h.visible),
      t = T - e.length,
      r = a - t;
    for (let h = 0; h < r && e.length > 0; h++) {
      let i = Math.floor(Math.random() * e.length),
        c = e[i];
      c.arr[c.idx] = !1, e.splice(i, 1);
    }
  }
  build(T) {
    let {
        noun: R,
        verb: a,
        nounColor: e,
        verbColor: t,
        backgroundColor: r,
        categoryWidth: h,
        padding: i
      } = this.widget.props,
      c = B9(R),
      s = B9(a),
      A = c.map((b, y) => this.nounVisible[y] ? b : " ").join(""),
      l = s.map((b, y) => this.verbVisible[y] ? b : " ").join(""),
      o = new cT({
        color: e,
        dim: !0
      }),
      n = new cT({
        color: t,
        bold: !0
      }),
      p = new XT({
        width: h,
        child: new xT({
          text: new G(A, o),
          textAlign: "right"
        })
      }),
      _ = new XT({
        width: h > 0 ? 2 : 0
      }),
      m = new j0({
        child: new xT({
          text: new G(l, n)
        })
      });
    return new SR({
      decoration: r ? {
        color: r
      } : void 0,
      padding: i,
      child: new T0({
        children: [p, _, m],
        crossAxisAlignment: "start"
      })
    });
  }
};
i0R = class i0R extends B0 {
  props;
  debugLabel = "CommandPalette";
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    let {
        context: R,
        enabled: a,
        paletteController: e,
        commands: t,
        onExecuteResult: r,
        onDismiss: h
      } = this.props,
      i = t.getAllCommands(R),
      c = new Map(),
      s = new Map();
    for (let _ of i) c.set(_.id, new Set(t.getCommandFollows(_.id))), s.set(_.id, t.getPriority(_.id, R));
    let A = "",
      l = new Map(),
      o = (_, m) => {
        if (m !== A) A = m, l.clear();
        let b = l.get(_.id);
        if (b) return b;
        let y = {
          exactNounOrVerbMatch: _.noun?.toLowerCase() === m || _.verb.toLowerCase() === m,
          exactAliasMatch: _.aliases?.some(u => u.toLowerCase() === m) ?? !1
        };
        return l.set(_.id, y), y;
      },
      n = "",
      p = 0;
    for (let _ of i) if (_.noun) {
      let m = _.noun.toLowerCase().length;
      if (m > p) p = m;
    }
    return new we({
      items: i,
      enabled: a ?? !0,
      isItemDisabled: _ => {
        return (_.isShown ? _.isShown(R) : !0) !== !0;
      },
      buildDisabledReasonWidget: (_, m) => {
        let b = _.isShown ? _.isShown(R) : !0;
        if (typeof b !== "string") return;
        let y = $R.of(m),
          u = new cT({
            color: y.colors.mutedForeground,
            dim: !0
          }),
          P = _.noun ? `${_.noun}: ${_.verb}` : void 0,
          k = /(https?:\/\/[^\s]+)/g,
          x = [],
          f;
        while ((f = k.exec(b)) !== null) x.push(f[1] ?? f[0]);
        let v = (j, d) => {
            let C = /(https?:\/\/[^\s]+)/g,
              L = [],
              w = 0;
            while ((f = C.exec(j)) !== null) {
              if (f.index > w) L.push(new G(j.slice(w, f.index), d));
              let D = f[1] ?? f[0];
              L.push(H3.createSpan(D, D, new cT({
                color: y.app.link,
                dim: !0
              }))), w = f.index + D.length;
            }
            if (w < j.length) L.push(new G(j.slice(w), d));
            return L;
          },
          g = j => {
            let d = new xT({
              text: new G(void 0, void 0, j),
              textAlign: "center"
            });
            if (x.length > 0) return new G0({
              onClick: () => {
                if (x[0]) je(m, x[0]);
              },
              cursor: "pointer",
              child: d
            });
            return d;
          };
        if (!P) {
          let j = v(b, u);
          return g(j);
        }
        let I = b.indexOf(P);
        if (I === -1) {
          let j = v(b, u);
          return g(j);
        }
        let S = [];
        if (I > 0) S.push(...v(b.slice(0, I), u));
        S.push(new G(P, new cT({
          color: y.app.command,
          dim: !0
        })));
        let O = I + P.length;
        if (O < b.length) S.push(...v(b.slice(O), u));
        return g(S);
      },
      filterItem: (_, m) => {
        if (m === "") return (_.isShown ? _.isShown(R) : !0) === !0;
        return !0;
      },
      getLabel: _ => {
        let m = _.noun ? `${_.noun.toLowerCase()} ${_.verb.toLowerCase()}` : _.verb.toLowerCase(),
          b = _.getPromptText && _.getPromptText(R),
          y = _.aliases ? _.aliases.join(" ") : "",
          u = b ? `${m} ${b}` : m;
        return y ? `${u} ${y}` : u;
      },
      sortItems: (_, m, b) => {
        n = b;
        let y = b.trim().toLowerCase();
        return hH0(_, m, {
          query: b,
          normalizedQuery: y,
          getCommandFollows: u => c.get(u) ?? new Set(),
          getPriority: u => s.get(u) ?? 0,
          hasExactNounOrVerbMatch: (u, P) => o(u, P).exactNounOrVerbMatch,
          hasExactAliasMatch: (u, P) => o(u, P).exactAliasMatch
        });
      },
      onAccept: async _ => {
        let m = new AbortController();
        try {
          if (_.customFlow) {
            let b = !1,
              y = async k => {
                m = new AbortController();
                let x = await t.execute(_.id, R, k, m);
                if (b = !0, x) r(x);
                return x;
              },
              u = () => {
                if (h(), b) h();
              },
              P = () => m.abort(new FrT(_));
            e.launchCustomWidget(k => _.customFlow(k, y, u, P, e), _.customFlowDimensions);
          } else {
            if (_.nonBlocking) return t.execute(_.id, R, void 0, m).catch(y => {
              J.warn("Non-blocking command failed", {
                error: y
              });
            }), h();
            let b = await t.execute(_.id, R, void 0, m);
            if (b) r(b);else h();
          }
        } catch (b) {
          r(b instanceof Error ? b : Error(String(b)));
        }
      },
      onDismiss: h,
      title: "Command Palette",
      renderItem: (_, m, b, y) => {
        let u = $R.of(y),
          {
            colors: P,
            app: k
          } = u,
          x = m ? k.selectionBackground : void 0,
          f = m ? k.selectionForeground : P.foreground,
          v = b || !m;
        if (t.flickeringCommandIds.has(_.id)) return new r0R({
          key: new k3(`flicker-${_.id}`),
          noun: _.noun?.toLowerCase() ?? "",
          verb: _.verb.toLowerCase(),
          nounColor: f,
          verbColor: f,
          backgroundColor: x,
          categoryWidth: p,
          padding: TR.only({
            left: 1,
            right: 2
          }),
          onComplete: () => {
            t.hideCommand(_.id);
          }
        });
        let g = [];
        if (_.noun) g.push(new G(_.noun.toLowerCase(), new cT({
          color: f,
          dim: v
        })));
        let I = new XT({
            width: p,
            child: new xT({
              text: new G("", void 0, g),
              textAlign: "right"
            })
          }),
          S = new XT({
            width: p > 0 ? 2 : 0
          }),
          O = [],
          j = _.verb.toLowerCase(),
          d = j.match(/^(\$_|md)\s+(.+)$/);
        if (d) O.push(new G(d[1], new cT({
          color: k.command,
          bold: !0,
          dim: b
        }))), O.push(new G(" ")), O.push(new G(d[2], new cT({
          color: f,
          bold: !0,
          dim: b
        })));else O.push(new G(j, new cT({
          color: f,
          bold: !0,
          dim: b
        })));
        if (_.noun?.toLowerCase() === "dev") O.push(new G(" (dev only)", new cT({
          color: f,
          dim: b
        })));
        if (b) O.push(new G(" (unavailable)", new cT({
          color: f,
          dim: !0
        })));
        let C = _.getPromptText && _.getPromptText(R);
        if (C && !b) O.push(new G(' "', new cT({
          color: f,
          dim: b
        }))), O.push(new G(C, new cT({
          color: f,
          dim: b
        }))), O.push(new G('"', new cT({
          color: f,
          dim: b
        })));
        if (n && _.aliases) {
          let D = n.toLowerCase(),
            B = _.aliases.find(M => M.toLowerCase().includes(D));
          if (B) O.push(new G(" (alias: ", new cT({
            color: f,
            dim: b
          }))), O.push(new G(B, new cT({
            color: f,
            dim: b
          }))), O.push(new G(")", new cT({
            color: f,
            dim: b
          })));
        }
        let L = new j0({
            child: new xT({
              text: new G("", void 0, O)
            })
          }),
          w = new XT({
            width: 0
          });
        if (_.shortcut) {
          let D = _.shortcut.toString().split("+"),
            B = [];
          for (let M = 0; M < D.length; M++) {
            let V = D[M],
              Q = V === "Ctrl" || V === "Shift" || V === "Alt" || V === "Meta" ? k.keybind : P.mutedForeground;
            if (B.push(new G(V, new cT({
              color: Q,
              bold: !0,
              dim: b
            }))), M < D.length - 1) B.push(new G(" ", new cT({
              color: P.mutedForeground,
              dim: b
            })));
          }
          w = new xT({
            text: new G("", void 0, B)
          });
        }
        return new SR({
          decoration: x ? {
            color: x
          } : void 0,
          padding: TR.only({
            left: 1,
            right: 2
          }),
          child: new T0({
            children: [I, S, L, w],
            crossAxisAlignment: "start"
          })
        });
      }
    });
  }
};
c0R = class c0R extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new s0R();
  }
};
s0R = class s0R extends wR {
  activeModal = null;
  initialCommandTriggered = !1;
  onCommandsChanged = () => {
    if (this.mounted) this.setState();
  };
  dismissPaletteLayer = () => {
    if (this.activeModal !== null) {
      if (!this.mounted) return;
      this.setState(() => {
        this.activeModal = null;
      });
      return;
    }
    this.widget.props.commands.resetRemovedCommands(), this.widget.props.onDismiss();
  };
  paletteController = {
    launchCustomWidget: (T, R) => {
      this.setState(() => {
        this.activeModal = {
          type: "custom-widget",
          widgetFactory: T,
          width: R?.width,
          height: R?.height
        };
      });
    },
    updateDimensions: T => {
      if (this.activeModal?.type === "custom-widget") this.setState(() => {
        if (this.activeModal?.type === "custom-widget") this.activeModal = {
          ...this.activeModal,
          width: T.width,
          height: T.height
        };
      });
    }
  };
  showMessage(T) {
    if (!this.mounted) return;
    this.setState(() => {
      this.activeModal = {
        type: "message",
        message: T,
        dismiss: () => {
          this.widget.props.onDismiss();
        }
      };
    });
  }
  initState() {
    super.initState(), this.widget.props.commands.addChangeListener(this.onCommandsChanged), k8.instance.addPostFrameCallback(() => {
      this.triggerInitialCommandIfNeeded();
    });
  }
  dispose() {
    this.widget.props.commands.removeChangeListener(this.onCommandsChanged), super.dispose();
  }
  didUpdateWidget(T) {
    let R = this.getCommandIdFromOptions(T.props.showOptions),
      a = this.getCommandIdFromOptions(this.widget.props.showOptions);
    if (R !== a) this.initialCommandTriggered = !1, this.triggerInitialCommandIfNeeded();
  }
  getCommandIdFromOptions(T) {
    if (!T) return;
    return T.commandId;
  }
  isStandaloneMode() {
    return this.widget.props.showOptions?.type === "standalone";
  }
  triggerInitialCommandIfNeeded() {
    let {
        showOptions: T,
        commands: R,
        commandContext: a
      } = this.widget.props,
      e = this.getCommandIdFromOptions(T);
    if (!e || this.initialCommandTriggered) return;
    let t = R.getAllCommands(a).find(r => r.id === e);
    if (t?.customFlow) {
      this.initialCommandTriggered = !0;
      let r = this.isStandaloneMode(),
        h = T?.type === "standalone" ? T : void 0,
        i = !1,
        c = () => {
          i = !0, this.widget.props.onInitialCommandExecuted?.();
        },
        s = () => {
          if (r) {
            if (i) h?.onSubmit();else h?.onCancel();
          } else if (i) this.widget.props.onDismiss();else this.dismissPaletteLayer();
        },
        A = () => {
          if (r) h?.onCancel();else this.widget.props.onDismiss();
        };
      this.setState(() => {
        this.activeModal = {
          type: "custom-widget",
          widgetFactory: l => t.customFlow({
            ...l,
            commandPaletteMode: r ? "standalone" : "normal"
          }, async o => {
            h?.onBeforeExecute?.();
            let n = await t.execute(l, new AbortController(), o);
            return c(), n;
          }, s, A, this.paletteController),
          width: t.customFlowDimensions?.width,
          height: t.customFlowDimensions?.height
        };
      });
    }
  }
  build(T) {
    if (!this.widget.props.mainThread) return new XT();
    let R = this.isStandaloneMode(),
      a = [];
    if (!R) a.push(new i0R({
      commands: this.widget.props.commands,
      thread: this.widget.props.mainThread,
      context: this.widget.props.commandContext,
      onDismiss: this.dismissPaletteLayer,
      paletteController: this.paletteController,
      onExecuteResult: r => this.showMessage(r),
      enabled: this.activeModal === null
    }));
    if (this.activeModal !== null) {
      let r;
      switch (this.activeModal.type) {
        case "custom-widget":
          r = this.activeModal.widgetFactory(this.widget.props.commandContext);
          break;
        case "message":
          r = new ob({
            message: this.activeModal.message,
            onDismiss: this.activeModal.dismiss
          });
          break;
      }
      a.push(r);
    }
    if (a.length === 0) return new XT();
    let e = 80,
      t = 20;
    if (this.activeModal?.type === "custom-widget") e = this.activeModal.width || 80, t = this.activeModal.height || 20;else if (this.activeModal?.type === "message" && this.activeModal.message instanceof et) e = this.activeModal.message.dimensions?.width || 80, t = this.activeModal.message.dimensions?.height || 20;
    return new SR({
      constraints: o0.loose(e, t),
      child: new Ta({
        fit: "expand",
        children: a
      })
    });
  }
};
o0R = class o0R extends NR {
  options;
  onConfirm;
  onCancel;
  constructor({
    options: T,
    onConfirm: R,
    onCancel: a
  }) {
    super();
    this.options = T, this.onConfirm = R, this.onCancel = a;
  }
  createState() {
    return new n0R();
  }
};
A0R = class A0R extends NR {
  confirmationRequest;
  onResponse;
  onShowOverlay;
  constructor({
    key: T,
    confirmationRequest: R,
    onResponse: a,
    onShowOverlay: e
  }) {
    super({
      key: T
    });
    this.confirmationRequest = R, this.onResponse = a, this.onShowOverlay = e;
  }
  createState() {
    return new p0R();
  }
};
m0R = class m0R extends NR {
  constructor() {
    super();
  }
  createState() {
    return new u0R();
  }
};
k0R = class k0R extends NR {
  deps;
  thread;
  dtwAnalyze;
  onDismiss;
  initialAnalysis;
  initialProgress;
  constructor({
    key: T,
    deps: R,
    thread: a,
    dtwAnalyze: e,
    onDismiss: t,
    initialAnalysis: r,
    initialProgress: h
  }) {
    super(T ? {
      key: T
    } : {});
    this.deps = R ?? null, this.thread = a ?? null, this.dtwAnalyze = e ?? null, this.onDismiss = t, this.initialAnalysis = r, this.initialProgress = h;
  }
  createState() {
    return new x0R();
  }
};
f0R = class f0R extends NR {
  tokenUsage;
  costInfo;
  onDismiss;
  onOpenCostBreakdown;
  constructor({
    tokenUsage: T,
    costInfo: R,
    onDismiss: a,
    onOpenCostBreakdown: e,
    key: t
  }) {
    super(t ? {
      key: t
    } : void 0);
    this.tokenUsage = T, this.costInfo = R, this.onDismiss = a, this.onOpenCostBreakdown = e;
  }
  createState() {
    return new I0R();
  }
};
v0R = class v0R extends NR {
  error;
  options;
  onResponse;
  onCopy;
  constructor({
    key: T,
    error: R,
    options: a,
    onResponse: e,
    onCopy: t
  }) {
    super({
      key: T
    });
    this.error = R, this.options = a, this.onResponse = e, this.onCopy = t;
  }
  createState() {
    return new j0R();
  }
};
S0R = class S0R extends NR {
  onDismiss;
  constructor({
    key: T,
    onDismiss: R
  }) {
    super(T ? {
      key: T
    } : {});
    this.onDismiss = R;
  }
  createState() {
    return new O0R();
  }
};
ZM = class ZM extends B0 {
  items;
  renderRow;
  constructor({
    items: T,
    renderRow: R
  }) {
    super();
    this.items = T, this.renderRow = R;
  }
  build(T) {
    let R = I9.of(T).size.width,
      a = 50,
      e = R < 50,
      t = [];
    for (let r of this.items) {
      let [h, i] = this.renderRow(r),
        c;
      if (e) c = new xR({
        crossAxisAlignment: "start",
        mainAxisSize: "min",
        children: [h, new uR({
          padding: TR.only({
            left: 4
          }),
          child: i
        })]
      });else c = new T0({
        crossAxisAlignment: "start",
        children: [new j0({
          flex: 1,
          child: h
        }), new XT({
          width: 1
        }), new j0({
          flex: 1,
          child: i
        })]
      });
      t.push(new uR({
        padding: TR.horizontal(6),
        child: c
      }));
    }
    return new xR({
      crossAxisAlignment: "start",
      mainAxisSize: "min",
      children: t
    });
  }
};
d0R = class d0R extends NR {
  commands;
  submitOnEnter;
  constructor({
    key: T,
    commands: R,
    submitOnEnter: a
  }) {
    super(T ? {
      key: T
    } : {});
    this.commands = R, this.submitOnEnter = a ?? !0;
  }
  createState() {
    return new E0R();
  }
};
M0R = class M0R extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new D0R();
  }
};
w0R = class w0R extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new B0R();
  }
};
N0R = class N0R extends NR {
  options;
  onSubmit;
  onCancel;
  constructor({
    options: T,
    onSubmit: R,
    onCancel: a
  }) {
    super();
    this.options = T, this.onSubmit = R, this.onCancel = a;
  }
  createState() {
    return new U0R();
  }
};
X0R = class X0R extends NR {
  color;
  trigger;
  trail;
  fps;
  speed;
  leftOffset;
  direction;
  backgroundColor;
  constructor({
    key: T,
    color: R,
    trigger: a,
    trail: e = 5,
    fps: t = 60,
    speed: r = 1,
    leftOffset: h = 0,
    direction: i = "left-to-right",
    backgroundColor: c
  }) {
    super(T ? {
      key: T
    } : {});
    this.color = R, this.trigger = a, this.trail = e, this.fps = t, this.speed = r, this.leftOffset = h, this.direction = i, this.backgroundColor = c;
  }
  createState() {
    return new Y0R();
  }
};
Y0R = class Y0R extends wR {
  progress = 0;
  timer = null;
  initState() {
    this.restart();
  }
  didUpdateWidget(T) {
    if (T.trigger !== this.widget.trigger) this.restart();
  }
  dispose() {
    this.stop();
  }
  restart() {
    this.stop(), this.progress = this.widget.direction === "right-to-left" ? 0 : -this.widget.trail, this.start();
  }
  start() {
    if (this.timer) return;
    let T = Math.max(16, Math.round(1000 / Math.max(1, this.widget.fps)));
    this.timer = setInterval(() => {
      this.setState(() => {
        this.progress += this.widget.speed;
      });
    }, T);
  }
  stop() {
    if (this.timer) clearInterval(this.timer), this.timer = null;
  }
  build(T) {
    let R = this.widget.backgroundColor ?? Z0.of(T).colorScheme.background;
    return new Q0R({
      color: this.widget.color,
      trail: this.widget.trail,
      head: this.progress,
      leftOffset: this.widget.leftOffset,
      direction: this.widget.direction,
      backgroundColor: R
    }, this.widget.key);
  }
};
Q0R = class Q0R extends to {
  props;
  constructor(T, R) {
    super(R ? {
      key: R
    } : {});
    this.props = T;
  }
  createElement() {
    return new bp(this);
  }
  createRenderObject() {
    return new Z0R(this.props.color, this.props.trail, this.props.head, this.props.leftOffset, this.props.direction, this.props.backgroundColor);
  }
  updateRenderObject(T) {
    T.update(this.props.color, this.props.trail, this.props.head, this.props.leftOffset, this.props.direction, this.props.backgroundColor);
  }
};
Z0R = class Z0R extends O9 {
  _color;
  _trail;
  _head;
  _leftOffset;
  _direction;
  _backgroundColor;
  constructor(T, R, a, e, t, r) {
    super();
    this._color = T, this._trail = R, this._head = a, this._leftOffset = e, this._direction = t, this._backgroundColor = r;
  }
  update(T, R, a, e, t, r) {
    let h = !1;
    if (R !== this._trail) this._trail = R, h = !0;
    if (this._color = T, this._head = a, this._leftOffset = e, this._direction = t, this._backgroundColor = r, h) this.markNeedsLayout();
    this.markNeedsPaint();
  }
  performLayout() {
    let T = this._lastConstraints,
      R = T.constrain(T.biggest.width, 1);
    this.setSize(R.width, R.height), super.performLayout();
  }
  paint(T, R = 0, a = 0) {
    let e = Math.floor(R + this.offset.x),
      t = Math.floor(a + this.offset.y),
      r = Math.floor(this.size.width),
      h = [1, 0.7, 0.5, 0.35, 0.25, 0.15];
    for (let i = 0; i <= this._trail && i < h.length; i++) {
      let c = this._direction === "right-to-left" ? r - 1 - Math.floor(this._head) + i + this._leftOffset : Math.floor(this._head) - i + this._leftOffset;
      if (c < this._leftOffset || c >= r) continue;
      let s = sW0(this._color, h[i]);
      T.setChar(e + c, t, "\u2501", {
        fg: s,
        bg: this._backgroundColor
      }, 1);
    }
    super.paint(T, R, a);
  }
};
J0R = class J0R extends NR {
  servers;
  onDismiss;
  constructor({
    servers: T,
    onDismiss: R
  }) {
    super();
    this.servers = T, this.onDismiss = R;
  }
  createState() {
    return new T9R();
  }
};
R9R = class R9R extends B0 {
  server;
  animationFrame;
  animationFrames;
  serverNameStyle;
  connectedStyle;
  connectingStyle;
  failedStyle;
  errorStyle;
  warningStyle;
  constructor(T) {
    super();
    this.server = T.server, this.animationFrame = T.animationFrame, this.animationFrames = T.animationFrames, this.serverNameStyle = T.serverNameStyle, this.connectedStyle = T.connectedStyle, this.connectingStyle = T.connectingStyle, this.failedStyle = T.failedStyle, this.errorStyle = T.errorStyle, this.warningStyle = T.warningStyle;
  }
  build(T) {
    let R = this.server.status,
      a = [],
      e,
      t,
      r,
      h;
    switch (R.type) {
      case "connected":
        e = "\u2713", t = this.connectedStyle, r = "connected", h = this.connectedStyle;
        break;
      case "connecting":
        e = this.animationFrames[this.animationFrame] ?? "\u223F", t = this.connectingStyle, r = "connecting", h = this.connectingStyle;
        break;
      case "authenticating":
        e = this.animationFrames[this.animationFrame] ?? "\u223F", t = this.connectingStyle, r = "authenticating", h = this.connectingStyle;
        break;
      case "failed":
        e = "\u2717", t = this.failedStyle, r = "failed", h = this.failedStyle;
        break;
      case "denied":
        e = "\u2717", t = this.failedStyle, r = "denied", h = this.failedStyle;
        break;
      case "awaiting-approval":
        e = "?", t = this.warningStyle, r = "awaiting approval", h = this.warningStyle;
        break;
      case "blocked-by-registry":
        e = "\u2298", t = this.failedStyle, r = "blocked", h = this.failedStyle;
        break;
      default:
        e = "\xB7", t = this.errorStyle, r = "unknown", h = this.errorStyle;
    }
    let i = new T0({
      children: [new xT({
        text: new G(e, t),
        maxLines: 1
      }), y3.horizontal(2), new j0({
        child: new xT({
          text: new G(this.server.name, this.serverNameStyle),
          maxLines: 1
        })
      }), new xT({
        text: new G(r, h),
        maxLines: 1
      })]
    });
    if (a.push(new uR({
      padding: TR.horizontal(2),
      child: i
    })), R.type === "failed") {
      let c = this.formatErrorMessage(R.error.message);
      a.push(new uR({
        padding: TR.only({
          left: 5,
          right: 2
        }),
        child: new xT({
          text: new G(`\u2514\u2500 ${c}`, this.errorStyle),
          maxLines: 2
        })
      }));
    } else if (R.type === "blocked-by-registry") a.push(new uR({
      padding: TR.only({
        left: 5,
        right: 2
      }),
      child: new xT({
        text: new G("\u2514\u2500 Blocked by workspace MCP registry", this.errorStyle),
        maxLines: 1
      })
    }));
    return a.push(new XT({
      height: 1
    })), new xR({
      crossAxisAlignment: "stretch",
      mainAxisSize: "min",
      children: a
    });
  }
  formatErrorMessage(T) {
    let R = T.replace(/\n/g, " ").trim();
    if (R.length > 60) R = R.substring(0, 57) + "...";
    return R;
  }
};
a9R = class a9R extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new e9R();
  }
};
t9R = class t9R extends B0 {
  message;
  onDismiss;
  constructor({
    key: T,
    message: R,
    onDismiss: a
  }) {
    super({
      key: T
    });
    this.message = R, this.onDismiss = a;
  }
  build(T) {
    let R = Z0.of(T).colorScheme,
      a = LRR(this.message),
      e = [{
        value: "dismiss",
        label: "Dismiss"
      }],
      t = a.type === "error" ? R.destructive : R.primary,
      r = new ro({
        child: new xT({
          text: new G(a.description),
          selectable: !0
        })
      });
    return new io({
      title: a.title,
      body: r,
      options: e,
      onSelect: h => {
        this.onDismiss();
      },
      borderColor: t,
      autofocus: !0,
      showDismissalMessage: !1,
      enableMouseInteraction: !0
    });
  }
};
r9R = class r9R extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new h9R();
  }
};
x3 = class x3 extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new i9R();
  }
};
i9R = class i9R extends wR {
  _animationTimer;
  _spinner = new xa();
  initState() {
    if (super.initState(), this.widget.props.status === "in-progress") this._startAnimation();
  }
  didUpdateWidget(T) {
    if (super.didUpdateWidget(T), T.props.status !== "in-progress" && this.widget.props.status === "in-progress") this._startAnimation();else if (T.props.status === "in-progress" && this.widget.props.status !== "in-progress") this._stopAnimation();
  }
  dispose() {
    this._stopAnimation(), super.dispose();
  }
  _startAnimation() {
    this._animationTimer = setInterval(() => {
      this.setState(() => {
        this._spinner.step();
      });
    }, 200);
  }
  _stopAnimation() {
    if (this._animationTimer) clearInterval(this._animationTimer), this._animationTimer = void 0;
  }
  build(T) {
    let {
        name: R,
        status: a,
        children: e,
        tail: t,
        content: r
      } = this.widget.props,
      h = $R.of(T),
      i = a === "in-progress" ? this._spinner.toBraille() : xW(a),
      c = qr(a, h),
      s = [];
    s.push(new G(`${i} `, new cT({
      color: c
    }))), s.push(new G(R, new cT({
      color: h.app.toolName,
      bold: !0
    })));
    let A = new xT({
        text: new G("", void 0, s),
        selectable: !0
      }),
      l;
    if (!e || e.length === 0) l = A;else {
      let n = [A];
      for (let p of e) n.push(new XT({
        width: 1
      })), n.push(p);
      l = new T0({
        children: n,
        mainAxisSize: "min"
      });
    }
    if ((!t || t.length === 0) && !r) return l;
    let o = [l];
    if (t && t.length > 0) o.push(new xT({
      text: new G("", void 0, t),
      selectable: !0
    }));
    if (r) o.push(r);
    return new xR({
      crossAxisAlignment: "start",
      children: o
    });
  }
};
nf = class nf extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new c9R();
  }
};
c9R = class c9R extends wR {
  _animationTimer;
  _spinner = new xa();
  initState() {
    if (super.initState(), this._shouldAnimate(this.widget.props.status)) this._startAnimation();
  }
  didUpdateWidget(T) {
    super.didUpdateWidget(T);
    let R = this._shouldAnimate(T.props.status),
      a = this._shouldAnimate(this.widget.props.status);
    if (!R && a) this._startAnimation();else if (R && !a) this._stopAnimation();
  }
  dispose() {
    this._stopAnimation(), super.dispose();
  }
  _shouldAnimate(T) {
    return T === "in-progress" || T === "queued";
  }
  _startAnimation() {
    this._animationTimer = setInterval(() => {
      this.setState(() => {
        this._spinner.step();
      });
    }, 200);
  }
  _stopAnimation() {
    if (!this._animationTimer) return;
    clearInterval(this._animationTimer), this._animationTimer = void 0;
  }
  build(T) {
    let R = $R.of(T),
      {
        expanded: a,
        label: e,
        meta: t,
        status: r,
        statusColor: h
      } = this.widget.props,
      i = a ? "\u25BC" : "\u25B6",
      c = [];
    if (r) {
      let l = this._shouldAnimate(r) ? this._spinner.toBraille() : xW(r);
      c.push(new G(`${l} `, new cT({
        color: h
      })));
    }
    if (c.push(new G(e, new cT({
      color: R.app.toolName
    }))), t) if (typeof t === "string") c.push(new G(` ${t}`, new cT({
      color: R.colors.mutedForeground
    })));else c.push(new G(" ")), c.push(...t);
    let s = new xT({
        text: new G("", void 0, c),
        selectable: !0,
        maxLines: 1
      }),
      A = new xT({
        text: new G(i, new cT({
          color: R.colors.mutedForeground
        })),
        selectable: !1
      });
    return new G0({
      cursor: "pointer",
      onClick: () => this.widget.props.onToggle(!a),
      child: new T0({
        children: [s, new XT({
          width: 1
        }), A]
      })
    });
  }
};
s9R = class s9R extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    let R = $R.of(T),
      a = _W0(this.props.toolRun),
      e = this.props.toolRun?.status ?? "in-progress",
      t = e === "in-progress" || e === "queued",
      r = qr(e, R),
      h = bW0(a),
      i = t ? "Editing" : "Edited",
      c = h ? h.fileCount === 1 ? `${i} ${h.primaryFile}` : `${i} ${h.fileCount} ${o9(h.fileCount, "file")}` : `${i} files`,
      s = h ? mW0(h, R) : void 0,
      A = new nf({
        label: c,
        meta: s,
        status: e,
        statusColor: r,
        expanded: this.props.expanded,
        onToggle: this.props.onToggle
      }),
      l = Jm(this.props.guidanceFiles, R),
      o = this.props.expanded ? uW0(a, this.props.toolRun, R, T, t) : void 0;
    if (!this.props.expanded) return A;
    return o || l ? new xR({
      crossAxisAlignment: "start",
      children: [A, ...(l ? [l] : []), ...(o ? [new XT({
        height: 1
      }), o] : [])]
    }) : A;
  }
};
o9R = class o9R extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new n9R();
  }
};
n9R = class n9R extends wR {
  _spinner = new xa();
  _animationTimer;
  get _isRunning() {
    let T = this.widget.props.status;
    return T === "in-progress" || T === "queued";
  }
  initState() {
    if (super.initState(), this._isRunning) this._startAnimation();
  }
  didUpdateWidget(T) {
    super.didUpdateWidget(T);
    let R = T.props.status === "in-progress" || T.props.status === "queued";
    if (!R && this._isRunning) this._startAnimation();else if (R && !this._isRunning) this._stopAnimation();
  }
  dispose() {
    this._stopAnimation(), super.dispose();
  }
  _startAnimation() {
    if (this._animationTimer) return;
    this._animationTimer = setInterval(() => {
      this.setState(() => {
        this._spinner.step();
      });
    }, 200);
  }
  _stopAnimation() {
    if (!this._animationTimer) return;
    clearInterval(this._animationTimer), this._animationTimer = void 0;
  }
  build(T) {
    let {
        props: R
      } = this.widget,
      a = $R.of(T),
      e = this._isRunning,
      t = qr(R.status, a),
      r = R.error?.trim(),
      h = Boolean(r),
      i = R.exitCode !== void 0 && R.exitCode !== 0,
      c = R.status === "error" || R.status === "done" && (i || h),
      s = R.status === "done" && (i || h) ? a.app.toolError : t,
      A = a.colors.foreground,
      l = Jm(R.guidanceFiles, a),
      o = new cT({
        color: a.colors.mutedForeground
      }),
      n = R.command.split(`
`),
      p = (R.expanded ? n : [n[0] ?? ""]).map((P, k) => {
        let x = [];
        if (k === 0) {
          if (e) x.push(new G(`${this._spinner.toBraille()} `, new cT({
            color: a.app.shellMode
          })));else x.push(new G("$ ", new cT({
            color: s,
            bold: !0
          })));
        } else x.push(new G("  ", new cT({})));
        if (x.push(new G(P, new cT({
          color: A
        }))), k === 0) {
          let f;
          if (R.status === "error") f = " (error)";else if (i) f = ` (exit ${R.exitCode})`;else if (h) f = " (error)";
          if (f) x.push(new G(f, new cT({
            color: a.app.toolError,
            italic: !0,
            dim: !0
          })));
          let v = n.length > 1 ? !R.expanded ? "... " : "    " : " ",
            g = R.expanded ? "\u25BC" : "\u25B6";
          x.push(new G(v, o)), x.push(new G(g, o));
        }
        return new xT({
          text: new G("", void 0, x),
          selectable: !0
        });
      }),
      _ = new G0({
        cursor: "pointer",
        onClick: () => R.onToggle(!R.expanded),
        child: new xR({
          crossAxisAlignment: "start",
          children: p
        })
      });
    if (!R.expanded) {
      if (e && R.progressOutput) {
        let P = vgT(R.progressOutput),
          k = new cT({
            color: a.colors.mutedForeground,
            dim: !0
          }),
          x = [_, ...P.map(f => new uR({
            padding: TR.only({
              left: 2
            }),
            child: new xT({
              text: new G(f, k),
              maxLines: 1,
              overflow: "ellipsis",
              selectable: !0
            })
          }))];
        return new xR({
          crossAxisAlignment: "start",
          children: x
        });
      }
      if (!e && c) {
        let P = R.error?.trim() || R.output?.trim() || R.progressOutput?.trim();
        if (P) {
          let k = vgT(P),
            x = new cT({
              color: a.app.toolError,
              dim: !0
            }),
            f = [_, ...k.map(v => new uR({
              padding: TR.only({
                left: 2
              }),
              child: new xT({
                text: new G(v, x),
                maxLines: 1,
                overflow: "ellipsis",
                selectable: !0
              })
            }))];
          return new xR({
            crossAxisAlignment: "start",
            children: f
          });
        }
      }
      return _;
    }
    let m = R.error?.trim() || R.output?.trim() || R.progressOutput?.trim(),
      b;
    if (e) b = "Command running...";else if (c && R.exitCode !== void 0) b = `Exited with code ${R.exitCode}.`;else b = "No output.";
    let y = new cT({
        color: c ? a.app.toolError : a.colors.mutedForeground,
        dim: !0
      }),
      u = new xT({
        text: new G(m || b, y),
        selectable: !0
      });
    return new xR({
      crossAxisAlignment: "start",
      children: [_, ...(l ? [l] : []), new XT({
        height: 1
      }), new uR({
        padding: TR.only({
          left: 2
        }),
        child: u
      })]
    });
  }
};
l9R = class l9R extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    let R = $R.of(T),
      a = qr(this.props.status, R),
      e = this.props.status === "in-progress" ? "Reviewing code" : "Reviewed code",
      t = this.props.subTools && this.props.subTools.length > 0,
      r = new nf({
        label: e,
        status: this.props.status,
        statusColor: a,
        expanded: t ? this.props.expanded : !1,
        onToggle: this.props.onToggle
      });
    if (!this.props.expanded || !t) return r;
    let h = new cT({
        color: R.colors.mutedForeground,
        dim: !0
      }),
      i = this.props.subTools.map(c => {
        let s = [new G("\xB7 ", h), new G(c.name, h)];
        if (c.detail) s.push(new G(` ${c.detail}`, h));
        return new xT({
          text: new G("", void 0, s),
          selectable: !0,
          maxLines: 1
        });
      });
    return new xR({
      crossAxisAlignment: "start",
      children: [r, new XT({
        height: 1
      }), ...i]
    });
  }
};
A9R = class A9R extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    let R = $R.of(T),
      a = this.props.toolRun?.status ?? "in-progress",
      e = a === "in-progress" || a === "queued",
      t = qr(a, R),
      r = this.props.path ? ki(this.props.path, T) : "file",
      h = PW0(this.props),
      i = new nf({
        label: `${e ? "Creating" : "Created"} ${r}`,
        meta: h,
        status: a,
        statusColor: t,
        expanded: this.props.expanded,
        onToggle: this.props.onToggle
      }),
      c = Jm(this.props.guidanceFiles, R);
    if (!this.props.expanded) return i;
    let s = kW0(this.props, R);
    return new xR({
      crossAxisAlignment: "start",
      children: [i, ...(c ? [c] : []), ...(this.props.expanded ? [new XT({
        height: 1
      }), s] : [])]
    });
  }
};
_9R = class _9R extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    let R = $R.of(T),
      a = this.props.toolRun?.status ?? "in-progress",
      e = a === "in-progress" || a === "queued",
      t = qr(a, R),
      r = this.props.path ? ki(this.props.path, T) : "file",
      h = tq0(this.props),
      i = new nf({
        label: `${e ? "Editing" : "Edited"} ${r}`,
        meta: h,
        status: a,
        statusColor: t,
        expanded: this.props.expanded,
        onToggle: this.props.onToggle
      }),
      c = Jm(this.props.guidanceFiles, R);
    if (!this.props.expanded) return i;
    let s = rq0(this.props, R);
    return new xR({
      crossAxisAlignment: "start",
      children: [i, ...(c ? [c] : []), ...(this.props.expanded ? [new XT({
        height: 1
      }), s] : [])]
    });
  }
};
b9R = class b9R extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new m9R();
  }
};
m9R = class m9R extends wR {
  _spinner = new xa();
  _animationTimer;
  get _isRunning() {
    let T = this.widget.props.status;
    return T === "in-progress" || T === "queued";
  }
  initState() {
    if (super.initState(), this._isRunning) this._startAnimation();
  }
  didUpdateWidget(T) {
    super.didUpdateWidget(T);
    let R = T.props.status === "in-progress" || T.props.status === "queued";
    if (!R && this._isRunning) this._startAnimation();else if (R && !this._isRunning) this._stopAnimation();
  }
  dispose() {
    this._stopAnimation(), super.dispose();
  }
  _startAnimation() {
    if (this._animationTimer) return;
    this._animationTimer = setInterval(() => {
      this.setState(() => {
        this._spinner.step();
      });
    }, 200);
  }
  _stopAnimation() {
    if (!this._animationTimer) return;
    clearInterval(this._animationTimer), this._animationTimer = void 0;
  }
  build(T) {
    let {
        props: R
      } = this.widget,
      a = $R.of(T),
      e = this._isRunning,
      t = qr(R.status, a),
      r = R.error?.trim(),
      h = Boolean(r),
      i = R.exitCode !== void 0 && R.exitCode !== 0,
      c = R.status === "error" || R.status === "done" && (i || h),
      s = R.status === "done" && (i || h) ? a.app.toolError : t,
      A = a.colors.foreground,
      l = Jm(R.guidanceFiles, a),
      o = new cT({
        color: a.colors.mutedForeground
      }),
      n = R.command.split(`
`),
      p = (R.expanded ? n : [n[0] ?? ""]).map((P, k) => {
        let x = [];
        if (k === 0) {
          if (e) x.push(new G(`${this._spinner.toBraille()} `, new cT({
            color: a.app.shellMode
          })));else x.push(new G("$ ", new cT({
            color: s,
            bold: !0
          })));
        } else x.push(new G("  ", new cT({})));
        if (x.push(new G(P, new cT({
          color: A
        }))), k === 0) {
          let f;
          if (R.status === "error") f = " (error)";else if (i) f = ` (exit ${R.exitCode})`;else if (h) f = " (error)";
          if (f) x.push(new G(f, new cT({
            color: a.app.toolError,
            italic: !0,
            dim: !0
          })));
          let v = n.length > 1 ? !R.expanded ? "... " : "    " : " ",
            g = R.expanded ? "\u25BC" : "\u25B6";
          x.push(new G(v, o)), x.push(new G(g, o));
        }
        return new xT({
          text: new G("", void 0, x),
          selectable: !0
        });
      }),
      _ = new G0({
        cursor: "pointer",
        onClick: () => R.onToggle(!R.expanded),
        child: new xR({
          crossAxisAlignment: "start",
          children: p
        })
      });
    if (!R.expanded) {
      if (e && R.progressOutput) {
        let P = SgT(R.progressOutput),
          k = new cT({
            color: a.colors.mutedForeground,
            dim: !0
          }),
          x = [_, ...P.map(f => new uR({
            padding: TR.only({
              left: 2
            }),
            child: new xT({
              text: new G(f, k),
              maxLines: 1,
              overflow: "ellipsis",
              selectable: !0
            })
          }))];
        return new xR({
          crossAxisAlignment: "start",
          children: x
        });
      }
      if (!e && c) {
        let P = R.error?.trim() || R.output?.trim() || R.progressOutput?.trim();
        if (P) {
          let k = SgT(P),
            x = new cT({
              color: a.app.toolError,
              dim: !0
            }),
            f = [_, ...k.map(v => new uR({
              padding: TR.only({
                left: 2
              }),
              child: new xT({
                text: new G(v, x),
                maxLines: 1,
                overflow: "ellipsis",
                selectable: !0
              })
            }))];
          return new xR({
            crossAxisAlignment: "start",
            children: f
          });
        }
      }
      return _;
    }
    let m = R.error?.trim() || R.output?.trim() || R.progressOutput?.trim(),
      b;
    if (e) b = "Command running...";else if (c && R.exitCode !== void 0) b = `Exited with code ${R.exitCode}.`;else b = "No output.";
    let y = new cT({
        color: c ? a.app.toolError : a.colors.mutedForeground,
        dim: !0
      }),
      u = new xT({
        text: new G(m || b, y),
        selectable: !0
      });
    return new xR({
      crossAxisAlignment: "start",
      children: [_, ...(l ? [l] : []), new XT({
        height: 1
      }), new uR({
        padding: TR.only({
          left: 2
        }),
        child: u
      })]
    });
  }
};
u9R = class u9R extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    let R = $R.of(T),
      a = this.props.toolRun?.status ?? "in-progress",
      e = a === "in-progress" || a === "queued",
      t = qr(a, R),
      r = this.props.path ? ki(this.props.path, T) : "file",
      h = new nf({
        label: `${e ? "Reverting" : "Reverted"} ${r}`,
        status: a,
        statusColor: t,
        expanded: this.props.expanded,
        onToggle: this.props.onToggle
      });
    if (!this.props.expanded) return h;
    let i = hq0(this.props, R);
    return new xR({
      crossAxisAlignment: "start",
      children: [h, new XT({
        height: 1
      }), i]
    });
  }
};
chT = class chT extends NR {
  toolUse;
  toolRun;
  constructor(T) {
    super(T.key ? {
      key: T.key
    } : {});
    this.toolUse = T.toolUse, this.toolRun = T.toolRun;
  }
  createState() {
    return new y9R();
  }
};
$9R = class $9R extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    let {
        toolRun: R
      } = this.props,
      a = $R.of(T),
      {
        app: e
      } = a,
      t = R?.status ?? "in-progress",
      r = [],
      h = f50(R);
    if (h) {
      let s = h.files.length,
        A = h.files.reduce((p, _) => p + _.additions, 0),
        l = h.files.reduce((p, _) => p + _.deletions, 0),
        o = A + l,
        n = [];
      if (n.push(new G(`${s} ${o9(s, "file")} ${o} ${o9(o, "change")}`, new cT({
        dim: !0
      }))), A > 0) n.push(new G(` +${A}`, new cT({
        color: e.diffAdded
      })));
      if (l > 0) n.push(new G(` -${l}`, new cT({
        color: e.diffRemoved
      })));
      r.push(new xT({
        text: new G("", void 0, n)
      }));
    }
    let i;
    if (h) {
      let s = [];
      for (let A of h.files) {
        let l = ki(A.path, T),
          o = [new G(" "), new G(`+${A.additions}`, new cT({
            color: e.diffAdded
          })), new G(` -${A.deletions}`, new cT({
            color: e.diffRemoved
          }))],
          n = A.uri;
        s.push(new xR({
          crossAxisAlignment: "start",
          children: [new uR({
            padding: TR.only({
              left: 2,
              top: 1
            }),
            child: new T0({
              crossAxisAlignment: "center",
              children: [new H3({
                uri: n,
                text: l,
                style: new cT({
                  color: e.fileReference,
                  dim: !0,
                  underline: !0
                })
              }), new xT({
                text: new G("", void 0, o)
              })]
            })
          }), A.diff ? new uR({
            padding: TR.only({
              left: 0
            }),
            child: new fp({
              diff: A.diff,
              filePath: A.path
            })
          }) : new XT({
            width: 0,
            height: 0
          })]
        }));
      }
      i = new xR({
        crossAxisAlignment: "start",
        children: s
      });
    } else if (I50(R)) i = new uR({
      padding: TR.only({
        left: 2
      }),
      child: new xT({
        text: new G(R.error.message, new cT({
          color: e.toolError
        })),
        selectable: !0
      })
    });
    let c = [];
    if (h && h.discoveredGuidanceFiles && h.discoveredGuidanceFiles.length > 0) {
      for (let s of h.discoveredGuidanceFiles) c.push(new G(`  Loaded ${ZA(s.uri)} (${s.lineCount} lines)
`, new cT({
        color: e.toolSuccess,
        dim: !0
      })));
      if (i) c.push(new G(`
`));
    }
    return new x3({
      name: "Apply Patch",
      status: t,
      children: r,
      content: i,
      tail: c.length > 0 ? c : void 0
    });
  }
};
v9R = class v9R extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    let {
        toolUse: R,
        toolRun: a
      } = this.props,
      e = a?.status ?? "in-progress",
      t = [],
      r = $R.of(T),
      {
        app: h
      } = r,
      i = Va(R) ? R.input : R.inputIncomplete,
      c = i?.path,
      s = i?.content;
    if (c) {
      let n = ki(c, T);
      t.push(new H3({
        uri: `file://${c}`,
        text: n,
        style: new cT({
          color: h.fileReference,
          dim: !0,
          underline: !0
        })
      }));
    }
    let A = [];
    if (s) {
      let n = xx(s);
      if (n.added > 0) A.push(new G(`+${n.added}`, new cT({
        color: h.diffAdded
      })));
    }
    if (A.length > 0) t.push(new xT({
      text: new G("", void 0, A)
    }));
    let l;
    if (s) {
      let n = s.endsWith(`
`) ? s : s + `
`,
        p = $A(null, n).split(`
`).slice(0, -1).join(`
`),
        _ = S50(p, j50);
      l = new fp({
        diff: _,
        filePath: c
      });
    } else if (O50(a)) l = new uR({
      padding: TR.only({
        left: 2
      }),
      child: new xT({
        text: new G(a.error.message, new cT({
          color: h.toolError
        })),
        selectable: !0
      })
    });
    let o = [];
    if (a?.status === "done" && typeof a.result === "object" && a.result.discoveredGuidanceFiles && a.result.discoveredGuidanceFiles.length > 0) {
      for (let n of a.result.discoveredGuidanceFiles) o.push(new G(`  Loaded ${ZA(n.uri)} (${n.lineCount} lines)
`, new cT({
        color: h.toolSuccess,
        dim: !0
      })));
      if (l) o.push(new G(`
`));
    }
    return new x3({
      name: "Create",
      status: e,
      children: t,
      content: l,
      tail: o.length > 0 ? o : void 0
    });
  }
};
j9R = class j9R extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    let {
        toolUse: R,
        toolRun: a
      } = this.props,
      e = a?.status ?? "in-progress",
      t = [],
      r = R.input,
      h = $R.of(T),
      {
        app: i
      } = h;
    if (r.path) {
      let l = ki(r.path, T);
      t.push(new H3({
        uri: `file://${r.path}`,
        text: l,
        style: new cT({
          color: i.fileReference,
          dim: !0,
          underline: !0
        })
      }));
    }
    let c = [];
    if (e === "done" && r.old_str && r.new_str) {
      let l = kx(r.old_str, r.new_str);
      if (l.added > 0 || l.deleted > 0 || l.changed > 0) {
        if (l.added > 0) c.push(new G(`+${l.added}`, new cT({
          color: i.diffAdded
        })));
        if (l.changed > 0) c.push(new G(` ~${l.changed}`, new cT({
          color: i.diffChanged
        })));
        if (l.deleted > 0) c.push(new G(` -${l.deleted}`, new cT({
          color: i.diffRemoved
        })));
      }
    }
    if (c.length > 0) t.push(new xT({
      text: new G("", void 0, c)
    }));
    let s;
    if (d50(a)) s = new fp({
      diff: a.result.diff,
      filePath: r.path
    });else if (E50(a)) s = new uR({
      padding: TR.only({
        left: 2
      }),
      child: new xT({
        text: new G(a.error.message, new cT({
          color: i.toolError
        })),
        selectable: !0
      })
    });
    let A = [];
    if (a?.status === "done" && typeof a.result === "object" && a.result.discoveredGuidanceFiles && a.result.discoveredGuidanceFiles.length > 0) {
      for (let l of a.result.discoveredGuidanceFiles) A.push(new G(`  Loaded ${ZA(l.uri)} (${l.lineCount} lines)
`, new cT({
        color: i.toolSuccess,
        dim: !0
      })));
      if (s) A.push(new G(`
`));
    }
    return new x3({
      name: "Edit",
      status: e,
      children: t,
      content: s,
      tail: A.length > 0 ? A : void 0
    });
  }
};
IW = class IW extends Ve {
  switchToThread;
  constructor({
    switchToThread: T,
    child: R
  }) {
    super({
      child: R
    });
    this.switchToThread = T;
  }
  updateShouldNotify(T) {
    return !1;
  }
  static of(T) {
    return T.dependOnInheritedWidgetOfExactType(IW)?.widget?.switchToThread;
  }
};
vb = class vb extends Ve {
  threadViewStates;
  threadTitles;
  threadSummaries;
  constructor({
    threadViewStates: T,
    threadTitles: R,
    threadSummaries: a,
    child: e
  }) {
    super({
      child: e
    });
    this.threadViewStates = T, this.threadTitles = R, this.threadSummaries = a;
  }
  updateShouldNotify(T) {
    return !KgT(T.threadViewStates, this.threadViewStates) || !KgT(T.threadTitles, this.threadTitles) || !C50(T.threadSummaries, this.threadSummaries);
  }
  static of(T) {
    return T.dependOnInheritedWidgetOfExactType(vb)?.widget?.threadViewStates;
  }
  static getThreadViewState(T, R) {
    return vb.of(T)?.[R];
  }
  static getThreadTitle(T, R) {
    let a = T.dependOnInheritedWidgetOfExactType(vb)?.widget;
    if (!a) return;
    let e = a.threadTitles[R];
    if (e) return e;
    return a.threadSummaries?.find(t => t.id === R)?.title;
  }
};
S9R = class S9R extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new O9R();
  }
};
O9R = class O9R extends wR {
  _isGreen = !0;
  _spinnerTimer;
  _blinkTimer;
  _titleTimeoutTimer;
  _titleTimedOut = !1;
  _spinner = new xa();
  initState() {
    this._restartTimers();
  }
  didUpdateWidget(T) {
    super.didUpdateWidget(T);
    let R = T.props.toolRun.status === "in-progress",
      a = this.widget.props.toolRun.status === "in-progress",
      e = this._isActivelyWorking(T.props),
      t = this._isActivelyWorking(this.widget.props);
    if (R !== a || e !== t) this._restartTimers();
  }
  dispose() {
    this._stopTimers(), super.dispose();
  }
  _isActivelyWorking(T) {
    return N7(T.threadViewState);
  }
  _restartTimers() {
    this._stopTimers();
    let T = this.widget.props.toolRun.status === "in-progress",
      R = this._isActivelyWorking(this.widget.props);
    if (T) this._spinnerTimer = setInterval(() => {
      this._spinner.step(), this.setState();
    }, 200);
    if (R) this._blinkTimer = setInterval(() => {
      this._isGreen = !this._isGreen, this.setState();
    }, 700);
    this._startTitleTimeout();
  }
  _startTitleTimeout() {
    if (this._titleTimeoutTimer || this._titleTimedOut) return;
    let {
      toolRun: T
    } = this.widget.props;
    if (T.status === "done" && "result" in T && T.result?.newThreadID) this._titleTimeoutTimer = setTimeout(() => {
      this._titleTimedOut = !0, this._stopTitleTimeout(), this.setState();
    }, 5000);
  }
  _stopTitleTimeout() {
    if (this._titleTimeoutTimer) clearTimeout(this._titleTimeoutTimer), this._titleTimeoutTimer = void 0;
  }
  _stopTimers() {
    if (this._spinnerTimer) clearInterval(this._spinnerTimer), this._spinnerTimer = void 0;
    if (this._blinkTimer) clearInterval(this._blinkTimer), this._blinkTimer = void 0;
    this._stopTitleTimeout();
  }
  build(T) {
    let {
        toolRun: R
      } = this.widget.props,
      a = R.status,
      e = Z0.of(T),
      t = $R.of(T),
      r = e.colorScheme,
      h = a === "done" && "result" in R ? R.result : void 0,
      i = a === "error" && "error" in R ? R.error : void 0,
      c = a === "done" && h?.newThreadID,
      s = a === "error",
      A = a === "in-progress",
      l = this._isActivelyWorking(this.widget.props),
      o = h?.newThreadID ? vb.getThreadTitle(T, h.newThreadID) : void 0,
      n = s ? r.destructive : r.border,
      p = h9.all(new e9(n, 1, "rounded")),
      _ = I9.of(T).size.width,
      m = 60,
      b = 0.7,
      y = Math.max(60, Math.floor(_ * 0.7)),
      u = [],
      P = c ? l ? this._isGreen ? t.app.toolSuccess : r.mutedForeground : r.mutedForeground : r.mutedForeground;
    u.push(new G("\u25CF ", new cT({
      color: P,
      bold: !0
    }))), u.push(new G("Handoff", new cT({
      color: t.app.toolName,
      bold: !0
    })));
    let k = o === "Untitled" ? void 0 : o,
      x = k !== void 0;
    if (x) this._stopTitleTimeout();else if (c) this._startTitleTimeout();
    if (x) u.push(new G(" " + k, new cT({
      color: r.mutedForeground
    })));else if (this._titleTimedOut) u.push(new G(" Untitled", new cT({
      color: r.mutedForeground,
      dim: !0
    })));else u.push(new G(" ...", new cT({
      color: r.mutedForeground,
      dim: !0
    })));
    let f = new xT({
        text: new G("", void 0, u)
      }),
      v;
    if (A) v = new xT({
      text: new G("\u21B3 " + this._spinner.toBraille(), new cT({
        color: r.mutedForeground
      }))
    });else if (c && h) {
      let I = IW.of(T),
        S = h.newThreadID,
        O = I ? () => {
          I(S);
        } : void 0,
        j = new xT({
          text: new G(S, new cT({
            color: r.accent,
            underline: !!O
          }))
        });
      v = new T0({
        mainAxisSize: "min",
        children: [new xT({
          text: new G("\u21B3 ", new cT({
            color: r.mutedForeground
          }))
        }), O ? new G0({
          onClick: () => O(),
          cursor: "pointer",
          child: j
        }) : j]
      });
    } else if (s && i) v = new xT({
      text: new G(i.message || "Failed to create handoff thread", new cT({
        color: r.destructive
      })),
      maxLines: 1
    });
    let g = [f];
    if (v) g.push(v);
    return new SR({
      decoration: new p8(r.background, p),
      padding: TR.symmetric(1, 0),
      width: y,
      child: new xR({
        crossAxisAlignment: "start",
        children: g
      })
    });
  }
};
d9R = class d9R extends Dn {
  constructor({
    key: T,
    header: R,
    body: a
  }) {
    super({
      key: T,
      children: [R, a]
    });
  }
  createRenderObject() {
    return new E9R();
  }
  updateRenderObject(T) {}
};
L9R = class L9R extends wR {
  _thinkingBlockStates = new Map();
  _listenerUnsubscribe;
  initState() {
    this._listenerUnsubscribe = Ut.instance.addListener(() => {
      this.setState(() => {
        this._thinkingBlockStates.clear();
      });
    });
  }
  dispose() {
    this._listenerUnsubscribe?.();
  }
  getThinkingBlockExpanded(T) {
    return this._thinkingBlockStates.get(T) ?? Ut.instance.allExpanded;
  }
  toggleThinking = T => {
    return R => {
      this.setState(() => {
        this._thinkingBlockStates.set(T, R);
      });
    };
  };
  build(T) {
    let {
        toolRun: R,
        name: a,
        detail: e,
        inputSection: t,
        outputSection: r,
        subagentContent: h,
        hideHeader: i
      } = this.widget,
      c = [];
    if (e && e.length > 0) c.push(new xT({
      text: new G("", void 0, e)
    }));
    let s = i ? null : new x3({
        name: a,
        status: R.status,
        children: c
      }),
      A = [];
    if (t) A.push(new Z3({
      markdown: t.content
    }));
    let l = R,
      o = (R.status === "in-progress" || R.status === "done" || R.status === "cancelled" || R.status === "error") && l.progress,
      n = h !== void 0 && C9R(h);
    if (n) A.push(...gB(h ?? {
      tools: []
    }));else if (o) {
      let p = l.progress ?? [],
        _ = h?.tools ?? [],
        m = r?.content,
        b = 0,
        y = 0,
        u = 0;
      for (let P = 0; P < p.length; P++) {
        let k = p[P];
        if (k?.message?.trim().length && !B50(k.message, m)) A.push(new Z3({
          markdown: k.message
        }));
        if (k?.reasoning) {
          let x = P === p.length - 1,
            f = R.status === "in-progress" && x,
            v = new Rd({
              key: new k3(`thinking-${u}`),
              thinkingBlock: {
                type: "thinking",
                thinking: k.reasoning,
                signature: ""
              },
              expanded: this.getThinkingBlockExpanded(u),
              onToggle: this.toggleThinking(u),
              isStreaming: f
            });
          A.push(v), u++;
        }
        if (k?.tool_uses) for (let x of k.tool_uses) {
          let f = _[b];
          if (f) {
            A.push(new Bs({
              toolUse: f.toolUse,
              toolRun: f.toolRun,
              toolProgress: f.toolProgress
            })), b++;
            continue;
          }
          let v = D50(x, this.widget.toolUse.id, y++),
            g = x.normalized_name ?? x.tool_name,
            I = M50(x.input);
          A.push(new Bs({
            toolUse: iN(g, I, v),
            toolRun: w50(x)
          }));
        }
      }
      for (; b < _.length; b++) {
        let P = _[b];
        if (P) A.push(new Bs({
          toolUse: P.toolUse,
          toolRun: P.toolRun,
          toolProgress: P.toolProgress
        }));
      }
    } else if (h && (h.tools.length > 0 || h.terminalAssistantMessage !== void 0)) A.push(...gB(h));
    if (r && !n) A.push(new Z3({
      markdown: r.content
    }));
    if (i) {
      if (A.length === 0) return XT.shrink();
      return new uR({
        padding: new TR(2, 0, 2, 0),
        child: new Jb({
          children: A
        })
      });
    }
    if (A.length === 0) {
      if (!s) return XT.shrink();
      return s;
    }
    if (!s) return XT.shrink();
    return new d9R({
      header: s,
      body: new uR({
        padding: new TR(2, 0, 2, 0),
        child: new Jb({
          children: A
        })
      })
    });
  }
};
M9R = class M9R extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    let {
        toolUse: R,
        toolRun: a,
        subagentContent: e,
        hideHeader: t
      } = this.props,
      r = a.status === "done" ? a.result : a.status === "in-progress" ? a.result : void 0;
    return new qv({
      toolUse: R,
      toolRun: a,
      name: "Oracle",
      inputSection: typeof R.input.task === "string" ? {
        content: R.input.task
      } : void 0,
      outputSection: r ? {
        content: r
      } : void 0,
      subagentContent: e,
      hideHeader: t
    });
  }
};
D9R = class D9R extends wR {
  _thinkingBlockStates = new Map();
  _listenerUnsubscribe;
  initState() {
    this._listenerUnsubscribe = Ut.instance.addListener(() => {
      this.setState(() => {
        this._thinkingBlockStates.clear();
      });
    });
  }
  dispose() {
    this._listenerUnsubscribe?.();
  }
  getThinkingBlockExpanded(T) {
    return this._thinkingBlockStates.get(T) ?? Ut.instance.allExpanded;
  }
  toggleThinking = T => {
    return R => {
      this.setState(() => {
        this._thinkingBlockStates.set(T, R);
      });
    };
  };
  build(T) {
    let {
        toolRun: R,
        name: a,
        inputPrompt: e,
        outputResult: t,
        hideHeader: r,
        subagentContent: h
      } = this.widget,
      i = h?.tools ?? [],
      c = r ? null : new x3({
        name: a,
        status: R.status,
        children: []
      }),
      s = [];
    if (e) s.push(new Z3({
      markdown: e
    }));
    let A = R,
      l = (R.status === "in-progress" || R.status === "done" || R.status === "cancelled" || R.status === "error") && A.progress,
      o = h !== void 0 && C9R(h);
    if (o) s.push(...gB(h ?? {
      tools: []
    }));else if (l) {
      let p = A.progress ?? [],
        _ = t,
        m = 0,
        b = 0,
        y = 0;
      for (let u = 0; u < p.length; u++) {
        let P = p[u];
        if (P?.message?.trim().length && !H50(P.message, _)) s.push(new Z3({
          markdown: P.message
        }));
        if (P?.reasoning) {
          let x = u === p.length - 1,
            f = R.status === "in-progress" && x,
            v = new Rd({
              key: new k3(`thinking-${m}`),
              thinkingBlock: {
                type: "thinking",
                thinking: P.reasoning,
                signature: ""
              },
              expanded: this.getThinkingBlockExpanded(m),
              onToggle: this.toggleThinking(m),
              isStreaming: f
            });
          s.push(v), m++;
        }
        let k = P?.tool_uses ?? [];
        if (Array.isArray(k) && k.length > 0) for (let x of k) {
          let f = i[y];
          if (f) {
            s.push(new Bs({
              toolUse: f.toolUse,
              toolRun: f.toolRun,
              toolProgress: f.toolProgress
            })), y++;
            continue;
          }
          let v = U50(x, this.widget.toolUse.id, b++),
            g = x.normalized_name ?? x.tool_name,
            I = N50(x.input),
            S = iN(g, I, v),
            O = W50(x);
          s.push(new Bs({
            toolUse: S,
            toolRun: O
          }));
        }
      }
      for (; y < i.length; y++) {
        let u = i[y];
        if (u) s.push(new Bs({
          toolUse: u.toolUse,
          toolRun: u.toolRun,
          toolProgress: u.toolProgress
        }));
      }
    } else if (h && (h.tools.length > 0 || h.terminalAssistantMessage !== void 0)) s.push(...gB(h));
    if (t && !o) s.push(new Z3({
      markdown: t
    }));
    let n = new uR({
      padding: new TR(2, 0, 2, 0),
      child: new Jb({
        children: s
      })
    });
    if (c) return new xR({
      crossAxisAlignment: "start",
      children: [c, n]
    });
    return n;
  }
};
ohT = class ohT extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    let {
        toolUse: R,
        toolRun: a,
        subagentContent: e,
        hideHeader: t
      } = this.props,
      r = a.status === "done" ? a.result : a.status === "in-progress" ? a.result : void 0;
    return new shT({
      toolUse: R,
      toolRun: a,
      subagentContent: e,
      name: "Subagent",
      inputPrompt: typeof R.input.description === "string" ? R.input.description : void 0,
      outputResult: r,
      hideHeader: t
    });
  }
};
B9R = class B9R extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    let {
        toolUse: R,
        toolRun: a
      } = this.props,
      e = $R.of(T),
      t = [];
    if (R.input.path) {
      let h = R.input.path,
        i = ki(h, T);
      if (t.push(new H3({
        uri: JM(h, T),
        text: i,
        style: new cT({
          color: e.app.fileReference,
          dim: !0,
          underline: !0
        })
      })), R.input.read_range) {
        let [c, s] = R.input.read_range;
        if (typeof c === "number" && typeof s === "number" && c >= 0 && s >= 0) t.push(new xT({
          text: new G(` @${c}-${s}`, new cT({
            color: e.colors.warning,
            dim: !0
          })),
          selectable: !0
        }));
      }
    }
    let r = [];
    if (a.status === "done" && typeof a.result === "object" && a.result.discoveredGuidanceFiles && a.result.discoveredGuidanceFiles.length > 0) for (let h of a.result.discoveredGuidanceFiles) r.push(new G(`  Loaded ${ZA(h.uri)} (${h.lineCount} lines)
`, new cT({
      color: e.app.toolSuccess,
      dim: !0
    })));
    return new x3({
      name: "Read",
      status: a.status,
      children: t,
      tail: r.length > 0 ? r : void 0
    });
  }
};
N9R = class N9R extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    let {
        toolUse: R,
        toolRun: a
      } = this.props,
      e = $R.of(T),
      t = [],
      r = [];
    if (R.input.path) {
      let s = R.input.path,
        A = ki(s, T);
      t.push(new H3({
        uri: JM(s, T),
        text: A,
        style: new cT({
          color: e.app.fileReference,
          dim: !0,
          underline: !0
        })
      }));
    }
    if (R.input.objective) r.push(new G(R.input.objective, new cT({
      dim: !0
    })));
    let h,
      i = R.input.referenceFiles,
      c = i?.[0];
    if (i?.length === 1 && c) {
      let s = ki(c, T);
      h = new T0({
        children: [new xT({
          text: new G("comparing to: ", new cT({
            dim: !0
          }))
        }), new H3({
          uri: JM(c, T),
          text: s,
          style: new cT({
            color: e.app.fileReference,
            dim: !0,
            underline: !0
          })
        })]
      });
    } else if (i && i.length > 1) {
      let s = i.map(A => {
        let l = ki(A, T);
        return new T0({
          children: [new xT({
            text: new G("  - ", new cT({
              dim: !0
            }))
          }), new H3({
            uri: JM(A, T),
            text: l,
            style: new cT({
              color: e.app.fileReference,
              dim: !0,
              underline: !0
            })
          })]
        });
      });
      h = new xR({
        mainAxisSize: "min",
        crossAxisAlignment: "start",
        children: [new xT({
          text: new G("comparing to:", new cT({
            dim: !0
          }))
        }), ...s]
      });
    }
    return new x3({
      name: "Look At",
      status: a.status,
      children: t,
      tail: r,
      content: h
    });
  }
};
U9R = class U9R extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new H9R();
  }
};
H9R = class H9R extends wR {
  imageStates = new Map();
  getCapabilities() {
    try {
      return d9.instance.tuiInstance.getCapabilities();
    } catch {
      return null;
    }
  }
  supportsKittyGraphics() {
    return this.getCapabilities()?.kittyGraphics ?? !1;
  }
  getImageState(T) {
    if (!this.imageStates.has(T)) this.imageStates.set(T, {
      expanded: !0,
      downloadStatus: null
    });
    return this.imageStates.get(T);
  }
  toggleExpanded(T) {
    let R = this.getImageState(T);
    this.setState(() => {
      R.expanded = !R.expanded;
    });
  }
  async downloadImage(T, R) {
    let a = this.getImageState(R),
      e = await qQT(T);
    this.setState(() => {
      if (e.success) a.downloadStatus = `Saved to ${e.destPath}`;else a.downloadStatus = `Error: ${e.error}`;
    }), setTimeout(() => {
      this.setState(() => {
        a.downloadStatus = null;
      });
    }, 2000);
  }
  createImageBlock(T) {
    let R = T.savedPath.startsWith("file://") ? T.savedPath.slice(7) : T.savedPath;
    return {
      type: "image",
      source: {
        type: "base64",
        mediaType: Qd0(R) || "image/png",
        data: T.data
      },
      sourcePath: R
    };
  }
  build(T) {
    let {
        toolUse: R,
        toolRun: a
      } = this.widget.props,
      e = $R.of(T),
      t = e.colors,
      r = [],
      h = [],
      i,
      c = R.input.prompt;
    if (c) {
      let s = c.length > 80 ? c.slice(0, 77) + "..." : c;
      r.push(new xT({
        text: new G(s, new cT({
          color: t.foreground,
          dim: !0
        })),
        selectable: !0
      }));
    }
    if (a.status === "error" && a.error?.message) h.push(new G(`
`)), h.push(new G(`  Error: ${a.error.message}`, new cT({
      color: e.app.toolError
    })));else if (a.status === "done" && "result" in a) {
      let s = a.result;
      if (s && Array.isArray(s) && s.length > 0) {
        let A = this.supportsKittyGraphics(),
          l = [];
        if (s.forEach((o, n) => {
          let p = o?.savedPath;
          if (!p) return;
          let _ = p.startsWith("file://") ? p.slice(7) : p,
            m = this.getImageState(n),
            b = [new G0({
              onClick: () => this.toggleExpanded(n),
              cursor: "pointer",
              child: new xT({
                text: new G(m.expanded ? "\u25BC " : "\u25B6 ", new cT({
                  color: e.app.link
                }))
              })
            }), new G0({
              onClick: () => this.toggleExpanded(n),
              cursor: "pointer",
              child: new xT({
                text: new G(s.length === 1 ? "Generated Image" : `Image ${n + 1}`, new cT({
                  color: t.foreground
                }))
              })
            })];
          if (m.downloadStatus) b.push(new xT({
            text: new G(`  ${m.downloadStatus}`, new cT({
              color: m.downloadStatus.startsWith("Error") ? e.app.toolError : e.app.toolSuccess
            }))
          }));
          let y = new T0({
              mainAxisSize: "min",
              children: b
            }),
            u = this.createImageBlock(o),
            P = bW.of(T),
            k = x => {
              if (!P) {
                this.downloadImage(_, n);
                return;
              }
              if (x.button === "right") P.onShowSaveDialog(u, _);else P.onShowImagePreview(u, _);
            };
          if (m.expanded && A) l.push(new xR({
            crossAxisAlignment: "start",
            mainAxisSize: "min",
            children: [y, new XT({
              height: 1
            }), new G0({
              onClick: k,
              cursor: "pointer",
              child: new FH({
                image: u,
                width: 60,
                height: 15,
                backgroundColor: t.background
              })
            })]
          }));else if (m.expanded && !A) l.push(new xR({
            crossAxisAlignment: "start",
            mainAxisSize: "min",
            children: [y, new G0({
              onClick: k,
              cursor: "pointer",
              child: new xT({
                text: new G("  [Click to preview, right-click to save - terminal does not support inline images]", new cT({
                  color: t.mutedForeground,
                  dim: !0
                }))
              })
            })]
          }));else l.push(y);
          if (n < s.length - 1) l.push(new XT({
            height: 1
          }));
        }), l.length > 0) i = new xR({
          crossAxisAlignment: "start",
          mainAxisSize: "min",
          children: l
        });
      }
    }
    return new x3({
      name: "Painter",
      status: a.status,
      children: r,
      tail: h.length > 0 ? h : void 0,
      content: i
    });
  }
};
W9R = class W9R extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    let {
        toolUse: R,
        toolRun: a
      } = this.props,
      e = $R.of(T),
      t = e.colors,
      r = new cT({
        color: t.foreground,
        dim: !0
      }),
      h = a.status === "done" && Array.isArray(a.result) && a.result.length > 0 && a.result[0] === UzT,
      i = [];
    if (R.input.pattern) i.push(new G(R.input.pattern, new cT({
      color: e.app.command
    })));
    if (R.input.path) {
      let A = ki(R.input.path, T);
      if (A.length > 0) i.push(new G(` in ${A}`, r));
    }
    let c = [];
    if (i.length > 0) c.push(new xT({
      text: new G("", void 0, i),
      selectable: !0
    }));
    let s = [];
    if (h) s.push(new G("  No results", r));
    return new x3({
      name: "Grep",
      status: a.status,
      children: c,
      tail: s.length > 0 ? s : void 0
    });
  }
};
q9R = class q9R extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    let {
        toolUse: R,
        toolRun: a,
        detail: e,
        name: t
      } = this.props,
      r = $R.of(T),
      h = r.colors,
      i = new cT({
        color: h.foreground,
        dim: !0
      }),
      c = [];
    if (e) {
      let A = R.name === Wt || R.name === rN || R.name === v0T || R.name === y8 || R.name === AlR || R.name === YS,
        l;
      if (A) try {
        let o = rf(T),
          n = zR.file(e);
        l = Mr(n, o ?? void 0);
      } catch {
        l = e;
      } else l = e;
      c.push(new xT({
        text: new G(l, i),
        selectable: !0
      }));
    }
    let s = [];
    if (a.status === "error" && a.error?.message) s.push(new G(`
`)), s.push(new G(`  Error: ${a.error.message}`, new cT({
      color: r.app.toolError
    })));
    return new x3({
      name: t || nhT(R),
      status: a.status,
      children: c,
      tail: s.length > 0 ? s : void 0
    });
  }
};
z9R = class z9R extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new K9R();
  }
};
F9R = class F9R extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new G9R();
  }
};
G9R = class G9R extends wR {
  _animationTimer;
  _spinner = new xa();
  initState() {
    if (super.initState(), this.widget.props.toolRun.status === "in-progress") this._startAnimation();
  }
  didUpdateWidget(T) {
    if (super.didUpdateWidget(T), T.props.toolRun.status !== "in-progress" && this.widget.props.toolRun.status === "in-progress") this._startAnimation();else if (T.props.toolRun.status === "in-progress" && this.widget.props.toolRun.status !== "in-progress") this._stopAnimation();
  }
  dispose() {
    this._stopAnimation(), super.dispose();
  }
  _startAnimation() {
    this._animationTimer = setInterval(() => {
      this.setState(() => {
        this._spinner.step();
      });
    }, 200);
  }
  _stopAnimation() {
    if (this._animationTimer) clearInterval(this._animationTimer), this._animationTimer = void 0;
  }
  build(T) {
    let {
        toolUse: R,
        toolRun: a,
        toolProgress: e
      } = this.widget.props,
      t = $R.of(T),
      r = t.colors,
      h = R.input,
      i = h.command ?? "",
      c = a.status,
      s = qr(a.status, $R.of(T)),
      A = c === "done" && typeof a.result.exitCode === "number" && a.result.exitCode !== 0,
      l = new cT({
        color: r.foreground,
        bold: !0
      }),
      o = c === "cancelled" ? l.copyWith({
        strikethrough: !0
      }) : c === "rejected-by-user" ? l.copyWith({
        dim: !0
      }) : l,
      n = i.split(`
`),
      p = n[0] || "",
      _ = n.slice(1),
      m = [];
    if (c === "in-progress") {
      let b = this._spinner.toBraille();
      m.push(new G(`${b} `, new cT({
        color: s
      })));
    } else {
      let b = new cT({
        color: A ? t.app.toolError : s,
        bold: !0
      });
      m.push(new G("$ ", b));
    }
    if (m.push(new G(p, o)), c !== "rejected-by-user") {
      let b = Q9R(h, a, T);
      if (b.length > 0) m.push(new G("", void 0, b));
    }
    if (c === "rejected-by-user") m.push(new G(" (rejected)", new cT({
      dim: !0,
      italic: !0
    })));else if (c === "cancelled") m.push(new G(" (cancelled)", new cT({
      color: t.app.toolCancelled,
      italic: !0
    })));
    m.push(new G(`
`));
    for (let b of _) m.push(new G(`  ${b}
`, o));
    if (c === "error" && a.error.message) m.push(new G(`  Error: ${a.error.message}
`, new cT({
      color: t.app.toolError
    })));else if (c === "done") m.push(...on(a.result.output, !0, r));else if (c === "cancelled") m.push(...on(rx(e), !0, r));else if (c === "in-progress") m.push(...on(rx(e), !1, r));
    return m.push(...Y9R(a, t)), new xT({
      text: new G("", void 0, m),
      selectable: !0
    });
  }
};
K9R = class K9R extends wR {
  _animationTimer;
  _spinner = new xa();
  initState() {
    if (super.initState(), this.widget.props.toolRun.status === "in-progress") this._startAnimation();
  }
  didUpdateWidget(T) {
    if (super.didUpdateWidget(T), T.props.toolRun.status !== "in-progress" && this.widget.props.toolRun.status === "in-progress") this._startAnimation();else if (T.props.toolRun.status === "in-progress" && this.widget.props.toolRun.status !== "in-progress") this._stopAnimation();
  }
  dispose() {
    this._stopAnimation(), super.dispose();
  }
  _startAnimation() {
    this._animationTimer = setInterval(() => {
      this.setState(() => {
        this._spinner.step();
      });
    }, 200);
  }
  _stopAnimation() {
    if (this._animationTimer) clearInterval(this._animationTimer), this._animationTimer = void 0;
  }
  build(T) {
    let {
        toolUse: R,
        toolRun: a,
        toolProgress: e
      } = this.widget.props,
      t = $R.of(T),
      r = t.colors,
      h = R.input,
      i = h.cmd || h.command || "",
      c = a.status,
      s = qr(a.status, $R.of(T)),
      A = c === "done" && typeof a.result.exitCode === "number" && a.result.exitCode !== 0,
      l = new cT({
        color: r.foreground,
        bold: !0
      }),
      o = c === "cancelled" ? l.copyWith({
        strikethrough: !0
      }) : c === "rejected-by-user" ? l.copyWith({
        dim: !0
      }) : l,
      n = i.split(`
`),
      p = n[0] || "",
      _ = n.slice(1),
      m = [];
    if (c === "in-progress") {
      let b = this._spinner.toBraille();
      m.push(new G(`${b} `, new cT({
        color: s
      })));
    } else {
      let b = new cT({
        color: A ? t.app.toolError : s,
        bold: !0
      });
      m.push(new G("$ ", b));
    }
    if (m.push(new G(p, o)), c !== "rejected-by-user") {
      let b = Q9R(h, a, T);
      if (b.length > 0) m.push(new G("", void 0, b));
    }
    if (c === "rejected-by-user") m.push(new G(" (rejected)", new cT({
      dim: !0,
      italic: !0
    })));else if (c === "cancelled") m.push(new G(" (cancelled)", new cT({
      color: t.app.toolCancelled,
      italic: !0
    })));
    m.push(new G(`
`));
    for (let b of _) m.push(new G(`  ${b}
`, o));
    if (c === "error" && a.error.message) m.push(new G(`  Error: ${a.error.message}
`, new cT({
      color: t.app.toolError
    })));else if (c === "done") m.push(...on(a.result.output, !0, r));else if (c === "cancelled") m.push(...on(rx(e), !0, r));else if (c === "in-progress") m.push(...on(rx(e), !1, r));
    return m.push(...Y9R(a, t)), new xT({
      text: new G("", void 0, m),
      selectable: !0
    });
  }
};
V9R = class V9R extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new X9R();
  }
};
X9R = class X9R extends wR {
  _animationTimer;
  _spinner = new xa();
  initState() {
    if (super.initState(), this.widget.props.toolRun.status === "in-progress") this._startAnimation();
  }
  didUpdateWidget(T) {
    if (super.didUpdateWidget(T), T.props.toolRun.status !== "in-progress" && this.widget.props.toolRun.status === "in-progress") this._startAnimation();else if (T.props.toolRun.status === "in-progress" && this.widget.props.toolRun.status !== "in-progress") this._stopAnimation();
  }
  dispose() {
    this._stopAnimation(), super.dispose();
  }
  _startAnimation() {
    this._animationTimer = setInterval(() => {
      this.setState(() => {
        this._spinner.step();
      });
    }, 200);
  }
  _stopAnimation() {
    if (this._animationTimer) clearInterval(this._animationTimer), this._animationTimer = void 0;
  }
  build(T) {
    let {
        toolUse: R,
        toolRun: a
      } = this.widget.props,
      e = $R.of(T),
      t = e.colors,
      r = R.input,
      h = a.status,
      i = qr(a.status, $R.of(T)),
      c = [];
    if (h === "in-progress") {
      let l = this._spinner.toBraille();
      c.push(new G(`${l} `, new cT({
        color: i
      })));
    } else {
      let l = new cT({
        color: i,
        bold: !0
      });
      c.push(new G("> ", l));
    }
    let s = r.args?.length ? `${r.binary ?? ""} ${r.args.join(" ")}`.trim() : r.binary ?? "";
    c.push(new G(s ? `REPL ${s}` : "REPL", new cT({
      color: t.foreground,
      bold: !0
    })));
    let A = new cT({
      color: t.foreground,
      dim: !0
    });
    if (r.objective) c.push(new G(` "${r.objective}"`, A));
    if (h === "rejected-by-user") c.push(new G(" (rejected)", new cT({
      dim: !0,
      italic: !0
    })));else if (h === "cancelled") c.push(new G(" (cancelled)", new cT({
      color: e.app.toolCancelled,
      italic: !0
    })));
    if (c.push(new G(`
`)), h === "in-progress" && a.progress) {
      let l = a.progress;
      if (l.transcript && l.transcript.length > 0) {
        for (let o of l.transcript) if (o.type === "input") {
          if (o.content) c.push(new G("  > ", new cT({
            color: e.app.command
          }))), c.push(new G(`${o.content}
`, A));
        } else c.push(...h2(o.content, t));
      } else {
        if (l.input) c.push(new G("  > ", new cT({
          color: e.app.command
        }))), c.push(new G(`${l.input}
`, A));
        if (l.output) c.push(...h2(l.output, t));
      }
    } else if (h === "error" && a.error.message) c.push(new G(`  Error: ${a.error.message}
`, new cT({
      color: e.app.toolError
    })));else if (h === "done") c.push(...h2(a.result, t));
    return new xT({
      text: new G("", void 0, c),
      selectable: !0
    });
  }
};
Z9R = class Z9R extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new J9R();
  }
};
J9R = class J9R extends wR {
  _animationTimer;
  _spinner = new xa();
  initState() {
    if (super.initState(), this.widget.props.toolRun.status === "in-progress") this._startAnimation();
  }
  didUpdateWidget(T) {
    if (super.didUpdateWidget(T), T.props.toolRun.status !== "in-progress" && this.widget.props.toolRun.status === "in-progress") this._startAnimation();else if (T.props.toolRun.status === "in-progress" && this.widget.props.toolRun.status !== "in-progress") this._stopAnimation();
  }
  dispose() {
    this._stopAnimation(), super.dispose();
  }
  _startAnimation() {
    this._animationTimer = setInterval(() => {
      this.setState(() => {
        this._spinner.step();
      });
    }, 200);
  }
  _stopAnimation() {
    if (this._animationTimer) clearInterval(this._animationTimer), this._animationTimer = void 0;
  }
  build(T) {
    let {
        toolUse: R,
        toolRun: a,
        toolProgress: e
      } = this.widget.props,
      t = $R.of(T),
      r = t.colors,
      h = R.input,
      i = a.status,
      c = qr(a.status, $R.of(T)),
      s = i === "done" && typeof a.result.exitCode === "number" && a.result.exitCode !== 0,
      A = R.name.replace(/^tb__/, ""),
      l = new cT({
        color: r.foreground,
        bold: !0
      }),
      o = "";
    if (Object.keys(h).length > 0) o = Object.entries(h).map(([p, _]) => `${p}: ${JSON.stringify(_)}`).join(", ");
    let n = [];
    if (i === "in-progress") {
      let p = this._spinner.toBraille();
      n.push(new G(`${p} `, new cT({
        color: c
      })));
    } else {
      let p = new cT({
        color: s ? t.app.toolError : c,
        bold: !0
      });
      n.push(new G("\u2022 ", p));
    }
    if (n.push(new G(A, l)), o) {
      let p = new cT({
        color: r.foreground,
        dim: !0
      });
      n.push(new G(" ", void 0)), n.push(new G(o, p));
    }
    if (s) {
      let p = new cT({
        italic: !0
      });
      n.push(new G(" (", p)), n.push(new G("exit code: ", p)), n.push(new G(String(a.result.exitCode), p.copyWith({
        color: t.app.toolError
      }))), n.push(new G(")", p));
    }
    if (i === "rejected-by-user") n.push(new G(" (rejected)", new cT({
      dim: !0,
      italic: !0
    })));else if (i === "cancelled") n.push(new G(" (cancelled)", new cT({
      color: t.app.toolCancelled,
      italic: !0
    })));
    if (n.push(new G(`
`)), i === "error" && a.error.message) n.push(new G(`  Error: ${a.error.message}
`, new cT({
      color: t.app.toolError
    })));else if (i === "done") n.push(...on(a.result.output, !0, r));else if (i === "cancelled") n.push(...on(rx(e), !0, r));else if (i === "in-progress") n.push(...on(rx(e), !1, r));
    return new xT({
      text: new G("", void 0, n),
      selectable: !0
    });
  }
};
T8R = class T8R extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    let {
        toolUse: R,
        toolRun: a
      } = this.props,
      e = $R.of(T),
      t = e.colors,
      r = new cT({
        color: t.foreground,
        dim: !0
      }),
      h = R.input,
      i = h.repository,
      c = h.path,
      s = h.read_range,
      A = [];
    if (c && i) {
      let l = c.startsWith("/") ? c.slice(1) : c,
        o = i.startsWith("http") ? `${i}/blob/main/${l}` : `https://github.com/${i}/blob/main/${l}`,
        n = i.replace(/^https?:\/\/github\.com\//, "");
      if (A.push(new H3({
        uri: o,
        text: `${n}/${l}`,
        style: new cT({
          color: e.app.fileReference,
          dim: !0,
          underline: !0
        })
      })), s && Array.isArray(s)) A.push(new xT({
        text: new G(` @${s[0]}-${s[1]}`, r),
        selectable: !0
      }));
    }
    return new x3({
      name: "Read",
      status: a.status,
      children: A
    });
  }
};
TD = class TD extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    let {
        toolUse: R,
        toolRun: a,
        name: e,
        patternField: t
      } = this.props,
      r = $R.of(T),
      h = r.colors,
      i = new cT({
        color: h.foreground,
        dim: !0
      }),
      c = R.input,
      s = c[t],
      A = c.repository,
      l = c.path,
      o = [];
    if (s) o.push(new G(s, new cT({
      color: r.app.command
    })));
    if (A) {
      let p = A.replace(/^https?:\/\/github\.com\//, "");
      if (o.push(new G(` in ${p}`, i)), l) {
        let _ = l.startsWith("/") ? l.slice(1) : l;
        o.push(new G(`/${_}`, i));
      }
    }
    let n = [];
    if (o.length > 0) n.push(new xT({
      text: new G("", void 0, o),
      selectable: !0
    }));
    return new x3({
      name: e,
      status: a.status,
      children: n
    });
  }
};
R8R = class R8R extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    let {
        toolUse: R,
        toolRun: a
      } = this.props,
      e = $R.of(T),
      t = e.colors,
      r = new cT({
        color: t.foreground,
        dim: !0
      }),
      h = R.input,
      i = h.repository,
      c = h.path || "/",
      s = [];
    if (c) s.push(new G(c, new cT({
      color: e.app.command
    })));
    if (i) s.push(new G(` in ${i}`, r));
    let A = [];
    if (s.length > 0) A.push(new xT({
      text: new G("", void 0, s),
      selectable: !0
    }));
    return new x3({
      name: "List",
      status: a.status,
      children: A
    });
  }
};
a8R = class a8R extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    let {
        toolUse: R,
        toolRun: a
      } = this.props,
      e = $R.of(T),
      t = R.input,
      r = t.pattern,
      h = t.organization,
      i = t.language,
      c = [],
      s = [];
    if (r) s.push(r);
    if (h) s.push(`org:${h}`);
    if (i) s.push(`language:${i}`);
    if (s.length > 0) c.push(new G(s.join(" "), new cT({
      color: e.app.command
    })));
    let A = [];
    if (c.length > 0) A.push(new xT({
      text: new G("", void 0, c),
      selectable: !0
    }));
    return new x3({
      name: "List Repositories",
      status: a.status,
      children: A
    });
  }
};
e8R = class e8R extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    let {
        toolUse: R,
        toolRun: a
      } = this.props,
      e = $R.of(T),
      t = e.colors,
      r = new cT({
        color: t.foreground,
        dim: !0
      }),
      h = R.input,
      i = [];
    if (h.base && h.head) {
      let s = EgT(h.base),
        A = EgT(h.head);
      i.push(new G(`${s}...${A}`, new cT({
        color: e.app.command
      })));
    }
    if (h.repository) {
      let s = h.repository.replace(/^https?:\/\/github\.com\//, "");
      i.push(new G(` in ${s}`, r));
    }
    let c = [];
    if (i.length > 0) c.push(new xT({
      text: new G("", void 0, i),
      selectable: !0
    }));
    return new x3({
      name: "Diff",
      status: a.status,
      children: c
    });
  }
};
t8R = class t8R extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    let {
        toolUse: R,
        toolRun: a
      } = this.props,
      e = $R.of(T).colors,
      t = new cT({
        color: e.foreground,
        dim: !0
      }),
      r = [],
      h = R.input,
      i = "Web search";
    if (h.objective) i = h.objective;else if (h.search_queries && Array.isArray(h.search_queries)) i = h.search_queries.join(", ");else if ("query" in h && h.query && typeof h.query === "string") i = h.query;
    if (r.push(new xT({
      text: new G(i, t),
      selectable: !0
    })), P9R(a)) r.push(new xT({
      text: new G(" \u2022  Powered by Parallel", new cT({
        dim: !0
      })),
      selectable: !1
    }));
    return new x3({
      name: "Web Search",
      status: a.status,
      children: r
    });
  }
};
r8R = class r8R extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new h8R();
  }
};
i8R = class i8R extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    let {
        toolUse: R,
        toolRun: a
      } = this.props,
      e = $R.of(T),
      t = e.colors,
      r = new cT({
        color: t.foreground,
        dim: !0
      }),
      h = R.input,
      i = a.status === "queued" || a.status === "blocked-on-user" ? "in-progress" : a.status,
      c = h.query || "Searching threads...",
      s = [new G(c, r)];
    if (a.status === "done") {
      let o = a.result.threads.length,
        n = a.result.hasMore,
        p;
      if (o === 0) p = "No threads found";else if (o === 1) p = "1 thread";else p = `${o}${n ? "+" : ""} threads`;
      s.push(new G(` (${p})`, new cT({
        color: t.foreground,
        dim: !0
      })));
    }
    let A = new x3({
        name: "Find Thread",
        status: i,
        children: [new xT({
          text: new G("", void 0, s),
          selectable: !0
        })]
      }),
      l = [];
    if (a.status === "done" && a.result.threads.length > 0) {
      for (let o of a.result.threads) {
        let n = o.title || "Untitled thread",
          p = o.updatedAt ? new xT({
            text: new G(` (${OO(new Date(o.updatedAt))} ago)`, new cT({
              color: t.foreground,
              dim: !0
            })),
            selectable: !0
          }) : null;
        l.push(new T0({
          children: [new H3({
            uri: `https://ampcode.com/threads/${o.id}`,
            text: n,
            style: new cT({
              color: e.app.link,
              underline: !0
            })
          }), ...(p ? [p] : [])]
        }));
      }
      if (a.result.hasMore) l.push(new xT({
        text: new G("More threads available...", new cT({
          color: t.foreground,
          dim: !0,
          italic: !0
        })),
        selectable: !1
      }));
    }
    return new xR({
      crossAxisAlignment: "start",
      children: l.length > 0 ? [A, new uR({
        padding: new TR(2, 0, 2, 0),
        child: new Jb({
          children: l
        })
      })] : [A]
    });
  }
};
c8R = class c8R extends NR {
  toolUse;
  toolRun;
  constructor({
    toolUse: T,
    toolRun: R
  }) {
    super();
    this.toolUse = T, this.toolRun = R;
  }
  createState() {
    return new s8R();
  }
};
s8R = class s8R extends wR {
  _showSourceQuery = !1;
  _chartData;
  _error;
  _parseChartData() {
    let {
      toolUse: T,
      toolRun: R
    } = this.widget;
    if (this._chartData = void 0, this._error = void 0, R.status !== "done") return;
    try {
      let a = R.result,
        e = (typeof a.data === "string" ? a.data : void 0) ?? (typeof T.input.data === "string" ? T.input.data : void 0);
      if (e) {
        let t;
        try {
          JSON.parse(e), t = e;
        } catch {
          t = e.replace(/\n/g, "");
        }
        this._chartData = v50({
          data: t,
          chartType: typeof T.input.chartType === "string" ? T.input.chartType : "bar",
          xColumn: typeof T.input.xColumn === "string" ? T.input.xColumn : "",
          yColumns: Array.isArray(T.input.yColumns) ? T.input.yColumns : [],
          title: typeof T.input.title === "string" ? T.input.title : void 0,
          subtitle: typeof T.input.subtitle === "string" ? T.input.subtitle : void 0,
          xAxisLabel: typeof T.input.xAxisLabel === "string" ? T.input.xAxisLabel : void 0,
          yAxisLabel: typeof T.input.yAxisLabel === "string" ? T.input.yAxisLabel : void 0,
          stacked: typeof T.input.stacked === "boolean" ? T.input.stacked : void 0,
          horizontal: typeof T.input.horizontal === "boolean" ? T.input.horizontal : void 0,
          hoverColumns: Array.isArray(T.input.hoverColumns) ? T.input.hoverColumns : void 0,
          groupColumn: typeof T.input.groupColumn === "string" ? T.input.groupColumn : void 0,
          cmd: typeof T.input.cmd === "string" ? T.input.cmd : void 0
        });
      }
    } catch (a) {
      let e = a instanceof Error ? a.message : String(a);
      J.error("Chart rendering failed", {
        error: a
      }), this._error = e;
    }
  }
  initState() {
    super.initState(), this._parseChartData();
  }
  didUpdateWidget(T) {
    super.didUpdateWidget(T), this._parseChartData();
  }
  build(T) {
    let {
        toolUse: R,
        toolRun: a
      } = this.widget,
      e = $R.of(T),
      t = [];
    if (typeof R.input.title === "string") t.push(new xT({
      text: new G(R.input.title, new cT({
        color: e.colors.foreground,
        dim: !0
      })),
      selectable: !0
    }));
    if (this._chartData?.sourceQuery) {
      let i = this._showSourceQuery ? "Show Chart" : "Show Query";
      t.push(new G0({
        onClick: () => {
          this.setState(() => {
            this._showSourceQuery = !this._showSourceQuery;
          });
        },
        cursor: "pointer",
        child: new xT({
          text: new G(i, new cT({
            color: e.app.link,
            dim: !this._showSourceQuery
          })),
          selectable: !0
        })
      }));
    }
    let r = [];
    if (this._error) r.push(new G(`
`)), r.push(new G(`  Error: ${this._error}`, new cT({
      color: e.app.toolError
    })));
    let h;
    if (this._chartData) h = new xRR({
      chartData: this._chartData,
      showSourceQuery: this._showSourceQuery
    });
    return new x3({
      name: "Chart",
      status: r.length > 0 ? "error" : a.status,
      children: t.length > 0 ? t : void 0,
      tail: r.length > 0 ? r : void 0,
      content: h
    });
  }
};
S$ = class S$ extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    let R = this.props.message,
      a = $R.of(T),
      {
        colors: e
      } = a,
      t = "",
      r,
      h,
      i = null;
    if (R.role === "info") {
      let l = ZS(R);
      if (!l) return new SR();
      t = `${DN0(l.hidden ?? !1)} ${l.args.cmd}`;
      let o = p8R(t, T);
      r = o, h = o, i = lhT(T, l);
    } else {
      t = m8R(R);
      let l = R.interrupted ? e.warning : e.success;
      h = l, r = l;
    }
    let c = new cT({
        color: h,
        italic: !0
      }),
      s = [];
    if (R.role === "user") {
      let l = R.content.filter(n => n.type === "image"),
        o = _8R(T, l, c, n => {
          let p = l[n];
          if (p) this.props.onShowImagePreview(p, n);
        });
      if (o) s.push(o);
    }
    if (t) {
      if (s.length > 0) s.push(new XT({
        height: 1
      }));
      s.push(qQ(t, c, R.role === "user" ? R.interrupted : void 0, e.warning));
    }
    if (i) {
      if (s.length > 0) s.push(new XT({
        height: 1
      }));
      s.push(i);
    }
    if (R.role === "user" && R.discoveredGuidanceFiles) {
      let l = b8R(T, R.discoveredGuidanceFiles);
      if (l) {
        if (s.length > 0) s.push(new XT({
          height: 1
        }));
        s.push(l);
      }
    }
    let A;
    if (s.length === 0) A = new SR();else if (s.length === 1) A = s[0];else A = new xR({
      mainAxisSize: "min",
      crossAxisAlignment: "start",
      children: s
    });
    return new SR({
      decoration: {
        color: e.background,
        border: new h9(void 0, void 0, void 0, new e9(r, 2, "solid"))
      },
      padding: TR.only({
        left: 1
      }),
      child: A
    });
  }
};
zQ = class zQ extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    let R = $R.of(T),
      a = R.colors,
      e = this.props.message,
      t = "",
      r = R.app.selectedMessage,
      h = R.app.selectedMessage,
      i = null,
      c = ZS(e);
    if (c) {
      t = `${c.hidden ? "$$" : "$"} ${c.args.cmd}`;
      let p = p8R(t, T);
      r = p, h = p, i = lhT(T, c);
    } else if (e.role === "user") t = m8R(e), h = e.interrupted ? a.warning : a.success;
    let s = new cT({
        color: h,
        italic: !0
      }),
      A = [];
    if (e.role === "user") {
      let p = e.content.filter(m => m.type === "image"),
        _ = _8R(T, p, s, m => {
          let b = p[m];
          if (b) this.props.onShowImagePreview(b, m);
        });
      if (_) A.push(_);
    }
    if (t) {
      if (A.length > 0) A.push(new XT({
        height: 1
      }));
      A.push(qQ(t, s, e.role === "user" ? e.interrupted : void 0, a.warning));
    }
    if (i) {
      if (A.length > 0) A.push(new XT({
        height: 1
      }));
      A.push(i);
    }
    if (e.role === "user" && e.discoveredGuidanceFiles) {
      let p = b8R(T, e.discoveredGuidanceFiles);
      if (p) {
        if (A.length > 0) A.push(new XT({
          height: 1
        }));
        A.push(p);
      }
    }
    let l;
    if (A.length === 0) l = new SR();else if (A.length === 1) l = A[0];else l = new xR({
      mainAxisSize: "min",
      crossAxisAlignment: "start",
      children: A
    });
    let o = new SR({
      decoration: {
        border: h9.all(new e9(r, 2, "solid")),
        color: a.background
      },
      padding: TR.only({
        left: 1,
        right: 1
      }),
      width: 1 / 0,
      child: l
    });
    if (this.props.isShowingRestoreConfirmation) {
      let p = new y8R({
          affectedFiles: this.props.affectedFiles,
          onConfirm: this.props.onRestoreConfirm,
          onCancel: this.props.onRestoreCancel
        }),
        _ = [];
      if (this.props.showRestoreHint) _.push(new FQ(), new XT({
        height: 1
      }));
      return _.push(p, new XT({
        height: 1
      })), new xR({
        children: [..._, new CA({
          forceDim: !0,
          child: new SR({
            decoration: {
              border: new h9(void 0, void 0, void 0, new e9(r, 2, "solid")),
              color: a.background
            },
            padding: TR.only({
              left: 1,
              right: 1
            }),
            width: 1 / 0,
            child: l
          })
        })]
      });
    }
    if (this.props.isShowingEditConfirmation) {
      let p = new P8R({
          affectedFiles: this.props.affectedFiles,
          onConfirm: this.props.onEditConfirm,
          onCancel: this.props.onEditCancel
        }),
        _ = this.props.pendingEditText ?? t,
        m = qQ(_, s, void 0, a.warning),
        b = new xR({
          mainAxisSize: "min",
          crossAxisAlignment: "start",
          children: [m, new XT({
            height: 1
          }), p]
        });
      return new SR({
        decoration: {
          border: h9.all(new e9(r, 2, "solid")),
          color: a.background
        },
        padding: TR.only({
          left: 1,
          right: 1
        }),
        width: 1 / 0,
        child: b
      });
    }
    let n = !(this.props.showEditHint ?? !0) ? o : new BtT({
      child: new Ta({
        children: [o, new ca({
          left: 2,
          right: 0,
          bottom: 0,
          child: new xT({
            text: new G("", void 0, [new G("e", new cT({
              color: R.app.keybind
            })), new G(" to edit", new cT({
              color: a.foreground,
              dim: !0
            }))])
          })
        })]
      })
    });
    if (!this.props.isFirstMessage || !this.props.showRestoreHint) return new uR({
      padding: TR.only({}),
      child: n
    });
    return new uR({
      padding: TR.only({}),
      child: new xR({
        mainAxisSize: "min",
        crossAxisAlignment: "start",
        children: [new FQ(), new XT({
          height: 1
        }), n]
      })
    });
  }
};
FQ = class FQ extends B0 {
  build(T) {
    let R = $R.of(T),
      a = R.colors,
      e = R.app,
      t = [new G(" r", new cT({
        color: e.keybind
      })), new G(" to restore ", new cT({
        color: a.foreground,
        dim: !0
      }))];
    return new Ta({
      children: [new SR({
        decoration: {
          color: a.background,
          border: new h9(new e9(a.selection, 2, "solid"), void 0, void 0, void 0)
        },
        width: 1 / 0,
        height: 1
      }), new ca({
        left: 0,
        right: 0,
        top: 0,
        child: new N0({
          child: new xT({
            text: new G("", void 0, t)
          })
        })
      })]
    });
  }
};
y8R = class y8R extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    let R = this.props.affectedFiles,
      a = R.length > 0,
      e = a ? "This will delete this message and any subsequent messages in the thread, and will restore the following files:" : "This will delete this message and any subsequent messages in the thread.",
      t = $R.of(T),
      r = [new xT({
        text: new G(e, new cT({
          color: t.app.command,
          bold: !0
        }))
      }), new XT({
        height: 1
      })],
      h = u8R(T, R);
    if (h) r.push(h), r.push(new XT({
      height: 1
    }));
    let i = [{
      value: "confirm",
      label: a ? "Delete and restore" : "Delete"
    }, {
      value: "cancel",
      label: "Cancel"
    }];
    return r.push(new io({
      options: i,
      onSelect: c => {
        if (c === "confirm") this.props.onConfirm();else this.props.onCancel();
      },
      padding: TR.all(0),
      showDismissalMessage: !1,
      enableMouseInteraction: !1,
      showBorder: !1
    })), new xR({
      mainAxisSize: "min",
      crossAxisAlignment: "start",
      children: r
    });
  }
};
P8R = class P8R extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    let R = this.props.affectedFiles,
      a = $R.of(T),
      e = [],
      t = u8R(T, R);
    if (t) e.push(new xT({
      text: new G("This will restore the following files:", new cT({
        color: a.app.command,
        bold: !0
      }))
    })), e.push(new XT({
      height: 1
    })), e.push(t), e.push(new XT({
      height: 1
    }));
    let r = [{
      value: "confirm",
      label: "Confirm edit"
    }, {
      value: "cancel",
      label: "Cancel"
    }];
    return e.push(new io({
      options: r,
      onSelect: h => {
        if (h === "confirm") this.props.onConfirm();else this.props.onCancel();
      },
      padding: TR.all(0),
      showDismissalMessage: !1,
      enableMouseInteraction: !1,
      showBorder: !1
    })), new xR({
      mainAxisSize: "min",
      crossAxisAlignment: "start",
      children: e
    });
  }
};
GQ = class GQ extends NR {
  controller;
  onSubmitted;
  message;
  completionBuilder;
  autocompleteHandle;
  onShowImagePreview;
  onDoubleAtTrigger;
  submitOnEnter;
  constructor(T) {
    super();
    this.controller = T.controller, this.onSubmitted = T.onSubmitted, this.message = T.message, this.completionBuilder = T.completionBuilder, this.autocompleteHandle = T.autocompleteHandle, this.onShowImagePreview = T.onShowImagePreview, this.onDoubleAtTrigger = T.onDoubleAtTrigger, this.submitOnEnter = T.submitOnEnter ?? !0;
  }
  createState() {
    return new k8R();
  }
};
RD = class RD extends H8 {};
aD = class aD extends H8 {};
VQ = class VQ extends H8 {};
XQ = class XQ extends H8 {};
YQ = class YQ extends H8 {};
QQ = class QQ extends H8 {};
ZQ = class ZQ extends H8 {};
JQ = class JQ extends H8 {};
I8R = class I8R extends NR {
  message;
  onDestruct;
  constructor({
    key: T,
    message: R,
    onDestruct: a
  }) {
    super(T ? {
      key: T
    } : {});
    this.message = R, this.onDestruct = a;
  }
  createState() {
    return new g8R();
  }
};
$8R = class $8R extends NR {
  request;
  requestIndex;
  totalRequests;
  onPreviousRequest;
  onNextRequest;
  onSubmit;
  constructor({
    request: T,
    requestIndex: R,
    totalRequests: a,
    onPreviousRequest: e,
    onNextRequest: t,
    onSubmit: r
  }) {
    super();
    this.request = T, this.requestIndex = R, this.totalRequests = a, this.onPreviousRequest = e, this.onNextRequest = t, this.onSubmit = r;
  }
  createState() {
    return new v8R();
  }
};
j8R = class j8R extends NR {
  originX;
  originY;
  sparkleColors;
  durationSeconds;
  fps;
  onComplete;
  constructor({
    originX: T,
    originY: R,
    sparkleColors: a,
    durationSeconds: e = XE0,
    fps: t = Rz0,
    onComplete: r,
    key: h
  }) {
    super(h ? {
      key: h
    } : {});
    this.originX = T, this.originY = R, this.sparkleColors = a, this.durationSeconds = e, this.fps = t, this.onComplete = r;
  }
  createState() {
    return new S8R();
  }
};
S8R = class S8R extends wR {
  elapsedSeconds = 0;
  timer = null;
  particles = [];
  completed = !1;
  animationStartTimeMs = 0;
  initState() {
    super.initState(), this.restart();
  }
  didUpdateWidget(T) {
    if (super.didUpdateWidget(T), this.widget.originX !== T.originX || this.widget.originY !== T.originY || this.widget.durationSeconds !== T.durationSeconds || this.widget.fps !== T.fps) this.restart();
  }
  dispose() {
    if (this.timer) clearInterval(this.timer), this.timer = null;
    super.dispose();
  }
  restart() {
    if (this.timer) clearInterval(this.timer), this.timer = null;
    this.elapsedSeconds = 0, this.completed = !1, this.animationStartTimeMs = performance.now();
    let T = ZE0(this.widget.originX, this.widget.originY);
    if (this.particles = JE0(T, YE0), this.widget.fps <= 0) {
      this.elapsedSeconds = this.widget.durationSeconds, this.complete();
      return;
    }
    let R = Math.max(16, Math.floor(1000 / this.widget.fps));
    this.timer = setInterval(() => {
      if (!this.mounted) return;
      if (this.elapsedSeconds = Math.min(this.widget.durationSeconds, (performance.now() - this.animationStartTimeMs) / 1000), this.elapsedSeconds >= this.widget.durationSeconds) {
        this.elapsedSeconds = this.widget.durationSeconds, this.setState(() => {}), this.complete();
        return;
      }
      this.setState(() => {});
    }, R);
  }
  complete() {
    if (this.completed) return;
    if (this.completed = !0, this.timer) clearInterval(this.timer), this.timer = null;
    this.widget.onComplete?.();
  }
  build(T) {
    let R = Z0.of(T),
      a = this.widget.sparkleColors.length > 0 ? this.widget.sparkleColors : [R.colorScheme.primary, R.colorScheme.warning];
    return new O8R({
      originX: this.widget.originX,
      originY: this.widget.originY,
      elapsedSeconds: this.elapsedSeconds,
      sparkleColors: a,
      particles: this.particles
    });
  }
};
O8R = class O8R extends to {
  props;
  constructor(T, R) {
    super(R ? {
      key: R
    } : {});
    this.props = T;
  }
  createElement() {
    return new bp(this);
  }
  createRenderObject() {
    return new d8R(this.props.originX, this.props.originY, this.props.elapsedSeconds, this.props.sparkleColors, this.props.particles);
  }
  updateRenderObject(T) {
    T.update(this.props.originX, this.props.originY, this.props.elapsedSeconds, this.props.sparkleColors, this.props.particles);
  }
};
d8R = class d8R extends O9 {
  _originX;
  _originY;
  _elapsedSeconds;
  _sparkleColors;
  _particles;
  constructor(T, R, a, e, t) {
    super();
    this._originX = T, this._originY = R, this._elapsedSeconds = a, this._sparkleColors = e, this._particles = t;
  }
  update(T, R, a, e, t) {
    this._originX = T, this._originY = R, this._elapsedSeconds = a, this._sparkleColors = e, this._particles = t, this.markNeedsPaint();
  }
  performLayout() {
    let T = this._lastConstraints,
      R = T.constrain(T.biggest.width, T.biggest.height);
    this.setSize(R.width, R.height), super.performLayout();
  }
  paint(T, R = 0, a = 0) {
    let e = R + this.offset.x,
      t = a + this.offset.y,
      r = Math.floor(this.size.width),
      h = Math.floor(this.size.height),
      i = this._originX - e,
      c = this._originY - t,
      s = this._sparkleColors;
    for (let A of this._particles) {
      let l = TC0(A, {
        elapsedSeconds: this._elapsedSeconds,
        originX: i,
        originY: c
      });
      if (!l) continue;
      let o = Math.round(l.x),
        n = Math.round(l.y);
      if (o < 0 || o >= r || n < 0 || n >= h) continue;
      let p = l.progress,
        _ = p > 0.85 ? "." : A.glyph,
        m = s[A.colorIndex % s.length];
      if (!m) continue;
      if (T.setCell(e + o, t + n, {
        char: _,
        width: 1,
        style: {
          fg: m,
          dim: p > 0.65,
          bold: A.kind === "burst" && p < 0.25
        }
      }), !(A.kind === "rain" && p > 0.2)) continue;
      let b = n - 1;
      if (b < 0 || b >= h) continue;
      T.setCell(e + o, t + b, {
        char: ".",
        width: 1,
        style: {
          fg: m,
          dim: !0
        }
      });
      let y = n - 2;
      if (y < 0 || y >= h) continue;
      T.setCell(e + o, t + y, {
        char: ".",
        width: 1,
        style: {
          fg: m,
          dim: !0
        }
      });
    }
  }
};
E8R = class E8R extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  build(T) {
    let {
        type: R,
        title: a,
        threadID: e,
        labelColor: t,
        mutedColor: r,
        foregroundColor: h,
        onNavigate: i
      } = this.props,
      c = az0(R);
    return new XT({
      height: 1,
      child: new T0({
        mainAxisAlignment: "end",
        children: [new G0({
          cursor: "pointer",
          onClick: () => {
            i(e);
          },
          child: new uR({
            padding: TR.only({
              right: 2
            }),
            child: new xT({
              text: new G("", void 0, [new G("\u21B3 ", new cT({
                color: t
              })), new G(`${c}: `, new cT({
                color: r,
                dim: !0
              })), new G(a, new cT({
                color: h
              }))])
            })
          })
        })]
      })
    });
  }
};
L8R = class L8R extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new M8R();
  }
};
M8R = class M8R extends wR {
  filterByWorkspace = !0;
  cachedEntries = [];
  scoringLabelCache = new Map();
  initState() {
    this.cachedEntries = this.computeFilteredEntries();
  }
  handleKeyEvent = T => {
    if (T.ctrlKey && T.key.toLowerCase() === "t" || T.altKey && T.key.toLowerCase() === "w") return this.setState(() => {
      this.filterByWorkspace = !this.filterByWorkspace, this.cachedEntries = this.computeFilteredEntries();
    }), "handled";
    return "ignored";
  };
  computeFilteredEntries() {
    let {
        entries: T,
        currentCwd: R
      } = this.widget.props,
      a;
    if (this.filterByWorkspace) a = T.filter(r => r.cwd === void 0 || tz0(r.cwd, R));else a = [...T];
    a = a.reverse();
    let e = new Set(),
      t = [];
    for (let r of a) {
      if (!e.has(r.text)) e.add(r.text), t.push(r);
      if (t.length >= 200) break;
    }
    return t;
  }
  handleAccept = T => {
    this.widget.props.onAccept(T.text);
  };
  handleDismiss = () => {
    this.widget.props.onDismiss();
  };
  getScoringLabel(T) {
    let R = this.scoringLabelCache.get(T);
    if (R !== void 0) return R;
    let a = ez0(T);
    return this.scoringLabelCache.set(T, a), a;
  }
  build(T) {
    let R = $R.of(T),
      {
        colors: a,
        app: e
      } = R,
      t = this.cachedEntries,
      r = this.filterByWorkspace ? "Showing: current workspace" : "Showing: all workspaces",
      h = new SR({
        padding: TR.symmetric(1, 0),
        child: new T0({
          children: [new j0({
            child: new xT({
              text: new G("", void 0, [new G("Alt+W/Ctrl+T", new cT({
                color: a.foreground
              })), new G(` toggle filter \xB7 ${r}`, new cT({
                color: a.foreground,
                dim: !0
              }))]),
              maxLines: 1,
              overflow: "ellipsis"
            })
          })]
        })
      }),
      i = new we({
        items: t,
        getLabel: c => this.getScoringLabel(c.text),
        filterItem: (c, s) => {
          if (!s) return !0;
          return c.text.toLowerCase().includes(s.toLowerCase());
        },
        sortItems: () => 0,
        onAccept: this.handleAccept,
        onDismiss: this.handleDismiss,
        title: "Prompt History",
        emptyStateText: this.filterByWorkspace ? "No history for this workspace" : "No prompt history",
        maxRenderItems: 100,
        footer: h,
        renderItem: (c, s, A, l) => {
          let o = s ? e.selectionBackground : void 0,
            n = s ? e.selectionForeground : a.foreground,
            p = C8R(c.text);
          return new T0({
            children: [new j0({
              child: new SR({
                decoration: o ? {
                  color: o
                } : void 0,
                padding: TR.symmetric(2, 0),
                child: new xT({
                  text: new G(p, new cT({
                    color: n
                  })),
                  maxLines: 1,
                  overflow: "ellipsis"
                })
              })
            })]
          });
        }
      });
    return new N0({
      child: new SR({
        constraints: o0.loose(110, 26),
        child: new C8({
          onKey: this.handleKeyEvent,
          child: i,
          debugLabel: "PromptHistoryPicker"
        })
      })
    });
  }
};
D8R = class D8R extends NR {
  props;
  constructor(T) {
    super({
      key: T.key
    });
    this.props = T;
  }
  createState() {
    return new w8R();
  }
};
B8R = class B8R extends to {
  color;
  constructor({
    color: T,
    key: R
  }) {
    super({
      key: R
    });
    this.color = T;
  }
  createRenderObject() {
    return new N8R(this.color);
  }
  updateRenderObject(T) {
    T.color = this.color;
  }
};
N8R = class N8R extends O9 {
  color;
  constructor(T) {
    super();
    this.color = T;
  }
  performLayout() {
    let T = this._lastConstraints;
    if (T) this.setSize(T.maxWidth, 1);
  }
  paint(T, R, a) {
    let e = Math.floor(this.size.width);
    for (let t = 0; t < e; t++) T.setChar(R + t, a, "\u2500", {
      fg: this.color
    }, 1);
  }
};
U8R = class U8R extends B0 {
  submitOnEnter;
  constructor(T = {}) {
    super(T.key ? {
      key: T.key
    } : {});
    this.submitOnEnter = T.submitOnEnter ?? !0;
  }
  build(T) {
    let R = Z0.of(T).colorScheme,
      a = $R.of(T).app,
      e = new cT({
        color: a.keybind
      }),
      t = new cT({
        color: R.foreground,
        dim: !0
      }),
      r = Xb() && !TXT,
      h = (this.submitOnEnter ? ZgT : ZgT.map(c => c.left.keys === "Shift+Enter" ? {
        left: {
          keys: "Ctrl/Cmd+Enter",
          description: "submit"
        },
        right: c.right
      } : c)).map(c => {
        let s = c.left.keys === "Shift+Enter" && r ? "Alt+Enter" : c.left.keys,
          A = c.left.description,
          l = s.length + 1 + A.length,
          o = " ".repeat(Math.max(0, hz0 - l)),
          n = c.right.keys,
          p = c.right.description;
        return new xT({
          text: new G("", void 0, [new G(s, e), new G(" ", t), new G(A, t), new G(o + "  ", t), new G(n, e), new G(" ", t), new G(p, t)])
        });
      });
    if (r) h.push(new XT({
      height: 1
    })), h.push(new G0({
      onClick: () => je(T, "https://ampcode.com/manual/appendix#amp-cli-tmux"),
      cursor: "pointer",
      child: new xT({
        text: new G("", void 0, [new G("Enable ", t), new G("extended-keys", new cT({
          color: a.command
        })), new G(" in tmux to use ", t), new G("Shift+Enter", e), new G(". See ", t), H3.createSpan("https://ampcode.com/manual/appendix#amp-cli-tmux", "https://ampcode.com/manual/appendix#amp-cli-tmux", new cT({
          color: a.link,
          underline: !0
        }))])
      })
    }));
    let i = new T0({
      children: [new j0({
        child: new B8R({
          color: R.border
        })
      })]
    });
    return new xR({
      crossAxisAlignment: "start",
      mainAxisSize: "min",
      children: [...h, i]
    });
  }
};
H8R = class H8R extends NR {
  skills;
  errors;
  warnings;
  onDismiss;
  onAddSkill;
  onDocs;
  onInsertPrompt;
  onInvokeSkill;
  cwd;
  constructor({
    key: T,
    skills: R,
    errors: a,
    warnings: e,
    onDismiss: t,
    onAddSkill: r,
    onDocs: h,
    onInsertPrompt: i,
    onInvokeSkill: c,
    cwd: s
  }) {
    super(T ? {
      key: T
    } : {});
    this.skills = R, this.errors = a, this.warnings = e, this.onDismiss = t, this.onAddSkill = r, this.onDocs = h, this.onInsertPrompt = i, this.onInvokeSkill = c, this.cwd = s;
  }
  createState() {
    return new W8R();
  }
};
q8R = class q8R extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new z8R();
  }
};
F8R = class F8R extends NR {
  stableProps;
  arePropsEqual;
  constructor({
    key: T,
    stableProps: R,
    arePropsEqual: a
  }) {
    super(T ? {
      key: T
    } : {});
    this.stableProps = R, this.arePropsEqual = a ?? bz0;
  }
  createState() {
    return new mhT();
  }
};
mhT = class mhT extends wR {
  cachedChild = null;
  build(T) {
    let {
        stableProps: R,
        arePropsEqual: a
      } = this.widget,
      e = this.cachedChild;
    if (e && a(e.props, R)) return e.widget;
    let t = this.widget.buildStableChild(R);
    return this.cachedChild = {
      props: R,
      widget: t
    }, t;
  }
  dispose() {
    this.cachedChild = null;
  }
};
G8R = class G8R extends F8R {
  constructor(T) {
    super({
      stableProps: T
    });
  }
  createState() {
    return new K8R();
  }
  buildStableChild(T) {
    let {
      threadID: R,
      ...a
    } = T;
    return new AhT({
      ...a,
      key: R ? new k3(`message-view-${R}`) : void 0
    });
  }
};
K8R = class K8R extends mhT {
  build(T) {
    return super.build(T);
  }
};
Y8R = class Y8R extends NR {
  props;
  constructor(T) {
    super({
      key: T.key
    });
    this.props = T;
  }
  createState() {
    return new Q8R();
  }
};
Q8R = class Q8R extends wR {
  build(T) {
    let R = $R.of(T).colors,
      {
        todos: a,
        title: e = "TODOs"
      } = this.widget.props;
    if (!Array.isArray(a) || a.length === 0) return new XT({
      width: 0,
      height: 0
    });
    let t = a.map(r => this.buildTodoItem(r, R));
    return new SR({
      child: new uR({
        padding: TR.symmetric(1, 0),
        child: new xR({
          crossAxisAlignment: "stretch",
          mainAxisSize: "min",
          children: [new xT({
            text: new G(e, new cT({
              bold: !0,
              color: R.foreground
            }))
          }), ...t]
        })
      })
    });
  }
  buildTodoItem(T, R) {
    let a = this.getStatusIcon(T.status),
      e = T.status === "completed",
      t = new cT({
        bold: T.status === "in-progress",
        color: R.foreground,
        dim: e
      }),
      r = new cT({
        bold: T.status === "in-progress",
        strikethrough: T.status === "completed",
        color: R.foreground,
        dim: e
      });
    return new T0({
      crossAxisAlignment: "start",
      children: [new xT({
        text: new G(a, t)
      }), new XT({
        width: 1
      }), new j0({
        child: new xT({
          text: new G(T.content, r)
        })
      })]
    });
  }
  getStatusIcon(T) {
    return T === "completed" ? "\u2713" : "\u2022";
  }
};
Z8R = class Z8R extends NR {
  dependencies;
  constructor(T) {
    super();
    this.dependencies = T;
  }
  createState() {
    return new uhT();
  }
};
J8R = class J8R extends NR {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  createState() {
    return new T3R();
  }
};