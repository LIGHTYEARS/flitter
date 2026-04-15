Nt = class Nt extends NR {
  actions;
  child;
  dispatcher;
  constructor({
    actions: T,
    child: R,
    dispatcher: a,
    key: e
  }) {
    super({
      key: e
    });
    this.actions = T, this.child = R, this.dispatcher = a;
  }
  createState() {
    return new Ww();
  }
  static invoke(T, R) {
    return Nt.of(T).invokeAction(R, T);
  }
  static maybeInvoke(T, R) {
    try {
      return Nt.invoke(T, R);
    } catch {
      return null;
    }
  }
  static find(T, R) {
    let a = Nt.maybeFind(T, R);
    if (!a) {
      let e = R?.constructor.name || "unknown";
      throw Error(`No action found for intent type: ${e}`);
    }
    return a;
  }
  static maybeFind(T, R) {
    if (!R) return null;
    let a = null;
    return HXT(T, e => {
      let t = e.getActionForIntent(R);
      if (!t) return !1;
      return a = t, !0;
    }), a;
  }
  static of(T) {
    let R = T.findAncestorStateOfType(Ww);
    if (!R) throw Error("No Actions widget found in context");
    return R.dispatcher;
  }
  static handler(T, R) {
    let a = Nt.of(T).findAction(R, T);
    if (a && a.enabled) return () => a.action.invoke(R);
    return null;
  }
};
Ww = class Ww extends wR {
  dispatcher = new dtT();
  getActionForIntent(T) {
    let R = T.constructor;
    return this.widget.actions.get(R);
  }
  build(T) {
    return this.widget.child;
  }
};
C8 = class C8 extends NR {
  focusNode;
  child;
  autofocus;
  canRequestFocus;
  skipTraversal;
  onKey;
  onPaste;
  onFocusChange;
  debugLabel;
  constructor({
    key: T,
    focusNode: R,
    child: a,
    autofocus: e = !1,
    canRequestFocus: t = !0,
    skipTraversal: r = !1,
    onKey: h,
    onPaste: i,
    onFocusChange: c,
    debugLabel: s
  }) {
    super({
      key: T
    });
    this.focusNode = R, this.child = a, this.autofocus = e, this.canRequestFocus = t, this.skipTraversal = r, this.onKey = h || null, this.onPaste = i || null, this.onFocusChange = c || null, this.debugLabel = s || null;
  }
  createState() {
    return new EtT();
  }
};
EtT = class EtT extends wR {
  _internalFocusNode = null;
  _isDisposed = !1;
  _focusChangeHandler = null;
  get effectiveFocusNode() {
    return this.widget.focusNode ?? this._internalFocusNode;
  }
  initState() {
    if (super.initState(), !this.widget.focusNode) {
      let R = {
        canRequestFocus: this.widget.canRequestFocus,
        skipTraversal: this.widget.skipTraversal
      };
      if (this.widget.onKey) R.onKey = this.widget.onKey;
      if (this.widget.onPaste) R.onPaste = this.widget.onPaste;
      if (this.widget.debugLabel) R.debugLabel = this.widget.debugLabel;
      this._internalFocusNode = new l8(R);
    }
    if (this.widget.onKey && this.widget.focusNode) this.effectiveFocusNode.addKeyHandler(this.widget.onKey);
    if (this.widget.onPaste) this.effectiveFocusNode.onPaste = this.widget.onPaste;
    if (this.widget.onFocusChange) this._focusChangeHandler = R => {
      if (!this._isDisposed && this.widget.onFocusChange) this.widget.onFocusChange(R.hasFocus);
    }, this.effectiveFocusNode.addListener(this._focusChangeHandler);
    let T = this.context.findAncestorStateOfType(EtT)?.effectiveFocusNode || null;
    if (ic.instance.registerNode(this.effectiveFocusNode, T), this.widget.autofocus) queueMicrotask(() => {
      if (!this._isDisposed) this.effectiveFocusNode.requestFocus();
    });
  }
  dispose() {
    if (this.widget.onKey) this.effectiveFocusNode.removeKeyHandler(this.widget.onKey);
    if (ic.instance.unregisterNode(this.effectiveFocusNode), this._isDisposed = !0, this._focusChangeHandler) this.effectiveFocusNode.removeListener(this._focusChangeHandler), this._focusChangeHandler = null;
    if (this._internalFocusNode) this._internalFocusNode.dispose(), this._internalFocusNode = null;
    super.dispose();
  }
  build(T) {
    return this.widget.child;
  }
};
kc = class kc extends NR {
  shortcuts;
  child;
  manager;
  debugLabel;
  focusNode;
  constructor({
    shortcuts: T,
    child: R,
    manager: a,
    debugLabel: e,
    focusNode: t,
    key: r
  }) {
    super({
      key: r
    });
    this.shortcuts = T, this.child = R, this.manager = a, this.debugLabel = e, this.focusNode = t;
  }
  createState() {
    return new GXT();
  }
};
GXT = class GXT extends wR {
  manager = null;
  initState() {
    if (super.initState(), this.createManager(), this.widget.focusNode) this.widget.focusNode.addKeyHandler(this.handleKeyEvent);
  }
  didUpdateWidget(T) {
    if (super.didUpdateWidget(T), T.shortcuts !== this.widget.shortcuts || T.manager !== this.widget.manager) this.createManager();
  }
  createManager() {
    if (this.widget.manager) this.manager = this.widget.manager;else this.manager = new CtT(this.widget.shortcuts);
  }
  dispose() {
    if (this.widget.focusNode) this.widget.focusNode.removeKeyHandler(this.handleKeyEvent);
    super.dispose();
  }
  handleKeyEvent = T => {
    if (!this.manager) return "ignored";
    let R = this.manager.handleKeyEvent(T);
    if (R) {
      if (this.invokeIntent(R) === "handled") return "handled";
    }
    return "ignored";
  };
  invokeIntent(T) {
    let R = new dtT().findAction(T, this.context);
    if (R && R.enabled) {
      if (R.action.invoke(T) === "ignored") return null;
      return "handled";
    }
    return null;
  }
  build(T) {
    if (this.widget.focusNode) return this.widget.child;else return new C8({
      onKey: this.handleKeyEvent,
      autofocus: !1,
      canRequestFocus: !0,
      skipTraversal: !1,
      debugLabel: this.widget.debugLabel,
      child: this.widget.child
    });
  }
};
ro = class ro extends NR {
  child;
  focusNode;
  enabled;
  onCopy;
  onSelectionChanged;
  scrollController;
  getScrollBounds;
  autoScrollThreshold;
  autoScrollStep;
  autoScrollIntervalMs;
  constructor({
    key: T,
    child: R,
    focusNode: a,
    enabled: e = !0,
    onCopy: t,
    onSelectionChanged: r,
    scrollController: h,
    getScrollBounds: i,
    autoScrollThreshold: c = 1,
    autoScrollStep: s = 1,
    autoScrollIntervalMs: A = 30
  }) {
    super({
      key: T
    });
    this.child = R, this.focusNode = a, this.enabled = e, this.onCopy = t, this.onSelectionChanged = r, this.scrollController = h, this.getScrollBounds = i, this.autoScrollThreshold = c, this.autoScrollStep = s, this.autoScrollIntervalMs = A;
  }
  createState() {
    return new b1T();
  }
};
b1T = class b1T extends wR {
  _controller;
  _focusNode;
  _globalReleaseCallback;
  _globalMoveCallback;
  _globalClickCallback;
  _doubleClickTimer;
  _tripleClickTimer;
  _selectionChangeListener;
  _selectionChangeListenerCleanup;
  _scrollChangeListener;
  _ignoreNextClick = !1;
  _wordDragBaseRange = null;
  _wordDragMoved = !1;
  _wordDragMouseDown = !1;
  _pendingWordCopyOnRelease = !1;
  _lastDragGlobalPoint = null;
  _autoScrollTimer;
  _autoScrollDirection = 0;
  _lastHoverCheck = 0;
  _lastHoverPosition = {
    x: -1,
    y: -1
  };
  _currentCursor = B3.DEFAULT;
  _lastHasSelection = !1;
  get controller() {
    return this._controller;
  }
  get focusNode() {
    return this._focusNode;
  }
  initState() {
    super.initState(), this._controller = new _1T(), this._controller.setOnCopyCallback(this.widget.onCopy), this._syncSelectionChangeListener(), this._attachScrollListener(), this._focusNode = this.widget.focusNode ?? new l8({
      debugLabel: "SelectionArea",
      onKey: this._handleKeyEvent.bind(this)
    }), this._globalClickCallback = this._handleGlobalClick.bind(this), ha.instance.addGlobalClickCallback(this._globalClickCallback);
  }
  didUpdateWidget(T) {
    if (super.didUpdateWidget(T), this._controller.setOnCopyCallback(this.widget.onCopy), T.onSelectionChanged !== this.widget.onSelectionChanged) this._syncSelectionChangeListener();
    if (T.scrollController !== this.widget.scrollController) this._detachScrollListener(T.scrollController), this._attachScrollListener();
  }
  build(T) {
    if (!this.widget.enabled) return this.widget.child;
    let R = new G0({
      onClick: this._handleMouseClick.bind(this),
      onDrag: this._handleMouseDrag.bind(this),
      onHover: this._handleMouseHover.bind(this),
      onExit: this._handleMouseExit.bind(this),
      cursor: this._currentCursor,
      opaque: !1,
      child: this.widget.child
    });
    return new C8({
      focusNode: this._focusNode,
      child: new Yb({
        controller: this._controller,
        child: R
      })
    });
  }
  _handleMouseClick(T) {
    if (T.button !== "left") return;
    if (this._ignoreNextClick) {
      this._ignoreNextClick = !1;
      return;
    }
    let R = {
        x: T.position.x,
        y: T.position.y
      },
      a = this._controller.hitTest(R);
    if (!a) {
      let {
        selectable: e
      } = this._getSelectableAtPoint(R);
      if (!e) return;
      this._startDragAtSelectable(e, R, !1, T.clickCount);
      return;
    }
    this._startDragAtSelectable(a, R, !0, T.clickCount);
  }
  _startDragAtSelectable(T, R, a, e) {
    this._lastDragGlobalPoint = R;
    let t = T.globalToLocal(R),
      r = a ? T.hitTestSelection(t) ?? T.nearestCaretPosition(t) : this._getOutOfBoundsPosition(T, R, t);
    if (e === 2) {
      let i = T.wordBoundary(r),
        c = {
          start: {
            selectableId: T.selectableId,
            offset: i.start
          },
          end: {
            selectableId: T.selectableId,
            offset: i.end
          }
        };
      this._wordDragBaseRange = c, this._wordDragMoved = !1, this._wordDragMouseDown = !0, this._pendingWordCopyOnRelease = !1;
      let s = {
          selectableId: T.selectableId,
          offset: i.start
        },
        A = {
          selectableId: T.selectableId,
          offset: i.end
        };
      this._controller.setSelection({
        anchor: s,
        extent: A
      }), this._captureGlobalMouse(), this._doubleClickTimer = setTimeout(() => {
        if (!this._wordDragBaseRange) {
          this._doubleClickTimer = void 0;
          return;
        }
        if (this._wordDragMouseDown) {
          this._pendingWordCopyOnRelease = !0, this._doubleClickTimer = void 0;
          return;
        }
        this._controller.autoCopySelection(), this._doubleClickTimer = void 0, this._wordDragBaseRange = null, this._wordDragMoved = !1, this._wordDragMouseDown = !1, this._pendingWordCopyOnRelease = !1, this._releaseGlobalMouse();
      }, 500);
      return;
    } else if (e === 3) {
      if (this._doubleClickTimer) clearTimeout(this._doubleClickTimer), this._doubleClickTimer = void 0;
      this._wordDragBaseRange = null, this._wordDragMoved = !1, this._wordDragMouseDown = !1, this._pendingWordCopyOnRelease = !1, this._releaseGlobalMouse();
      let i = T.getSelectionContext?.() ?? "line",
        c;
      if (i === "paragraph" && T.paragraphBoundary) c = T.paragraphBoundary(r);else c = T.lineBoundary(r);
      let s = {
          selectableId: T.selectableId,
          offset: c.start
        },
        A = {
          selectableId: T.selectableId,
          offset: c.end
        };
      this._controller.setSelection({
        anchor: s,
        extent: A
      }), this._tripleClickTimer = setTimeout(() => {
        this._controller.autoCopySelection(), this._tripleClickTimer = void 0;
      }, 200);
      return;
    }
    if (this._doubleClickTimer) clearTimeout(this._doubleClickTimer), this._doubleClickTimer = void 0;
    if (this._tripleClickTimer) clearTimeout(this._tripleClickTimer), this._tripleClickTimer = void 0;
    this._wordDragBaseRange = null, this._wordDragMoved = !1, this._wordDragMouseDown = !1, this._pendingWordCopyOnRelease = !1;
    let h = {
      selectableId: T.selectableId,
      offset: r.offset
    };
    this._controller.beginDrag(h), this._captureGlobalMouse();
  }
  _handleMouseDrag(T) {
    let R = {
      x: T.position.x,
      y: T.position.y
    };
    this._lastDragGlobalPoint = R, this._continueSelectionAtPoint(R);
  }
  _handleMouseHover(T) {
    let R = {
        x: T.position.x,
        y: T.position.y
      },
      a = Date.now();
    if (a - this._lastHoverCheck < 16) return;
    if (R.x === this._lastHoverPosition.x && R.y === this._lastHoverPosition.y) return;
    this._lastHoverCheck = a, this._lastHoverPosition = {
      x: R.x,
      y: R.y
    };
    let e;
    if (this._controller.isDragging()) e = B3.TEXT;else {
      let {
        selectable: t
      } = this._getSelectableAtPoint(R);
      if (t) {
        let r = t.globalToLocal(R);
        if ("getOnClickAtPosition" in t) e = t.getOnClickAtPosition(r.x, r.y) ? B3.POINTER : B3.TEXT;else e = B3.TEXT;
      } else e = B3.DEFAULT;
    }
    if (e !== this._currentCursor && this.mounted) {
      this._currentCursor = e;
      let t = this.context.findRenderObject();
      if (t instanceof si) t.cursor = e;
    }
  }
  _handleMouseExit(T) {
    if (this._currentCursor !== B3.DEFAULT && this.mounted) {
      this._currentCursor = B3.DEFAULT;
      let R = this.context.findRenderObject();
      if (R instanceof si) R.cursor = B3.DEFAULT;
    }
  }
  _handleGlobalClick = T => {
    if (T.event.button !== "left") return;
    let R = T.mouseTargets.some(a => this._isOpaqueMouseTarget(a));
    if (R) this._ignoreNextClick = !0;
    if (!this._controller.getSelection()) return;
    if (!this._controller.hitTest(T.globalPosition)) {
      if (R) return;
      this._controller.clear();
    }
  };
  _isOpaqueMouseTarget(T) {
    if (T instanceof si) return T.opaque;
    if (T && typeof T === "object" && "target" in T) {
      let R = T.target;
      return R instanceof si && R.opaque;
    }
    return !1;
  }
  _findClosestSelectable(T) {
    let R = this._controller.getAllSelectables();
    if (R.length === 0) return null;
    let a = R.filter(e => {
      let t = e.globalBounds();
      return T.y >= t.top && T.y <= t.bottom;
    });
    if (a.length > 0) return a.reduce((e, t) => {
      let r = t.globalBounds(),
        h = e.globalBounds(),
        i = Math.min(Math.abs(T.x - r.left), Math.abs(T.x - r.right)),
        c = Math.min(Math.abs(T.x - h.left), Math.abs(T.x - h.right));
      return i < c ? t : e;
    });
    return R.reduce((e, t) => {
      let r = t.globalBounds(),
        h = e.globalBounds(),
        i = T.y < r.top ? r.top - T.y : T.y > r.bottom ? T.y - r.bottom : 0,
        c = T.y < h.top ? h.top - T.y : T.y > h.bottom ? T.y - h.bottom : 0;
      if (i !== c) return i < c ? t : e;
      let s = T.x < r.left ? r.left - T.x : T.x > r.right ? T.x - r.right : 0,
        A = T.x < h.left ? h.left - T.x : T.x > h.right ? T.x - h.right : 0;
      return s < A ? t : e;
    });
  }
  _getSelectableAtPoint(T) {
    let R = this._controller.hitTest(T);
    if (R) return {
      selectable: R,
      wasHit: !0
    };
    return {
      selectable: this._findClosestSelectable(T),
      wasHit: !1
    };
  }
  _getOutOfBoundsPosition(T, R, a) {
    let e = T.globalBounds();
    if (R.y < e.top) return {
      offset: 0
    };
    if (R.y >= e.bottom) return {
      offset: T.textLength?.() ?? T.plainText?.length ?? 0
    };
    return T.nearestCaretPosition(a);
  }
  _handleGlobalMouseRelease = () => {
    if (this._wordDragMouseDown = !1, this._stopAutoScroll(), this._lastDragGlobalPoint = null, this._controller.isDragging()) {
      this._controller.endDrag(), this._releaseGlobalMouse();
      return;
    }
    if (this._wordDragBaseRange) {
      if (this._wordDragMoved || this._pendingWordCopyOnRelease) {
        if (this._doubleClickTimer) clearTimeout(this._doubleClickTimer), this._doubleClickTimer = void 0;
        this._controller.autoCopySelection(), this._wordDragBaseRange = null, this._wordDragMoved = !1, this._wordDragMouseDown = !1, this._pendingWordCopyOnRelease = !1, this._releaseGlobalMouse();
        return;
      }
      if (!this._doubleClickTimer) this._wordDragBaseRange = null, this._wordDragMoved = !1, this._wordDragMouseDown = !1, this._pendingWordCopyOnRelease = !1, this._releaseGlobalMouse();
    }
  };
  _captureGlobalMouse() {
    this._globalReleaseCallback = this._handleGlobalMouseRelease, ha.instance.addGlobalReleaseCallback(this._globalReleaseCallback);
  }
  _releaseGlobalMouse() {
    if (this._stopAutoScroll(), this._globalReleaseCallback) ha.instance.removeGlobalReleaseCallback(this._globalReleaseCallback), this._globalReleaseCallback = void 0;
    if (this._globalMoveCallback) this._globalMoveCallback = void 0;
  }
  _handleKeyEvent(T) {
    if (T.key === "a" && T.ctrlKey) return this._controller.selectAll(), "handled";
    if (T.key === "c" && T.ctrlKey) {
      let R = this._controller.copySelection();
      if (R) return eA.writeText(R).then(a => {
        this._controller.startCopyHighlight(), setTimeout(() => {
          this._controller.endCopyHighlight(), this._controller.clear();
        }, 300), this.widget.onCopy?.(R, a);
      }).catch(a => {
        J.error("Failed to write selection to clipboard:", a);
      }), "handled";
    }
    if (T.key === "Escape") {
      if (this._controller.copySelection()) return this._controller.clear(), "handled";
    }
    return "ignored";
  }
  _continueSelectionAtPoint(T) {
    let {
      selectable: R,
      wasHit: a
    } = this._getSelectableAtPoint(T);
    if (!R) {
      this._updateAutoScroll(T);
      return;
    }
    if (this._wordDragBaseRange) {
      if (this._doubleClickTimer) clearTimeout(this._doubleClickTimer), this._doubleClickTimer = void 0;
      let h = R.globalToLocal(T),
        i = R.nearestCaretPosition(h);
      if (!a) i = this._getOutOfBoundsPosition(R, T, h);
      let c = R.wordBoundary(i),
        s = {
          start: {
            selectableId: R.selectableId,
            offset: c.start
          },
          end: {
            selectableId: R.selectableId,
            offset: c.end
          }
        },
        A = Xk0(this._wordDragBaseRange, s, (l, o) => this._controller.comparePositions(l, o));
      this._wordDragMoved = !0, this._controller.setSelection({
        anchor: A.start,
        extent: A.end
      }), this._updateAutoScroll(T);
      return;
    }
    if (!this._controller.isDragging()) {
      this._stopAutoScroll();
      return;
    }
    let e = R.globalToLocal(T),
      t = R.nearestCaretPosition(e);
    if (!a) t = this._getOutOfBoundsPosition(R, T, e);
    let r = {
      selectableId: R.selectableId,
      offset: t.offset
    };
    this._controller.updateDrag(r), this._updateAutoScroll(T);
  }
  _syncSelectionChangeListener() {
    if (this._selectionChangeListenerCleanup) this._selectionChangeListenerCleanup(), this._selectionChangeListenerCleanup = void 0;
    if (this._selectionChangeListener) this._selectionChangeListener = void 0;
    if (!this.widget.onSelectionChanged) return;
    this._selectionChangeListener = () => {
      let T = this._controller.getSelection() !== null;
      if (T !== this._lastHasSelection) this._lastHasSelection = T, this.widget.onSelectionChanged?.(T);
    }, this._selectionChangeListenerCleanup = this._controller.addListener(this._selectionChangeListener);
  }
  _attachScrollListener() {
    if (!this.widget.scrollController) return;
    this._scrollChangeListener = () => {
      if (!this._lastDragGlobalPoint) return;
      if (!this._controller.isDragging() && !this._wordDragBaseRange) return;
      this._continueSelectionAtPoint(this._lastDragGlobalPoint);
    }, this.widget.scrollController.addListener(this._scrollChangeListener);
  }
  _detachScrollListener(T = this.widget.scrollController) {
    if (T && this._scrollChangeListener) T.removeListener(this._scrollChangeListener);
    this._scrollChangeListener = void 0;
  }
  _updateAutoScroll(T) {
    if (!this.widget.scrollController || !this.widget.getScrollBounds) {
      this._stopAutoScroll();
      return;
    }
    let R = this.widget.getScrollBounds();
    if (!R) {
      this._stopAutoScroll();
      return;
    }
    let a = 0;
    if (T.y <= R.top + this.widget.autoScrollThreshold) a = -1;else if (T.y >= R.bottom - this.widget.autoScrollThreshold) a = 1;
    if (a === this._autoScrollDirection && (a === 0 || this._autoScrollTimer)) return;
    if (this._stopAutoScroll(), this._autoScrollDirection = a, a === 0) return;
    this._autoScrollTimer = setInterval(() => {
      let e = this.widget.scrollController;
      if (!e) {
        this._stopAutoScroll();
        return;
      }
      let t = e.offset;
      if (this._autoScrollDirection < 0) e.scrollUp(this.widget.autoScrollStep);else e.scrollDown(this.widget.autoScrollStep);
      if (e.offset === t) this._stopAutoScroll();
    }, this.widget.autoScrollIntervalMs);
  }
  _stopAutoScroll() {
    if (this._autoScrollTimer) clearInterval(this._autoScrollTimer), this._autoScrollTimer = void 0;
    this._autoScrollDirection = 0;
  }
  dispose() {
    if (this._doubleClickTimer) clearTimeout(this._doubleClickTimer), this._doubleClickTimer = void 0;
    if (this._tripleClickTimer) clearTimeout(this._tripleClickTimer), this._tripleClickTimer = void 0;
    if (this._wordDragBaseRange = null, this._wordDragMoved = !1, this._wordDragMouseDown = !1, this._pendingWordCopyOnRelease = !1, this._lastDragGlobalPoint = null, this._stopAutoScroll(), this._releaseGlobalMouse(), this._globalClickCallback) ha.instance.removeGlobalClickCallback(this._globalClickCallback), this._globalClickCallback = void 0;
    if (this._detachScrollListener(), this._controller.dispose(), !this.widget.focusNode) this._focusNode.dispose();
    super.dispose();
  }
};
f1T = class f1T extends NR {
  axisDirection;
  controller;
  physics;
  viewportBuilder;
  autofocus;
  keyboardScrolling;
  constructor({
    key: T,
    axisDirection: R = "vertical",
    controller: a,
    physics: e,
    viewportBuilder: t,
    autofocus: r = !1,
    keyboardScrolling: h = !0
  }) {
    super(T ? {
      key: T
    } : {});
    this.axisDirection = R, this.controller = a, this.physics = e, this.viewportBuilder = t, this.autofocus = r, this.keyboardScrolling = h;
  }
  createState() {
    return new I1T();
  }
};
I3 = class I3 extends B0 {
  child;
  controller;
  scrollDirection;
  autofocus;
  position;
  keyboardScrolling;
  constructor({
    key: T,
    child: R,
    controller: a,
    scrollDirection: e = "vertical",
    autofocus: t = !0,
    position: r = "top",
    keyboardScrolling: h = !0
  }) {
    super(T ? {
      key: T
    } : {});
    this.child = R, this.controller = a, this.scrollDirection = e, this.autofocus = t, this.position = r, this.keyboardScrolling = h;
  }
  build(T) {
    return new f1T({
      controller: this.controller,
      axisDirection: this.scrollDirection,
      autofocus: this.autofocus,
      keyboardScrolling: this.keyboardScrolling,
      viewportBuilder: (R, a, e, t) => {
        return new $1T(this.child, {
          axisDirection: this.scrollDirection,
          offset: a,
          scrollController: t || this.controller,
          position: this.position
        });
      }
    });
  }
};
Gm = class Gm extends NR {
  controller;
  placeholder;
  style;
  onChanged;
  onSubmitted;
  onOpenInEditor;
  maxWidth;
  maxLines;
  minLines;
  expands;
  wrap;
  enabled;
  focusNode;
  autofocus;
  submitKey;
  prompts;
  clipboard;
  ensureVisible;
  onCopy;
  copyOnSelectionEnabled;
  onBackspaceWhenEmpty;
  _ownsController;
  constructor({
    key: T,
    controller: R,
    placeholder: a = "",
    style: e = {},
    onChanged: t,
    onSubmitted: r,
    onOpenInEditor: h,
    maxWidth: i,
    maxLines: c = 1,
    minLines: s = 1,
    expands: A = !1,
    wrap: l = !1,
    enabled: o = !0,
    focusNode: n,
    autofocus: p = !1,
    submitKey: _,
    prompts: m = [],
    clipboard: b,
    ensureVisible: y = !1,
    onCopy: u,
    copyOnSelectionEnabled: P = !1,
    onBackspaceWhenEmpty: k
  }) {
    super(T ? {
      key: T
    } : void 0);
    if (c !== null && s > c) throw Error("minLines must be <= maxLines");
    this._ownsController = !R, this.controller = R || new wc(), this.placeholder = a, this.style = {
      backgroundColor: LT.default(),
      textColor: LT.default(),
      border: h9.all(new e9(LT.default(), 1, "rounded")),
      padding: TR.symmetric(1, 0),
      cursorColor: LT.default(),
      placeholderColor: LT.index(8),
      ...e
    }, this.onChanged = t, this.onSubmitted = r, this.onOpenInEditor = h, this.maxWidth = i, this.maxLines = c, this.minLines = s, this.expands = A, this.wrap = l, this.enabled = o, this.focusNode = n, this.autofocus = p, this.prompts = m, this.clipboard = b ?? eA, this.ensureVisible = y, this.onCopy = u, this.copyOnSelectionEnabled = P, this.onBackspaceWhenEmpty = k, this.submitKey = _ ?? {
      character: "Enter",
      modifiers: c === 1 ? {} : {
        ctrl: !0
      }
    };
  }
  get isMultiline() {
    return this.maxLines === null || this.maxLines > 1 || this.minLines > 1;
  }
  createState() {
    return new sP();
  }
};
sP = class sP extends wR {
  static _allInstances = new Set();
  static AUTO_COPY_DELAY_MS = 500;
  static AUTO_COPY_HIGHLIGHT_DURATION_MS = 300;
  _hScrollOffset = 0;
  _vScrollOffset = 0;
  _textChangeListener;
  _scrollListener;
  _focusChangeListener;
  _internalFocusNode = null;
  _lastLayoutLineCount = 0;
  _isDragging = !1;
  _dragSelectionMode = null;
  _wordDragBaseRange = null;
  _didMouseMove = !1;
  _globalReleaseCallback;
  _copyHighlightActive = !1;
  _copyHighlightTimer;
  _autoCopyTimer;
  _allowCursorOffscreen = !1;
  get effectiveFocusNode() {
    return this.widget.focusNode ?? this._internalFocusNode;
  }
  initState() {
    if (super.initState(), sP._allInstances.add(this), !this.widget.focusNode) this._internalFocusNode = new l8({
      debugLabel: `TextField(${this.widget.key?.value || "unlabeled"})`
    });
    if (this.widget.prompts.length > 0) this.widget.controller.setPromptRules(this.widget.prompts);
    this._textChangeListener = () => {
      if (this._updateScrollOffset(this.context), this.setState(() => {}), this.widget.isMultiline) {
        let T = this.widget.controller.getLayoutLines().length;
        if (T !== this._lastLayoutLineCount) {
          this._lastLayoutLineCount = T;
          let R = this.context.element,
            a = R.renderObject;
          if (a) {
            a.markNeedsLayout();
            let e = R.parent;
            while (e?.renderObject) e.renderObject.markNeedsLayout(), e = e.parent;
          }
        }
        k8.instance.addPostFrameCallback(() => {
          this._ensureCursorVisibleInAncestorScroll();
        });
      }
      if (this.widget.onChanged) this.widget.onChanged(this.widget.controller.text);
    }, this.widget.controller.addListener(this._textChangeListener), this._scrollListener = () => {
      let T = this.context.element.renderObject;
      if (T && nx0(T)) T.scrollOffset = this.widget.controller.getScrollOffset();
    }, this.widget.controller.addScrollListener(this._scrollListener), this._focusChangeListener = T => {
      if (T.hasFocus) this._updateScrollOffset(this.context), this.setState(() => {});else this._endDrag(), this.setState(() => {});
    }, this.effectiveFocusNode.addListener(this._focusChangeListener);
  }
  didUpdateWidget(T) {
    if (super.didUpdateWidget(T), this.widget.prompts !== T.prompts) this.widget.controller.setPromptRules(this.widget.prompts);
  }
  dispose() {
    try {
      if (sP._allInstances.delete(this), this._releaseGlobalMouse(), this._internalFocusNode) {
        try {
          this._internalFocusNode.dispose();
        } catch {}
        this._internalFocusNode = null;
      }
      if (this._textChangeListener) try {
        this.widget.controller.removeListener(this._textChangeListener);
      } catch {}
      if (this._scrollListener) try {
        this.widget.controller.removeScrollListener(this._scrollListener);
      } catch {}
      if (this._focusChangeListener) try {
        this.effectiveFocusNode.removeListener(this._focusChangeListener);
      } catch {}
      if (this._clearCopyHighlight(), this._clearAutoCopyTimer(), this.widget._ownsController) try {
        this.widget.controller.dispose();
      } catch {}
      super.dispose();
    } catch {}
  }
  _captureGlobalMouse() {
    this._globalReleaseCallback = () => {
      if (this._isDragging) this._endDrag();
    }, ha.instance.addGlobalReleaseCallback(this._globalReleaseCallback);
  }
  _releaseGlobalMouse() {
    if (this._globalReleaseCallback) ha.instance.removeGlobalReleaseCallback(this._globalReleaseCallback), this._globalReleaseCallback = void 0;
  }
  async _endDrag() {
    let T = this._didMouseMove,
      R = this._dragSelectionMode;
    if (this._isDragging = !1, this._dragSelectionMode = null, this._wordDragBaseRange = null, this._didMouseMove = !1, this._releaseGlobalMouse(), T || R === "word") this._scheduleAutoCopy();
  }
  async _autoCopySelection() {
    if (!this.widget.copyOnSelectionEnabled) return;
    let T = this.widget.controller.selectedText;
    if (T && T.length > 0) {
      let R = !1;
      try {
        R = await this.widget.clipboard.writeText(T);
      } catch (a) {
        J.debug("Failed to write selection to clipboard:", a);
      }
      this._startCopyHighlight(), this.widget.onCopy?.(T, R);
    }
  }
  _scheduleAutoCopy() {
    this._clearAutoCopyTimer(), this._autoCopyTimer = setTimeout(() => {
      this._autoCopySelection(), this._autoCopyTimer = void 0;
    }, sP.AUTO_COPY_DELAY_MS);
  }
  _startCopyHighlight() {
    this._clearHighlightTimer(), this._copyHighlightActive = !0, this.setState(() => {}), this._copyHighlightTimer = setTimeout(() => {
      this._copyHighlightActive = !1, this.setState(() => {}), this._copyHighlightTimer = void 0;
    }, sP.AUTO_COPY_HIGHLIGHT_DURATION_MS);
  }
  _clearCopyHighlight() {
    this._clearHighlightTimer(), this._copyHighlightActive = !1;
  }
  _clearHighlightTimer() {
    if (this._copyHighlightTimer) clearTimeout(this._copyHighlightTimer), this._copyHighlightTimer = void 0;
  }
  _clearAutoCopyTimer() {
    if (this._autoCopyTimer) clearTimeout(this._autoCopyTimer), this._autoCopyTimer = void 0;
  }
  _updateScrollOffset(T) {
    let R = this.widget.controller,
      a = this.widget.isMultiline;
    if (T) {
      let e = I9.of(T).supportsEmojiWidth,
        t = this.widget.style,
        r = t.padding || TR.all(0),
        h = t.border ? 1 : 0,
        i = T.findRenderObject()?.size?.width || 120,
        c = (this.widget.maxWidth || i) - h * 2 - r.left - r.right;
      R.updateLayoutConfig(Math.max(1, c), this.widget.wrap ? "word" : "none", e);
    }
    if (this._allowCursorOffscreen = !1, a) this._updateVerticalScrollOffset(T);else this._updateHorizontalScrollOffset(T);
  }
  _ensureCursorVisibleInAncestorScroll() {
    if (!this.widget.ensureVisible) return;
    if (!this.widget.isMultiline || !this.widget.expands) return;
    let T = this.widget.controller,
      R = T.getLayoutLines(),
      a = T.cursorPosition,
      e = 0;
    for (let A = 0; A < R.length; A++) {
      let l = R[A];
      if (a >= l.startOffset && a <= l.endOffset) {
        e = A;
        break;
      }
    }
    let t = 1,
      r = this.widget.style,
      h = r.padding || TR.all(0),
      i = r.border ? 1 : 0,
      c = h.top + i + e * t,
      s = c + t;
    E1T(this.context, {
      top: c,
      bottom: s
    }, {
      padding: 1
    });
  }
  _updateHorizontalScrollOffset(T) {
    let R = this.widget.controller,
      a = R.cursorPosition,
      e = R.graphemes,
      t = !1;
    if (T) t = I9.of(T).supportsEmojiWidth;
    let r = this.widget.style,
      h = r.padding || TR.all(0),
      i = r.border ? 1 : 0,
      c = T?.findRenderObject()?.size?.width || 120,
      s = (this.widget.maxWidth || c) - i * 2 - h.left - h.right;
    if (s <= 0) return;
    let A = 0;
    for (let l = this._hScrollOffset; l < a && l < e.length; l++) A += J8(e[l], t);
    if (A >= s) {
      let l = this._hScrollOffset;
      while (A >= s && l < a) {
        let o = J8(e[l], t);
        A -= o, l++;
      }
      this._hScrollOffset = l;
    } else if (a < this._hScrollOffset) this._hScrollOffset = a;
    this._hScrollOffset = Math.max(0, Math.min(this._hScrollOffset, Math.max(0, e.length - 1)));
  }
  _updateVerticalScrollOffset(T) {
    let R = this.widget.controller,
      a = R.cursorPosition,
      e = R.getLayoutLines(),
      t = -1;
    for (let n = 0; n < e.length; n++) {
      let p = e[n];
      if (a >= p.startOffset && a <= p.endOffset) {
        t = n;
        break;
      }
    }
    if (t === -1) return;
    let r = e.length,
      h = this.widget.minLines,
      i = this.widget.maxLines === null ? Number.MAX_SAFE_INTEGER : this.widget.maxLines,
      c;
    if (this.widget.expands) c = r;else c = Math.max(h, Math.min(r, i));
    let s = c;
    if (T) {
      let n = T.findRenderObject();
      if (n?.size) {
        let p = this.widget.style,
          _ = p.padding || TR.all(0),
          m = p.border ? 1 : 0;
        s = n.size.height - _.top - _.bottom - m * 2;
      }
    }
    if (s = Math.max(1, Math.floor(s)), r <= s) {
      if (this._vScrollOffset !== 0) this._vScrollOffset = 0, R.setScrollOffset(0);
      return;
    }
    let A = R.getScrollOffset(),
      l = A;
    if (!this._allowCursorOffscreen) {
      if (t < A) l = t;else if (t >= A + s) l = t - s + 1;
    }
    let o = Math.max(0, r - s);
    if (l = Math.floor(Math.max(0, Math.min(l, o))), l !== this._vScrollOffset) this._vScrollOffset = l, R.setScrollOffset(l);
  }
  build(T) {
    let R = Z0.maybeOf(T),
      a = R?.colorScheme.border ?? LT.default(),
      e = R?.colorScheme.cursor ?? LT.default(),
      t = {
        ...this.widget.style,
        border: this.widget.style.border === null ? null : this.widget.style.border ?? h9.all(new e9(a, 1, "rounded")),
        cursorColor: this.widget.style.cursorColor && this.widget.style.cursorColor.type !== "default" ? this.widget.style.cursorColor : e
      },
      r = _ => {
        let m = this.widget.controller;
        if (!this.widget.enabled) return "ignored";
        let b = this.widget.submitKey,
          y = b.character,
          u = b.modifiers?.shift ?? !1;
        if (u && b.character.length === 1 && b.character.toLowerCase() === b.character) y = b.character.toUpperCase();
        let P = b.modifiers?.ctrl ?? !1,
          k = b.modifiers?.alt ?? !1,
          x = b.modifiers?.meta ?? !1,
          f = _.key === y && _.shiftKey === u && _.ctrlKey === P && _.altKey === k && _.metaKey === x,
          v = b.character === "Enter" && x && !P && !k && _.key === y && _.shiftKey === u && _.ctrlKey && !_.altKey && !_.metaKey;
        if (f && _.key === "Enter") {
          let {
            graphemes: g,
            cursorPosition: I
          } = m;
          if (I > 0 && g[I - 1] === "\\") return m.deleteText(1), m.insertText(`
`), "handled";
        }
        if (f || v) {
          if (this.widget.onSubmitted) this.widget.onSubmitted(m.text);
          return "handled";
        }
        if (_.key === "Enter") {
          if (_.shiftKey && this.widget.isMultiline) return m.insertText(`
`), "handled";
          if (_.altKey && this.widget.isMultiline) return m.insertText(`
`), "handled";
          if (!_.shiftKey && !_.altKey && !_.ctrlKey && !_.metaKey && this.widget.isMultiline) return m.insertText(`
`), "handled";
          return "ignored";
        } else if (_.key === "Backspace") {
          try {
            if (m.cursorPosition === 0 && this.widget.onBackspaceWhenEmpty) {
              if (this.widget.onBackspaceWhenEmpty()) return "handled";
            }
            if (_.altKey) m.deleteWordLeft();else m.deleteSelectedOrText(1);
          } catch (g) {
            throw J.error("TextField: Error in deleteText:", g), g;
          }
          return "handled";
        } else if (_.key === "Delete") {
          if (m.hasSelection) m.deleteSelectedText();else m.deleteForward(1);
          return "handled";
        } else if (_.key === "Tab") return "ignored";else if (_.key === "Escape") return "ignored";
        if (_.ctrlKey) {
          if (_.key === "g") {
            if (this.widget.onOpenInEditor) this.widget.onOpenInEditor(m.text);
            return "handled";
          }
          if (_.key === "a") {
            if (this.widget.isMultiline) m.moveCursorToLineStart(_.shiftKey);else m.moveCursorToStart(_.shiftKey);
            return "handled";
          } else if (_.key === "e") {
            if (this.widget.isMultiline) m.moveCursorToLineEnd(_.shiftKey);else m.moveCursorToEnd(_.shiftKey);
            return "handled";
          } else if (_.key === "u") return m.deleteToLineStart(), "handled";else if (_.key === "k") return m.deleteToLineEnd(), "handled";else if (_.key === "f") return m.moveCursorRight(1, _.shiftKey), "handled";else if (_.key === "b") return m.moveCursorLeft(1, _.shiftKey), "handled";else if (_.key === "n") {
            let {
                line: g,
                column: I
              } = m.cursorTextPosition,
              S = m.getLineCount();
            if (g === S - 1) {
              let O = m.getLine(g),
                j = B9(O).length;
              if (I === j) return "ignored";else return m.moveCursorToLineEnd(_.shiftKey), "handled";
            } else {
              let O = m.cursorPosition;
              return m.moveCursorDown(1, _.shiftKey), m.cursorPosition === O ? "ignored" : "handled";
            }
          } else if (_.key === "p") {
            let {
              line: g
            } = m.cursorTextPosition;
            if (g === 0) {
              let I = m.cursorPosition;
              return m.moveCursorToLineStart(_.shiftKey), m.cursorPosition === I ? "ignored" : "handled";
            } else {
              let I = m.cursorPosition;
              return m.moveCursorUp(1, _.shiftKey), m.cursorPosition === I ? "ignored" : "handled";
            }
          } else if (_.key === "d") return m.deleteForward(1), "handled";else if (_.key === "h") return m.deleteText(1), "handled";else if (_.key === "ArrowLeft") return m.moveCursorWordBoundary(-1, _.shiftKey), "handled";else if (_.key === "ArrowRight") return m.moveCursorWordBoundary(1, _.shiftKey), "handled";else if (_.key === "w") return m.deleteWordLeft(), "handled";else if (_.key === "y") return m.yankText(), "handled";else if (_.key === "j" && this.widget.isMultiline) return m.insertText(`
`), "handled";
        } else if (_.altKey || _.metaKey) {
          if (_.metaKey && _.key === "ArrowLeft") {
            if (this.widget.isMultiline) m.moveCursorToLineStart(_.shiftKey);else m.moveCursorToStart(_.shiftKey);
            return "handled";
          } else if (_.metaKey && _.key === "ArrowRight") {
            if (this.widget.isMultiline) m.moveCursorToLineEnd(_.shiftKey);else m.moveCursorToEnd(_.shiftKey);
            return "handled";
          } else if (_.key === "ArrowUp") {
            let S = m.cursorPosition,
              O = m.getCurrentLayoutLine(S);
            if (!O) return "ignored";
            let j = S === O.line.startOffset;
            if (O.index === 0 && j) return "ignored";else if (O.index === 0) return m.moveCursorToPosition(O.line.startOffset, _.shiftKey), "handled";else {
              let d = m.cursorPosition;
              return m.moveCursorUp(1, _.shiftKey), m.cursorPosition === d ? "ignored" : "handled";
            }
          } else if (_.key === "ArrowDown") {
            let S = m.cursorPosition,
              O = m.getLayoutLines(),
              j = m.getCurrentLayoutLine(S);
            if (!j) return "ignored";
            let d = j.index === O.length - 1,
              C = S === j.line.endOffset;
            if (d && C) return "ignored";else if (d) return m.moveCursorToPosition(j.line.endOffset, _.shiftKey), "handled";else {
              let L = m.cursorPosition;
              return m.moveCursorDown(1, _.shiftKey), m.cursorPosition === L ? "ignored" : "handled";
            }
          }
          let g = _.key === "ArrowLeft" || _.key.toLowerCase() === "b",
            I = _.key === "ArrowRight" || _.key.toLowerCase() === "f";
          if (g || I) return m.moveCursorWordBoundary(g ? -1 : 1, _.shiftKey), "handled";
          if (_.key.toLowerCase() === "d") {
            let S = m.text.length;
            if (m.deleteWordRight(), m.text.length < S) return "handled";
            return "ignored";
          }
        } else if (_.key === "ArrowLeft") return m.moveCursorLeft(1, _.shiftKey), "handled";else if (_.key === "ArrowRight") return m.moveCursorRight(1, _.shiftKey), "handled";else if (_.key === "ArrowUp") {
          if (!this.widget.isMultiline) return "ignored";
          let g = m.cursorPosition,
            I = m.getCurrentLayoutLine(g);
          if (!I) return "ignored";
          let S = g === I.line.startOffset;
          if (I.index === 0 && S) return "ignored";else if (I.index === 0) return m.moveCursorToPosition(I.line.startOffset, _.shiftKey), "handled";else {
            let O = m.cursorPosition;
            return m.moveCursorUp(1, _.shiftKey), m.cursorPosition === O ? "ignored" : "handled";
          }
        } else if (_.key === "ArrowDown") {
          if (!this.widget.isMultiline) return "ignored";
          let g = m.cursorPosition,
            I = m.getLayoutLines(),
            S = m.getCurrentLayoutLine(g);
          if (!S) return "ignored";
          let O = S.index === I.length - 1,
            j = g === S.line.endOffset;
          if (O && j) return "ignored";else if (O) return m.moveCursorToPosition(S.line.endOffset, _.shiftKey), "handled";else {
            let d = m.cursorPosition;
            return m.moveCursorDown(1, _.shiftKey), m.cursorPosition === d ? "ignored" : "handled";
          }
        } else if (_.key === "Home" || _.key === "End") return "ignored";else if (_.key === "PageUp" || _.key === "PageDown") return "ignored";
        if (_.key && !cx0(_)) return m.insertText(_.key), "handled";
        return "ignored";
      },
      h = _ => {
        if (!this.widget.enabled) return "ignored";
        let m = this.widget.controller,
          b = this.widget.isMultiline,
          y = _.text;
        if (!b) y = y.replace(/[\r\n]+/g, " ");
        return m.insertText(y), "handled";
      },
      i = _ => {
        if (!this.widget.enabled || !this.widget.isMultiline) return !1;
        let m = this.widget.controller,
          b = m.getLayoutLines();
        if (b.length <= 1) return !1;
        let y = m.getScrollOffset(),
          u = 3;
        if (_.direction === "up") {
          let P = Math.max(0, y - u);
          if (P === y) return !1;
          y = P;
        } else {
          let P = this.widget.style,
            k = P.padding || TR.all(0),
            x = P.border ? 1 : 0,
            f = (T.findRenderObject()?.size?.height || 10) - x * 2 - k.top - k.bottom,
            v = Math.max(0, b.length - f),
            g = Math.min(v, y + u);
          if (g === y) return !1;
          y = g;
        }
        return this._allowCursorOffscreen = !0, m.setScrollOffset(y), this._vScrollOffset = y, !0;
      },
      c = _ => {
        if (!this.widget.enabled) return;
        if (_.button === "middle") {
          this.widget.clipboard.readPrimarySelection().then(m => {
            if (m) h({
              type: "paste",
              text: m
            });
          }).catch(m => {
            J.debug("Failed to read primary selection for middle-click paste:", m);
          });
          return;
        }
        if (_.button === "left") {
          this._clearCopyHighlight();
          let m = l(_.localPosition.x, _.localPosition.y);
          if (_.clickCount === 3) this._clearAutoCopyTimer(), this._isDragging = !1, this._dragSelectionMode = null, this._wordDragBaseRange = null, this._releaseGlobalMouse(), this.widget.controller.selectLineAt(m), this._scheduleAutoCopy();else if (_.clickCount === 2) {
            this._clearAutoCopyTimer();
            let b = this.widget.controller.getWordBoundariesAt(m);
            if (this.widget.controller.selectWordAt(m), b.start === b.end) {
              this._isDragging = !1, this._dragSelectionMode = null, this._wordDragBaseRange = null, this._releaseGlobalMouse();
              return;
            }
            this._isDragging = !0, this._dragSelectionMode = "word", this._wordDragBaseRange = b, this._didMouseMove = !1, this._captureGlobalMouse();
          } else if (_.clickCount === 1) this._clearAutoCopyTimer(), this.widget.controller.startSelectionAt(m), this._isDragging = !0, this._dragSelectionMode = "character", this._wordDragBaseRange = null, this._didMouseMove = !1, this.effectiveFocusNode.requestFocus(), this._captureGlobalMouse();
        }
      },
      s = _ => {
        if (!this.widget.enabled || !this._isDragging) return;
        if (_.button !== "left") return;
        this._didMouseMove = !0;
        let m = l(_.localPosition.x, _.localPosition.y);
        if (this._dragSelectionMode === "word" && this._wordDragBaseRange) {
          let b = this.widget.controller.getWordBoundariesAt(m),
            y = this._wordDragBaseRange;
          if (b.end <= y.start) {
            this.widget.controller.setSelectionRange(b.start, y.end);
            return;
          }
          if (b.start >= y.end) {
            this.widget.controller.setSelectionRange(y.start, b.end);
            return;
          }
          this.widget.controller.setSelectionRange(y.start, y.end);
          return;
        }
        this.widget.controller.extendSelectionTo(m);
      },
      A = _ => {
        if (_.button === "left") this._endDrag();
      },
      l = (_, m) => {
        let b = I9.of(T).supportsEmojiWidth,
          y = this.widget.style.padding || TR.all(0),
          u = this.widget.style.border ? 1 : 0,
          P = _ - u - y.left,
          k = m - u - y.top,
          x = this.widget.controller.text,
          f = this.widget.prompts.find(S => S.match(x)),
          v = this.widget.controller.graphemes,
          g = this.widget.isMultiline,
          I = 0;
        if (g) {
          let S = this.widget.controller.getLayoutLines(),
            O = Math.max(0, Math.min(Math.floor(k) + this.widget.controller.getScrollOffset(), S.length - 1));
          if (f && O === 0) {
            P -= f.spacing ?? 0;
            let j = q8(f.display, b),
              d = f.spacing ?? 0;
            if (P < j + d) return j;
          }
          if (O < S.length) {
            let j = S[O],
              d = v.slice(j.startOffset, j.endOffset),
              C = 0,
              L = 0;
            for (let w = 0; w < d.length; w++) {
              let D = J8(d[w], b),
                B = C + D;
              if (P <= B) {
                if ((P - C) / D < 0.6) L = w;else L = w + 1;
                break;
              }
              C = B, L = w + 1;
            }
            I = j.startOffset + L;
          }
        } else {
          if (f) {
            P -= f.spacing ?? 0;
            let O = q8(f.display, b),
              j = f.spacing ?? 0;
            if (P < O + j) return O;
          }
          let S = 0;
          for (let O = 0; O < v.length; O++) {
            let j = J8(v[O], b),
              d = S + j;
            if (P <= d) {
              if ((P - S) / j < 0.6) I = O;else I = O + 1;
              break;
            }
            S = d, I = O + 1;
          }
        }
        return I;
      },
      o = I9.of(T).supportsEmojiWidth,
      n = new C1T({
        controller: this.widget.controller,
        style: t,
        placeholder: this.widget.placeholder,
        hScrollOffset: this._hScrollOffset,
        vScrollOffset: this._vScrollOffset,
        maxWidth: this.widget.maxWidth,
        maxLines: this.widget.maxLines,
        minLines: this.widget.minLines,
        expands: this.widget.expands,
        wrap: this.widget.wrap,
        enabled: this.widget.enabled,
        focusNode: this.effectiveFocusNode,
        emojiSupported: o,
        prompts: this.widget.prompts,
        copyHighlightActive: this._copyHighlightActive
      }),
      p = new G0({
        onClick: c,
        onDrag: s,
        onRelease: A,
        onScroll: i,
        cursor: this.widget.enabled ? B3.TEXT : B3.DEFAULT,
        child: n
      });
    return new C8({
      key: this.widget.key ?? void 0,
      autofocus: this.widget.autofocus,
      focusNode: this.effectiveFocusNode,
      onKey: r,
      onPaste: h,
      child: p
    });
  }
};
C1T = class C1T extends to {
  controller;
  style;
  placeholder;
  hScrollOffset;
  vScrollOffset;
  maxWidth;
  maxLines;
  minLines;
  expands;
  wrap;
  enabled;
  focusNode;
  emojiSupported;
  prompts;
  copyHighlightActive;
  constructor({
    controller: T,
    style: R,
    placeholder: a,
    hScrollOffset: e,
    vScrollOffset: t,
    maxWidth: r,
    maxLines: h,
    minLines: i,
    expands: c,
    wrap: s,
    enabled: A,
    focusNode: l,
    emojiSupported: o,
    prompts: n,
    copyHighlightActive: p = !1
  }) {
    super({});
    this.controller = T, this.style = R, this.placeholder = a, this.hScrollOffset = e, this.vScrollOffset = t, this.maxWidth = r, this.maxLines = h, this.minLines = i, this.expands = c, this.wrap = s, this.enabled = A, this.focusNode = l, this.emojiSupported = o, this.prompts = n, this.copyHighlightActive = p;
  }
  createRenderObject() {
    return new L1T(this.controller, this.style, this.placeholder, this.hScrollOffset, this.maxWidth, this.maxLines, this.minLines, this.expands, this.wrap, this.enabled, this.focusNode, this.emojiSupported, this.prompts, this.copyHighlightActive);
  }
  updateRenderObject(T) {
    T.updateProperties(this.controller, this.style, this.placeholder, this.hScrollOffset, this.vScrollOffset, this.maxWidth, this.maxLines, this.minLines, this.expands, this.wrap, this.enabled, this.focusNode, this.emojiSupported, this.prompts, this.copyHighlightActive);
  }
};
L1T = class L1T extends O9 {
  _controller;
  _style;
  _placeholder;
  _hScrollOffset;
  _maxWidth;
  _maxLines;
  _minLines;
  _expands;
  _wrap;
  _enabled;
  _focusNode;
  _emojiSupported;
  _prompts;
  _copyHighlightActive;
  constructor(T, R, a, e, t, r, h, i, c, s = !0, A, l = !1, o = [], n = !1) {
    super();
    this._controller = T, this._style = R, this._placeholder = a, this._hScrollOffset = e, this._maxWidth = t, this._maxLines = r, this._minLines = h, this._expands = i, this._wrap = c, this._enabled = s, this._focusNode = A, this._emojiSupported = l, this._prompts = o, this._copyHighlightActive = n;
  }
  get isMultiline() {
    return this._maxLines === null || this._maxLines > 1 || this._minLines > 1;
  }
  set scrollOffset(T) {
    this.markNeedsPaint();
  }
  updateProperties(T, R, a, e, t, r, h, i, c, s, A = !0, l, o = !1, n = [], p = !1) {
    this._controller = T, this._style = R, this._placeholder = a, this._hScrollOffset = e, this._maxWidth = r, this._maxLines = h, this._minLines = i, this._expands = c, this._wrap = s, this._enabled = A, this._focusNode = l, this._emojiSupported = o, this._prompts = n, this._copyHighlightActive = p, this.markNeedsLayout(), this.markNeedsPaint();
  }
  performLayout() {
    super.performLayout();
    let T = this._lastConstraints;
    e8(!!T, "performLayout called without constraints");
    let R = this._style.padding || TR.all(0),
      a = this._style.border ? 1 : 0,
      e = R.left + R.right + a * 2 + 1,
      t = R.top + R.bottom + a * 2 + 1,
      r = this._maxWidth || T.maxWidth,
      h = Math.max(e, Number.isFinite(r) ? Math.min(r, T.maxWidth) : e),
      i;
    if (this._expands) {
      if (T.minHeight === T.maxHeight) i = T.maxHeight;else {
        let A = this.getMinIntrinsicHeight(h);
        i = Math.min(Math.max(A, T.minHeight), T.maxHeight);
      }
    } else {
      let A = this.getMinIntrinsicHeight(h);
      if (i = Math.max(t, A), i > T.maxHeight) i = T.maxHeight;
    }
    this.setSize(h, i);
    let c = this.getPromptPrefixWidth(),
      s = h - a * 2 - R.left - R.right - c;
    if (this._controller.updateLayoutConfig(Math.max(1, s), this._wrap ? "word" : "none", this._emojiSupported), this.isMultiline && this._expands) this._updateScrollOffsetFromLayout(T, i);
  }
  getPromptPrefixWidth() {
    let T = this._controller.text;
    return this._prompts.find(R => R.match(T))?.spacing ?? 0;
  }
  getMinIntrinsicWidth(T) {
    let R = this._style.padding || TR.all(0),
      a = this._style.border ? 1 : 0,
      e = this.getPromptPrefixWidth(),
      t = this._maxWidth || 20;
    return Math.max(R.left + R.right + a * 2 + t + e, R.left + R.right + a * 2 + 1 + e);
  }
  getMaxIntrinsicWidth(T) {
    let R = this.getPromptPrefixWidth();
    if (this._maxWidth) return this._maxWidth + R;
    return Number.POSITIVE_INFINITY;
  }
  getMinIntrinsicHeight(T) {
    let R = this._style.padding || TR.all(0),
      a = this._style.border ? 1 : 0,
      e = this.getPromptPrefixWidth(),
      t = T - a * 2 - R.left - R.right - e,
      r = this._wrap ? "word" : "none",
      h = this._controller.calculateLayoutLines(Math.max(1, t), r, !1).length,
      i = this._minLines,
      c = this._maxLines === null ? Number.MAX_SAFE_INTEGER : this._maxLines,
      s = Math.max(i, Math.min(h, c));
    return R.top + R.bottom + a * 2 + s;
  }
  getMaxIntrinsicHeight(T) {
    let R = this._style.padding || TR.all(0),
      a = this._style.border ? 1 : 0,
      e = this.getPromptPrefixWidth(),
      t = T - a * 2 - R.left - R.right - e,
      r = this._wrap ? "word" : "none",
      h = this._controller.calculateLayoutLines(Math.max(1, t), r, !1).length,
      i = this._minLines,
      c = this._maxLines === null ? Number.MAX_SAFE_INTEGER : this._maxLines,
      s = Math.max(i, Math.min(h, c));
    return R.top + R.bottom + a * 2 + s;
  }
  dispose() {
    super.dispose();
  }
  paint(T, R = 0, a = 0) {
    let e = R + this.offset.x,
      t = a + this.offset.y,
      r = this.size.width,
      h = this.size.height,
      i = this._style.backgroundColor || LT.default();
    for (let k = 0; k < h; k++) for (let x = 0; x < r; x++) T.setChar(e + x, t + k, " ", {
      bg: i,
      fg: this._style.textColor || LT.default()
    }, 1);
    let c = this._style.border;
    if (c) {
      for (let k = 0; k < r; k++) T.setChar(e + k, t, "\u2500", {
        fg: c.top?.color || LT.default(),
        bg: i
      }, 1);
      for (let k = 0; k < r; k++) T.setChar(e + k, t + h - 1, "\u2500", {
        fg: c.bottom?.color || LT.default(),
        bg: i
      }, 1);
      for (let k = 0; k < h; k++) T.setChar(e, t + k, "\u2502", {
        fg: c.left?.color || LT.default(),
        bg: i
      }, 1);
      for (let k = 0; k < h; k++) T.setChar(e + r - 1, t + k, "\u2502", {
        fg: c.right?.color || LT.default(),
        bg: i
      }, 1);
      T.setChar(e, t, "\u256D", {
        fg: c.top?.color || LT.default(),
        bg: i
      }, 1), T.setChar(e + r - 1, t, "\u256E", {
        fg: c.top?.color || LT.default(),
        bg: i
      }, 1), T.setChar(e, t + h - 1, "\u2570", {
        fg: c.bottom?.color || LT.default(),
        bg: i
      }, 1), T.setChar(e + r - 1, t + h - 1, "\u256F", {
        fg: c.bottom?.color || LT.default(),
        bg: i
      }, 1);
    }
    let s = this._style.padding || TR.all(0),
      A = c ? 1 : 0,
      l = e + A + s.left,
      o = t + A + s.top,
      n = r - A * 2 - s.left - s.right,
      p = h - A * 2 - s.top - s.bottom;
    if (n <= 0 || p <= 0) return;
    let _ = this._emojiSupported,
      m = this.isMultiline,
      b = this._controller.text,
      y = b || this._placeholder,
      u = b ? this._style.textColor || LT.default() : this._style.placeholderColor || LT.index(8),
      P = !this._enabled;
    if (m) this._paintMultilineText(T, y, u, i, l, o, n, p, _, P);else this._paintSingleLineText(T, y, u, i, l, o, n, _, P);
    if (this._enabled && this._focusNode.hasFocus) this._paintCursor(T, l, o, n, p, _);
  }
  _paintSoftwareCursor(T, R, a, e, t, r, h, i, c) {
    let s = " ";
    if (t < e.length) {
      let l = e[t];
      s = l === `
` ? " " : l;
    }
    let A = J8(s, c);
    T.setChar(R, a, s, {
      fg: i,
      bg: h,
      reverse: !0
    }, A), T.setCursorPositionHint?.(R, a);
  }
  _paintSingleLineText(T, R, a, e, t, r, h, i, c = !1) {
    if (!R) return;
    let s = B9(R),
      A = t,
      l = this._controller.text,
      o = this._prompts.find(m => m.match(l));
    if (o) {
      let m = B9(o.display),
        b = o.style?.color ?? a;
      for (let u of m) {
        let P = J8(u, i);
        if (A + P <= t + h) T.setChar(A, r, u, {
          fg: b,
          bg: e
        }, P), A += P;
      }
      let y = o.spacing ?? 0;
      for (let u = 0; u < y; u++) if (A < t + h) T.setChar(A, r, " ", {
        fg: a,
        bg: e
      }, 1), A += 1;
    }
    let n = o?.concealPrefix ? B9(o.display).length : 0,
      p = Math.max(this._hScrollOffset, n),
      _ = this._controller.selectionRange;
    for (let m = p; m < s.length && A < t + h; m++) {
      let b = s[m];
      if (b === `
`) continue;
      let y = J8(b, i);
      if (A + y <= t + h) {
        let u = _ && m >= _.start && m < _.end,
          P = u ? this._copyHighlightActive ? LT.yellow : this._style.selectionBackgroundColor ?? LT.blue : e,
          k = u ? this._style.selectionForegroundColor ?? a : a;
        T.setChar(A, r, b, {
          fg: k,
          bg: P,
          dim: c
        }, y), A += y;
      } else break;
    }
  }
  _paintMultilineText(T, R, a, e, t, r, h, i, c, s = !1) {
    if (!R) return;
    let A = this._controller.text,
      l,
      o,
      n;
    if (A) l = this._controller.getLayoutLines(), o = this._controller.getScrollOffset(), n = this._controller.graphemes;else l = new Kw(R, {
      maxWidth: h,
      wrapMode: this._wrap ? "word" : "none",
      emojiSupported: c
    }).lines, o = 0, n = B9(R);
    let p = Math.min(o + i, l.length),
      _ = this._controller.selectionRange;
    for (let m = o; m < p; m++) {
      let b = r + (m - o),
        y = l[m];
      if (y) {
        let u = n.slice(y.startOffset, y.endOffset),
          P = t,
          k = m === 0,
          x = this._controller.text,
          f = k ? this._prompts.find(g => g.match(x)) : void 0;
        if (f) {
          let g = B9(f.display),
            I = f.style?.color ?? a;
          for (let O of g) {
            let j = J8(O, c);
            if (P + j <= t + h) T.setChar(P, b, O, {
              fg: I,
              bg: e
            }, j), P += j;
          }
          let S = f.spacing ?? 0;
          for (let O = 0; O < S; O++) if (P < t + h) T.setChar(P, b, " ", {
            fg: a,
            bg: e
          }, 1), P += 1;
        }
        let v = f?.concealPrefix ? B9(f.display).length : 0;
        for (let g = v; g < u.length && P < t + h; g++) {
          let I = u[g],
            S = J8(I, c);
          if (P + S <= t + h) {
            let O = y.startOffset + g,
              j = _ && O >= _.start && O < _.end,
              d = j ? this._copyHighlightActive ? LT.yellow : this._style.selectionBackgroundColor ?? LT.blue : e,
              C = j ? this._style.selectionForegroundColor ?? a : a;
            T.setChar(P, b, I, {
              fg: C,
              bg: d,
              dim: s
            }, S), P += S;
          } else break;
        }
      }
    }
  }
  _paintCursor(T, R, a, e, t, r) {
    if (this.isMultiline) {
      let h = this._controller.cursorPosition,
        i = this._controller.getLayoutLines(),
        c = -1,
        s = 0;
      for (let l = 0; l < i.length; l++) {
        let o = i[l];
        if (h >= o.startOffset && h <= o.endOffset) {
          c = l, s = h - o.startOffset;
          break;
        }
      }
      let A = this._controller.getScrollOffset();
      if (c >= A && c < A + t) {
        let l = a + (c - A),
          o = i[c],
          n = this._controller.graphemes,
          p = R,
          _ = c === 0,
          m = this._controller.text,
          b = _ ? this._prompts.find(P => P.match(m)) : void 0;
        if (b) {
          let P = B9(b.display);
          for (let k of P) p += J8(k, r);
          p += b.spacing ?? 0;
        }
        let y = b?.concealPrefix ? B9(b.display).length : 0,
          u = Math.max(0, s - y);
        for (let P = 0; P < u; P++) {
          let k = o.startOffset + y + P;
          if (k < n.length) {
            let x = n[k],
              f = J8(x, r);
            p += f;
          }
        }
        if (p >= R && p <= R + e) this._paintSoftwareCursor(T, p, l, n, h, this._style.textColor ?? LT.white, this._style.backgroundColor ?? LT.black, this._style.cursorColor ?? LT.default(), r);
      }
    } else {
      let h = this._controller.cursorPosition,
        i = this._controller.graphemes,
        c = this._controller.text,
        s = this._prompts.find(p => p.match(c)),
        A = R;
      if (s) {
        let p = B9(s.display);
        for (let _ of p) A += J8(_, r);
        A += s.spacing ?? 0;
      }
      let l = s?.concealPrefix ? B9(s.display).length : 0,
        o = Math.max(this._hScrollOffset, l),
        n = Math.max(h, l);
      for (let p = o; p < n && p < i.length; p++) {
        let _ = i[p];
        if (_ !== `
`) A += J8(_, r);
      }
      if (A >= R && A <= R + e) this._paintSoftwareCursor(T, A, a, i, h, this._style.textColor ?? LT.white, this._style.backgroundColor ?? LT.black, this._style.cursorColor ?? LT.default(), r);
    }
  }
  _updateScrollOffsetFromLayout(T, R) {
    let a = this._controller;
    if (!(R >= T.maxHeight)) {
      a.setScrollOffset(0);
      return;
    }
    let e = a.getLayoutLines(),
      t = a.cursorPosition,
      r = -1;
    for (let _ = 0; _ < e.length; _++) {
      let m = e[_];
      if (t >= m.startOffset && t <= m.endOffset) {
        r = _;
        break;
      }
    }
    if (r === -1) return;
    let h = this._style.padding || TR.all(0),
      i = this._style.border ? 1 : 0,
      c = R - h.top - h.bottom - i * 2,
      s = a.getScrollOffset(),
      A = s,
      l = s + c - 1;
    if (r < A) a.setScrollOffset(r);else if (r > l) {
      let _ = r - c + 1;
      a.setScrollOffset(_);
    }
    let o = Math.max(0, e.length - c),
      n = a.getScrollOffset(),
      p = Math.max(0, Math.min(n, o));
    a.setScrollOffset(p);
  }
};
G1T = class G1T extends NR {
  children;
  itemCount;
  itemBuilder;
  itemKeyBuilder;
  estimatedItemExtent;
  estimatedItemExtentBuilder;
  itemSpacing;
  cacheExtent;
  controller;
  autofocus;
  position;
  keyboardScrolling;
  disableVirtualization;
  enableSelection;
  onCopy;
  onSelectionChanged;
  showScrollbar;
  scrollbarThickness;
  initialViewportHeight;
  constructor({
    key: T,
    children: R,
    itemCount: a,
    itemBuilder: e,
    itemKeyBuilder: t,
    estimatedItemExtent: r = 1,
    estimatedItemExtentBuilder: h,
    itemSpacing: i = 0,
    cacheExtent: c = 8,
    controller: s,
    autofocus: A = !0,
    position: l = "top",
    keyboardScrolling: o = !0,
    disableVirtualization: n = !1,
    enableSelection: p = !1,
    onCopy: _,
    onSelectionChanged: m,
    showScrollbar: b = !1,
    scrollbarThickness: y = 1,
    initialViewportHeight: u = 20
  }) {
    super(T ? {
      key: T
    } : {});
    if (R === void 0 && !(e !== void 0 && a !== void 0)) throw Error("ListView requires either children or itemBuilder + itemCount");
    this.children = R, this.itemCount = a, this.itemBuilder = e, this.itemKeyBuilder = t, this.estimatedItemExtent = r, this.estimatedItemExtentBuilder = h, this.itemSpacing = i, this.cacheExtent = c, this.controller = s, this.autofocus = A, this.position = l, this.keyboardScrolling = o, this.disableVirtualization = n, this.enableSelection = p, this.onCopy = _, this.onSelectionChanged = m, this.showScrollbar = b, this.scrollbarThickness = y, this.initialViewportHeight = u;
  }
  createState() {
    return new K1T();
  }
};
Y1T = class Y1T extends wR {
  expanded = !1;
  actionExpanded = new Map();
  visibleActionCount = 0;
  _pendingAppendTimer;
  _spinner = new xa();
  _animationTimer;
  get _isActive() {
    return this.widget.props.group.hasInProgress;
  }
  initState() {
    if (super.initState(), this.visibleActionCount = this.widget.props.group.actions.length, this._isActive) this._startAnimation();
  }
  didUpdateWidget(T) {
    super.didUpdateWidget(T);
    let R = T.props.group.actions,
      a = this.widget.props.group.actions;
    if (R !== a) {
      let t = R.length,
        r = a.length;
      if (r < t) this._clearPendingAppendTimer(), this.actionExpanded.clear(), this.visibleActionCount = r;else {
        for (let h of this.actionExpanded.keys()) if (h >= r) this.actionExpanded.delete(h);
        if (!this._isActive) this._clearPendingAppendTimer(), this.visibleActionCount = r;else this.visibleActionCount = Math.max(this.visibleActionCount, t), this._scheduleAppendStep(r);
      }
    }
    let e = T.props.group.hasInProgress;
    if (!e && this._isActive) this._startAnimation(), this._scheduleAppendStep(a.length);else if (e && !this._isActive) this._stopAnimation(), this._clearPendingAppendTimer(), this.visibleActionCount = a.length;
  }
  dispose() {
    this._stopAnimation(), this._clearPendingAppendTimer(), super.dispose();
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
  _clearPendingAppendTimer() {
    if (!this._pendingAppendTimer) return;
    clearTimeout(this._pendingAppendTimer), this._pendingAppendTimer = void 0;
  }
  _scheduleAppendStep(T) {
    if (this.visibleActionCount >= T || this._pendingAppendTimer) return;
    this._pendingAppendTimer = setTimeout(() => {
      this._pendingAppendTimer = void 0, this.setState(() => {
        this.visibleActionCount = Math.min(this.visibleActionCount + 1, T);
      }), this._scheduleAppendStep(T);
    }, 90);
  }
  build(T) {
    let R = $R.of(T),
      {
        actions: a,
        summary: e
      } = this.widget.props.group,
      t = [];
    if (this._isActive) t.push(new G(`${this._spinner.toBraille()} `, new cT({
      color: R.app.toolRunning
    })));else t.push(new G("\u2713 ", new cT({
      color: R.app.toolSuccess
    })));
    t.push(new G(e, new cT({
      color: R.app.toolName
    })));
    let r = new xT({
        text: new G("", void 0, t),
        selectable: !0,
        maxLines: 1
      }),
      h = this.expanded ? new xR({
        crossAxisAlignment: "start",
        children: a.slice(0, this.visibleActionCount).map((i, c) => this._buildActionRow(i, c, R))
      }) : new SR();
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
  _buildActionRow(T, R, a) {
    let e = sfT(T, a);
    if (!T.detail) return new uR({
      padding: TR.only({
        left: 1
      }),
      child: e
    });
    let t = this.actionExpanded.get(R) ?? !1,
      r = sfT(T, a),
      h = new uR({
        padding: TR.only({
          left: 2
        }),
        child: new xT({
          text: new G(T.detail, new cT({
            color: a.colors.mutedForeground,
            dim: !0
          })),
          selectable: !0
        })
      });
    return new uR({
      padding: TR.only({
        left: 1
      }),
      child: new Ds({
        title: r,
        child: h,
        expanded: t,
        onChanged: i => {
          this.setState(() => {
            this.actionExpanded.set(R, i);
          });
        }
      })
    });
  }
};
io = class io extends NR {
  options;
  onSelect;
  title;
  body;
  borderColor;
  backgroundColor;
  padding;
  selectedIndex;
  autofocus;
  showDismissalMessage;
  enableMouseInteraction;
  showBorder;
  constructor({
    key: T,
    options: R,
    onSelect: a,
    title: e,
    body: t,
    borderColor: r,
    backgroundColor: h,
    padding: i = new TR(1, 0, 1, 0),
    selectedIndex: c = 0,
    autofocus: s = !0,
    showDismissalMessage: A = !0,
    enableMouseInteraction: l = !0,
    showBorder: o = !0
  }) {
    super({
      key: T
    });
    this.options = R, this.onSelect = a, this.title = e, this.body = t, this.borderColor = r ?? LT.default(), this.backgroundColor = h, this.padding = i, this.selectedIndex = Math.max(0, Math.min(c, R.length - 1)), this.autofocus = s, this.showDismissalMessage = A, this.enableMouseInteraction = l, this.showBorder = o;
  }
  createState() {
    return new WQT();
  }
};
WQT = class WQT extends wR {
  selectedIndex = 0;
  focusNode = new l8({});
  scrollController = new Q3();
  initState() {
    super.initState(), this.selectedIndex = this.widget.selectedIndex, this.focusNode.addKeyHandler(this.handleKeyEvent.bind(this)), this.scrollController.followMode = !1;
  }
  dispose() {
    this.focusNode.dispose(), this.scrollController.dispose(), super.dispose();
  }
  handleKeyEvent(T) {
    let R = (a, e) => {
      return T.key === a && T.shiftKey === (e?.shift ?? !1) && T.ctrlKey === (e?.ctrl ?? !1) && T.altKey === (e?.alt ?? !1) && T.metaKey === (e?.meta ?? !1);
    };
    if (R("ArrowDown") || R("n", {
      ctrl: !0
    }) || R("Tab") || R("j")) return this.moveSelection(1), "handled";
    if (R("ArrowUp") || R("p", {
      ctrl: !0
    }) || R("Tab", {
      shift: !0
    }) || R("k")) return this.moveSelection(-1), "handled";
    if (R("Enter")) {
      let a = this.widget.options[this.selectedIndex];
      if (a && (a.enabled ?? !0)) this.widget.onSelect(a.value);
      return "handled";
    }
    if (R("Escape")) return this.widget.onSelect(null), "handled";
    return "ignored";
  }
  moveSelection(T) {
    if (this.widget.options.length === 0) return;
    let R = this.selectedIndex + T;
    if (R < 0) R = this.widget.options.length - 1;else if (R >= this.widget.options.length) R = 0;
    let a = 0;
    while (a < this.widget.options.length) {
      let e = this.widget.options[R];
      if (e && (e.enabled ?? !0)) break;
      R = (R + T + this.widget.options.length) % this.widget.options.length, a++;
    }
    if (this.selectedIndex !== R) this.setState(() => {
      this.selectedIndex = R, this.scrollController.jumpTo(R);
    });
  }
  build(T) {
    let R = Z0.of(T).colorScheme,
      a = this.widget.borderColor ?? R.border,
      e = this.widget.backgroundColor ?? R.background,
      t = R.mutedForeground;
    if (this.widget.options.length === 0) return new XT({
      width: 0,
      height: 0
    });
    let r = [];
    if (this.widget.title) r.push(new xT({
      text: new G(this.widget.title, new cT({
        bold: !0
      }))
    })), r.push(new XT({
      height: 1
    }));
    if (this.widget.body) {
      if (typeof this.widget.body === "string") r.push(new xT({
        text: new G(this.widget.body)
      }));else r.push(this.widget.body);
      r.push(new XT({
        height: 1
      }));
    }
    let h = [];
    for (let A = 0; A < this.widget.options.length; A++) {
      let l = this.widget.options[A],
        o = A === this.selectedIndex,
        n = l.enabled ?? !0,
        p = vd0(l, o, n && this.widget.enableMouseInteraction ? () => this.widget.onSelect(l.value) : void 0);
      if (h.push(p), l.description) h.push(new XT({
        height: 1
      }));
    }
    let i = new xR({
      crossAxisAlignment: "stretch",
      mainAxisSize: "min",
      children: h
    });
    if (r.push(new Fm({
      fit: "loose",
      child: new I3({
        controller: this.scrollController,
        child: i,
        autofocus: !1,
        keyboardScrolling: !1
      })
    })), this.widget.showDismissalMessage) r.push(new XT({
      height: 1
    })), r.push(new xT({
      text: new G("Escape to close", new cT({
        color: t
      }))
    }));
    let c = new xR({
        crossAxisAlignment: "stretch",
        mainAxisSize: "min",
        children: r
      }),
      s;
    if (this.widget.showBorder) s = new SR({
      child: new uR({
        padding: this.widget.padding,
        child: c
      }),
      decoration: new p8(e, h9.all(new e9(a, 1, "rounded")))
    });else s = new uR({
      padding: this.widget.padding,
      child: c
    });
    return new C8({
      focusNode: this.focusNode,
      child: s,
      autofocus: this.widget.autofocus
    });
  }
};
PZT = class PZT extends wR {
  props;
  controller;
  stateListener = null;
  overlayEntry = null;
  layerLink = new mZT();
  scrollOffset = 0;
  _effectiveFocusNode;
  _cachedMaxVisibleOptions = 0;
  constructor(T) {
    super();
    this.props = T;
  }
  initState() {
    if (super.initState(), this._effectiveFocusNode = this.props.focusNode || new l8({
      debugLabel: "AutocompleteFocusOwned"
    }), this.controller = new uZT(), this.controller.initialize({
      textController: this.props.controller,
      triggers: this.props.triggers,
      optionsBuilder: this.props.optionsBuilder,
      onSelected: this.props.onSelected
    }), this.stateListener = jE0(this.controller.state, () => {
      this.updateOverlay(), this.setState(() => {});
    }), this.props.handle) this.props.handle.dismiss = () => this.controller.dismiss();
  }
  didUpdateWidget(T) {
    super.didUpdateWidget(T);
    let R = T.props,
      a = this.widget.props;
    if (this.props = a, R.controller !== a.controller || R.triggers !== a.triggers || R.optionsBuilder !== a.optionsBuilder || R.textFieldProps !== a.textFieldProps || R.onSelected !== a.onSelected) this.controller.initialize({
      textController: a.controller,
      triggers: a.triggers,
      optionsBuilder: a.optionsBuilder,
      onSelected: a.onSelected
    });
    if (R.handle !== a.handle) {
      if (a.handle) a.handle.dismiss = () => this.controller.dismiss();
    }
    this.setState(() => {});
  }
  dispose() {
    this.removeOverlay(), this.stateListener?.dispose(), this.controller.dispose(), this._effectiveFocusNode.dispose(), super.dispose();
  }
  invoke = T => {
    if (!this.controller.currentState.isActive) return "ignored";
    if (T instanceof g$) return this.controller.selectNext(), this.updateScrollPosition(), "handled";
    if (T instanceof $$) return this.controller.selectPrevious(), this.updateScrollPosition(), "handled";
    if (T instanceof v$) return this.controller.acceptSelected(), "handled";
    if (T instanceof zM) return this.controller.dismiss(), "handled";
    return "ignored";
  };
  updateScrollPosition() {
    let T = this.controller.currentState;
    if (!T.isActive || T.selectedIndex < 0) return;
    let R = T.selectedIndex,
      a = T.options.length,
      e = this._cachedMaxVisibleOptions || a;
    if (e >= a) {
      this.scrollOffset = 0;
      return;
    }
    let t = R - this.scrollOffset,
      r = 1,
      h = this.scrollOffset;
    if (t >= e - r) h = Math.max(0, R - (e - r - 1));
    if (t < r) h = Math.max(0, R - r);
    let i = Math.max(0, a - e);
    h = Math.min(h, i), this.scrollOffset = h;
  }
  build(T) {
    let R = new Gm({
        ...this.props.textFieldProps,
        controller: this.props.controller,
        focusNode: this._effectiveFocusNode,
        autofocus: this.props.autofocus ?? !0
      }),
      a = new kc({
        shortcuts: new Map([[new x0("ArrowDown"), new g$()], [new x0("ArrowUp"), new $$()], [new x0("n", {
          ctrl: !0
        }), new g$()], [new x0("p", {
          ctrl: !0
        }), new $$()], [new x0("Enter"), new v$()], [new x0("Escape"), new zM()], [new x0("Tab"), new v$()]]),
        focusNode: this._effectiveFocusNode,
        child: R
      }),
      e = new Nt({
        actions: new Map([[g$, new x9(this.invoke)], [$$, new x9(this.invoke)], [v$, new x9(this.invoke)], [zM, new x9(this.invoke)]]),
        child: a
      });
    return new _ZT({
      link: this.layerLink,
      child: e
    });
  }
  updateOverlay() {
    let T = this.controller.currentState;
    if (T.isActive && T.options.length > 0) {
      if (!this.overlayEntry) this.createOverlay();else this.overlayEntry.markNeedsBuild();
    } else this.removeOverlay();
  }
  createOverlay() {
    if (this.overlayEntry) return;
    this.overlayEntry = new lZT(T => {
      let R = this.controller.currentState;
      return this.buildOverlayContent(T, R);
    });
    try {
      xS.of(this.context).insert(this.overlayEntry);
    } catch (T) {
      J.error("Failed to insert autocomplete overlay:", T), this.overlayEntry = null;
    }
  }
  removeOverlay() {
    if (this.overlayEntry) this.overlayEntry.remove(), this.overlayEntry = null;
  }
  buildOverlayHints(T, R) {
    if (this.props.overlayHint !== void 0) {
      if (this.props.overlayHint === null) return [];
      let {
          prefix: a,
          suffix: e
        } = this.props.overlayHint,
        t = [];
      if (a) t.push(new G(a, new cT({
        color: $R.of(T).app.command
      })), new G(" ", new cT({
        color: R
      })));
      return t.push(new G(e, new cT({
        color: R
      }))), [{
        child: new xT({
          text: new G(" ", new cT({
            dim: !0
          }), t)
        }),
        position: "top",
        alignment: "center"
      }];
    }
    return [];
  }
  buildOverlayContent(T, R) {
    let a = Z0.maybeOf(T),
      e = a?.colorScheme.background ?? LT.default(),
      t = this.props.overlayBorderColor ?? a?.colorScheme.border ?? LT.default(),
      r = R.options.length,
      h = I9.sizeOf(T).height,
      i = 0;
    try {
      let x = this.layerLink.getTargetTransform();
      if (x) i = x.position.y;
    } catch {}
    let c = this.props.autoOverlayPosition ? i < h / 3 : !1,
      s = 2,
      A;
    if (c) {
      let x = this.props.controller.getCursorVisualRow(),
        f = i + x + 1;
      A = h - f - s;
    } else A = i - s;
    r = Math.min(r, Math.max(1, A)), this._cachedMaxVisibleOptions = r, this.updateScrollPosition();
    let l = this.scrollOffset,
      o = Math.min(R.options.length, l + r),
      n = [],
      p = 0;
    for (let x = l; x < o; x++) {
      let f = R.options[x];
      if (!f) continue;
      let v = x === R.selectedIndex,
        g,
        I;
      if (this.props.optionViewBuilder) {
        g = this.props.optionViewBuilder(T, f, v);
        let j = this.props.displayStringForOption?.(f) ?? String(f),
          d = "",
          C = j,
          L = f;
        if (L && typeof L === "object" && "type" in L) switch (L.type) {
          case "file":
            d = "@", C = L.path || j;
            break;
          case "artifact":
            d = "", C = L.label || j;
            break;
        }
        I = d + C;
      } else {
        let j = this.props.displayStringForOption?.(f) ?? String(f),
          d = a?.colorScheme.selection ?? LT.default(),
          C = a?.colorScheme.foreground ?? LT.default();
        g = new xT({
          text: new G(j, new cT({
            color: C,
            backgroundColor: v ? d : void 0
          }))
        }), I = j;
      }
      let S = I9.of(T),
        O = q8(I, S.supportsEmojiWidth);
      p = Math.max(p, O), n.push(g);
    }
    let _ = I9.sizeOf(T).width,
      m = p + 4,
      b = Math.floor(_ * 0.9),
      y = Math.max(Math.min(m, b), Math.min(30, b)),
      u = n.length + 2,
      P;
    if (c) P = this.props.controller.getCursorVisualRow() + 1;else P = -u;
    let k = new XT({
      width: y,
      child: new SR({
        height: u,
        decoration: new p8(e),
        child: new Rt({
          decoration: {
            border: h9.all(new e9(t, 1, "rounded"))
          },
          padding: TR.symmetric(1, 0),
          overlays: this.buildOverlayHints(T, t),
          child: new xR({
            crossAxisAlignment: "start",
            children: n
          })
        })
      })
    });
    return new AZT({
      link: this.layerLink,
      showWhenUnlinked: !1,
      offset: {
        x: 0,
        y: P
      },
      child: k
    });
  }
};
kZT = class kZT extends wR {
  props;
  _effectiveFocusNode;
  _textChangeListener = null;
  _isCommitMode = !1;
  _imageUploadSpinner = new xa();
  _imageUploadSpinnerInterval = null;
  constructor(T) {
    super();
    this.props = T;
  }
  buildOptions = async T => {
    let R = this.props.controller.text,
      a = this.props.controller.cursorPosition,
      e = new ef().detect(R, a);
    if (e && this.props.completionBuilder) {
      if (e.query === "@" && this.props.onDoubleAtTrigger) return this.props.onDoubleAtTrigger(this.props.controller), [];
      let t = e.query.toLowerCase().startsWith(LE0);
      if (t !== this._isCommitMode) this._isCommitMode = t, this.setState();
      return await this.props.completionBuilder.buildOptions(e);
    }
    if (this._isCommitMode) this._isCommitMode = !1, this.setState();
    return [];
  };
  defaultOnOptionSelected = T => {
    switch (T.type) {
      case "hint":
        {
          let R = this.props.controller.text,
            a = this.props.controller.cursorPosition,
            e = R.slice(0, a).lastIndexOf("@");
          if (e !== -1) {
            let t = R.slice(0, e),
              r = R.slice(a),
              h = T.kind === "commit" ? "@:" : "@@",
              i = t + h + r;
            this.props.controller.clear(), this.props.controller.insertText(i), this.props.controller.cursorPosition = e + h.length;
          }
          return;
        }
      case "file":
        {
          let R = this.props.controller.text,
            a = this.props.controller.cursorPosition,
            e = R.slice(0, a).lastIndexOf("@");
          if (e !== -1) {
            let t = R.slice(0, e),
              r = R.slice(a),
              h = t + `@${T.path} ` + r;
            this.props.controller.clear(), this.props.controller.insertText(h), this.props.controller.cursorPosition = e + 1 + T.path.length + 1;
          }
          break;
        }
      case "commit":
        {
          let R = this.props.controller.text,
            a = this.props.controller.cursorPosition,
            e = R.slice(0, a).lastIndexOf("@");
          if (e !== -1) {
            let t = R.slice(0, e),
              r = R.slice(a),
              h = `git-commit(${T.hash})`,
              i = t + h + " " + r;
            this.props.controller.clear(), this.props.controller.insertText(i), this.props.controller.cursorPosition = e + h.length + 1;
          }
          break;
        }
    }
  };
  initState() {
    super.initState(), this._effectiveFocusNode = this.props.focusNode || new l8({
      debugLabel: "PromptEditorFocus"
    }), this._textChangeListener = () => {
      this.setState();
    }, this.props.controller.addListener(this._textChangeListener), this.props.controller.onInsertText = (T, R) => {
      if (T.length <= 3) return !0;
      let a = gE0(T);
      if (a.length === 0) return !0;
      if (this.props.onInsertImage) {
        for (let e of a) this.props.onInsertImage(e);
        return !1;
      }
      return !0;
    }, this.syncImageUploadSpinner();
  }
  didUpdateWidget(T) {
    super.didUpdateWidget(T), this.props = this.widget.props, this.syncImageUploadSpinner();
  }
  dispose() {
    if (this._imageUploadSpinnerInterval) clearInterval(this._imageUploadSpinnerInterval), this._imageUploadSpinnerInterval = null;
    if (this._textChangeListener) this.props.controller.removeListener(this._textChangeListener), this._textChangeListener = null;
    if (!this.props.focusNode) this._effectiveFocusNode.dispose();
    super.dispose();
  }
  syncImageUploadSpinner() {
    if (this.props.showImageUploadSpinner === !0) {
      if (!this._imageUploadSpinnerInterval) this._imageUploadSpinnerInterval = setInterval(() => {
        this._imageUploadSpinner.step(), this.setState();
      }, 120);
      return;
    }
    if (this._imageUploadSpinnerInterval) clearInterval(this._imageUploadSpinnerInterval), this._imageUploadSpinnerInterval = null;
  }
  _handleOpenInEditor = async T => {
    try {
      let R = await pE0(mIT.join(yE0(), "amp-edit-")),
        a = mIT.join(R, "message.amp.md");
      await uE0(a, T, "utf-8"), await Zb(a);
      try {
        let e = await _E0(a, "utf-8");
        this.props.controller.text = e;
      } catch (e) {
        if (e?.code !== "ENOENT") J.error("Failed to read temporary file", e);
      }
      try {
        await mE0(a), await bE0(R);
      } catch (e) {
        J.warn("Failed to clean up temporary file", e);
      }
    } catch (R) {
      J.error("Error opening editor:", R);
    }
  };
  _handleBackspaceAtStart = () => {
    if (this.props.imageAttachments.length > 0 && this.props.popImage) return this.props.popImage(), !0;
    if ((this.props.pendingSkills ?? []).length > 0 && this.props.popSkill) return this.props.popSkill(), !0;
    return !1;
  };
  _handleSubmitted = T => {
    if (this.props.previousThreadId && T.trim() === "") {
      this.props.onPreviousThreadHintAccepted?.();
      return;
    }
    this.props.onSubmitted?.(T);
  };
  build(T) {
    let R = this.props.theme,
      a = this.props.pendingSkills ?? [],
      e = this.props.imageAttachments.length > 0,
      t = a.length > 0 ? new T0({
        mainAxisSize: "min",
        children: [new xT({
          text: new G("Skills: ", new cT({
            color: R.foreground,
            dim: !0
          }))
        }), ...a.flatMap((c, s) => {
          let A = new G0({
            onClick: () => {
              this.props.onSkillClick?.(s);
            },
            cursor: "pointer",
            child: new xT({
              text: new G(c.name, new cT({
                color: R.success,
                underline: !0
              }))
            })
          });
          if (s < a.length - 1) return [A, new xT({
            text: new G(" ")
          })];
          return [A];
        })]
      }) : null,
      r = e ? new T0({
        mainAxisSize: "min",
        children: [new xT({
          text: new G("Images: ", new cT({
            color: R.foreground,
            dim: !0
          }))
        }), ...this.props.imageAttachments.flatMap((c, s) => {
          let A = this.props.onImageClick !== void 0,
            l = new G0({
              onClick: A ? () => {
                this.props.onImageClick?.(s);
              } : void 0,
              cursor: A ? "pointer" : void 0,
              child: new xT({
                text: new G(`[Image ${s + 1}]`, new cT({
                  color: R.success,
                  underline: !0
                }))
              })
            });
          if (s < this.props.imageAttachments.length - 1) return [l, new xT({
            text: new G(" ")
          })];
          return [l];
        }), ...(this.props.showImageUploadSpinner ? [new xT({
          text: new G(" ")
        }), new xT({
          text: new G(this._imageUploadSpinner.toBraille(), new cT({
            color: R.foreground,
            dim: !0
          }))
        })] : [])]
      }) : null,
      h = new yZT({
        controller: this.props.controller,
        triggers: this.props.triggers,
        optionsBuilder: this.buildOptions,
        onSelected: this.props.onOptionSelected ?? this.defaultOnOptionSelected,
        displayStringForOption: c => dE0(c),
        overlayBorderColor: R.border,
        focusNode: this._effectiveFocusNode,
        autofocus: this.props.autofocus ?? !0,
        autoOverlayPosition: this.props.autoOverlayPosition,
        handle: this.props.autocompleteHandle,
        textFieldProps: {
          placeholder: this.props.placeholder,
          wrap: !0,
          minLines: this.props.minLines ?? 3,
          maxLines: null,
          expands: !0,
          autofocus: !1,
          enabled: this.props.enabled ?? !0,
          onSubmitted: this._handleSubmitted,
          onOpenInEditor: this._handleOpenInEditor,
          submitKey: this.props.submitKey ?? {
            character: "Enter"
          },
          prompts: this.props.shellPromptRules,
          style: {
            backgroundColor: R.background,
            border: null,
            padding: TR.all(0),
            textColor: this.props.textColor ?? R.foreground,
            cursorColor: R.cursor,
            placeholderColor: R.mutedForeground,
            selectionBackgroundColor: R.selection
          },
          clipboard: this.props.clipboard,
          onCopy: this.props.onCopy,
          copyOnSelectionEnabled: !0,
          onBackspaceWhenEmpty: this._handleBackspaceAtStart
        },
        optionViewBuilder: (c, s, A) => {
          let l = A ? R.selection : void 0,
            o = R.secondary,
            n = R.foreground,
            p = R.foreground,
            _ = R.warning;
          if (s.type === "commit") return new SR({
            decoration: new p8(l),
            child: new T0({
              children: [new j0({
                child: new xT({
                  text: new G("", void 0, [new G(s.shortHash, new cT({
                    color: R.secondary
                  })), new G(" ", new cT({})), new G(s.message, new cT({
                    color: n
                  }))]),
                  maxLines: 1,
                  overflow: "ellipsis"
                })
              }), new xT({
                text: new G(` ${s.relativeDate}`, new cT({
                  color: p,
                  dim: !0
                }))
              })]
            })
          });
          let m = [];
          switch (s.type) {
            case "file":
              m.push(new G("@", new cT({
                color: o
              }))), m.push(new G(s.path, new cT({
                color: n
              })));
              break;
            case "hint":
              m.push(new G(s.kind === "commit" ? "@:" : "@@", new cT({
                color: _
              }))), m.push(new G(" ", new cT({}))), m.push(new G(s.message, new cT({
                color: _
              })));
              break;
          }
          let b = EE0(s);
          if (b) m.push(new G(" - ", new cT({
            color: p,
            dim: !0
          }))), m.push(new G(b, new cT({
            color: p,
            dim: !0
          })));
          return new SR({
            decoration: new p8(l),
            child: new xT({
              text: new G("", void 0, m),
              maxLines: 1,
              overflow: "ellipsis"
            })
          });
        }
      }),
      i = [];
    if (this.props.topWidget) i.push(this.props.topWidget);
    if (t || r) {
      let c = [];
      if (t) c.push(t);
      if (t && r) c.push(new xT({
        text: new G("  ")
      }));
      if (r) c.push(r);
      let s = new SR({
        padding: TR.only({
          bottom: 1
        }),
        child: new T0({
          mainAxisSize: "min",
          children: c
        })
      });
      i.push(s);
    }
    if (i.push(new Fm({
      fit: this.props.fillAvailableHeight === !1 ? "loose" : "tight",
      child: h
    })), this.props.bottomWidget) i.push(this.props.bottomWidget);
    return new xR({
      mainAxisSize: "min",
      crossAxisAlignment: "start",
      children: i
    });
  }
  requestFocus() {
    this._effectiveFocusNode.requestFocus();
  }
};
NZT = class NZT extends wR {
  textController;
  focusNode;
  scrollController = new Q3();
  selectedIndex = 0;
  itemContexts = [];
  hasUserInteracted = !1;
  cachedQuery = "";
  cachedItemsRef = null;
  cachedFiltered = [];
  initState() {
    if (this.scrollController.disableFollowMode(), this.textController = new wc(this.widget.props.controller?.query ?? ""), this.focusNode = new l8({
      debugLabel: this.widget.debugLabel
    }), this.textController.addListener(() => {
      this.hasUserInteracted = !0, this.selectedIndex = 0, this.recomputeFilteredItems(), this.setState(), k8.instance.addPostFrameCallback(() => {
        this.ensureSelectedItemVisible();
      });
      let T = this.widget.props.controller;
      if (T) T.query = this.textController.text;
      this.syncSelection();
    }), this.recomputeFilteredItems(), this.widget.props.controller?.selectedItem) {
      let T = this.cachedFiltered.findIndex(R => FF(R, this.widget.props.controller?.selectedItem));
      if (T >= 0) this.selectedIndex = T;
    }
    this.clampSelectedIndex(), this.syncSelection(), this.ensureSelectedItemVisible();
  }
  didUpdateWidget(T) {
    if (!FF(T.props.items, this.widget.props.items)) {
      if (this.recomputeFilteredItems(), this.widget.props.controller?.selectedItem) {
        let R = this.cachedFiltered.findIndex(a => FF(a, this.widget.props.controller?.selectedItem));
        if (R >= 0) this.selectedIndex = R;
      }
      this.clampSelectedIndex(), this.ensureSelectedItemVisible(), this.syncSelection();
    }
  }
  dispose() {
    this.widget.props.onSelectionChange?.(null), this.textController.dispose(), this.focusNode.dispose(), this.scrollController.dispose();
  }
  invoke = T => {
    if (T instanceof qy) {
      let R = this.getFilteredItems();
      if (R.length > 0 && this.selectedIndex < R.length - 1) this.hasUserInteracted = !0, this.selectedIndex++, this.setState(), k8.instance.addPostFrameCallback(() => {
        this.ensureSelectedItemVisible();
      }), this.syncSelection();
      return "handled";
    }
    if (T instanceof zy) {
      if (this.getFilteredItems().length > 0 && this.selectedIndex > 0) this.hasUserInteracted = !0, this.selectedIndex--, this.setState(), k8.instance.addPostFrameCallback(() => {
        this.ensureSelectedItemVisible();
      }), this.syncSelection();
      return "handled";
    }
    if (T instanceof FM) {
      let R = this.getFilteredItems();
      if (R.length > 0 && this.selectedIndex < R.length) {
        let a = R[this.selectedIndex];
        if (a) {
          if (!(this.widget.props.isItemDisabled?.(a) ?? !1)) this.widget.props.onAccept(a, {
            hasUserInteracted: this.hasUserInteracted
          });
        }
      }
      return "handled";
    }
    if (T instanceof GM) return this.widget.props.onDismiss?.(), "handled";
    return "ignored";
  };
  syncSelection() {
    let T = this.cachedFiltered[this.selectedIndex] ?? null;
    if (this.widget.props.controller) this.widget.props.controller.selectedItem = T;
    this.widget.props.onSelectionChange?.(T);
  }
  clampSelectedIndex() {
    let T = this.cachedFiltered.length - 1;
    if (T < 0) {
      this.selectedIndex = 0;
      return;
    }
    this.selectedIndex = Math.max(0, Math.min(this.selectedIndex, T));
  }
  recomputeFilteredItems() {
    let T = this.textController.text,
      R = this.widget.props.items,
      a = this.widget.props.normalizeQuery?.(T) ?? T,
      e = R.filter(t => !this.widget.props.filterItem || this.widget.props.filterItem(t, T)).map(t => ({
        item: t,
        ...GE0(a, this.widget.props.getLabel(t))
      })).filter(t => t.matches).sort(this.widget.props.sortItems ? (t, r) => this.widget.props.sortItems(t, r, T) : (t, r) => r.score - t.score).map(t => t.item);
    this.cachedQuery = T, this.cachedItemsRef = R, this.cachedFiltered = this.widget.props.maxRenderItems ? e.slice(0, this.widget.props.maxRenderItems) : e;
  }
  getFilteredItems() {
    let T = this.textController.text,
      R = this.widget.props.items;
    if (this.cachedQuery === T && this.cachedItemsRef === R) return this.cachedFiltered;
    return this.recomputeFilteredItems(), this.cachedFiltered;
  }
  ensureSelectedItemVisible() {
    let T = this.itemContexts[this.selectedIndex];
    if (!T) return;
    let R = T.findRenderObject();
    if (!R) return;
    let a = 0,
      e = R.size.height;
    E1T(T, {
      top: a,
      bottom: e
    }, {
      padding: 1
    });
  }
  handleScroll = T => {
    let R = this.getFilteredItems();
    if (R.length === 0) return !1;
    let a = this.selectedIndex;
    if (T.direction === "down") {
      if (this.selectedIndex < R.length - 1) this.hasUserInteracted = !0, this.selectedIndex++;else return !1;
    } else if (this.selectedIndex > 0) this.hasUserInteracted = !0, this.selectedIndex--;else return !1;
    return this.setState(), k8.instance.addPostFrameCallback(() => {
      this.ensureSelectedItemVisible();
    }), this.syncSelection(), this.selectedIndex !== a;
  };
  handleItemClick = (T, R) => {
    let a = this.getFilteredItems();
    if (T >= 0 && T < a.length) {
      let e = a[T],
        t = e ? this.widget.props.isItemDisabled?.(e) ?? !1 : !1;
      if (R === 1) this.hasUserInteracted = !0, this.selectedIndex = T, this.setState(), this.syncSelection();else if (R === 2 && !t) {
        if (e) this.hasUserInteracted = !0, this.widget.props.onAccept(e, {
          hasUserInteracted: this.hasUserInteracted
        });
      }
    }
  };
  build(T) {
    let R = $R.of(T),
      {
        colors: a
      } = R,
      e = this.getFilteredItems(),
      t = h9.all(new e9(a.foreground, 1, "solid")),
      r = this.widget.props.hidePromptWhenLoading && this.widget.props.isLoading,
      h = this.widget.props.enabled ?? !0,
      i = new Gm({
        controller: this.textController,
        focusNode: this.focusNode,
        autofocus: !0,
        enabled: h,
        style: {
          backgroundColor: a.background,
          textColor: a.foreground,
          cursorColor: a.cursor,
          placeholderColor: a.mutedForeground,
          border: null
        },
        maxLines: 1
      }),
      c = new kc({
        shortcuts: new Map([[new x0("ArrowDown"), new qy()], [new x0("ArrowUp"), new zy()], [new x0("Tab"), new qy()], [new x0("Tab", {
          shift: !0
        }), new zy()], [new x0("n", {
          ctrl: !0
        }), new qy()], [new x0("p", {
          ctrl: !0
        }), new zy()], [new x0("Enter"), new FM()], [new x0("Escape"), new GM()]]),
        focusNode: this.focusNode,
        child: i
      }),
      s = new Nt({
        actions: new Map([[qy, new x9(this.invoke)], [zy, new x9(this.invoke)], [FM, new x9(this.invoke)], [GM, new x9(this.invoke)]]),
        child: c
      }),
      A = new T0({
        children: [new SR({
          decoration: {
            color: a.background
          },
          child: new xT({
            text: new G(">", new cT({
              color: a.foreground
            }))
          })
        }), new j0({
          child: s
        })]
      });
    this.itemContexts = [];
    let l;
    if (this.widget.props.isLoading) {
      let p = this.widget.props.loadingText ?? "Loading...";
      l = new XT({
        height: 10,
        child: new N0({
          child: new xT({
            text: new G(p, new cT({
              color: a.foreground
            }))
          })
        })
      });
    } else if (e.length === 0 && this.widget.props.emptyStateText) l = new j0({
      child: new N0({
        child: new xT({
          text: new G(this.widget.props.emptyStateText, new cT({
            color: a.foreground,
            dim: !0
          }))
        })
      })
    });else {
      let p = e.map((_, m) => {
        let b = m === this.selectedIndex,
          y = this.widget.props.isItemDisabled?.(_) ?? !1,
          u;
        if (this.widget.props.renderItem) u = this.widget.props.renderItem(_, b, y, T);else {
          let P = b ? R.app.selectionBackground : void 0,
            k = b ? R.app.selectionForeground : a.foreground;
          u = new SR({
            decoration: P ? {
              color: P
            } : void 0,
            padding: TR.symmetric(2, 0),
            child: new xT({
              text: new G(this.widget.props.getLabel(_), new cT({
                color: k,
                dim: y
              }))
            })
          });
        }
        return new wZT(new G0({
          onClick: P => this.handleItemClick(m, P.clickCount),
          child: u
        }), P => {
          this.itemContexts[m] = P;
        });
      });
      l = new xR({
        children: p,
        crossAxisAlignment: "start"
      });
    }
    let o = new G0({
        onScroll: this.handleScroll,
        opaque: !1,
        child: new I3({
          controller: this.scrollController,
          autofocus: !1,
          child: l
        })
      }),
      n = [];
    if (this.widget.props.title) {
      let p = new SR({
        padding: TR.symmetric(1, 0),
        child: new xT({
          text: new G(this.widget.props.title, new cT({
            color: R.app.command,
            bold: !0
          }))
        })
      });
      n.push(p);
    }
    if (!r) n.push(A, new XT({
      height: 1
    }));
    if (this.textController.text !== "") {
      let p = e.length > 0 ? e[this.selectedIndex] : void 0,
        _ = p && this.widget.props.buildDisabledReasonWidget?.(p, T);
      n.push(new j0({
        child: new xR({
          mainAxisAlignment: "spaceBetween",
          children: [new j0({
            child: o
          }), new SR({
            padding: TR.only({
              top: 1
            }),
            child: new N0({
              child: _ ?? new XT({
                height: 1
              })
            })
          })]
        })
      }));
    } else n.push(new j0({
      child: o
    }));
    if (this.widget.props.footer) n.push(this.widget.props.footer);
    return new SR({
      decoration: {
        border: t,
        color: a.background
      },
      padding: TR.symmetric(1, 0),
      child: new xR({
        children: n
      })
    });
  }
};
QZT = class QZT extends wR {
  editorController = new wc();
  commandPalette = new d1T(this);
  exitHintTimer = new UtT(this, 1000);
  activeAgentModeUnsubscribe = null;
  clientPoolErrorUnsubscribe = null;
  defaultThreadController = new NY(ok0());
  activeClient = null;
  connectionErrorMessage = null;
  initState() {
    if (this.clientPoolErrorUnsubscribe = this.widget.clientPool.onConnectionError(this.onConnectionError), this.widget.initialThreadID) this.connectToInitialThread(this.widget.initialThreadID);
  }
  build(T) {
    let R = this.buildHints(),
      a = this.activeClient === null ? new VZT({
        editorController: this.editorController,
        onNewThread: this.onNewThread,
        connectionErrorMessage: this.connectionErrorMessage,
        hints: R
      }) : new dZT({
        editorController: this.editorController,
        observingClient: {
          client: this.activeClient.client,
          observer: this.activeClient.observer
        },
        threadController: this.activeClient.threadController,
        agentMode: this.activeClient.agentMode,
        connectionErrorMessage: this.connectionErrorMessage,
        hints: R
      }),
      e = I9.of(T),
      t = [new SR({
        constraints: o0.tight(e.size.width, e.size.height),
        child: a
      })];
    if (this.commandPalette.isEnabled()) t.push(new qZT({
      commands: this.getCommandPaletteCommands(),
      onDismiss: this.commandPalette.disable
    }));
    return new KH({
      completionBuilder: this.widget.completionBuilder,
      child: new Nt({
        actions: this.buildActions(),
        child: new kc({
          shortcuts: new Map([[x0.ctrl("c"), new wY()], [x0.ctrl("o"), new BY()]]),
          child: new C8({
            autofocus: !0,
            child: new Ta({
              children: t
            })
          })
        })
      })
    });
  }
  buildActions() {
    let T = new x9(() => {
        return this.onExitPressed(), "handled";
      }),
      R = new x9(() => {
        return this.commandPalette.toggle(), "handled";
      }),
      a = new x9(() => {
        return (this.activeClient?.threadController || this.defaultThreadController).selectPreviousUserMessage() ? "handled" : "ignored";
      }),
      e = new x9(() => {
        return (this.activeClient?.threadController || this.defaultThreadController).selectNextUserMessage() ? "handled" : "ignored";
      });
    return new Map([[wY, T], [BY, R], [qtT, e], [ztT, a]]);
  }
  buildHints() {
    let T = new Set();
    if (this.exitHintTimer.isActive()) T.add(HtT);
    return T;
  }
  getCommandPaletteCommands() {
    return [{
      id: "new-thread",
      noun: "thread",
      verb: "new",
      enabled: !0,
      run: () => {
        this.commandPalette.disable(), this.setState(() => {
          this.activeAgentModeUnsubscribe?.(), this.activeAgentModeUnsubscribe = null, this.activeClient?.threadController.dispose(), this.activeClient = null, this.connectionErrorMessage = null;
        });
      }
    }, {
      id: "dashboard",
      noun: "thread",
      verb: "dashboard",
      enabled: !0,
      run: T => {
        T.push(new FZT({
          title: "Dashboard",
          child: new xT({
            text: new G("Coming soon", new cT({
              bold: !0
            }))
          })
        }));
      }
    }, {
      id: "quit",
      noun: "amp",
      verb: "quit",
      shortcut: x0.ctrl("c"),
      enabled: !0,
      run: () => {
        d9.instance.stop();
      }
    }];
  }
  onExitPressed = () => {
    if (this.exitHintTimer.isActive()) this.exitHintTimer.clear(), d9.instance.stop();else this.exitHintTimer.activate();
  };
  onNewThread = (T, R) => {
    let {
      client: a,
      observer: e
    } = this.widget.clientPool.createNewThread();
    this.clearConnectionError(), a.sendUserMessage(T, R), this.setActiveClient({
      client: a,
      observer: e
    }, R, a.getThreadId() ?? void 0);
  };
  async connectToInitialThread(T) {
    try {
      let R = this.widget.clientPool.connectToThread(T);
      this.setActiveClient(R, void 0, T);
    } catch (R) {
      J.error("Failed to connect to initial thread", {
        error: R,
        threadID: T
      });
    }
  }
  setActiveClient({
    client: T,
    observer: R
  }, a, e) {
    let t = this.resolveAgentMode(R, a);
    this.activeAgentModeUnsubscribe?.(), this.activeAgentModeUnsubscribe = null, this.setState(() => {
      this.activeClient?.threadController.dispose(), this.activeClient = {
        client: T,
        observer: R,
        threadController: new NY(R.reader()),
        agentMode: t,
        threadID: e ?? T.getThreadId() ?? void 0
      }, this.connectionErrorMessage = null;
    });
    let r = R.reader();
    this.activeAgentModeUnsubscribe = r.subscribe(() => {
      if (!this.mounted || !this.activeClient || this.activeClient.client !== T) return;
      let h = this.resolveAgentMode(R, this.activeClient.agentMode);
      if (h === this.activeClient.agentMode) return;
      this.setState(() => {
        if (!this.activeClient || this.activeClient.client !== T) return;
        this.activeClient = {
          ...this.activeClient,
          agentMode: h
        };
      });
    });
  }
  dispose() {
    this.clientPoolErrorUnsubscribe?.(), this.clientPoolErrorUnsubscribe = null, this.activeAgentModeUnsubscribe?.(), this.activeAgentModeUnsubscribe = null, this.activeClient?.threadController.dispose(), super.dispose();
  }
  onConnectionError = ({
    threadID: T,
    error: R
  }) => {
    let a = hC0(R);
    if (J.error("Neo failed to connect to thread", {
      threadID: T,
      error: R
    }), !this.mounted || !this.isConnectionErrorRelevant(T)) return;
    this.setState(() => {
      this.connectionErrorMessage = T ? `Connection failed for ${T}: ${a}` : `Connection failed: ${a}`;
    });
  };
  isConnectionErrorRelevant(T) {
    if (!this.activeClient) return !0;
    if (!T) return !0;
    let R = this.activeClient.client.getThreadId() ?? this.activeClient.threadID;
    if (!R) return !1;
    return R === T;
  }
  clearConnectionError() {
    if (!this.connectionErrorMessage) return;
    this.setState(() => {
      this.connectionErrorMessage = null;
    });
  }
  resolveAgentMode(T, R) {
    return FET({
      messages: T.reader().read()
    }) ?? R ?? "smart";
  }
};
vQ = class vQ extends Bn {
  get intentType() {
    return "pageUp";
  }
};
jQ = class jQ extends Bn {
  get intentType() {
    return "pageDown";
  }
};
SQ = class SQ extends Bn {
  get intentType() {
    return "halfPageUp";
  }
};
OQ = class OQ extends Bn {
  get intentType() {
    return "halfPageDown";
  }
};
dQ = class dQ extends Bn {
  get intentType() {
    return "home";
  }
};
EQ = class EQ extends Bn {
  get intentType() {
    return "end";
  }
};
YM = class YM extends Bn {
  get intentType() {
    return "focusMessageView";
  }
};
CQ = class CQ extends Bn {
  get intentType() {
    return "showCommandPalette";
  }
};
XrT = class XrT extends NR {
  threadViewState;
  tokenUsage;
  threadAgentMode;
  hasStartedStreamingResponse;
  compactionState;
  submittingPromptMessage;
  waitingForConfirmation;
  showingEphemeralError;
  executingCommand;
  executingCommandNoun;
  executingCommandVerb;
  executingCommandMessage;
  runningBashInvocations;
  constructor({
    threadViewState: T,
    tokenUsage: R,
    threadAgentMode: a,
    hasStartedStreamingResponse: e = !1,
    compactionState: t = "idle",
    submittingPromptMessage: r = !1,
    waitingForConfirmation: h = !1,
    showingEphemeralError: i = !1,
    executingCommand: c = null,
    executingCommandNoun: s = null,
    executingCommandVerb: A = null,
    executingCommandMessage: l = null,
    runningBashInvocations: o = !1,
    key: n
  } = {}) {
    super(n ? {
      key: n
    } : {});
    this.threadViewState = T, this.tokenUsage = R, this.threadAgentMode = a, this.hasStartedStreamingResponse = e, this.compactionState = t, this.submittingPromptMessage = r, this.waitingForConfirmation = h, this.showingEphemeralError = i, this.executingCommand = c, this.executingCommandNoun = s, this.executingCommandVerb = A, this.executingCommandMessage = l, this.runningBashInvocations = o;
  }
  createState() {
    return new sRR();
  }
};
vRR = class vRR extends wR {
  controller = new wc();
  focusNode = new l8({
    debugLabel: "CommandArgumentPrompt",
    onKey: T => {
      if (T.key === "Escape") return this.widget.props.onDismiss(), "handled";
      return "ignored";
    }
  });
  _textListener = () => {
    this.setState(() => {});
  };
  initState() {
    this.focusNode.requestFocus(), this.controller.addListener(this._textListener);
  }
  dispose() {
    this.controller.removeListener(this._textListener), this.focusNode.dispose();
  }
  build(T) {
    let R = $R.of(T),
      {
        colors: a,
        app: e
      } = R,
      t = this.widget.props.isRequiredArg ?? !0,
      r = this.controller.text.trim().length > 0,
      h = !t || r,
      i = h9.all(new e9(a.foreground, 1, "solid")),
      c = new Gm({
        controller: this.controller,
        focusNode: this.focusNode,
        placeholder: this.widget.props.placeholder ?? "Enter command argument...",
        onSubmitted: n => {
          let p = n.trim();
          if (t && p.length === 0) return;
          this.widget.props.onSubmit(p);
        },
        autofocus: !0,
        style: {
          textColor: a.foreground,
          border: null
        },
        maxLines: 1
      }),
      s = new T0({
        children: [new SR({
          decoration: {
            color: a.background
          },
          child: new xT({
            text: new G(">", new cT({
              color: a.foreground
            }))
          })
        }), new j0({
          child: c
        })]
      }),
      A = new SR({
        padding: TR.symmetric(1, 0),
        child: new xT({
          text: new G("", void 0, [new G("Command: ", new cT({
            color: a.foreground
          })), new G(this.widget.props.commandName, new cT({
            color: e.command,
            bold: !0
          }))])
        })
      }),
      l = [];
    if (h) l.push(new G("Enter", new cT({
      color: e.keybind
    }))), l.push(new G(" to submit, ", new cT({
      color: a.foreground,
      dim: !0
    })));
    l.push(new G("Esc", new cT({
      color: e.keybind
    }))), l.push(new G(" to cancel", new cT({
      color: a.foreground,
      dim: !0
    })));
    let o = new SR({
      padding: TR.symmetric(1, 0),
      child: new xT({
        text: new G("", void 0, l)
      })
    });
    return new SR({
      decoration: {
        border: i,
        color: a.background
      },
      padding: TR.all(1),
      child: new xR({
        children: [A, new XT({
          height: 1
        }), s, new y3(), o]
      })
    });
  }
};
jRR = class jRR extends wR {
  controller = new wc();
  imageAttachments = [];
  imagePaths = [];
  isConfirmingClearInput = !1;
  clearInputConfirmTimeout = null;
  focusNode = new l8({
    debugLabel: "CommandMultilinePrompt",
    onKey: T => {
      if (T.key === "Escape") {
        if (this.isConfirmingClearInput) {
          if (this.controller.clear(), this.setState(() => {
            this.isConfirmingClearInput = !1, this.imageAttachments = [], this.imagePaths = [];
          }), this.clearInputConfirmTimeout) clearTimeout(this.clearInputConfirmTimeout), this.clearInputConfirmTimeout = null;
          return "handled";
        }
        if (this.controller.text.trim() !== "" || this.imageAttachments.length > 0) {
          if (this.setState(() => {
            this.isConfirmingClearInput = !0;
          }), this.clearInputConfirmTimeout) clearTimeout(this.clearInputConfirmTimeout);
          return this.clearInputConfirmTimeout = setTimeout(() => {
            this.setState(() => {
              this.isConfirmingClearInput = !1;
            }), this.clearInputConfirmTimeout = null;
          }, 1000), "handled";
        }
        return this.widget.props.onDismiss(), "handled";
      }
      return "ignored";
    }
  });
  initState() {
    if (this.widget.props.initialText) this.controller.text = this.widget.props.initialText;
    if (this.widget.props.initialImages) this.imageAttachments = [...this.widget.props.initialImages];
    this.focusNode.requestFocus();
  }
  _handleInsertImage = async T => {
    if (this.imageAttachments.length >= pb) return !1;
    let R = await GH(T);
    if (typeof R === "object") return this.setState(() => {
      this.imageAttachments = [...this.imageAttachments, R], this.imagePaths = [...this.imagePaths, T];
    }), !1;
    return !1;
  };
  _handlePopImage = () => {
    if (this.imageAttachments.length > 0) this.setState(() => {
      this.imageAttachments = this.imageAttachments.slice(0, -1), this.imagePaths = this.imagePaths.slice(0, -1);
    });
  };
  dispose() {
    if (this.clearInputConfirmTimeout) clearTimeout(this.clearInputConfirmTimeout), this.clearInputConfirmTimeout = null;
    this.focusNode.dispose(), this.controller.dispose();
  }
  build(T) {
    let R = $R.of(T),
      {
        colors: a,
        app: e
      } = R,
      t = I9.of(T).size.height,
      r = Math.max(Math.floor(t * 0.5), 10),
      h = new Td({
        controller: this.controller,
        triggers: [new ef()],
        completionBuilder: this.widget.props.completionBuilder,
        onSubmitted: o => {
          this.widget.props.onSubmit(o.trim(), this.imageAttachments);
        },
        theme: a,
        placeholder: this.widget.props.placeholder || "Enter your message...",
        enabled: this.widget.props.enabled ?? !0,
        autofocus: !0,
        clipboard: d9.instance.tuiInstance.clipboard,
        autoOverlayPosition: !0,
        onInsertImage: this.widget.props.onInsertImage ?? this._handleInsertImage,
        imageAttachments: this.imageAttachments,
        popImage: this._handlePopImage
      }),
      i = new C8({
        focusNode: this.focusNode,
        child: h
      }),
      c = new SR({
        constraints: new o0({
          maxHeight: r
        }),
        padding: TR.symmetric(1, 0),
        child: i
      }),
      s = new SR({
        padding: TR.symmetric(1, 0),
        child: new xT({
          text: new G("", void 0, [new G("Command: ", new cT({
            color: a.foreground
          })), new G(this.widget.props.commandName, new cT({
            color: e.command,
            bold: !0
          }))])
        })
      }),
      A = new SR({
        padding: TR.symmetric(1, 0),
        child: new xT({
          text: this.isConfirmingClearInput ? new G("", void 0, [new G("Esc", new cT({
            color: e.keybind
          })), new G(" again to clear input", new cT({
            color: a.foreground,
            dim: !0
          }))]) : new G("", void 0, [new G("Press ", new cT({
            color: a.foreground,
            dim: !0
          })), new G("Enter", new cT({
            color: e.keybind
          })), new G(" to submit, ", new cT({
            color: a.foreground,
            dim: !0
          })), new G("Esc", new cT({
            color: e.keybind
          })), new G(" to clear", new cT({
            color: a.foreground,
            dim: !0
          }))])
        })
      }),
      l = [s, new XT({
        height: 1
      }), new j0({
        child: c
      }), new XT({
        height: 1
      }), A];
    return new SR({
      decoration: {
        border: h9.all(new e9(a.foreground, 1, "solid")),
        color: a.background
      },
      padding: TR.all(1),
      child: new xR({
        children: l
      })
    });
  }
};
n0R = class n0R extends wR {
  focusNode;
  initState() {
    this.focusNode = new l8();
  }
  dispose() {
    this.focusNode.dispose();
  }
  handleConfirm = () => {
    this.widget.onConfirm();
  };
  handleCancel = () => {
    this.widget.onCancel();
  };
  build(T) {
    let R = Z0.of(T).colorScheme,
      a = $R.of(T).app,
      e = I9.of(T),
      t = e.size.width,
      r = e.size.height,
      h = t - 4,
      i = Math.max(50, Math.min(80, h)),
      c = new cT({
        color: R.primary,
        bold: !0
      }),
      s = new cT({
        color: R.foreground
      }),
      A = new cT({
        color: R.foreground,
        dim: !0
      }),
      l = new cT({
        color: a.keybind
      }),
      o = this.widget.options.title,
      n = this.widget.options.confirmButtonText ?? "Yes",
      p = [new xT({
        text: new G(o, c)
      })];
    if (this.widget.options.message) p.push(new XT({
      height: 1
    })), p.push(new xT({
      text: new G(this.widget.options.message, s)
    }));
    p.push(new XT({
      height: 1
    })), p.push(new T0({
      children: [new xT({
        text: new G("", void 0, [new G("y", l), new G(` ${n.toLowerCase()} \xB7 `, A), new G("n", l), new G("/"), new G("Esc", l), new G(" cancel", A)])
      })]
    }));
    let _ = new SR({
      constraints: new o0(i - 4, i - 4, 0, r - 6),
      decoration: {
        color: R.background,
        border: h9.all(new e9(R.primary, 1, "rounded"))
      },
      padding: TR.all(2),
      child: new xR({
        crossAxisAlignment: "start",
        mainAxisSize: "min",
        children: p
      })
    });
    return new C8({
      autofocus: !0,
      onKey: m => {
        if (m.key === "y" || m.key === "Y") return this.handleConfirm(), "handled";
        if (m.key === "n" || m.key === "N" || m.key === "Escape") return this.handleCancel(), "handled";
        return "ignored";
      },
      child: new N0({
        child: _
      })
    });
  }
};
p0R = class p0R extends wR {
  feedbackInputActive = !1;
  feedbackController = new wc();
  focusNode = new l8({
    debugLabel: "ConfirmationWidget"
  });
  initState() {
    super.initState(), this.focusNode.addKeyHandler(this.handleKeyEvent.bind(this));
  }
  dispose() {
    this.feedbackController.dispose(), this.focusNode.dispose(), super.dispose();
  }
  handleKeyEvent(T) {
    if (this.feedbackInputActive && T.key === "Escape") return this.setState(() => {
      this.feedbackInputActive = !1, this.feedbackController.text = "";
    }), "handled";
    return "ignored";
  }
  submitFeedback() {
    let T = this.feedbackController.text.trim();
    if (this.feedbackController.text = "", T) this.widget.onResponse({
      type: "deny-with-feedback",
      feedback: T
    });else this.widget.onResponse({
      type: "simple",
      value: "no"
    });
  }
  handleOptionSelect = T => {
    if (T === "no-with-feedback") {
      this.setState(() => {
        this.feedbackInputActive = !0;
      });
      return;
    }
    this.widget.onResponse(T === null ? null : {
      type: "simple",
      value: T
    });
  };
  getOverlayContent() {
    if (this.widget.confirmationRequest.type === "tool-use" && this.widget.confirmationRequest.tools.length === 1) {
      let T = this.widget.confirmationRequest.tools[0];
      if (!T?.useBlock) return null;
      if ((T.useBlock.normalizedName ?? T.useBlock.name) === U8) {
        let R = Va(T.useBlock) ? T.useBlock.input : T.useBlock.inputIncomplete;
        return R.cmd ?? R.command ?? "";
      }
      if (T.useBlock.name === ke) {
        let R = Va(T.useBlock) ? T.useBlock.input : T.useBlock.inputIncomplete;
        return $A(R.old_str ?? "", R.new_str ?? "", R.path ?? "file");
      }
      if (T.useBlock.name === Wt) {
        let R = Va(T.useBlock) ? T.useBlock.input : T.useBlock.inputIncomplete;
        return $A("", R.content ?? "", R.path ?? "file");
      }
    }
    return null;
  }
  build(T) {
    let R = Z0.of(T).colorScheme;
    if (this.feedbackInputActive) return this.buildFeedbackInput(R);
    let a = this.formatConfirmationContent(this.widget.confirmationRequest),
      e = this.createConfirmationOptions(this.widget.confirmationRequest);
    return new _0R({
      content: a,
      options: e,
      onSelect: this.handleOptionSelect,
      borderColor: R.warning,
      onShowCommand: () => {
        let t = this.getOverlayContent();
        if (t && this.widget.onShowOverlay) this.widget.onShowOverlay(t);
      }
    });
  }
  formatConfirmationContent(T) {
    switch (T.type) {
      case "tool-use":
        {
          if (T.tools.length === 1) {
            let R = T.tools[0];
            if (R?.useBlock) return this.formatToolConfirmation(R.useBlock, T.reason, T.subagentToolName, T.isSubagent);
            return {
              header: "Confirm tool call"
            };
          }
          return {
            header: `Confirm ${T.tools.length} tool calls`
          };
        }
      case "out-of-credits":
        return {
          header: "Insufficient usage balance. Retry?"
        };
      case "agent-file-creation":
        return {
          header: `Create ${ka} file for this codebase?`
        };
    }
  }
  formatToolConfirmation(T, R, a, e) {
    let t = a ? `[${a}] ` : e ? "[Subagent] " : "";
    if ((T.normalizedName ?? T.name) === U8) {
      let r = Va(T) ? T.input : T.inputIncomplete,
        h = r.cmd ?? r.command ?? "",
        i = this.truncateCommand(h),
        c = h !== i;
      return {
        header: `${t}Run this command?`,
        command: i,
        cwd: r.cwd,
        reason: R,
        hint: c ? "Press ? for full command" : void 0
      };
    } else if (T.name === ke) {
      let r = Va(T) ? T.input : T.inputIncomplete;
      return {
        header: `${t}Allow editing file:`,
        filePath: r.path,
        reason: R,
        hint: "Press ? to view full diff"
      };
    } else if (T.name === Wt) {
      let r = Va(T) ? T.input : T.inputIncomplete;
      return {
        header: `${t}Allow creating file:`,
        filePath: r.path,
        reason: R,
        hint: "Press ? to view full diff"
      };
    } else if (T.name === uc) return {
      header: R || "The Librarian needs your permission to proceed."
    };else return {
      header: `${t}Invoke tool ${T.name}?`,
      json: JSON.stringify(T.input, null, 2)
    };
  }
  truncateCommand(T) {
    let R = T.split(`
`),
      a = 3;
    if (R.length <= 3) return T;
    return R.slice(0, 3).join(`
`) + `
...`;
  }
  createConfirmationOptions(T) {
    switch (T.type) {
      case "tool-use":
        {
          if (T.tools.some(t => t.useBlock.name === uc)) return [{
            value: "connect-github",
            label: "Connect GitHub"
          }, {
            value: "yes",
            label: "Retry"
          }, {
            value: "no",
            label: "Cancel"
          }, {
            value: "disable-librarian",
            label: "Disable the Librarian and cancel"
          }];
          let R = T.tools.some(t => t.useBlock.name === ke || t.useBlock.name === Wt),
            a = Boolean(T.reason && a9T.some(({
              pattern: t
            }) => T.reason.includes(t.description))),
            e = [{
              value: "yes",
              label: "Approve"
            }];
          if (a && R) e.push({
            value: "always-guarded",
            label: "Allow File for Every Session"
          });
          return e.push({
            value: "allow-all-session",
            label: "Allow All for This Session"
          }), e.push({
            value: "allow-all-persistent",
            label: "Allow All for Every Session"
          }), e.push({
            value: "no-with-feedback",
            label: "Deny with feedback"
          }), e;
        }
      case "out-of-credits":
      case "agent-file-creation":
        return [{
          value: "yes",
          label: "Yes"
        }, {
          value: "no",
          label: "No"
        }];
    }
  }
  buildFeedbackInput(T) {
    let R = new xT({
        text: new G("", void 0, [new G("\u2717 ", new cT({
          color: T.destructive,
          bold: !0
        })), new G("Denied", new cT({
          color: T.destructive,
          bold: !0
        })), new G(" \u2014 ", new cT({
          color: T.secondary
        })), new G("tell Amp what to do instead", new cT({
          color: T.foreground
        }))])
      }),
      a = new T0({
        crossAxisAlignment: "center",
        children: [new xT({
          text: new G("\u203A ", new cT({
            color: T.primary,
            bold: !0
          }))
        }), new j0({
          child: new Gm({
            controller: this.feedbackController,
            autofocus: !0,
            placeholder: `e.g. "use grep instead" or "don't modify that file"`,
            onSubmitted: () => this.submitFeedback()
          })
        })]
      }),
      e = new xT({
        text: new G("", void 0, [new G("Enter", new cT({
          color: T.primary
        })), new G(" send", new cT({
          color: T.secondary,
          dim: !0
        })), new G("  \u2022  ", new cT({
          color: T.secondary,
          dim: !0
        })), new G("Esc", new cT({
          color: T.primary
        })), new G(" cancel", new cT({
          color: T.secondary,
          dim: !0
        }))])
      }),
      t = new xR({
        crossAxisAlignment: "stretch",
        mainAxisSize: "min",
        children: [R, new XT({
          height: 1
        }), a, new XT({
          height: 1
        }), e]
      });
    return new C8({
      focusNode: this.focusNode,
      autofocus: !0,
      child: new SR({
        decoration: new p8(T.background, h9.all(new e9(T.primary, 1, "rounded"))),
        child: new uR({
          padding: TR.symmetric(1, 1),
          child: t
        })
      })
    });
  }
};
_0R = class _0R extends NR {
  options;
  onSelect;
  content;
  borderColor;
  autofocus;
  onShowCommand;
  constructor({
    key: T,
    options: R,
    onSelect: a,
    content: e,
    borderColor: t,
    autofocus: r = !0,
    onShowCommand: h
  }) {
    super({
      key: T
    });
    this.options = R, this.onSelect = a, this.content = e, this.borderColor = t ?? Gt.default().colorScheme.warning, this.autofocus = r, this.onShowCommand = h;
  }
  createState() {
    return new b0R();
  }
};
b0R = class b0R extends wR {
  focusNode = new l8({
    debugLabel: "ConfirmationSelect"
  });
  scrollController = new Q3();
  selectedIndex = 0;
  initState() {
    super.initState(), this.focusNode.addKeyHandler(this.handleKeyEvent.bind(this)), this.scrollController.disableFollowMode();
  }
  dispose() {
    this.focusNode.dispose(), this.scrollController.dispose(), super.dispose();
  }
  scrollToIndex(T) {
    this.scrollController.jumpTo(T);
  }
  handleKeyEvent(T) {
    if (T.key === "?" && !T.shiftKey && !T.ctrlKey && !T.altKey && !T.metaKey) {
      if (this.widget.onShowCommand) return this.widget.onShowCommand(), "handled";
    }
    if (T.key === "ArrowUp" || T.key === "k") return this.setState(() => {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1), this.scrollToIndex(this.selectedIndex);
    }), "handled";
    if (T.key === "ArrowDown" || T.key === "j") return this.setState(() => {
      this.selectedIndex = Math.min(this.widget.options.length - 1, this.selectedIndex + 1), this.scrollToIndex(this.selectedIndex);
    }), "handled";
    if (T.altKey && !T.shiftKey && !T.ctrlKey && !T.metaKey && T.key >= "1" && T.key <= "9") {
      let R = parseInt(T.key) - 1;
      if (R < this.widget.options.length) {
        let a = this.widget.options[R];
        if (a) return this.widget.onSelect(a.value), "handled";
      }
    }
    if (T.key === "Enter") {
      let R = this.widget.options[this.selectedIndex];
      if (R) this.widget.onSelect(R.value);
      return "handled";
    }
    if (T.key === "Escape") return this.widget.onSelect(null), "handled";
    return "ignored";
  }
  buildHeader(T, R) {
    let {
        content: a
      } = this.widget,
      e = [];
    if (e.push(new xT({
      text: new G(a.header, new cT({
        color: T.foreground
      })),
      selectable: !0
    })), a.filePath) e.push(new xT({
      text: new G(a.filePath, new cT({
        color: R.app.filename,
        bold: !0
      })),
      selectable: !0
    }));
    if (a.command) {
      let t = a.command.split(`
`),
        r = [],
        h = t[0] || "";
      r.push(new G("$ ", new cT({
        color: T.success,
        bold: !0
      })));
      let i = Sv(h, R.app.syntaxHighlight, "command.sh");
      for (let c of i) r.push(new G(c.content, new cT({
        color: c.color ?? T.foreground
      })));
      for (let c = 1; c < t.length; c++) {
        r.push(new G(`
  `, new cT({
          color: T.foreground
        })));
        let s = Sv(t[c], R.app.syntaxHighlight, "command.sh");
        for (let A of s) r.push(new G(A.content, new cT({
          color: A.color ?? T.foreground
        })));
      }
      e.push(new xT({
        text: new G("", void 0, r),
        selectable: !0
      }));
    }
    if (a.cwd) e.push(new xT({
      text: new G("", void 0, [new G("in ", new cT({
        color: T.secondary,
        dim: !0
      })), new G(a.cwd, new cT({
        color: R.app.filename
      }))]),
      selectable: !0
    }));
    if (a.json) {
      let t = a.json.split(`
`),
        r = [];
      for (let h = 0; h < t.length; h++) {
        if (h > 0) r.push(new G(`
`));
        let i = Sv(t[h], R.app.syntaxHighlight, "input.json");
        for (let c of i) r.push(new G(c.content, new cT({
          color: c.color ?? T.foreground
        })));
      }
      e.push(new xT({
        text: new G("", void 0, r),
        selectable: !0
      }));
    }
    if (a.reason) e.push(new xT({
      text: new G(`(${a.reason})`, new cT({
        color: T.secondary
      })),
      selectable: !0
    }));
    if (a.hint) e.push(new xT({
      text: new G(a.hint, new cT({
        color: T.secondary,
        dim: !0
      })),
      selectable: !0
    }));
    return new xR({
      crossAxisAlignment: "start",
      mainAxisSize: "min",
      children: e
    });
  }
  build(T) {
    let R = Z0.of(T).colorScheme,
      a = $R.of(T),
      e = this.buildHeader(R, a),
      t = [];
    for (let A = 0; A < this.widget.options.length; A++) {
      let l = this.widget.options[A],
        o = A === this.selectedIndex,
        n = o ? "\u25B8" : " ",
        p = o ? "\u25CF" : "\u25CB",
        _ = A < 9 ? `${cH0}+${A + 1}` : "",
        m = new T0({
          crossAxisAlignment: "start",
          children: [new xT({
            text: new G(n, new cT({
              color: R.primary
            }))
          }), new xT({
            text: new G(p, new cT({
              color: o ? R.primary : R.secondary
            }))
          }), new XT({
            width: 1
          }), new j0({
            child: new xT({
              text: new G("", void 0, [new G(l.label, new cT({
                color: o ? R.primary : R.foreground,
                bold: o
              })), _ ? new G(` [${_}]`, new cT({
                color: R.secondary,
                dim: !0
              })) : new G("")])
            })
          })]
        });
      t.push(m);
    }
    let r = new xR({
        crossAxisAlignment: "stretch",
        mainAxisSize: "min",
        children: t
      }),
      h = new SR({
        constraints: new o0({
          maxHeight: iH0
        }),
        child: new Fm({
          fit: "loose",
          child: new I3({
            controller: this.scrollController,
            autofocus: !1,
            child: r
          })
        })
      }),
      i = new xT({
        text: new G("\u2191\u2193 navigate \u2022 Enter select \u2022 Esc cancel", new cT({
          color: R.secondary,
          dim: !0
        }))
      }),
      c = new ro({
        child: e
      }),
      s = new xR({
        crossAxisAlignment: "stretch",
        mainAxisSize: "min",
        children: [c, h, i]
      });
    return new C8({
      focusNode: this.focusNode,
      autofocus: this.widget.autofocus,
      child: new SR({
        decoration: new p8(R.background, h9.all(new e9(this.widget.borderColor, 1, "rounded"))),
        child: new uR({
          padding: TR.symmetric(1, 0),
          child: s
        })
      })
    });
  }
};
O0R = class O0R extends wR {
  focusNode;
  initState() {
    this.focusNode = new l8();
  }
  dispose() {
    this.focusNode.dispose();
  }
  build(T) {
    let R = Z0.of(T).colorScheme,
      a = $R.of(T).app,
      e = I9.of(T),
      t = new cT({
        color: R.primary,
        bold: !0
      }),
      r = new cT({
        color: R.foreground
      }),
      h = new cT({
        color: R.primary
      }),
      i = new cT({
        color: a.keybind
      }),
      c = new cT({
        color: R.foreground
      }),
      s = e.size.width - 4,
      A = Math.max(40, Math.min(60, s)),
      l = new xR({
        crossAxisAlignment: "stretch",
        mainAxisSize: "min",
        children: [new uR({
          padding: TR.only({
            top: 1,
            left: 2,
            right: 2,
            bottom: 1
          }),
          child: new N0({
            child: new xT({
              text: new G("Stick a fork in it, it's done", t)
            })
          })
        }), new uR({
          padding: TR.symmetric(2, 1),
          child: new xT({
            text: new G("We've deprecated the fork command in favor of handoff and thread mentions.", r),
            textAlign: "center"
          })
        }), new uR({
          padding: TR.only({
            left: 2,
            right: 2,
            bottom: 1
          }),
          child: new xT({
            text: new G("Learn more: ", r, [H3.createSpan("https://ampcode.com/news/stick-a-fork-in-it", "https://ampcode.com/news/stick-a-fork-in-it", h)]),
            textAlign: "center"
          })
        }), new uR({
          padding: TR.symmetric(2, 1),
          child: new N0({
            child: new xT({
              text: new G("", c, [new G("Dismiss ", c), new G("(Esc)", i)])
            })
          })
        })]
      });
    return new C8({
      autofocus: !0,
      focusNode: this.focusNode,
      onKey: o => {
        if (o.key === "Escape") return this.widget.onDismiss(), "handled";
        return "ignored";
      },
      child: new N0({
        child: new SR({
          constraints: new o0(A, A, 0, Number.POSITIVE_INFINITY),
          decoration: new p8(R.background, h9.all(new e9(R.primary, 1, "rounded"))),
          child: l
        })
      })
    });
  }
};
C0R = class C0R extends NR {
  options;
  onSelect;
  onChange;
  title;
  body;
  border;
  selectedIndex;
  autofocus;
  showDismissalMessage;
  enableMouseInteraction;
  maxVisibleItems;
  scrollBuffer;
  constructor({
    key: T,
    options: R,
    onSelect: a,
    onChange: e,
    title: t,
    body: r,
    border: h,
    selectedIndex: i = 0,
    autofocus: c = !0,
    showDismissalMessage: s = !0,
    enableMouseInteraction: A = !0,
    maxVisibleItems: l = 20,
    scrollBuffer: o = 3
  }) {
    super({
      key: T
    });
    this.options = R, this.onSelect = a, this.onChange = e, this.title = t, this.body = r, this.border = h, this.selectedIndex = Math.max(0, Math.min(i, R.length - 1)), this.autofocus = c, this.showDismissalMessage = s, this.enableMouseInteraction = A, this.maxVisibleItems = l, this.scrollBuffer = o;
  }
  createState() {
    return new L0R();
  }
};
L0R = class L0R extends wR {
  selectedIndex = 0;
  focusNode = new l8({});
  scrollOffset = 0;
  initState() {
    super.initState(), this.selectedIndex = this.widget.selectedIndex, this.focusNode.addKeyHandler(this.handleKeyEvent.bind(this)), this.updateScrollPosition();
  }
  dispose() {
    this.focusNode.dispose(), super.dispose();
  }
  handleKeyEvent(T) {
    let R = (a, e) => {
      return T.key === a && T.shiftKey === (e?.shift ?? !1) && T.ctrlKey === (e?.ctrl ?? !1) && T.altKey === (e?.alt ?? !1) && T.metaKey === (e?.meta ?? !1);
    };
    if (R("ArrowDown") || R("n", {
      ctrl: !0
    }) || R("Tab") || R("j")) return this.moveSelection(1), "handled";
    if (R("ArrowUp") || R("p", {
      ctrl: !0
    }) || R("Tab", {
      shift: !0
    }) || R("k")) return this.moveSelection(-1), "handled";
    if (R("Enter")) {
      let a = this.widget.options[this.selectedIndex];
      if (a && (a.enabled ?? !0)) this.widget.onSelect(a.value);
      return "handled";
    }
    if (R("Escape")) return this.widget.onSelect(null), "handled";
    return "ignored";
  }
  handleMouseScroll(T) {
    if (this.widget.options.length === 0) return !1;
    let R = this.selectedIndex,
      a = 1;
    if (T.direction === "down") this.moveSelection(a);else this.moveSelection(-a);
    return this.selectedIndex !== R;
  }
  moveSelection(T) {
    if (this.widget.options.length === 0) return;
    let R = this.selectedIndex + T;
    R = Math.max(0, Math.min(R, this.widget.options.length - 1));
    let a = R,
      e = 0;
    while (e < this.widget.options.length) {
      let t = this.widget.options[R];
      if (t && (t.enabled ?? !0)) break;
      if (R = R + Math.sign(T), R < 0 || R >= this.widget.options.length) {
        R = a;
        break;
      }
      e++;
    }
    if (this.selectedIndex !== R) this.setState(() => {
      if (this.selectedIndex = R, this.updateScrollPosition(), this.widget.onChange) {
        let t = this.widget.options[R];
        if (t) this.widget.onChange(R, t);
      }
    });
  }
  updateScrollPosition() {
    let T = this.widget.maxVisibleItems,
      R = this.widget.scrollBuffer,
      a = this.selectedIndex,
      e = a - this.scrollOffset,
      t = this.scrollOffset;
    if (e >= T - R) t = Math.max(0, a - (T - R - 1));
    if (e < R) t = Math.max(0, a - R);
    let r = Math.max(0, this.widget.options.length - T);
    if (t = Math.min(t, r), t !== this.scrollOffset) this.scrollOffset = t;
  }
  build(T) {
    let R = Gt.default().colorScheme,
      a = this.widget.border ?? h9.all(new e9(R.border, 1, "rounded")),
      e = R.mutedForeground;
    if (this.widget.options.length === 0) return new XT({
      width: 0,
      height: 0
    });
    let t = [];
    if (this.widget.title) t.push(new xT({
      text: new G(this.widget.title, new cT({
        bold: !0
      }))
    })), t.push(new XT({
      height: 1
    }));
    if (this.widget.body) {
      if (typeof this.widget.body === "string") t.push(new xT({
        text: new G(this.widget.body)
      }));else t.push(this.widget.body);
      t.push(new XT({
        height: 1
      }));
    }
    let r = this.scrollOffset,
      h = Math.min(this.widget.options.length, r + this.widget.maxVisibleItems);
    for (let s = r; s < h; s++) {
      let A = this.widget.options[s],
        l = s === this.selectedIndex,
        o = A.enabled ?? !0,
        n = new nrT({
          title: A.label,
          subtitle: A.description,
          selected: l,
          enabled: o,
          onTap: o && this.widget.enableMouseInteraction ? () => this.widget.onSelect(A.value) : void 0
        });
      t.push(n);
    }
    if (this.widget.showDismissalMessage) t.push(new XT({
      height: 1
    })), t.push(new xT({
      text: new G("Escape to close", new cT({
        color: e
      }))
    }));
    let i = new xR({
        crossAxisAlignment: "stretch",
        mainAxisSize: "min",
        children: t
      }),
      c = new SR({
        child: new uR({
          padding: new TR(1, 0, 1, 0),
          child: i
        }),
        decoration: new p8(void 0, a)
      });
    return new C8({
      focusNode: this.focusNode,
      autofocus: this.widget.autofocus,
      child: new G0({
        onScroll: this.handleMouseScroll.bind(this),
        opaque: !1,
        child: c
      })
    });
  }
};
U0R = class U0R extends wR {
  textController;
  focusNode;
  initState() {
    this.textController = new wc(this.widget.options.initialValue ?? ""), this.focusNode = new l8();
  }
  dispose() {
    this.textController.dispose(), this.focusNode.dispose();
  }
  handleSubmit = () => {
    let T = this.textController.text;
    this.widget.onSubmit(T);
  };
  handleCancel = () => {
    this.widget.onCancel();
  };
  build(T) {
    let R = Z0.of(T).colorScheme,
      a = $R.of(T).app,
      e = I9.of(T),
      t = e.size.width,
      r = e.size.height,
      h = t - 4,
      i = Math.max(50, Math.min(80, h)),
      c = new cT({
        color: R.primary,
        bold: !0
      }),
      s = new cT({
        color: R.foreground,
        dim: !0
      }),
      A = new cT({
        color: a.keybind
      }),
      l = this.widget.options.title ?? "Input",
      o = this.widget.options.submitButtonText ?? "Submit",
      n = [new xT({
        text: new G(l, c)
      })];
    if (this.widget.options.helpText) n.push(new XT({
      height: 1
    })), n.push(new xT({
      text: new G(this.widget.options.helpText, s)
    }));
    n.push(new XT({
      height: 1
    })), n.push(new Gm({
      controller: this.textController,
      focusNode: this.focusNode,
      autofocus: !0,
      placeholder: "",
      onSubmitted: this.handleSubmit
    })), n.push(new XT({
      height: 1
    })), n.push(new T0({
      children: [new xT({
        text: new G("", void 0, [new G("Enter", A), new G(` ${o.toLowerCase()} \xB7 `, s), new G("Esc", A), new G(" cancel", s)])
      })]
    }));
    let p = new SR({
      constraints: new o0(i - 4, i - 4, 0, r - 6),
      decoration: {
        color: R.background,
        border: h9.all(new e9(R.primary, 1, "rounded"))
      },
      padding: TR.all(2),
      child: new xR({
        crossAxisAlignment: "start",
        mainAxisSize: "min",
        children: n
      })
    });
    return new C8({
      onKey: _ => {
        if (_.key === "Escape") return this.handleCancel(), "handled";
        return "ignored";
      },
      child: new N0({
        child: p
      })
    });
  }
};
h9R = class h9R extends wR {
  actionExpanded = new Map();
  visibleActionCount = 0;
  _pendingAppendTimer;
  _spinner = new xa();
  _animationTimer;
  initState() {
    if (super.initState(), this.visibleActionCount = this.widget.props.actions.length, this.widget.props.active) this._startAnimation();
  }
  didUpdateWidget(T) {
    if (super.didUpdateWidget(T), T.props.actions !== this.widget.props.actions) {
      let R = T.props.actions.length,
        a = this.widget.props.actions.length;
      if (a < R) this._clearPendingAppendTimer(), this.actionExpanded.clear(), this.visibleActionCount = a;else {
        for (let e of this.actionExpanded.keys()) if (e >= a) this.actionExpanded.delete(e);
        if (!this.widget.props.active) this._clearPendingAppendTimer(), this.visibleActionCount = a;else this.visibleActionCount = Math.max(this.visibleActionCount, R), this._scheduleAppendStep(a);
      }
    }
    if (!T.props.active && this.widget.props.active) this._startAnimation(), this._scheduleAppendStep(this.widget.props.actions.length);else if (T.props.active && !this.widget.props.active) this._stopAnimation(), this._clearPendingAppendTimer(), this.visibleActionCount = this.widget.props.actions.length;
  }
  dispose() {
    this._stopAnimation(), this._clearPendingAppendTimer(), super.dispose();
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
  _clearPendingAppendTimer() {
    if (!this._pendingAppendTimer) return;
    clearTimeout(this._pendingAppendTimer), this._pendingAppendTimer = void 0;
  }
  _scheduleAppendStep(T) {
    if (this.visibleActionCount >= T || this._pendingAppendTimer) return;
    this._pendingAppendTimer = setTimeout(() => {
      this._pendingAppendTimer = void 0, this.setState(() => {
        this.visibleActionCount = Math.min(this.visibleActionCount + 1, T);
      }), this._scheduleAppendStep(T);
    }, 90);
  }
  build(T) {
    let R = $R.of(T),
      {
        actions: a,
        reads: e,
        searches: t,
        explores: r,
        expanded: h
      } = this.widget.props,
      i = pW0(a),
      c = lW0({
        actions: a,
        reads: e,
        searches: t,
        explores: r,
        guidanceFilesCount: i.length
      }, R);
    if (this.widget.props.active) c.unshift(new G(`${this._spinner.toBraille()} `, new cT({
      color: R.app.toolRunning
    })));else if (this.widget.props.cancelled) c.unshift(new G("\u2715 ", new cT({
      color: R.app.toolCancelled
    })));else if (this.widget.props.completed) c.unshift(new G("\u2713 ", new cT({
      color: R.app.toolSuccess
    })));else c.unshift(new G("  ", new cT({})));
    let s = new xT({
        text: new G("", void 0, c),
        selectable: !0,
        maxLines: 1
      }),
      A = h ? new xR({
        crossAxisAlignment: "start",
        children: [...(i.length > 0 ? [Jm(i, R), new XT({
          height: 1
        })] : []), ...a.slice(0, this.visibleActionCount).map((l, o) => this.buildActionRow(l, o, R))].filter(l => l !== void 0)
      }) : new SR();
    return new Ds({
      title: s,
      child: A,
      expanded: h,
      onChanged: this.widget.props.onToggle
    });
  }
  buildActionRow(T, R, a) {
    let e = Og(T, a);
    if (T.kind === "thinking" && T.thinking) return this.buildThinkingActionRow(T, a, R);
    if (!T.detail && (!T.guidanceFiles || T.guidanceFiles.length === 0)) return new uR({
      padding: TR.only({
        left: 1
      }),
      child: e
    });
    let t = this.actionExpanded.get(R) ?? !1,
      r = Og(T, a, t),
      h = new uR({
        padding: TR.only({
          left: 2
        }),
        child: AW0(T, a)
      });
    return new uR({
      padding: TR.only({
        left: 1
      }),
      child: new Ds({
        title: r,
        child: h,
        expanded: t,
        onChanged: i => {
          this.setState(() => {
            this.actionExpanded.set(R, i);
          });
        }
      })
    });
  }
  buildThinkingActionRow(T, R, a) {
    let e = this.actionExpanded.get(a) ?? !1,
      t = Og(T, R, e),
      r = T.thinking;
    if (!r) return new uR({
      padding: TR.only({
        left: 1
      }),
      child: Og(T, R)
    });
    let h = kM0(r.thinking);
    if (h.trim().length === 0) return new uR({
      padding: TR.only({
        left: 1
      }),
      child: Og(T, R)
    });
    let i = R.colors.mutedForeground,
      c = {
        ...lrT(this.context),
        text: new cT({
          color: i,
          dim: !0,
          italic: !0
        }),
        inlineCode: new cT({
          color: i,
          dim: !0,
          italic: !0,
          bold: !0
        }),
        codeBlock: new cT({
          color: i,
          dim: !0,
          italic: !0
        }),
        link: new cT({
          color: i,
          dim: !0,
          italic: !0,
          underline: !0
        })
      },
      s = new Z3({
        markdown: h,
        styleScheme: c
      });
    return new uR({
      padding: TR.only({
        left: 1
      }),
      child: new Ds({
        title: t,
        child: new uR({
          padding: TR.only({
            left: 2
          }),
          child: s
        }),
        expanded: e,
        onChanged: A => {
          this.setState(() => {
            this.actionExpanded.set(a, A);
          });
        }
      })
    });
  }
};
w9R = class w9R extends B0 {
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
      e = R.input.action,
      t = $R.of(T),
      {
        colors: r,
        app: h
      } = t,
      i = t.app,
      c = this.getTitleForAction(e ?? "list"),
      s = e === "create" || e === "update",
      A = c,
      l = [];
    if (s && a.status === "done" && "task" in a.result) {
      let p = a.result.task;
      if (l.push(new xT({
        text: new G(`#${p.id}`, new cT({
          color: r.foreground,
          dim: !0
        }))
      })), e === "update" && R.input.status) l.push(new xT({
        text: new G(`\u2192 ${VgT(R.input.status)}`, new cT({
          color: r.foreground,
          dim: !0
        }))
      }));
      if (p.dependsOn && p.dependsOn.length > 0) l.push(new xT({
        text: new G(`(depends on ${p.dependsOn.map(_ => `#${_}`).join(", ")})`, new cT({
          color: r.foreground,
          dim: !0
        }))
      }));
    } else {
      let p = this.getQueryText(R.input);
      if (p) l.push(new xT({
        text: new G(p, new cT({
          color: r.foreground,
          dim: !0
        }))
      }));
    }
    let o = new x3({
        name: A,
        status: a.status,
        children: l
      }),
      n = [];
    if (a.status === "done") {
      let p = a.result;
      if ("error" in p) n.push(new xT({
        text: new G(p.error, new cT({
          color: h.toolError
        }))
      }));else if ("task" in p) {
        if (s) {
          let _ = p.task,
            m = this.getStatusIcon(_.status),
            b = XgT[_.status],
            y = _.status === "completed",
            u = _.status === "canceled",
            P = y || u,
            k = new cT({
              bold: _.status === "in_progress",
              color: b !== null ? h.recommendation : r.foreground,
              dim: P
            }),
            x = new cT({
              bold: _.status === "in_progress",
              strikethrough: y,
              color: r.foreground,
              dim: P
            }),
            f = [new xT({
              text: new G(m, k)
            }), new XT({
              width: 1
            }), new j0({
              child: new xT({
                text: new G(_.title, x)
              })
            })];
          if (n.push(new uR({
            padding: TR.only({
              left: 2
            }),
            child: new T0({
              crossAxisAlignment: "start",
              children: f
            })
          })), _.description) n.push(new uR({
            padding: TR.only({
              left: 4
            }),
            child: new xT({
              text: new G(_.description, new cT({
                color: r.foreground,
                dim: !0
              }))
            })
          }));
        } else n.push(this.buildTaskItem(p.task, r, i, {
          showStatus: !0,
          showID: !1
        }));
      } else if ("tasks" in p) {
        let _ = p.tasks;
        if (_.length === 0) n.push(new xT({
          text: new G("No tasks found", new cT({
            color: r.foreground,
            dim: !0
          }))
        }));else for (let m of _) n.push(this.buildTaskItem(m, r, i));
      }
    }
    return new xR({
      mainAxisSize: "min",
      crossAxisAlignment: "stretch",
      children: n.length > 0 ? [o, ...n] : [o]
    });
  }
  getTitleForAction(T) {
    switch (T) {
      case "create":
        return "Create Task";
      case "list":
        return "List Tasks";
      case "get":
        return "Get Task";
      case "update":
        return "Update Task";
      case "delete":
        return "Delete Task";
      default:
        return "Task List";
    }
  }
  getQueryText(T) {
    let R = [];
    switch (T.action) {
      case "list":
        {
          let a = [];
          if (T.status) a.push(`status=${VgT(T.status)}`);
          if (T.repoURL) a.push(`repo=${T.repoURL}`);
          if (T.limit) a.push(`limit=${T.limit}`);
          if (T.ready) a.push("ready=true");
          if (a.length > 0) R.push(a.join(", "));
          break;
        }
      case "get":
        if (T.taskID) R.push(`#${T.taskID}`);
        break;
      case "delete":
        if (T.taskID) R.push(`#${T.taskID}`);
        break;
      case "create":
        {
          if (T.dependsOn && T.dependsOn.length > 0) R.push(`depends on ${T.dependsOn.map(a => `#${a}`).join(", ")}`);
          break;
        }
      case "update":
        {
          let a = [];
          if (T.dependsOn && T.dependsOn.length > 0) a.push(`depends on ${T.dependsOn.map(e => `#${e}`).join(", ")}`);
          if (a.length > 0) R.push(a.join(", "));
          break;
        }
    }
    return R.length > 0 ? R.join(" ") : null;
  }
  buildTaskItem(T, R, a, e = {}) {
    let {
        showStatus: t = !0,
        showID: r = !0
      } = e,
      h = this.getStatusIcon(T.status),
      i = T.status === "completed",
      c = T.status === "canceled",
      s = i || c,
      A = XgT[T.status],
      l = new cT({
        bold: T.status === "in_progress",
        color: A !== null ? a.recommendation : R.foreground,
        dim: s
      }),
      o = new cT({
        color: R.foreground,
        dim: !0
      }),
      n = new cT({
        bold: T.status === "in_progress",
        strikethrough: i,
        color: R.foreground,
        dim: s
      }),
      p = new cT({
        color: R.foreground,
        dim: !0
      }),
      _ = [];
    if (t) _.push(new xT({
      text: new G(h, l)
    }), new XT({
      width: 1
    }));
    if (r) _.push(new xT({
      text: new G(`#${T.id} `, o)
    }));
    if (T.description) {
      let m = this.truncateText(T.description, 100);
      _.push(new j0({
        child: new xT({
          text: new G(T.title, n, [new G(` \u2014 ${m}`, p)])
        })
      }));
    } else _.push(new j0({
      child: new xT({
        text: new G(T.title, n)
      })
    }));
    return new uR({
      padding: TR.only({
        left: 2
      }),
      child: new T0({
        crossAxisAlignment: "start",
        children: _
      })
    });
  }
  truncateText(T, R) {
    let a = T.replace(/\n/g, " ").trim();
    if (a.length <= R) return a;
    return a.slice(0, R - 1) + "\u2026";
  }
  getStatusIcon(T) {
    return q50[T] ?? "\u2022";
  }
};
AhT = class AhT extends NR {
  items;
  subagentContentByParentID;
  toolProgressByToolUseID;
  controller;
  autofocus;
  onNewMessage;
  showScrollbar;
  onCopy;
  onMessageEditSubmit;
  onShellCommandSubmit;
  onMessageRestoreSubmit;
  onShowForkDeprecation;
  getAffectedFiles;
  hasStartedStreamingResponse = !1;
  focusNode;
  onDismissFocus;
  isInSelectionMode = !1;
  isInHandoffMode = !1;
  completionBuilder;
  onShowImagePreview;
  onSelectionChanged;
  onDoubleAtTrigger;
  stateController;
  denseView;
  submitOnEnter;
  threadViewState;
  isDTWMode;
  get userMessageIndices() {
    let T = [];
    for (let R = 0; R < this.items.length; R++) {
      let a = this.items[R];
      if (a?.type === "message") {
        if (a.message.role === "user" || ok(a.message)) T.push(R);
      }
    }
    return T;
  }
  get navigableItemIndices() {
    let T = [];
    for (let R = 0; R < this.items.length; R++) {
      let a = this.items[R];
      if (a?.type === "message") {
        if (a.message.role === "user" || ok(a.message)) T.push(R);
      } else if (a?.type === "toolResult" && a.toolUse.name === "chart") T.push(R);
    }
    return T;
  }
  constructor({
    key: T,
    items: R,
    subagentContentByParentID: a = {},
    toolProgressByToolUseID: e = new Map(),
    controller: t,
    autofocus: r = !1,
    onNewMessage: h,
    showScrollbar: i = !0,
    onCopy: c,
    onMessageEditSubmit: s,
    onMessageRestoreSubmit: A,
    onShowForkDeprecation: l,
    getAffectedFiles: o,
    hasStartedStreamingResponse: n = !1,
    focusNode: p,
    onDismissFocus: _,
    isInSelectionMode: m = !1,
    isInHandoffMode: b = !1,
    completionBuilder: y,
    onShowImagePreview: u,
    onSelectionChanged: P,
    onDoubleAtTrigger: k,
    stateController: x,
    denseView: f,
    submitOnEnter: v = !0,
    threadViewState: g,
    isDTWMode: I = !1
  }) {
    super(T ? {
      key: T
    } : {});
    this.items = R, this.subagentContentByParentID = a, this.toolProgressByToolUseID = e, this.controller = t, this.autofocus = r, this.onNewMessage = h, this.showScrollbar = i, this.onCopy = c, this.onMessageEditSubmit = s, this.onMessageRestoreSubmit = A, this.onShowForkDeprecation = l, this.getAffectedFiles = o, this.hasStartedStreamingResponse = n, this.focusNode = p, this.onDismissFocus = _, this.isInSelectionMode = m, this.isInHandoffMode = b, this.completionBuilder = y, this.onShowImagePreview = u, this.onSelectionChanged = P, this.onDoubleAtTrigger = k, this.stateController = x, this.denseView = f, this.submitOnEnter = v, this.threadViewState = g, this.isDTWMode = I;
  }
  createState() {
    return new f8R();
  }
};
g8R = class g8R extends wR {
  scrollController;
  focusNode;
  viewportHeight = 1;
  scrollListenerAttached = !1;
  initState() {
    this.scrollController = new Q3(), this.scrollController.disableFollowMode(), this.scrollController.jumpTo(0), this.focusNode = new l8();
  }
  dispose() {
    this.scrollController.dispose(), this.focusNode.dispose();
  }
  formatDate(T) {
    return new Date(T).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }
  updateViewportHeight() {
    let T = this.getViewportHeight();
    if (T !== this.viewportHeight) this.viewportHeight = T;
  }
  getViewportHeight() {
    let T = this.context.findRenderObject();
    if (!T) return this.viewportHeight;
    let R = (e, t = 0) => {
        if (e && "size" in e && "children" in e) {
          let r = e.children || [];
          for (let h of r) {
            if (h && "size" in h) {
              let c = h.size;
              if (typeof c?.height === "number" && c.height > 0) return c.height;
            }
            let i = R(h, t + 1);
            if (i > 0) return i;
          }
        }
        return 0;
      },
      a = R(T);
    if (a > 0) return a;
    return this.viewportHeight;
  }
  build(T) {
    let R = Z0.of(T).colorScheme,
      a = $R.of(T).app,
      e = I9.of(T);
    if (!this.scrollListenerAttached) this.scrollController.addListener(() => {
      this.updateViewportHeight(), this.setState(() => {});
    }), this.scrollListenerAttached = !0;
    let t = new cT({
        color: R.primary,
        bold: !0
      }),
      r = new cT({
        color: R.foreground,
        dim: !0
      }),
      h = new cT({
        color: R.foreground
      }),
      i = new cT({
        color: a.keybind
      }),
      c = new cT({
        color: R.foreground
      }),
      s = e.size.width,
      A = e.size.height,
      l = s - 4,
      o = Math.min(20, A - 4),
      n = Math.max(40, Math.min(60, l)),
      p = new uR({
        padding: TR.only({
          top: 1,
          left: 2,
          right: 2,
          bottom: 1
        }),
        child: new xR({
          crossAxisAlignment: "stretch",
          mainAxisSize: "min",
          children: [new N0({
            child: new xT({
              text: new G(this.widget.message.title, t)
            })
          }), new N0({
            child: new xT({
              text: new G(this.formatDate(this.widget.message.visibleFrom), r)
            })
          })]
        })
      }),
      _ = new T0({
        crossAxisAlignment: "stretch",
        children: [new j0({
          child: new I3({
            autofocus: !0,
            controller: this.scrollController,
            child: new SR({
              constraints: new o0(n - 5, n - 5, 0, Number.POSITIVE_INFINITY),
              child: new uR({
                padding: TR.only({
                  left: 2,
                  right: 2
                }),
                child: new xT({
                  text: new G(this.widget.message.body, h)
                })
              })
            })
          })
        }), new Oi({
          controller: this.scrollController,
          thumbColor: a.scrollbarThumb,
          trackColor: a.scrollbarTrack,
          getScrollInfo: () => {
            let y = this.scrollController.maxScrollExtent,
              u = this.scrollController.offset,
              P = this.viewportHeight,
              k = y + P;
            return {
              totalContentHeight: Math.max(k, 0),
              viewportHeight: Math.max(P, 1),
              scrollOffset: Math.max(u, 0)
            };
          }
        })]
      }),
      m = new uR({
        padding: TR.symmetric(2, 1),
        child: new N0({
          child: new xT({
            text: new G("", c, [new G("Destroy message ", c), new G("(Esc)", i)])
          })
        })
      }),
      b = new xR({
        crossAxisAlignment: "stretch",
        mainAxisSize: "min",
        children: [p, new Fm({
          fit: "loose",
          child: _
        }), m]
      });
    return new C8({
      autofocus: !0,
      focusNode: this.focusNode,
      onKey: y => {
        if (y.key === "Escape") return this.widget.onDestruct(), "handled";
        return "ignored";
      },
      child: new N0({
        child: new SR({
          constraints: new o0(n, n, 0, o),
          decoration: new p8(R.background, h9.all(new e9(R.primary, 1, "rounded"))),
          child: b
        })
      })
    });
  }
};
v8R = class v8R extends wR {
  textController;
  focusNode;
  errorMessage = null;
  initState() {
    this.textController = new wc(), this.focusNode = new l8({
      onKey: T => {
        if (this.widget.totalRequests <= 1) return "ignored";
        if (T.key === "ArrowLeft" && this.shouldSelectPreviousRequest()) return this.widget.onPreviousRequest(), "handled";
        if (T.key === "ArrowRight" && this.shouldSelectNextRequest()) return this.widget.onNextRequest(), "handled";
        return "ignored";
      }
    });
  }
  didUpdateWidget(T) {
    if (T.request !== this.widget.request) this.textController.text = "", this.textController.clearSelection(), this.errorMessage = null;
  }
  dispose() {
    this.textController.dispose(), this.focusNode.dispose();
  }
  handleSubmit = () => {
    let T = this.textController.text.trim();
    if (!T) {
      this.setState(() => {
        this.errorMessage = "Please enter the callback URL or authorization code";
      });
      return;
    }
    let R = this.validateOAuthCallbackInput(T);
    if (R) {
      this.setState(() => {
        this.errorMessage = R;
      });
      return;
    }
    this.widget.onSubmit(T);
  };
  shouldSelectPreviousRequest() {
    return !this.textController.hasSelection && this.textController.cursorPosition === 0;
  }
  shouldSelectNextRequest() {
    return !this.textController.hasSelection && this.textController.cursorPosition === this.textController.graphemes.length;
  }
  validateOAuthCallbackInput(T) {
    if (!T.startsWith("http://") && !T.startsWith("https://")) return null;
    let R;
    try {
      R = new URL(T);
    } catch {
      return "Invalid callback URL. Paste the full URL or just the authorization code.";
    }
    let a = R.searchParams.get("state"),
      e = this.expectedAuthorizationState();
    if (e && a !== e) return "This callback URL belongs to a different request or is missing state. Use Left/Right to switch requests.";
    if (!R.searchParams.get("code")) return "No authorization code found in callback URL.";
    return null;
  }
  expectedAuthorizationState() {
    try {
      return new URL(this.widget.request.authorizationUrl).searchParams.get("state");
    } catch {
      return null;
    }
  }
  build(T) {
    let R = Z0.of(T).colorScheme,
      a = $R.of(T).app,
      e = I9.of(T),
      t = e.size.width,
      r = e.size.height,
      h = t - 4,
      i = Math.max(50, Math.min(80, h)),
      c = new cT({
        color: R.primary,
        bold: !0
      }),
      s = new cT({
        color: a.link,
        bold: !0
      }),
      A = new cT({
        color: R.foreground,
        dim: !0
      }),
      l = new cT({
        color: R.secondary
      }),
      o = new cT({
        color: a.keybind
      }),
      n = new cT({
        color: a.link,
        underline: !0
      }),
      p = new cT({
        color: a.toolError
      }),
      _ = this.widget.request.serverName,
      m = this.widget.request.authorizationUrl,
      b = [new xT({
        text: new G("1. Open this URL in your browser (select to copy):", A)
      }), new XT({
        height: 1
      }), new uR({
        padding: TR.only({
          left: 3
        }),
        child: new ro({
          child: new xT({
            text: H3.createSpan(m, m, s),
            selectable: !0
          })
        })
      }), new XT({
        height: 1
      }), new xT({
        text: new G("2. Authorize the application", A)
      }), new XT({
        height: 1
      }), new xT({
        text: new G("3. After redirect fails, copy the URL from your browser address bar", A)
      }), new XT({
        height: 1
      }), new xT({
        text: new G("4. Paste the localhost URL below:", A)
      })],
      y = [new xT({
        text: new G(`OAuth Required: ${_}`, c)
      })];
    if (this.widget.totalRequests > 1) y.push(new XT({
      height: 1
    })), y.push(new T0({
      children: [new xT({
        text: new G(`Request ${this.widget.requestIndex + 1} of ${this.widget.totalRequests}`, l)
      }), y3.flexible(), new G0({
        onClick: this.widget.onPreviousRequest,
        child: new xT({
          text: new G("<", n)
        })
      }), y3.horizontal(2), new G0({
        onClick: this.widget.onNextRequest,
        child: new xT({
          text: new G(">", n)
        })
      })]
    }));
    if (y.push(new XT({
      height: 1
    })), y.push(...b), y.push(new XT({
      height: 1
    })), y.push(new Gm({
      controller: this.textController,
      focusNode: this.focusNode,
      autofocus: !0,
      placeholder: "Paste callback URL or authorization code...",
      onSubmitted: this.handleSubmit
    })), this.errorMessage) y.push(new XT({
      height: 1
    })), y.push(new xT({
      text: new G(this.errorMessage, p)
    }));
    y.push(new XT({
      height: 1
    })), y.push(new T0({
      children: [new xT({
        text: this.widget.totalRequests > 1 ? new G("", void 0, [new G("Left/Right", o), new G(" at start/end switch requests \xB7 ", A), new G("Enter", o), new G(" submit \xB7 ", A), new G("Esc", o), new G(" cancel", A)]) : new G("", void 0, [new G("Enter", o), new G(" submit \xB7 ", A), new G("Esc", o), new G(" cancel", A)])
      })]
    }));
    let u = new SR({
      constraints: new o0(i - 4, i - 4, 0, r - 6),
      decoration: {
        color: R.background,
        border: h9.all(new e9(R.primary, 1, "rounded"))
      },
      padding: TR.all(2),
      child: new xR({
        crossAxisAlignment: "start",
        mainAxisSize: "min",
        children: y
      })
    });
    return new N0({
      child: u
    });
  }
};
W8R = class W8R extends wR {
  listScrollController = new Q3();
  detailScrollController = new Q3();
  scrollAreaKey = new ph("skill-list-modal-scroll-area");
  focusNode = new l8();
  selectedSkill = null;
  _viewportHeight = 20;
  initState() {
    super.initState(), this.listScrollController.followMode = !1, this.detailScrollController.followMode = !1;
  }
  dispose() {
    this.focusNode.dispose(), this.listScrollController.dispose(), this.detailScrollController.dispose(), super.dispose();
  }
  getViewportHeight() {
    let T = this.scrollAreaKey.currentElement?.renderObject;
    if (T && "size" in T) {
      let R = T.size;
      if (typeof R.height === "number" && R.height > 0) return this._viewportHeight = R.height, R.height;
    }
    return this._viewportHeight;
  }
  handleKeyEvent = T => {
    switch (T.key) {
      case "Escape":
        if (this.selectedSkill) return this.setState(() => {
          this.selectedSkill = null;
        }), "handled";
        return this.widget.onDismiss(), "handled";
      case "i":
        if (this.selectedSkill && this.widget.onInvokeSkill) return this.widget.onInvokeSkill(this.selectedSkill.name), this.widget.onDismiss(), "handled";
        return "ignored";
      case "a":
        if (!this.selectedSkill && this.widget.onAddSkill) return this.widget.onAddSkill(), "handled";
        return "ignored";
      case "o":
        if (!this.selectedSkill && this.widget.onDocs) return this.widget.onDocs(), "handled";
        return "ignored";
      default:
        return "ignored";
    }
  };
  selectSkill = T => {
    this.setState(() => {
      this.selectedSkill = T, this.detailScrollController.jumpTo(0);
    });
  };
  build(T) {
    let R = Z0.of(T).colorScheme,
      a = $R.of(T).app,
      e = I9.of(T),
      t = new cT({
        color: R.primary,
        bold: !0
      }),
      r = new cT({
        color: R.secondary,
        bold: !0
      }),
      h = new cT({
        color: a.command
      }),
      i = new cT({
        color: a.command,
        bold: !0
      }),
      c = new cT({
        color: R.foreground
      }),
      s = new cT({
        color: R.foreground,
        dim: !0
      }),
      A = new cT({
        color: R.destructive,
        bold: !0
      }),
      l = new cT({
        color: R.destructive
      }),
      o = new cT({
        color: R.warning,
        bold: !0
      }),
      n = new cT({
        color: a.keybind
      }),
      p = new cT({
        color: R.foreground
      }),
      _ = new cT({
        color: R.foreground,
        dim: !0
      }),
      m = e.size.width,
      b = e.size.height,
      y = m - 4,
      u = b - 4,
      P = this.selectedSkill !== null,
      k = P ? Math.max(100, Math.min(150, y)) : Math.max(60, Math.min(90, y)),
      x = P ? Math.floor(k * 2 / 5) : 0,
      f = this.widget.skills.filter(TT => TT.baseDir.startsWith("builtin://")),
      v = this.widget.skills.filter(TT => !TT.baseDir.startsWith("builtin://")),
      g = this.widget.skills.length > 0 && v.length === 0 && this.widget.errors.length === 0,
      I = [],
      S = v.length + f.length,
      O = v.length > 0 ? `Skills (${S})` : "Skills",
      j = new cT({
        color: R.secondary
      }),
      d = new cT({
        color: R.secondary,
        dim: !0
      }),
      C = new xT({
        text: new G("", j, [new G("(", d), new G("o", n), new G(")", d), new G("wner's manual", j)])
      }),
      L = this.widget.onDocs ? new G0({
        cursor: "pointer",
        onClick: () => this.widget.onDocs(),
        child: C
      }) : C,
      w = new xT({
        text: new G("", j, [new G("(", d), new G("a", n), new G(")", d), new G("dd", j)])
      }),
      D = this.widget.onAddSkill ? new G0({
        cursor: "pointer",
        onClick: () => this.widget.onAddSkill(),
        child: w
      }) : w,
      B = new T0({
        children: [new XT({
          width: 2
        }), new j0({
          child: new xT({
            text: new G(O, t)
          })
        }), L, new xT({
          text: new G("  ", p)
        }), D, new XT({
          width: 2
        })]
      });
    if (this.widget.skills.length === 0 && this.widget.errors.length === 0 || g) {
      I.push(new uR({
        padding: TR.horizontal(2),
        child: new xT({
          text: new G("Skills give the agent specialized knowledge, teach it how to use tools,", _)
        })
      })), I.push(new uR({
        padding: TR.horizontal(2),
        child: new xT({
          text: new G("or define MCP servers to load on demand.", _)
        })
      })), I.push(new XT({
        height: 1
      })), I.push(new uR({
        padding: TR.horizontal(2),
        child: new xT({
          text: new G("Create your own:", r)
        })
      }));
      let TT = ["Create a skill for searching our production logs", "Create a user skill for my preferred commit message style"];
      for (let tT of TT) I.push(new uR({
        padding: TR.horizontal(2),
        child: this.widget.onInsertPrompt ? new G0({
          cursor: "pointer",
          onClick: () => {
            this.widget.onInsertPrompt(tT);
          },
          child: new xT({
            text: new G(`  "${tT}"`, c)
          })
        }) : new xT({
          text: new G(`  "${tT}"`, c)
        })
      }));
      I.push(new XT({
        height: 1
      }));
    }
    let M = (TT, tT, lT) => {
      if (TT.length === 0) return;
      I.push(new uR({
        padding: TR.horizontal(2),
        child: new xT({
          text: new G(`${tT} `, r, lT ? [new G(`${lT}
`, s)] : [])
        })
      }));
      for (let N of TT) {
        let q = this.selectedSkill?.name === N.name ? i : h,
          F = this.widget.onInvokeSkill ? new G0({
            cursor: "pointer",
            onClick: () => this.widget.onInvokeSkill(N.name),
            child: new xT({
              text: new G(N.name, q),
              maxLines: 1,
              overflow: "ellipsis"
            })
          }) : new xT({
            text: new G(N.name, q),
            maxLines: 1,
            overflow: "ellipsis"
          }),
          E = N.description ? pz0(N.description) : "",
          U = new G0({
            cursor: "pointer",
            onClick: () => this.selectSkill(N),
            child: new xT({
              text: new G(E, c),
              maxLines: 1,
              overflow: "ellipsis"
            })
          });
        I.push(new uR({
          padding: TR.horizontal(6),
          child: new T0({
            crossAxisAlignment: "start",
            children: [new j0({
              flex: 1,
              child: F
            }), new XT({
              width: 2
            }), new j0({
              flex: 2,
              child: U
            })]
          })
        }));
      }
      I.push(new XT({
        height: 1
      }));
    };
    if (v.length > 0) for (let TT of Az0(v, this.widget.cwd)) M(TT.skills, TT.label, TT.pathHint);
    if (f.length > 0) M(f, "Built-in");
    if (this.widget.errors.length > 0) {
      if (this.widget.skills.length > 0) I.push(new XT({
        height: 1
      }));
      I.push(new uR({
        padding: TR.horizontal(2),
        child: new xT({
          text: new G(`Skipped skills with errors (${this.widget.errors.length}):`, A)
        })
      })), I.push(new XT({
        height: 1
      }));
      for (let TT of this.widget.errors) {
        let tT = TT.path.split("/"),
          lT = tT[tT.length - 2] || "unknown";
        if (I.push(new uR({
          padding: TR.horizontal(2),
          child: new xT({
            text: new G(`\u26A0 ${lT}`, o)
          })
        })), I.push(new uR({
          padding: TR.only({
            left: 4
          }),
          child: new xT({
            text: new G(TT.error, l)
          })
        })), TT.hint) I.push(new uR({
          padding: TR.only({
            left: 4
          }),
          child: new xT({
            text: new G(TT.hint.split(`
`)[0], c)
          })
        }));
        let N = JgT(TT.path, this.widget.cwd);
        I.push(new uR({
          padding: TR.only({
            left: 4
          }),
          child: new xT({
            text: new G(N, s)
          })
        }));
      }
      I.push(new XT({
        height: 1
      }));
    }
    if (this.widget.warnings.length > 0) {
      I.push(new uR({
        padding: TR.horizontal(2),
        child: new xT({
          text: new G(`Skill warnings (${this.widget.warnings.length}):`, o)
        })
      })), I.push(new XT({
        height: 1
      }));
      for (let TT of this.widget.warnings) {
        let tT = JgT(TT.path, this.widget.cwd);
        I.push(new uR({
          padding: TR.horizontal(2),
          child: new xT({
            text: new G(`\u26A0 ${tT}`, h)
          })
        })), I.push(new uR({
          padding: TR.only({
            left: 4
          }),
          child: new xT({
            text: new G(TT.error, c)
          })
        }));
      }
      I.push(new XT({
        height: 1
      }));
    }
    if (v.length > 0) {
      I.push(new uR({
        padding: TR.horizontal(2),
        child: new xT({
          text: new G("Create your own:", r)
        })
      }));
      let TT = ["Create a skill for searching our production logs", "Create a user skill for my preferred commit message style"];
      for (let tT of TT) I.push(new uR({
        padding: TR.horizontal(2),
        child: this.widget.onInsertPrompt ? new G0({
          cursor: "pointer",
          onClick: () => {
            this.widget.onInsertPrompt(tT);
          },
          child: new xT({
            text: new G(`  "${tT}"`, c)
          })
        }) : new xT({
          text: new G(`  "${tT}"`, c)
        })
      }));
    }
    let V = new xR({
        crossAxisAlignment: "stretch",
        mainAxisSize: "min",
        children: I
      }),
      Q = null;
    if (this.selectedSkill) {
      let TT = this.selectedSkill,
        tT = TT.baseDir.startsWith("builtin://"),
        lT = _z0(TT.baseDir),
        N = this.widget.onInvokeSkill ? new G0({
          cursor: "pointer",
          onClick: () => this.widget.onInvokeSkill(TT.name),
          child: new xT({
            text: new G("", j, [new G("(", d), new G("i", n), new G(")", d), new G("nvoke", j)])
          })
        }) : null,
        q = new xT({
          text: new G(lT, s),
          maxLines: 1,
          overflow: "ellipsis"
        }),
        F = new T0({
          children: [new j0({
            child: q
          }), ...(N ? [new XT({
            width: 1
          }), N] : [])]
        }),
        E = [],
        U = TT.frontmatter;
      if (U.name) E.push(`name: ${U.name}`);
      if (U.description) E.push(`description: ${U.description}`);
      if (U.license) E.push(`license: ${U.license}`);
      if (U.compatibility) E.push(`compatibility: ${U.compatibility}`);
      if (U["argument-hint"]) E.push(`argument-hint: ${U["argument-hint"]}`);
      if (U.model) E.push(`model: ${U.model}`);
      if (U["allowed-tools"]?.length) E.push(`allowed-tools: [${U["allowed-tools"].join(", ")}]`);
      if (U["builtin-tools"]?.length) E.push(`builtin-tools: [${U["builtin-tools"].join(", ")}]`);
      if (U["disable-model-invocation"]) E.push("disable-model-invocation: true");
      if (U.mode) E.push("mode: true");
      if (U.isolatedContext) E.push("isolatedContext: true");
      if (U.metadata && Object.keys(U.metadata).length > 0) {
        E.push("metadata:");
        for (let [yT, uT] of Object.entries(U.metadata)) E.push(`  ${yT}: ${uT}`);
      }
      let Z = E.length > 0 ? `---
${E.join(`
`)}
---

${TT.content || ""}` : TT.content || "",
        X = [],
        rT = TT.baseDir.startsWith("file://") ? gW(TT.baseDir) : TT.baseDir,
        hT = (TT.files || []).filter(yT => !yT.toLowerCase().endsWith("skill.md"));
      if (!tT) {
        X.push(new XT({
          height: 1
        })), X.push(new xT({
          text: new G("\u2500".repeat(x - 4), s)
        })), X.push(new XT({
          height: 1
        })), X.push(new xT({
          text: new G("Files:", s)
        })), X.push(new G0({
          cursor: "pointer",
          onClick: () => {
            je(T, `${TT.baseDir}/SKILL.md`);
          },
          child: new xT({
            text: new G("  SKILL.md", new cT({
              color: R.primary
            }))
          })
        }));
        for (let yT of hT) {
          let uT = _hT(rT, yT),
            bT = yT.startsWith("/") ? `file://${yT}` : `${TT.baseDir}/${yT}`;
          X.push(new G0({
            cursor: "pointer",
            onClick: () => {
              je(T, bT);
            },
            child: new xT({
              text: new G(`  ${uT}`, new cT({
                color: R.primary
              }))
            })
          }));
        }
      }
      let pT = tT ? new xT({
          text: new G("SKILL.md", s)
        }) : new G0({
          cursor: "pointer",
          onClick: () => {
            je(T, `${TT.baseDir}/SKILL.md`);
          },
          child: new xT({
            text: new G("SKILL.md", new cT({
              color: R.primary
            }))
          })
        }),
        mT = new xR({
          crossAxisAlignment: "stretch",
          mainAxisSize: "min",
          children: [pT, new XT({
            height: 1
          }), ...(Z ? [new xT({
            text: new G(Z, c)
          })] : []), ...X]
        });
      Q = new SR({
        constraints: new o0({
          minWidth: x,
          maxWidth: x
        }),
        decoration: new p8(void 0, new h9(void 0, void 0, void 0, new e9(R.border, 1))),
        padding: TR.only({
          left: 2
        }),
        child: new xR({
          crossAxisAlignment: "stretch",
          children: [F, new XT({
            height: 1
          }), new j0({
            child: new T0({
              crossAxisAlignment: "stretch",
              children: [new j0({
                child: new I3({
                  controller: this.detailScrollController,
                  child: mT
                })
              }), new Oi({
                controller: this.detailScrollController,
                thumbColor: a.scrollbarThumb,
                trackColor: a.scrollbarTrack,
                getScrollInfo: () => {
                  let yT = this.detailScrollController.maxScrollExtent,
                    uT = this.detailScrollController.offset;
                  return {
                    totalContentHeight: Math.max(yT + 20, 0),
                    viewportHeight: 20,
                    scrollOffset: Math.max(uT, 0)
                  };
                }
              })]
            })
          })]
        })
      });
    }
    let W = new j0({
        child: new uR({
          padding: P ? TR.only({
            right: 1
          }) : TR.all(0),
          child: new T0({
            key: this.scrollAreaKey,
            crossAxisAlignment: "stretch",
            children: [new j0({
              child: new I3({
                controller: this.listScrollController,
                child: V
              })
            }), new Oi({
              controller: this.listScrollController,
              thumbColor: a.scrollbarThumb,
              trackColor: a.scrollbarTrack,
              getScrollInfo: () => {
                let TT = this.getViewportHeight(),
                  tT = this.listScrollController.maxScrollExtent,
                  lT = this.listScrollController.offset;
                return {
                  totalContentHeight: Math.max(tT + TT, 0),
                  viewportHeight: TT,
                  scrollOffset: Math.max(lT, 0)
                };
              }
            })]
          })
        })
      }),
      eT = new N0({
        child: new xT({
          text: new G("", _, [new G("Escape", n), new G(" to close", _)])
        })
      }),
      iT = new j0({
        child: new SR({
          padding: TR.symmetric(1, 0),
          child: new T0({
            crossAxisAlignment: "stretch",
            children: [W]
          })
        })
      }),
      aT = [new j0({
        child: new xR({
          crossAxisAlignment: "stretch",
          children: [B, new XT({
            height: 1
          }), iT, new XT({
            height: 1
          }), eT]
        })
      })];
    if (Q) aT.push(Q);
    let oT = new T0({
      crossAxisAlignment: "stretch",
      children: aT
    });
    return new C8({
      autofocus: !0,
      focusNode: this.focusNode,
      onKey: this.handleKeyEvent,
      child: new N0({
        child: new SR({
          constraints: new o0(k, k, 0, u),
          decoration: new p8(R.background, h9.all(new e9(R.primary, 1, "rounded"))),
          child: new uR({
            padding: TR.all(1),
            child: oT
          })
        })
      })
    });
  }
};