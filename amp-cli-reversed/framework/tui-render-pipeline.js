// Module: tui-render-pipeline
// Original: segment1[1686146:1701517]
// Type: Scope-hoisted
// Exports: T1T, zk0, a1T, H4, x$, Fk0, Gk0, Kk0, TfT, Vk0, cT, G, p8, h9, e9, MtT, TR, _1T
// Category: framework

s.tui.getQueryParser(), t = e?.getRgbColors();
if (J.info("Initial RGB colors from terminal", {
    available: !!t
  }), t) this.updateRgbColors(t);
if (e) e.setColorPaletteChangeCallback(() => {
  let i = e.getRgbColors();
  if (i) this.updateRgbColors(i)
});
let r = this.createMediaQueryWrapper(T);
if (this.rootElement = r.createElement(), this.rootElement.mount(), this.rootElementMountedCallback) this.rootElementMountedCallback(this.rootElement);
let h = this.rootElement.renderObject;
if (!h && this.rootElement.children.length > 0) h = this.rootElement.children[0]?.renderObject;
if (h) this.pipelineOwner.setRootRenderObject(h), this.updateRootConstraints();
if (this.rootElement.renderObject) this.mouseManager.setRootRenderObject(this.rootElement.renderObject);
this.mouseManager.setTui(this.tui), J.debug("Setting up event handlers..."), this.setupEventHandlers(), J.debug("Requesting initial frame..."), this.frameScheduler.requestFrame(), J.debug("Waiting for exit...", {
  isRunning: this.isRunning
}), await this.waitForExit(), J.debug("waitForExit completed")
}
finally {
  J.debug("Cleaning up..."), await this.cleanup()
}
}
stop() {
  if (this.isRunning = !1, this.exitResolve) this.exitResolve(), this.exitResolve = null
}
updateRootConstraints() {
  let T = this.tui.getSize();
  this.pipelineOwner.updateRootConstraints(T)
}
updateRootRenderObject() {
  if (!this.rootElement) return;
  let T = this.rootElement.renderObject;
  if (!T && this.rootElement.children.length > 0) T = this.rootElement.children[0]?.renderObject;
  if (T) this.pipelineOwner.setRootRenderObject(T), this.mouseManager.setRootRenderObject(T)
}
processResizeIfPending() {
  if (!this.pendingResizeEvent) return;
  let T = this.pendingResizeEvent;
  if (this.pendingResizeEvent = null, this.rootElement) {
    let R = {
        width: T.width,
        height: T.height
      },
      a = this.tui.getCapabilities() || OY(),
      e = new BM(R, a),
      t = this.rootElement;
    if (t.widget instanceof I9) {
      let r = new I9({
        data: e,
        child: t.widget.child
      });
      t.update(r)
    }
    this.tui.getScreen().markForRefresh(), this.pipelineOwner.updateRootConstraints(R), this.rootElement.markNeedsRebuild(), this.frameScheduler.requestFrame(), this.frameScheduler.addPostFrameCallback(() => {
      this.mouseManager.reestablishHoverState()
    }, "MouseManager.reestablishHoverState")
  }
}
beginFrame() {
  this.didPaintCurrentFrame = !1, this.shouldPaintCurrentFrame = this.forcePaintOnNextFrame || this.buildOwner.hasDirtyElements || this.pipelineOwner.hasNodesNeedingLayout || this.pipelineOwner.hasNodesNeedingPaint || this.tui.getScreen().requiresFullRefresh, this.forcePaintOnNextFrame = !1
}
requestForcedPaintFrame() {
  this.forcePaintOnNextFrame = !0, this.frameScheduler.requestFrame()
}
paint() {
  if (!this.shouldPaintCurrentFrame) return;
  if (this.pipelineOwner.flushPaint(), !this.rootElement) return;
  let T = this.rootElement.renderObject;
  if (!T && this.rootElement.children.length > 0) T = this.rootElement.children[0]?.renderObject;
  if (!T) return;
  try {
    let R = this.tui.getScreen();
    R.clear(), R.clearCursor(), this.renderRenderObject(T, R, 0, 0);
    let a = this.frameScheduler.frameStats;
    this.frameStatsOverlay.recordStats(a, this.tui.getLastRenderDiffStats()), this.frameStatsOverlay.draw(R, a), this.didPaintCurrentFrame = !0
  } catch (R) {
    J.error("Paint error:", R)
  }
}
render() {
  if (!this.didPaintCurrentFrame) return;
  try {
    this.tui.render()
  } catch (T) {
    J.error("Render error:", T)
  }
}
renderRenderObject(T, R, a, e) {
  if ("paint" in T && typeof T.paint === "function") T.paint(R, a, e)
}
createMediaQueryWrapper(T) {
  let R = this.tui.getCapabilities() || OY(),
    a = this.tui.getSize(),
    e = new BM(a, R);
  return new I9({
    data: e,
    child: T
  })
}
setupEventHandlers() {
  this.tui.onResize((T) => {
    this.mouseManager.clearHoverState(), this.pendingResizeEvent = T, this.frameScheduler.requestFrame()
  }), this.tui.onKey((T) => {
    let R = performance.now();
    for (let e of this.eventCallbacks.key) e(T);
    for (let e of this.keyInterceptors)
      if (e(T)) {
        let t = performance.now() - R;
        this.frameStatsOverlay.recordKeyEvent(t);
        return
      }
    if (this.focusManager.handleKeyEvent(T)) {
      let e = performance.now() - R;
      this.frameStatsOverlay.recordKeyEvent(e);
      return
    }
    this.handleGlobalKeyEvent(T);
    let a = performance.now() - R;
    this.frameStatsOverlay.recordKeyEvent(a)
  }), this.tui.onMouse((T) => {
    let R = performance.now();
    for (let e of this.eventCallbacks.mouse) e(T);
    this.mouseManager.handleMouseEvent(T);
    let a = performance.now() - R;
    this.frameStatsOverlay.recordMouseEvent(a)
  }), this.tui.onPaste((T) => {
    for (let R of this.eventCallbacks.paste) R(T);
    this.focusManager.handlePasteEvent(T)
  }), this.tui.onCapabilities((T) => {
    if (this.rootElement) {
      let R = this.tui.getSize(),
        a = new BM(R, T.capabilities),
        e = this.rootElement;
      if (e.widget instanceof I9) {
        let t = new I9({
          data: a,
          child: e.widget.child
        });
        e.update(t)
      }
      this.rootElement.markNeedsRebuild(), this.frameScheduler.requestFrame()
    }
  })
}
handleGlobalKeyEvent(T) {
  if (T.ctrlKey && T.key === "z" && !T.shiftKey && !T.altKey && !T.metaKey) {
    this.tui.handleSuspend();
    return
  }
}
toggleFrameStatsOverlay() {
  let T = !this.frameStatsOverlay.isEnabled();
  this.frameStatsOverlay.setEnabled(T), this.requestForcedPaintFrame()
}
exitPromise = null;
exitResolve = null;
async waitForExit() {
  if (this.exitPromise !== null) return this.exitPromise;
  return this.exitPromise = new Promise((T) => {
    if (this.exitResolve = T, !this.isRunning) T()
  }), this.exitPromise
}
async cleanup() {
  if (this.isRunning = !1, this.rootElement) this.rootElement.unmount(), this.rootElement = void 0;
  this.buildOwner.dispose(), this.pipelineOwner.dispose(), this.focusManager.dispose(), this.mouseManager.dispose(), this.frameScheduler.removeFrameCallback("frame-start"), this.frameScheduler.removeFrameCallback("resize"), this.frameScheduler.removeFrameCallback("build"), this.frameScheduler.removeFrameCallback("layout"), this.frameScheduler.removeFrameCallback("paint"), this.frameScheduler.removeFrameCallback("render"), await this.tui.deinit()
}
get tuiInstance() {
  return this.tui
}
get rootElementInstance() {
  return this.rootElement
}
setRootElementMountedCallback(T) {
  this.rootElementMountedCallback = T
}
on(T, R) {
  let a = this.eventCallbacks[T];
  return a.push(R), () => {
    let e = a.indexOf(R);
    if (e !== -1) a.splice(e, 1)
  }
}
dispatchSyntheticPaste(T) {
  this.tui.dispatchSyntheticPaste(T)
}
addKeyInterceptor(T) {
  return this.keyInterceptors.push(T), () => {
    let R = this.keyInterceptors.indexOf(T);
    if (R !== -1) this.keyInterceptors.splice(R, 1)
  }
}
}
async function T1T(T, R) {
  let a = d9.instance;
  if (R?.onRootElementMounted) a.setRootElementMountedCallback(R.onRootElementMounted);
  await a.runApp(T)
}

function zk0(T, R, a) {
  if (T.selectableId === R.selectableId) return T.offset - R.offset;
  return a(T.selectableId, R.selectableId)
}
class cT {
  color;
  backgroundColor;
  bold;
  italic;
  underline;
  strikethrough;
  dim;
  constructor({
    color: T,
    backgroundColor: R,
    bold: a,
    italic: e,
    underline: t,
    strikethrough: r,
    dim: h
  } = {}) {
    if (T !== void 0) this.color = T;
    if (R !== void 0) this.backgroundColor = R;
    if (a !== void 0) this.bold = a;
    if (e !== void 0) this.italic = e;
    if (t !== void 0) this.underline = t;
    if (r !== void 0) this.strikethrough = r;
    if (h !== void 0) this.dim = h
  }
  copyWith({
    color: T,
    backgroundColor: R,
    bold: a,
    italic: e,
    underline: t,
    strikethrough: r,
    dim: h
  }) {
    let i = {};
    if (T !== void 0 || this.color !== void 0) i.color = T ?? this.color;
    if (R !== void 0 || this.backgroundColor !== void 0) i.backgroundColor = R ?? this.backgroundColor;
    if (a !== void 0 || this.bold !== void 0) i.bold = a ?? this.bold;
    if (e !== void 0 || this.italic !== void 0) i.italic = e ?? this.italic;
    if (t !== void 0 || this.underline !== void 0) i.underline = t ?? this.underline;
    if (r !== void 0 || this.strikethrough !== void 0) i.strikethrough = r ?? this.strikethrough;
    if (h !== void 0 || this.dim !== void 0) i.dim = h ?? this.dim;
    return new cT(i)
  }
  merge(T) {
    if (!T) return this;
    let R = {};
    if (T.color !== void 0 || this.color !== void 0) R.color = T.color ?? this.color;
    if (T.backgroundColor !== void 0 || this.backgroundColor !== void 0) R.backgroundColor = T.backgroundColor ?? this.backgroundColor;
    if (T.bold !== void 0 || this.bold !== void 0) R.bold = T.bold ?? this.bold;
    if (T.italic !== void 0 || this.italic !== void 0) R.italic = T.italic ?? this.italic;
    if (T.underline !== void 0 || this.underline !== void 0) R.underline = T.underline ?? this.underline;
    if (T.strikethrough !== void 0 || this.strikethrough !== void 0) R.strikethrough = T.strikethrough ?? this.strikethrough;
    if (T.dim !== void 0 || this.dim !== void 0) R.dim = T.dim ?? this.dim;
    return new cT(R)
  }
  static normal(T) {
    return T ? new cT({
      color: T
    }) : new cT
  }
  static bold(T) {
    return T ? new cT({
      color: T,
      bold: !0
    }) : new cT({
      bold: !0
    })
  }
  static italic(T) {
    return T ? new cT({
      color: T,
      italic: !0
    }) : new cT({
      italic: !0
    })
  }
  static underline(T) {
    return T ? new cT({
      color: T,
      underline: !0
    }) : new cT({
      underline: !0
    })
  }
  static colored(T) {
    return new cT({
      color: T
    })
  }
  static background(T) {
    return new cT({
      backgroundColor: T
    })
  }
}
class G {
  text;
  style;
  children;
  hyperlink;
  onClick;
  constructor(T, R, a, e, t) {
    this.text = T, this.style = R, this.children = a, this.hyperlink = e, this.onClick = t
  }
  toPlainText() {
    let T = this.text ?? "";
    if (this.children)
      for (let R of this.children) T += R.toPlainText();
    return String(T)
  }
  equals(T) {
    if (!T) return !1;
    if (this.text !== T.text) return !1;
    if (this.hyperlink?.uri !== T.hyperlink?.uri) return !1;
    if (this.style !== T.style) {
      if (!this.style || !T.style) return !1;
      if (this.style.color !== T.style.color) return !1;
      if (this.style.backgroundColor !== T.style.backgroundColor) return !1;
      if (this.style.bold !== T.style.bold) return !1;
      if (this.style.italic !== T.style.italic) return !1;
      if (this.style.underline !== T.style.underline) return !1
    }
    if (this.children?.length !== T.children?.length) return !1;
    if (this.children && T.children)
      for (let R = 0; R < this.children.length; R++) {
        let a = this.children[R],
          e = T.children[R];
        if (!a || !e || !a.equals(e)) return !1
      }
    return !0
  }
  visitTextSpan(T) {
    if (!T(this)) return;
    if (this.children)
      for (let R of this.children) R.visitTextSpan(T)
  }
}

function a1T(T) {
  let R = T.text?.replace(/\r/g, ""),
    a = T.children?.map((e) => a1T(e));
  return new G(R, T.style, a, T.hyperlink, T.onClick)
}
class p8 {
  color;
  border;
  constructor(T, R) {
    this.color = T, this.border = R
  }
}
class h9 {
  top;
  right;
  bottom;
  left;
  constructor(T, R, a, e) {
    this.top = T, this.right = R, this.bottom = a, this.left = e
  }
  static all(T) {
    return new h9(T, T, T, T)
  }
  static symmetric(T, R) {
    return new h9(R, T, R, T)
  }
}
class e9 {
  color;
  width;
  style;
  constructor(T = LT.black, R = 1, a = "rounded") {
    this.color = T, this.width = R, this.style = a
  }
}
class MtT {
  detach() {}
  toString() {
    return `${this.constructor.name}#${this.hashCode()}`
  }
  hashCode() {
    return Math.random().toString(36).substr(2, 9)
  }
}

function H4(T, R, a) {
  return Math.min(Math.max(T, R), a)
}

function x$(T) {
  if (T instanceof xT) return q8(T.text.toPlainText());
  if (T instanceof XT) return Math.max(0, T.width ?? 0);
  if (T instanceof T0) return T.children.reduce((R, a) => R + x$(a), 0);
  if (T instanceof Ta) {
    let R = 0;
    for (let a of T.children) R = Math.max(R, x$(a));
    return R
  }
  if (T instanceof Fm || T instanceof j0 || T instanceof wtT || T instanceof ca) return x$(T.child);
  if (T instanceof SR || T instanceof dH || T instanceof G0) {
    if (T.child) return x$(T.child);
    return 0
  }
  return 1
}
class TR {
  left;
  top;
  right;
  bottom;
  constructor(T, R, a, e) {
    if (typeof T === "object") this.left = T.left ?? 0, this.top = T.top ?? 0, this.right = T.right ?? 0, this.bottom = T.bottom ?? 0;
    else this.left = T, this.top = R ?? 0, this.right = a ?? 0, this.bottom = e ?? 0
  }
  static all(T) {
    return new TR(T, T, T, T)
  }
  static symmetric(T = 0, R = 0) {
    return new TR(T, R, T, R)
  }
  static horizontal(T) {
    return new TR(T, 0, T, 0)
  }
  static vertical(T) {
    return new TR(0, T, 0, T)
  }
  static only(T) {
    return new TR(T.left ?? 0, T.top ?? 0, T.right ?? 0, T.bottom ?? 0)
  }
  get horizontal() {
    return this.left + this.right
  }
  get vertical() {
    return this.top + this.bottom
  }
}

function Fk0(T) {
  let R = new utT,
    a = [],
    e = new cT,
    t, r = "",
    h = () => {
      if (r.length > 0) a.push({
        text: r,
        style: e,
        hyperlink: t
      }), r = ""
    };
  if (R.onEvent((c) => {
      switch (c.type) {
        case "print":
          r += c.grapheme;
          break;
        case "execute":
          if (c.code === 10) r += `
`;
          else if (c.code === 9) r += "\t";
          break;
        case "csi":
          if (c.final === "m") h(), e = Gk0(e, c);
          break;
        case "osc": {
          let s = Vk0(c.data);
          if (s !== null) h(), t = s;
          break
        }
        case "escape":
        case "dcs":
          break
      }
    }), R.parse(T), R.flush(), h(), a.length === 0) return new G("");
  if (a.length === 1) {
    let c = a[0];
    return new G(c.text, c.style, void 0, c.hyperlink)
  }
  let i = a.map((c) => new G(c.text, c.style, void 0, c.hyperlink));
  return new G(void 0, void 0, i)
}

function Gk0(T, R) {
  let a = Kk0(R.params);
  if (a.length === 0) a.push(0);
  let e = T;
  for (let t = 0; t < a.length; t++) {
    let r = a[t];
    switch (r) {
      case 0:
        e = new cT;
        break;
      case 1:
        e = e.copyWith({
          bold: !0
        });
        break;
      case 2:
        e = e.copyWith({
          dim: !0
        });
        break;
      case 3:
        e = e.copyWith({
          italic: !0
        });
        break;
      case 4:
        e = e.copyWith({
          underline: !0
        });
        break;
      case 9:
        e = e.copyWith({
          strikethrough: !0
        });
        break;
      case 22:
        e = e.copyWith({
          bold: !1,
          dim: !1
        });
        break;
      case 23:
        e = e.copyWith({
          italic: !1
        });
        break;
      case 24:
        e = e.copyWith({
          underline: !1
        });
        break;
      case 29:
        e = e.copyWith({
          strikethrough: !1
        });
        break;
      case 30:
      case 31:
      case 32:
      case 33:
      case 34:
      case 35:
      case 36:
      case 37:
        e = e.copyWith({
          color: LT.index(r - 30)
        });
        break;
      case 38: {
        let h = TfT(a, t);
        if (h.color) e = e.copyWith({
          color: h.color
        });
        t = h.nextIndex;
        break
      }
      case 39:
        e = e.copyWith({
          color: LT.default()
        });
        break;
      case 40:
      case 41:
      case 42:
      case 43:
      case 44:
      case 45:
      case 46:
      case 47:
        e = e.copyWith({
          backgroundColor: LT.index(r - 40)
        });
        break;
      case 48: {
        let h = TfT(a, t);
        if (h.color) e = e.copyWith({
          backgroundColor: h.color
        });
        t = h.nextIndex;
        break
      }
      case 49:
        e = e.copyWith({
          backgroundColor: LT.default()
        });
        break;
      case 90:
      case 91:
      case 92:
      case 93:
      case 94:
      case 95:
      case 96:
      case 97:
        e = e.copyWith({
          color: LT.index(r - 90 + 8)
        });
        break;
      case 100:
      case 101:
      case 102:
      case 103:
      case 104:
      case 105:
      case 106:
      case 107:
        e = e.copyWith({
          backgroundColor: LT.index(r - 100 + 8)
        });
        break
    }
  }
  return e
}

function Kk0(T) {
  let R = [];
  for (let a of T)
    if (R.push(a.value), a.subparams) R.push(...a.subparams);
  return R
}

function TfT(T, R) {
  if (R + 1 >= T.length) return {
    color: null,
    nextIndex: R
  };
  let a = T[R + 1];
  if (a === 2) {
    let e = R + 2,
      t = T.length - e;
    if (t >= 4) {
      let r = T[e + 1] ?? 0,
        h = T[e + 2] ?? 0,
        i = T[e + 3] ?? 0;
      return {
        color: LT.rgb(r, h, i),
        nextIndex: R + 5
      }
    } else if (t >= 3) {
      let r = T[e] ?? 0,
        h = T[e + 1] ?? 0,
        i = T[e + 2] ?? 0;
      return {
        color: LT.rgb(r, h, i),
        nextIndex: R + 4
      }
    }
    return {
      color: null,
      nextIndex: R + 1
    }
  } else if (a === 5) {
    let e = R + 2,
      t = T.length - e;
    if (t >= 2) {
      let r = T[e + 1] ?? 0;
      return {
        color: LT.index(r),
        nextIndex: R + 4
      }
    } else if (t >= 1) {
      let r = T[e] ?? 0;
      return {
        color: LT.index(r),
        nextIndex: R + 2
      }
    }
    return {
      color: null,
      nextIndex: R + 1
    }
  }
  return {
    color: null,
    nextIndex: R + 1
  }
}

function Vk0(T) {
  let R = T.split(";");
  if (R.length < 2 || R[0] !== "8") return null;
  let a = R[1] ?? "",
    e = R.slice(2).join(";");
  if (!e) return;
  let t = "";
  if (a) {
    let r = a.match(/id=([^:;]+)/);
    if (r) t = r[1] ?? ""
  }
  return {
    uri: e,
    id: t
  }
}
class _1T {
  _selectables = [];
  _idToSelectable = new Map;
  _nextId = 1;
  _selection = null;
  _isDragging = !1;
  _dragAnchor = null;
  _orderedCache = [];
  _orderDirty = !0;
  _listeners = new Set;
  _copyHighlightTimer;
  _clearSelectionTimer;
  _onCopyCallback;
  register(T) {
    let R = this._nextId++;
    return T.selectableId = R, this._selectables.push(T), this._idToSelectable.set(R, T), this._orderDirty = !0, T.onAttachToSelectionArea(this), R
  }
  unregister(T) {
    let R = this._selectables.indexOf(T);
    if (R === -1) return;
    if (this._selectables.splice(R, 1), this._idToSelectable.delete(T.selectableId), this._orderDirty = !0, this._selection && this._involvesSelectable(this._selection, T.selectableId)) this.clear();
    T.setSelectedRanges([]), T.onDetachFromSelectionArea(this)
  }
  getAllSelectables() {
    return [...this._selectables]
  }
  hitTest(T) {
    this._ensureOrder();
    for (let R = this._orderedCache.length - 1; R >= 0; R--) {
      let a = this._orderedCache[R];
      if (a) {
        let e = a.selectable.globalBounds();
        if (this._pointInRect(T, e)) return a.selectable
      }
    }
    return null
  }
  setSelection(T) {
    if (this._selectionsEqual(this._selection, T)) return;
    this._selection = T, this._propagateSelection(), this._notifyListeners()
  }
  getSelection() {
    return this._selection
  }
  comparePositions(T, R) {
    return this._compareDocumentPositions(T, R)
  }
  clear() {
    this.setSelection(null), this._isDragging = !1, this._dragAnchor = null
  }
  selectAll() {
    if (this._selectables.length === 0) {
      this.clear();
      return
    }
    this._ensureOrder();
    let T = this._orderedCache[0],
      R = this._orderedCache[this._orderedCache.length - 1];
    if (!T || !R) {
      this.clear();
      return
    }
    this.setSelection({
      anchor: {
        selectableId: T.selectable.selectableId,
        offset: 0
      },
      extent: {
        selectableId: R.selectable.selectableId,
        offset: R.selectable.textLength()
      }
    })
  }
  copySelection() {
      if (!this._selection) return "";
      let T = this._splitSelectionBySelectable(this._selection),
        R = [];
      this._ensureOrder();
      for (let {
          selectable: a
        }
        of