I1T = class I1T extends wR {
  _controller = null;
  _physics = null;
  _scrollBehavior = null;
  _boundOnScrollChanged = this._onScrollChanged.bind(this);
  _boundHandleKeyEvent = this.handleKeyEvent.bind(this);
  _boundHandleMouseScrollEvent = this.handleMouseScrollEvent.bind(this);
  get controller() {
    return this._controller;
  }
  get physics() {
    return this._physics;
  }
  initState() {
    super.initState(), this._controller = this.widget.controller || new Q3(), this._physics = this.widget.physics || new x1T(), this._scrollBehavior = new P1T(this), this._controller.addListener(this._boundOnScrollChanged);
  }
  dispose() {
    if (this._controller) this._controller.removeListener(this._boundOnScrollChanged);
    if (!this.widget.controller) this._controller?.dispose();
    super.dispose();
  }
  build(T) {
    let R = this._controller.offset;
    this._scrollBehavior?.updateContext(T);
    let a = this._controller.followMode && this._controller.atBottom,
      e = this.widget.viewportBuilder(T, R, a, this._controller || void 0);
    if (e instanceof MY && e.child) e = new MY(e.child, {
      axisDirection: e.axisDirection,
      offset: e.offset,
      scrollController: this._controller || void 0
    });
    return new C8({
      onKey: this._boundHandleKeyEvent,
      autofocus: this.widget.autofocus,
      debugLabel: "Scrollable",
      child: new G0({
        onScroll: this._boundHandleMouseScrollEvent,
        opaque: !1,
        child: e
      })
    });
  }
  _onScrollChanged() {
    this.setState(() => {});
  }
  handleKeyEvent(T) {
    if (!this._scrollBehavior || !this.widget.keyboardScrolling) return "ignored";
    try {
      return this._scrollBehavior.handleKeyEvent(T);
    } catch (R) {
      return "ignored";
    }
  }
  handleMouseScrollEvent(T) {
    let R = this.widget.axisDirection === "horizontal",
      a = T.modifiers.shift,
      e = T.direction === "left" || T.direction === "right",
      t = T.direction === "up" || T.direction === "down",
      r = !1;
    if (R) r = e || t && a;else r = t && !a;
    if (!r) return !1;
    let h = this.getScrollStep(),
      i;
    if (T.direction === "down" || T.direction === "right") i = h;else i = -h;
    let c = this._controller.offset;
    return this.handleScrollDelta(i), this._controller.offset !== c;
  }
  getScrollStep() {
    return 1;
  }
  handleMouseEvent(T) {
    return this._scrollBehavior.handleMouseEvent(T);
  }
  handleScrollDelta(T) {
    if (!this._physics.shouldAcceptUserOffset()) return;
    let R = this._controller.offset + T,
      a = 0,
      e = this._controller.maxScrollExtent,
      t = this._physics.applyBoundaryConditions(R, a, e);
    this._controller.updateOffset(t);
  }
};
MY = class MY extends _t {
  axisDirection;
  offset;
  scrollController;
  constructor(T, {
    key: R,
    axisDirection: a = "vertical",
    offset: e = 0,
    scrollController: t
  } = {}) {
    super(R ? {
      child: T,
      key: R
    } : {
      child: T
    });
    this.axisDirection = a, this.offset = e, this.scrollController = t;
  }
  createRenderObject() {
    return new g1T(this.axisDirection, this.offset, this.scrollController);
  }
  updateRenderObject(T) {
    T.updateProperties(this.axisDirection, this.offset, this.scrollController);
  }
};
g1T = class g1T extends O9 {
  _axisDirection;
  _scrollOffset;
  _scrollController;
  constructor(T, R, a) {
    super();
    this._axisDirection = T, this._scrollOffset = R, this._scrollController = a;
  }
  updateProperties(T, R, a) {
    let e = !1;
    if (this._axisDirection !== T) this._axisDirection = T, e = !0;
    if (this._scrollOffset !== R) this._scrollOffset = R, e = !0;
    if (this._scrollController !== a) this._scrollController = a, e = !0;
    if (e) this.markNeedsLayout();
  }
  performLayout() {
    super.performLayout();
    let T = this._lastConstraints;
    if (e8(!!T, "performLayout called without constraints"), this.children.length === 0) {
      this.setSize(T.minWidth, T.minHeight);
      return;
    }
    let R = this.children[0];
    if (this._scrollController && typeof R?.getTotalContentHeight === "function") {
      let e = R.getTotalContentHeight(),
        t = Math.max(0, e - T.maxHeight),
        r = this._scrollController.atBottom;
      if (this._scrollController.updateMaxScrollExtent(t), this._scrollController.followMode && r) this._scrollController.jumpTo(t);else if (this._scrollController.offset > t) this._scrollController.jumpTo(t);
      this._scrollOffset = this._scrollController.offset;
    }
    if (typeof R.setScrollOffset === "function") R.setScrollOffset(this._scrollOffset);
    R.layout(T), this.handleBottomPositioning(T, R);
    let a = -this._scrollOffset;
    R.setOffset(0, a), this.setSize(T.maxWidth, T.maxHeight);
  }
  handleBottomPositioning(T, R) {
    if (typeof R.getTotalContentHeight !== "function" || typeof R.getPosition !== "function") return;
    let a = T.maxHeight,
      e = R.getTotalContentHeight(),
      t = R.getPosition();
    if (e <= a && t === "bottom") {
      let r = -(a - e);
      this._scrollOffset = r;
    }
  }
  paint(T, R = 0, a = 0) {
    for (let e of this.children) if ("offset" in e) {
      let t = e,
        r = R + t.offset.x,
        h = a + t.offset.y,
        i = new zm(T, R, a, this.size.width, this.size.height);
      e.paint(i, r, h);
    } else e.paint(T, R, a);
  }
  get axisDirection() {
    return this._axisDirection;
  }
  get scrollOffset() {
    return this._scrollOffset;
  }
  getMaxScrollExtent() {
    if (this.children.length === 0) return 0;
    return this.children[0]?.totalScrollExtent ?? 0;
  }
  dispose() {
    super.dispose();
  }
};
$1T = class $1T extends _t {
  axisDirection;
  offset;
  scrollController;
  position;
  constructor(T, {
    key: R,
    axisDirection: a = "vertical",
    offset: e = 0,
    scrollController: t,
    position: r = "top"
  } = {}) {
    super(R ? {
      child: T,
      key: R
    } : {
      child: T
    });
    this.axisDirection = a, this.offset = e, this.scrollController = t, this.position = r;
  }
  createRenderObject() {
    return new v1T(this.axisDirection, this.offset, this.scrollController, this.position);
  }
  updateRenderObject(T) {
    T.updateProperties(this.axisDirection, this.offset, this.scrollController, this.position);
  }
};
v1T = class v1T extends O9 {
  _axisDirection;
  _scrollOffset;
  _scrollController;
  _position;
  get scrollController() {
    return this._scrollController;
  }
  constructor(T, R, a, e = "top") {
    super();
    this._axisDirection = T, this._scrollOffset = R, this._scrollController = a, this._position = e;
  }
  updateProperties(T, R, a, e = "top") {
    if (this._axisDirection !== T) this._axisDirection = T, this.markNeedsLayout();
    if (this._scrollController !== a) this._scrollController = a, this.markNeedsLayout();
    if (this._position !== e) this._position = e, this.markNeedsLayout();
    if (this._scrollOffset !== R) this._scrollOffset = R, this.updateChildOffset();
  }
  updateChildOffset() {
    if (this.children.length === 0) return;
    let T = this.children[0],
      R = 0,
      a = 0;
    if (this._axisDirection === "vertical") a = -this._scrollOffset;else R = -this._scrollOffset;
    T.setOffset(R, a);
  }
  performLayout() {
    let T = this._lastConstraints;
    if (e8(!!T, "performLayout called without constraints"), this.children.length === 0) {
      this.setSize(T.minWidth, T.minHeight), super.performLayout();
      return;
    }
    let R = this.children[0];
    if (this._axisDirection === "vertical") {
      let t = new o0(T.minWidth, T.maxWidth, 0, Number.POSITIVE_INFINITY);
      R.layout(t);
    } else {
      let t = new o0(0, Number.POSITIVE_INFINITY, T.minHeight, T.maxHeight);
      R.layout(t);
    }
    let a, e;
    if (this._axisDirection === "vertical") a = T.maxWidth, e = this._position !== "bottom" ? Math.min(R.size.height, T.maxHeight) : T.maxHeight;else a = T.maxWidth, e = Math.min(R.size.height, T.maxHeight);
    if (this.setSize(a, e), this._scrollController) {
      let t = this.totalScrollExtent,
        r = this._scrollController.atBottom;
      if (this._scrollController.updateMaxScrollExtent(t), this._scrollController.followMode && r) this._scrollController.jumpTo(t);else if (this._scrollController.offset > t) this._scrollController.jumpTo(t);
      this._scrollOffset = this._scrollController.offset;
    }
    this.handleBottomPositioning(T, R), this.updateChildOffset(), super.performLayout();
  }
  handleBottomPositioning(T, R) {
    if (this._position !== "bottom") return;
    let a = this._axisDirection === "vertical" ? T.maxHeight : T.maxWidth,
      e = this._axisDirection === "vertical" ? R.size.height : R.size.width;
    if (e <= a) {
      let t = -(a - e);
      this._scrollOffset = t;
    }
  }
  get totalScrollExtent() {
    if (this.children.length === 0) return 0;
    let T = this.children[0];
    if (T.size.width <= 0 || T.size.height <= 0 || this.size.width <= 0 || this.size.height <= 0) return 0;
    if (this._axisDirection === "vertical") {
      let R = T.size.height,
        a = this.size.height;
      if (!Number.isFinite(R) || !Number.isFinite(a)) return 0;
      return Math.max(0, R - a);
    } else {
      let R = T.size.width,
        a = this.size.width;
      if (!Number.isFinite(R) || !Number.isFinite(a)) return 0;
      return Math.max(0, R - a);
    }
  }
  getMinIntrinsicWidth(T) {
    if (this.children.length === 0) return 0;
    let R = this.children[0];
    if (this._axisDirection === "horizontal") return 0;
    return R.getMinIntrinsicWidth(T);
  }
  getMaxIntrinsicWidth(T) {
    if (this.children.length === 0) return 0;
    let R = this.children[0];
    if (this._axisDirection === "horizontal") return R.getMaxIntrinsicWidth(T);
    return R.getMaxIntrinsicWidth(T);
  }
  getMinIntrinsicHeight(T) {
    if (this._axisDirection === "vertical") return 0;
    if (this.children.length === 0) return 0;
    return this.children[0].getMinIntrinsicHeight(T);
  }
  getMaxIntrinsicHeight(T) {
    if (this.children.length === 0) return 0;
    return this.children[0].getMaxIntrinsicHeight(T);
  }
  paint(T, R = 0, a = 0) {
    for (let e of this.children) if ("offset" in e && "paint" in e) {
      let t = new zm(T, R, a, this.size.width, this.size.height);
      e.paint(t, R, a);
    }
  }
};
W1T = class W1T extends NR {
  controller;
  getScrollInfo;
  thickness;
  trackChar;
  thumbChar;
  showTrack;
  thumbColor;
  trackColor;
  constructor({
    key: T,
    controller: R,
    getScrollInfo: a,
    thickness: e = 1,
    trackChar: t = U1T,
    thumbChar: r = H1T,
    showTrack: h = !0,
    thumbColor: i,
    trackColor: c
  }) {
    super(T ? {
      key: T
    } : {});
    this.controller = R, this.getScrollInfo = a, this.thickness = e, this.trackChar = t, this.thumbChar = r, this.showTrack = h, this.thumbColor = i, this.trackColor = c;
  }
  createState() {
    return new q1T();
  }
};
z1T = class z1T extends Jx {
  controller;
  getScrollInfo;
  thickness;
  trackChar;
  thumbChar;
  showTrack;
  thumbColor;
  trackColor;
  constructor({
    key: T,
    controller: R,
    getScrollInfo: a,
    thickness: e = 1,
    trackChar: t = U1T,
    thumbChar: r = H1T,
    showTrack: h = !0,
    thumbColor: i,
    trackColor: c
  }) {
    super(T ? {
      key: T
    } : {});
    this.controller = R, this.getScrollInfo = a, this.thickness = e, this.trackChar = t, this.thumbChar = r, this.showTrack = h, this.thumbColor = i, this.trackColor = c;
  }
  createRenderObject() {
    return new F1T(this);
  }
  updateRenderObject(T) {
    T.updateWidget(this);
  }
};
F1T = class F1T extends O9 {
  _widget;
  constructor(T) {
    super();
    this._widget = T;
  }
  updateWidget(T) {
    this._widget = T, this.markNeedsLayout();
  }
  performLayout() {
    let T = this._lastConstraints;
    e8(!!T, "performLayout called without constraints");
    let R = Math.min(T.maxWidth, this._widget.thickness),
      a = T.maxHeight;
    this.setSize(R, a), super.performLayout();
  }
  paint(T, R, a) {
    let {
      thumbStartFloat: e,
      thumbSizeFloat: t,
      showScrollbar: r
    } = this._calculateScrollbarMetrics();
    if (!r) return;
    let h = this._widget.trackColor,
      i = this._widget.thumbColor,
      c = !1,
      s = e,
      A = e + t;
    if (!c) {
      let l = ["\u2581", "\u2582", "\u2583", "\u2584", "\u2585", "\u2586", "\u2587", "\u2588"];
      for (let o = 0; o < this.size.height; o++) {
        let n = "\u2588",
          p = !0;
        if (o === Math.floor(s)) {
          let _ = 1 - (s - o),
            m = Math.floor(_ * 8);
          n = l[m] || "\u2588", p = !1;
        } else if (o === Math.floor(A)) {
          let _ = 1 - (A - o),
            m = Math.floor(_ * 8);
          n = l[m] || "\u2588";
        } else if (o > s && o < A) p = !1;
        T.setChar(R, a + o, n, {
          fg: i,
          bg: h,
          reverse: p
        }, 1);
      }
      return;
    }
    for (let l = 0; l < this.size.height; l++) {
      let o = l + 0.5,
        n = o >= s && o < A,
        p = n ? this._widget.thumbChar : this._widget.trackChar;
      T.setChar(R, a + l, p, {
        fg: n ? i : h,
        bg: LT.none(),
        reverse: !1
      }, 1);
    }
  }
  _calculateScrollbarMetrics() {
    let {
        totalContentHeight: T,
        viewportHeight: R,
        scrollOffset: a
      } = this._widget.getScrollInfo(),
      e = this.size.height;
    if (T <= R || e <= 0) return {
      thumbStartFloat: 0,
      thumbSizeFloat: 0,
      showScrollbar: !1
    };
    let t = Math.max(0, Math.min(1, a / (T - R))),
      r = Math.min(1, R / T),
      h = Math.max(1, e * r),
      i = e - h;
    return {
      thumbStartFloat: Math.max(0, i * t),
      thumbSizeFloat: h,
      showScrollbar: !0
    };
  }
};
QQT = class QQT extends wR {
  loadingState = {
    status: "loading"
  };
  downloadStatus = null;
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
    super.initState(), this.loadImage();
  }
  async loadImage() {
    try {
      let T = this.widget.props.imageBlock ? await KQT(this.widget.props.imageBlock) : await qd0(this.widget.props.filePath);
      this.loadingState = {
        status: "loaded",
        image: T.image,
        filePath: T.filePath,
        fileSize: T.fileSizeBytes,
        fileType: tQ(T.mediaType),
        originURL: T.originURL
      }, this.setState();
    } catch (T) {
      this.loadingState = {
        status: "error",
        message: T instanceof Error ? T.message : String(T)
      }, this.setState();
    }
  }
  getOptions() {
    return [{
      value: "download",
      label: "Save Image"
    }, {
      value: "close",
      label: "Close"
    }];
  }
  handleSelect = T => {
    if (!T) {
      this.widget.props.onDismiss();
      return;
    }
    switch (T) {
      case "download":
        this.downloadImage();
        break;
      case "close":
        this.widget.props.onDismiss();
        break;
    }
  };
  async downloadImage() {
    let T = this.loadingState.status === "loaded" ? this.loadingState.filePath : this.widget.props.filePath,
      R = await qQT(T);
    if (R.success) this.downloadStatus = `Saved to ${R.destPath}`, this.setState(), setTimeout(() => {
      this.widget.props.onDismiss();
    }, 1500);else this.downloadStatus = `Error: ${R.error}`, this.setState();
  }
  build(T) {
    let R = $R.of(T),
      a = R.colors,
      e = R.app,
      t = I9.sizeOf(T),
      r = t.width,
      h = t.height,
      i = r - 24,
      c = this.supportsKittyGraphics(),
      s = this.loadingState.status === "loaded" ? _IT(this.loadingState.originURL ?? this.loadingState.filePath) : _IT(this.widget.props.filePath),
      A = [];
    if (this.loadingState.status === "loading") A.push(new xT({
      text: new G("Loading...", new cT({
        color: a.foreground,
        dim: !0
      }))
    }));else if (this.loadingState.status === "error") A.push(new xT({
      text: new G(`Error: ${this.loadingState.message}`, new cT({
        color: e.toolError
      }))
    }));else {
      let {
          image: n,
          fileSize: p,
          fileType: _,
          originURL: m
        } = this.loadingState,
        b = Zd0(p);
      if (A.push(new xT({
        text: new G("", void 0, [new G(`${_}`, new cT({
          color: a.foreground,
          dim: !0
        })), new G(", ", new cT({
          color: a.foreground,
          dim: !0
        })), new G(b, new cT({
          color: a.foreground,
          dim: !0
        }))])
      })), A.push(new XT({
        height: 1
      })), m && !rQ(m)) A.push(new xT({
        text: new G(m, new cT({
          color: a.foreground,
          dim: !0
        }))
      })), A.push(new XT({
        height: 1
      }));
      let y = h - 11 - 12;
      if (c && y >= 2) {
        let u = i - 6,
          P = y;
        A.push(new N0({
          child: new FH({
            image: n,
            width: u,
            height: P,
            backgroundColor: a.background
          })
        }));
      } else if (!c) A.push(new xT({
        text: new G("(Terminal does not support inline images)", new cT({
          color: a.foreground,
          dim: !0,
          italic: !0
        }))
      }));
    }
    if (A.push(new XT({
      height: 1
    })), this.downloadStatus) A.push(new xT({
      text: new G(this.downloadStatus, new cT({
        color: this.downloadStatus.startsWith("Error") ? e.toolError : e.toolSuccess
      }))
    }));else A.push(new io({
      options: this.getOptions(),
      onSelect: this.handleSelect,
      autofocus: !0,
      showDismissalMessage: !1,
      enableMouseInteraction: !0,
      showBorder: !0
    }));
    let l = new xR({
        crossAxisAlignment: "stretch",
        mainAxisSize: "min",
        children: [new xT({
          text: new G(s, new cT({
            bold: !0,
            color: a.primary
          }))
        }), new XT({
          height: 1
        }), ...A]
      }),
      o = h - 12;
    return new C8({
      canRequestFocus: !1,
      onKey: n => {
        if (n.key === "Escape") return this.widget.props.onDismiss(), "handled";
        return "ignored";
      },
      child: new N0({
        child: new SR({
          constraints: new o0(i, i, 0, o),
          decoration: {
            color: a.background,
            border: h9.all(new e9(a.primary, 1, "rounded"))
          },
          padding: TR.symmetric(2, 1),
          child: l
        })
      })
    });
  }
};
XZT = class XZT extends wR {
  selectedAgentMode = "smart";
  submitPrompt = async T => {
    this.widget.props.editorController.clear(), this.widget.props.onNewThread(T, this.selectedAgentMode);
  };
  onToggleAgentMode = () => {
    let T = Kl();
    return this.setState(() => {
      this.selectedAgentMode = RCT(this.selectedAgentMode, T);
    }), "handled";
  };
  build(T) {
    let {
        editorController: R,
        hints: a
      } = this.widget.props,
      e = new x9(this.onToggleAgentMode),
      t = new Map([[dv, e]]),
      r = new _rT({
        child: new brT(),
        editorController: R,
        queuedMessages: [],
        hints: a,
        agentState: "idle",
        agentMode: this.selectedAgentMode,
        statusMessageOverride: this.widget.props.connectionErrorMessage,
        onSubmit: this.submitPrompt
      });
    return new Nt({
      actions: t,
      child: new kc({
        shortcuts: new Map([[x0.ctrl("s"), new dv()], [x0.alt("s"), new dv()]]),
        child: r
      })
    });
  }
};
ARR = class ARR extends wR {
  build(T) {
    let R = Z0.of(T).colorScheme,
      a = $R.of(T),
      e = I9.of(T),
      t = e.size.width,
      r = e.size.height,
      h = t - 4,
      i = Math.max(56, Math.min(86, h)),
      c = new cT({
        color: R.primary,
        bold: !0
      }),
      s = new cT({
        color: R.foreground,
        dim: !0
      }),
      A = new cT({
        color: a.app.link,
        bold: !0
      }),
      l = new cT({
        color: a.app.keybind
      }),
      o = new cT({
        color: a.app.toolError
      }),
      n = [new xT({
        text: new G("Authentication Required", c)
      }), new XT({
        height: 1
      }), new xT({
        text: new G("Sign in to Amp to continue. Your pending prompt will send automatically after login.", s)
      }), new XT({
        height: 1
      }), new xT({
        text: new G("Manual login link (select to copy):", s)
      }), new uR({
        padding: TR.only({
          left: 2,
          top: 1
        }),
        child: new ro({
          child: new xT({
            text: new G(this.widget.manualURL, A),
            selectable: !0
          })
        })
      })];
    if (this.widget.errorMessage) n.push(new XT({
      height: 1
    })), n.push(new xT({
      text: new G(this.widget.errorMessage, o)
    }));
    if (n.push(new XT({
      height: 1
    })), n.push(new xT({
      text: new G("", void 0, [new G("Enter/O", l), new G(" open browser \xB7 ", s), new G("C", l), new G(" copy link \xB7 ", s), new G("I", l), new G(" I completed login \xB7 ", s), new G("P", l), new G(" paste code \xB7 ", s), new G("Esc", l), new G(" cancel", s)])
    })), this.widget.isAuthenticating) n.push(new XT({
      height: 1
    })), n.push(new xT({
      text: new G("Waiting for login callback...", s)
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
    return new N0({
      child: p
    });
  }
};
Oi = class Oi extends NR {
  controller;
  getScrollInfo;
  thickness;
  trackChar;
  thumbChar;
  showTrack;
  thumbColor;
  trackColor;
  constructor({
    key: T,
    controller: R,
    getScrollInfo: a,
    thickness: e = 1,
    trackChar: t = zRR,
    thumbChar: r = FRR,
    showTrack: h = !0,
    thumbColor: i,
    trackColor: c
  }) {
    super(T ? {
      key: T
    } : {});
    this.controller = R, this.getScrollInfo = a, this.thickness = e, this.trackChar = t, this.thumbChar = r, this.showTrack = h, this.thumbColor = i, this.trackColor = c;
  }
  createState() {
    return new GRR();
  }
};
KRR = class KRR extends Jx {
  controller;
  getScrollInfo;
  thickness;
  trackChar;
  thumbChar;
  showTrack;
  thumbColor;
  trackColor;
  constructor({
    key: T,
    controller: R,
    getScrollInfo: a,
    thickness: e = 1,
    trackChar: t = zRR,
    thumbChar: r = FRR,
    showTrack: h = !0,
    thumbColor: i,
    trackColor: c
  }) {
    super(T ? {
      key: T
    } : {});
    this.controller = R, this.getScrollInfo = a, this.thickness = e, this.trackChar = t, this.thumbChar = r, this.showTrack = h, this.thumbColor = i, this.trackColor = c;
  }
  createRenderObject() {
    return new VRR(this);
  }
  updateRenderObject(T) {
    T.updateWidget(this);
  }
};
VRR = class VRR extends O9 {
  _widget;
  constructor(T) {
    super();
    this._widget = T;
  }
  updateWidget(T) {
    this._widget = T, this.markNeedsLayout();
  }
  performLayout() {
    let T = this._lastConstraints;
    e8(!!T, "performLayout called without constraints");
    let R = Math.min(T.maxWidth, this._widget.thickness),
      a = T.maxHeight;
    this.setSize(R, a), super.performLayout();
  }
  getMinIntrinsicWidth(T) {
    return this._widget.thickness;
  }
  getMaxIntrinsicWidth(T) {
    return this._widget.thickness;
  }
  getMinIntrinsicHeight(T) {
    return 0;
  }
  getMaxIntrinsicHeight(T) {
    return 0;
  }
  paint(T, R, a) {
    let {
      thumbStartFloat: e,
      thumbSizeFloat: t,
      showScrollbar: r
    } = this._calculateScrollbarMetrics();
    if (!r) return;
    let h = this._widget.trackColor,
      i = this._widget.thumbColor,
      c = !1,
      s = e,
      A = e + t;
    if (!c) {
      let l = ["\u2581", "\u2582", "\u2583", "\u2584", "\u2585", "\u2586", "\u2587", "\u2588"];
      for (let o = 0; o < this.size.height; o++) {
        let n = "\u2588",
          p = !0;
        if (o === Math.floor(s)) {
          let _ = 1 - (s - o),
            m = Math.floor(_ * 8);
          n = l[m] || "\u2588", p = !1;
        } else if (o === Math.floor(A)) {
          let _ = 1 - (A - o),
            m = Math.floor(_ * 8);
          n = l[m] || "\u2588";
        } else if (o > s && o < A) p = !1;
        T.setChar(R, a + o, n, {
          fg: i,
          bg: h,
          reverse: p
        }, 1);
      }
      return;
    }
    for (let l = 0; l < this.size.height; l++) {
      let o = l + 0.5,
        n = o >= s && o < A,
        p = n ? this._widget.thumbChar : this._widget.trackChar;
      T.setChar(R, a + l, p, {
        fg: n ? i : h,
        bg: h,
        reverse: !1
      }, 1);
    }
  }
  _calculateScrollbarMetrics() {
    let {
        totalContentHeight: T,
        viewportHeight: R,
        scrollOffset: a
      } = this._widget.getScrollInfo(),
      e = this.size.height;
    if (T <= R || e <= 0) return {
      thumbStartFloat: 0,
      thumbSizeFloat: 0,
      showScrollbar: !1
    };
    let t = Math.max(0, Math.min(1, a / (T - R))),
      r = Math.min(1, R / T),
      h = Math.max(1, e * r),
      i = e - h;
    return {
      thumbStartFloat: Math.max(0, i * t),
      thumbSizeFloat: h,
      showScrollbar: !0
    };
  }
};
XRR = class XRR extends wR {
  scrollController = new Q3();
  scrollAreaKey = new ph("message-dialog-scroll-area");
  viewportHeight = 20;
  initState() {
    super.initState(), this.scrollController.followMode = !1, this.scrollController.addListener(() => {
      this.setState();
    });
  }
  dispose() {
    this.scrollController.dispose(), super.dispose();
  }
  isWidgetMessage(T) {
    return T instanceof et;
  }
  resolveFooterStyle(T) {
    if (this.isWidgetMessage(T)) return T.footerStyle;
    return "default";
  }
  getViewportHeight() {
    let T = this.scrollAreaKey.currentElement?.renderObject;
    if (T && "size" in T) {
      let R = T.size;
      if (typeof R.height === "number" && R.height > 0) return this.viewportHeight = R.height, R.height;
    }
    return this.viewportHeight;
  }
  build(T) {
    let R = $R.of(T),
      a = this.widget.props.message,
      e = (() => {
        if (this.isWidgetMessage(a)) return {
          title: a.title,
          type: a.type
        };
        if (a instanceof Error && a.name === "CommandCancelledError") return {
          title: "Cancelled",
          type: "info",
          description: a.message
        };
        if (a instanceof Error && a.name === "CommandTimeoutError") return {
          title: "Timeout",
          type: "error",
          description: a.message
        };
        let A = LRR(a);
        return {
          title: A.title,
          type: A.type,
          description: A.description
        };
      })(),
      t = e.type === "error" ? R.app.toolError : R.app.command,
      r = h9.all(new e9(R.colors.border, 1, "solid")),
      h = new SR({
        padding: TR.symmetric(1, 0),
        child: new xT({
          text: new G(e.title, new cT({
            color: t,
            bold: !0
          }))
        })
      }),
      i = this.isWidgetMessage(a) ? a.widget : new xT({
        text: new G(e.description, new cT({
          color: R.colors.foreground
        })),
        selectable: !0
      }),
      c = new j0({
        child: new ro({
          child: new SR({
            padding: TR.symmetric(1, 0),
            child: new T0({
              key: this.scrollAreaKey,
              crossAxisAlignment: "stretch",
              children: [new j0({
                child: new I3({
                  controller: this.scrollController,
                  autofocus: !0,
                  child: i
                })
              }), new Oi({
                controller: this.scrollController,
                thumbColor: R.app.scrollbarThumb,
                trackColor: R.app.scrollbarTrack,
                getScrollInfo: () => {
                  let A = this.scrollController.maxScrollExtent,
                    l = this.scrollController.offset,
                    o = this.getViewportHeight(),
                    n = A + o;
                  return {
                    totalContentHeight: Math.max(n, 0),
                    viewportHeight: Math.max(o, 1),
                    scrollOffset: Math.max(l, 0)
                  };
                }
              })]
            })
          })
        })
      }),
      s = new SR({
        padding: TR.symmetric(1, 0),
        child: new xT({
          text: (() => {
            if (this.widget.props.onRetry) return new G("", void 0, [new G("Press ", new cT({
              color: R.colors.foreground,
              dim: !0
            })), new G("R", new cT({
              color: R.app.keybind
            })), new G(" to retry, ", new cT({
              color: R.colors.foreground,
              dim: !0
            })), new G("Esc", new cT({
              color: R.app.keybind
            })), new G(" to cancel", new cT({
              color: R.colors.foreground,
              dim: !0
            }))]);
            let A = this.resolveFooterStyle(this.widget.props.message);
            if (A === "none") return new G("", new cT({
              color: R.colors.foreground,
              dim: !0
            }));
            if (A === "help") {
              let l = new cT({
                  color: R.app.keybind
                }),
                o = new cT({
                  color: R.colors.foreground,
                  dim: !0
                });
              return new G("", o, [new G("Press ", o), new G("Escape", l), new G(" to close \u2022 Use ", o), new G("\u2191\u2193", l), new G(" or ", o), new G("j/k", l), new G(" to scroll", o)]);
            }
            return new G("Press any key to close", new cT({
              color: R.colors.foreground,
              dim: !0,
              italic: !0
            }));
          })()
        })
      });
    return new Ta({
      fit: "expand",
      children: [new G0({
        onClick: () => {},
        child: new XT()
      }), new C8({
        onKey: A => {
          if (this.widget.props.onRetry && A.key === "r") return this.widget.props.onRetry(), "handled";
          if (A.key === "Escape") return this.widget.props.onDismiss(), "handled";
          if (!this.widget.props.onRetry) return this.widget.props.onDismiss(), "handled";
          return "ignored";
        },
        autofocus: !1,
        child: new SR({
          decoration: {
            border: r,
            color: R.colors.background
          },
          padding: TR.all(1),
          child: new xR({
            mainAxisAlignment: "center",
            children: [h, new XT({
              height: 1
            }), c, s]
          })
        })
      })]
    });
  }
};
T0R = class T0R extends wR {
  result = void 0;
  isLoading = !1;
  isLoadingCurrentVisibility = !0;
  currentVisibility = null;
  initState() {
    this.loadCurrentVisibility();
  }
  async loadCurrentVisibility() {
    try {
      let T = await this.widget.props.threadService.get(this.widget.props.threadID);
      if (T) this.currentVisibility = eH0(T);
    } catch (T) {
      J.debug("Failed to load current thread visibility", {
        error: T
      });
    }
    if (this.mounted) this.setState(() => {
      this.isLoadingCurrentVisibility = !1;
    });
  }
  build(T) {
    let R = [];
    if (this.isLoadingCurrentVisibility) R.push(new Ko({
      message: "Loading visibility options..."
    }));else if (this.isLoading) R.push(new Ko({
      message: "Updating visibility..."
    }));else if (this.result !== void 0) R.push(new ob({
      message: this.result,
      onDismiss: () => {
        this.widget.props.onDismiss();
      }
    }));else {
      let a = ["private", "workspace", "unlisted", "public"],
        e = this.widget.props.workspace?.groups && this.widget.props.workspace.groups.length > 0 ? ["private", "workspace", "group", "unlisted", "public"] : a,
        t = (r, h) => h === this.currentVisibility ? `${r} (current)` : r;
      R.push(new we({
        items: e,
        getLabel: r => {
          switch (r) {
            case "private":
              return t("Private - Only you can see this thread", r);
            case "workspace":
              return t("Workspace - Visible to workspace members", r);
            case "group":
              return t("Group - Visible to group members", r);
            case "unlisted":
              return t("Unlisted - Anyone with the link can view", r);
            case "public":
              return t("Public - Searchable and on your public profile", r);
          }
        },
        isItemDisabled: r => r === this.currentVisibility,
        title: "Select Thread Visibility",
        onAccept: async r => {
          this.setState(() => {
            this.isLoading = !0;
          });
          let h = await this.widget.props.execute(r);
          this.setState(() => {
            this.isLoading = !1, this.result = h;
          });
        },
        onDismiss: this.widget.props.onDismiss
      }));
    }
    return new Ta({
      children: R,
      fit: "expand"
    });
  }
};
l0R = class l0R extends B0 {
  details;
  constructor({
    key: T,
    details: R
  }) {
    super(T ? {
      key: T
    } : {});
    this.details = R;
  }
  build(T) {
    let R = Z0.of(T).colorScheme,
      a = I9.of(T),
      e = new cT({
        color: R.primary,
        bold: !0
      }),
      t = new cT({
        color: R.foreground
      }),
      r = new cT({
        color: R.foreground
      }),
      h = new cT({
        color: R.secondary,
        bold: !0
      }),
      i = a.size.width,
      c = a.size.height,
      s = i - 4,
      A = Math.min(c - 4, Math.floor(c * 0.6)),
      l = Math.min(80, s),
      o = new I3({
        autofocus: !0,
        child: new uR({
          padding: TR.only({
            left: 2,
            right: 2
          }),
          child: new xR({
            crossAxisAlignment: "start",
            children: [new N0({
              child: new xT({
                text: new G(`Details
`, e),
                selectable: !0
              })
            }), new XT({
              height: 1
            }), new xT({
              text: new G(this.details, t),
              selectable: !0
            }), new XT({
              height: 1
            })]
          })
        })
      }),
      n = new N0({
        child: new xT({
          text: new G("", r, [new G("Press ", r), new G("Escape", h), new G(" to close \u2022 Use ", r), new G("\u2191\u2193", h), new G(" or ", r), new G("j/k", h), new G(" to scroll", r)])
        })
      }),
      p = new xR({
        crossAxisAlignment: "stretch",
        children: [new j0({
          child: new ro({
            child: o
          })
        }), n]
      });
    return new N0({
      child: new SR({
        constraints: new o0(l, l, 0, A),
        decoration: new p8(R.background, h9.all(new e9(R.primary, 1, "rounded"))),
        child: p
      })
    });
  }
};
u0R = class u0R extends wR {
  scrollOffset = 0;
  maxScrollOffset = 0;
  contentHeight = 0;
  viewportHeight = 0;
  logChangeListener = null;
  initState() {
    super.initState(), this.logChangeListener = () => {
      this.setState(() => {});
    }, Es.getInstance().addListener(this.logChangeListener);
  }
  dispose() {
    if (this.logChangeListener) Es.getInstance().removeListener(this.logChangeListener), this.logChangeListener = null;
    super.dispose();
  }
  handleKeyEvent = T => {
    switch (T.key) {
      case "ArrowUp":
      case "k":
        return this.scroll(-3), "handled";
      case "ArrowDown":
      case "j":
        return this.scroll(3), "handled";
      case "Home":
        return this.scrollToTop(), "handled";
      case "End":
        return this.scrollToBottom(), "handled";
      case "PageUp":
        return this.scroll(-Math.floor(this.viewportHeight * 0.8)), "handled";
      case "PageDown":
        return this.scroll(Math.floor(this.viewportHeight * 0.8)), "handled";
      default:
        return "ignored";
    }
  };
  scroll(T) {
    let R = Math.max(0, Math.min(this.maxScrollOffset, this.scrollOffset + T));
    if (R !== this.scrollOffset) this.scrollOffset = R, this.setState(() => {});
  }
  scrollToTop() {
    if (this.scrollOffset !== 0) this.scrollOffset = 0, this.setState(() => {});
  }
  scrollToBottom() {
    if (this.scrollOffset !== this.maxScrollOffset) this.scrollOffset = this.maxScrollOffset, this.setState(() => {});
  }
  updateScrollBounds(T, R) {
    this.contentHeight = T, this.viewportHeight = R, this.maxScrollOffset = Math.max(0, T - R), this.scrollOffset = Math.max(0, Math.min(this.maxScrollOffset, this.scrollOffset));
  }
  getScrollbarInfo = () => {
    return {
      totalContentHeight: this.contentHeight,
      viewportHeight: this.viewportHeight,
      scrollOffset: this.scrollOffset
    };
  };
  formatTimestamp(T) {
    let R = T.getHours().toString().padStart(2, "0"),
      a = T.getMinutes().toString().padStart(2, "0"),
      e = T.getSeconds().toString().padStart(2, "0"),
      t = T.getMilliseconds().toString().padStart(3, "0");
    return `${R}:${a}:${e}.${t}`;
  }
  getLevelColor(T, R) {
    switch (T) {
      case "error":
        return R.destructive;
      case "warn":
        return R.warning;
      case "info":
        return R.foreground;
      case "debug":
        return R.accent;
      default:
        return R.foreground;
    }
  }
  formatLogEntry(T, R) {
    let a = this.formatTimestamp(T.timestamp),
      e = this.getLevelColor(T.level, R),
      t = [new G(`[${a}] `, new cT({
        color: R.accent
      })), new G(`${T.level.toUpperCase()}: `, new cT({
        color: e
      })), new G(T.message, new cT({
        color: R.foreground
      }))];
    if (T.args.length > 0) {
      let r = T.args.map(h => typeof h === "string" ? h : JSON.stringify(h, null, 2)).join(" ");
      t.push(new G(` ${r}`, new cT({
        color: R.foreground,
        dim: !0
      })));
    }
    return t.push(new G(`
`)), t;
  }
  build(T) {
    J.debug("[ConsoleOverlay] Building console overlay");
    let R = Z0.of(T).colorScheme,
      a = Es.getInstance().getLogs();
    J.debug(`[ConsoleOverlay] Found ${a.length} log entries`);
    let e = `Console Log (${a.length} entries)`,
      t = [new G(e + `

`, new cT({
        color: R.foreground
      }))];
    if (a.length === 0) t.push(new G(`No log entries captured yet.
`, new cT({
      color: R.accent
    })));else {
      let p = a.slice().reverse();
      for (let _ of p) t.push(...this.formatLogEntry(_, R));
    }
    let r = T.mediaQuery,
      h = r ? Math.floor(r.size.width * 0.8) : 60,
      i = r ? Math.floor(r.size.height * 0.8) : 20,
      c = new C8({
        autofocus: !0,
        onKey: this.handleKeyEvent,
        child: new y0R({
          scrollOffset: this.scrollOffset,
          onMeasured: (p, _) => {
            this.updateScrollBounds(p, _);
          },
          child: new xT({
            text: new G("", void 0, t)
          })
        })
      }),
      s = $R.of(T),
      A = new Oi({
        controller: null,
        getScrollInfo: this.getScrollbarInfo,
        thickness: 1,
        thumbColor: s.app.scrollbarThumb,
        trackColor: s.app.scrollbarTrack
      }),
      l = new Ta({
        children: [new uR({
          padding: TR.only({
            left: 0,
            right: 1
          }),
          child: c
        }), new ca({
          right: 0,
          top: 0,
          bottom: 0,
          child: new XT({
            width: 1,
            child: A
          })
        })]
      }),
      o = new uR({
        padding: TR.only({
          top: 1,
          left: 1,
          right: 1,
          bottom: 1
        }),
        child: new xT({
          text: new G("Alt+C: close \u2022 \u2191\u2193/j k: scroll \u2022 Home/End: top/bottom \u2022 PgUp/PgDn: page scroll", new cT({
            color: R.accent
          }))
        })
      }),
      n = new xR({
        children: [new j0({
          child: l
        }), o]
      });
    return new N0({
      child: new SR({
        constraints: new o0(h, h, 0, i),
        decoration: new p8(R.background, h9.all(new e9(R.accent, 1, "rounded"))),
        child: new uR({
          padding: TR.all(1),
          child: n
        })
      })
    });
  }
};
y0R = class y0R extends _t {
  scrollOffset;
  onMeasured;
  constructor({
    child: T,
    scrollOffset: R = 0,
    onMeasured: a,
    key: e
  }) {
    super(e ? {
      child: T,
      key: e
    } : {
      child: T
    });
    this.scrollOffset = R, this.onMeasured = a;
  }
  createRenderObject() {
    return new P0R(this.scrollOffset, this.onMeasured);
  }
  updateRenderObject(T) {
    T.updateProperties(this.scrollOffset, this.onMeasured);
  }
};
P0R = class P0R extends O9 {
  _scrollOffset;
  _onMeasured;
  constructor(T, R) {
    super();
    this._scrollOffset = T, this._onMeasured = R;
  }
  updateProperties(T, R) {
    if (this._scrollOffset !== T) this._scrollOffset = T, this.markNeedsPaint();
    this._onMeasured = R;
  }
  performLayout() {
    let T = this._lastConstraints;
    if (e8(!!T, "performLayout called without constraints"), this.children.length === 0) {
      this.setSize(T.minWidth, T.minHeight), super.performLayout();
      return;
    }
    let R = this.children[0],
      a = new o0(T.minWidth, T.maxWidth, 0, Number.POSITIVE_INFINITY);
    R.layout(a);
    let e = -this._scrollOffset;
    if (R.setOffset(0, e), this.setSize(T.maxWidth, T.maxHeight), this._onMeasured) this._onMeasured(R.size.height, this.size.height);
    super.performLayout();
  }
  paint(T, R = 0, a = 0) {
    for (let e of this.children) if ("offset" in e && "paint" in e) {
      let t = new zm(T, R, a, this.size.width, this.size.height);
      e.paint(t, R, a);
    }
  }
};
g0R = class g0R extends _t {
  scrollOffset;
  onMeasured;
  constructor({
    child: T,
    scrollOffset: R = 0,
    onMeasured: a,
    key: e
  }) {
    super(e ? {
      child: T,
      key: e
    } : {
      child: T
    });
    this.scrollOffset = R, this.onMeasured = a;
  }
  createRenderObject() {
    return new $0R(this.scrollOffset, this.onMeasured);
  }
  updateRenderObject(T) {
    T.updateProperties(this.scrollOffset, this.onMeasured);
  }
};
$0R = class $0R extends O9 {
  _scrollOffset;
  _onMeasured;
  constructor(T, R) {
    super();
    this._scrollOffset = T, this._onMeasured = R;
  }
  updateProperties(T, R) {
    if (this._scrollOffset !== T) this._scrollOffset = T, this.markNeedsPaint();
    this._onMeasured = R;
  }
  performLayout() {
    let T = this._lastConstraints;
    if (e8(!!T, "performLayout called without constraints"), this.children.length === 0) {
      this.setSize(T.minWidth, T.minHeight), super.performLayout();
      return;
    }
    let R = this.children[0],
      a = new o0(T.minWidth, T.maxWidth, 0, Number.POSITIVE_INFINITY);
    R.layout(a);
    let e = -this._scrollOffset;
    R.setOffset(0, e);
    let t = Number.isFinite(T.maxHeight) ? T.maxHeight : R.size.height;
    if (this.setSize(T.maxWidth, t), this._onMeasured) this._onMeasured(R.size.height, this.size.height);
    super.performLayout();
  }
  paint(T, R = 0, a = 0) {
    for (let e of this.children) if ("offset" in e && "paint" in e) {
      let t = new zm(T, R, a, this.size.width, this.size.height);
      e.paint(t, R, a);
    }
  }
};
E0R = class E0R extends wR {
  scrollController;
  initState() {
    this.scrollController = new Q3(), this.scrollController.disableFollowMode(), this.scrollController.jumpTo(0);
  }
  dispose() {}
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
        color: a.keybind
      }),
      i = new cT({
        color: a.command
      }),
      c = new cT({
        color: R.foreground
      }),
      s = new cT({
        color: R.foreground
      }),
      A = e.size.width,
      l = e.size.height,
      o = A - 4,
      n = l - 4,
      p = Math.max(40, Math.min(80, o)),
      _ = new Set(["permissions-disable"]),
      m = [...this.widget.commands.filter(P => {
        let k = P.noun?.toLowerCase();
        return k !== "dev" && k !== "debug" && !P.id.startsWith("debug-") && !_.has(P.id);
      })].sort((P, k) => {
        let x = (P.noun ?? "").toLowerCase(),
          f = (k.noun ?? "").toLowerCase(),
          v = x.localeCompare(f);
        if (v !== 0) return v;
        let g = P.verb.toLowerCase(),
          I = k.verb.toLowerCase(),
          S = g.localeCompare(I);
        if (S !== 0) return S;
        return P.id.localeCompare(k.id);
      }),
      b = new I3({
        autofocus: !0,
        controller: this.scrollController,
        child: new SR({
          constraints: new o0(p, p, 0, Number.POSITIVE_INFINITY),
          child: new xR({
            crossAxisAlignment: "start",
            mainAxisSize: "min",
            children: [new N0({
              child: new xT({
                text: new G(`Amp CLI - Help & Keyboard Shortcuts
`, t)
              })
            }), new XT({
              height: 1
            }), new uR({
              padding: TR.horizontal(2),
              child: new xT({
                text: new G(`Editor Shortcuts
`, r)
              })
            }), new ZM({
              items: sH0.filter(P => P.submitOnEnterOnly === void 0 || P.submitOnEnterOnly === this.widget.submitOnEnter),
              renderRow: P => {
                let k = [];
                for (let f of P.methods) {
                  let v = this.buildCleanKeyCombination(f);
                  k.push(v);
                }
                let x = k.join(", ");
                return [new xT({
                  text: new G(x, h)
                }), new xT({
                  text: new G(P.description, c)
                })];
              }
            }), new XT({
              height: 1
            }), new uR({
              padding: TR.horizontal(2),
              child: new xT({
                text: new G(`Scrolling & Navigation
`, r)
              })
            }), new ZM({
              items: oH0,
              renderRow: P => {
                let k = [];
                for (let f of P.methods) {
                  let v = this.buildCleanKeyCombination(f);
                  k.push(v);
                }
                let x = k.join(", ");
                return [new xT({
                  text: new G(x, h)
                }), new xT({
                  text: new G(P.description, c)
                })];
              }
            }), new XT({
              height: 1
            }), new uR({
              padding: TR.horizontal(2),
              child: new xT({
                text: new G(`Command Palette Commands
`, r)
              })
            }), new ZM({
              items: m,
              renderRow: P => {
                let k = P.noun ? `${P.noun}: ${P.verb}` : P.verb;
                return [new xT({
                  text: new G(k, i)
                }), new xT({
                  text: new G(P.description, c)
                })];
              }
            }), new XT({
              height: 1
            })]
          })
        })
      }),
      y = new N0({
        child: new xT({
          text: new G("", s, [new G("Press ", s), new G("Escape", h), new G(" to close \u2022 Use ", s), new G("\u2191\u2193", h), new G(" or ", s), new G("j/k", h), new G(" to scroll", s)])
        })
      }),
      u = new xR({
        crossAxisAlignment: "stretch",
        children: [new j0({
          child: b
        }), y]
      });
    return new N0({
      child: new SR({
        constraints: new o0(p, p, 0, n),
        decoration: new p8(R.background, h9.all(new e9(R.border, 1, "rounded"))),
        child: u
      })
    });
  }
  buildCleanKeyCombination(T) {
    let {
        keys: R,
        input: a
      } = T,
      e = [];
    if (e.push(...R), a) e.push(a);
    return e.join("+");
  }
};
T9R = class T9R extends wR {
  scrollController;
  animationFrame = 0;
  animationTimer = null;
  animationFrames = ["\u223F", "\u223E", "\u223D", "\u224B", "\u2248", "\u223C"];
  initState() {
    this.scrollController = new Q3(), this.scrollController.disableFollowMode(), this.scrollController.jumpTo(0), this.startAnimationIfNeeded();
  }
  didUpdateWidget(T) {
    this.startAnimationIfNeeded();
  }
  dispose() {
    this.stopAnimation();
  }
  hasConnectingServers() {
    return this.widget.servers.some(T => T.status.type === "connecting" || T.status.type === "authenticating");
  }
  startAnimationIfNeeded() {
    let T = this.hasConnectingServers();
    if (T && !this.animationTimer) this.animationTimer = setInterval(() => {
      this.setState(() => {
        this.animationFrame = (this.animationFrame + 1) % this.animationFrames.length;
      });
    }, oW0);else if (!T && this.animationTimer) this.stopAnimation();
  }
  stopAnimation() {
    if (this.animationTimer) clearInterval(this.animationTimer), this.animationTimer = null;
  }
  build(T) {
    let R = Z0.of(T).colorScheme,
      a = $R.of(T).app,
      e = I9.of(T),
      t = e.size.width,
      r = e.size.height,
      h = t - 4,
      i = r - 4,
      c = Math.max(40, Math.min(70, h)),
      s = this.widget.servers,
      A = 0,
      l = 0,
      o = 0;
    for (let L of s) switch (L.status.type) {
      case "connected":
        A++;
        break;
      case "connecting":
      case "authenticating":
        l++;
        break;
      case "failed":
      case "denied":
      case "awaiting-approval":
      case "blocked-by-registry":
        o++;
        break;
    }
    let n = new cT({
        color: R.primary,
        bold: !0
      }),
      p = new cT({
        color: R.foreground,
        bold: !0
      }),
      _ = new cT({
        color: R.secondary,
        bold: !0
      }),
      m = new cT({
        color: a.ideConnected
      }),
      b = new cT({
        color: R.primary
      }),
      y = new cT({
        color: a.ideDisconnected
      }),
      u = new cT({
        color: a.ideWarning
      }),
      P = new cT({
        color: R.foreground,
        dim: !0
      }),
      k = new cT({
        color: a.keybind
      }),
      x = new cT({
        color: R.foreground,
        dim: !0
      }),
      f = [],
      v = new Map();
    for (let L of s) {
      let w = mW(L),
        D = v.get(w) ?? [];
      D.push(L), v.set(w, D);
    }
    for (let L of WRR) {
      let w = v.get(L);
      if (!w || w.length === 0) continue;
      let D = ahT[L];
      f.push(new uR({
        padding: TR.only({
          left: 2,
          top: f.length > 0 ? 1 : 0
        }),
        child: new xT({
          text: new G(D.label, _, [D.pathHint ? new G(` ${D.pathHint}`, P) : new G("")])
        })
      }));
      for (let B of w) f.push(new R9R({
        server: B,
        animationFrame: this.animationFrame,
        animationFrames: this.animationFrames,
        serverNameStyle: p,
        connectedStyle: m,
        connectingStyle: b,
        failedStyle: y,
        errorStyle: P,
        warningStyle: u
      }));
    }
    if (s.length === 0) f.push(new uR({
      padding: TR.symmetric(2, 1),
      child: new xT({
        text: new G("No MCP servers configured", new cT({
          color: R.foreground,
          dim: !0
        }))
      })
    }));
    let g = [];
    if (A > 0) g.push(new G(`${A} connected`, m));
    if (l > 0) {
      if (g.length > 0) g.push(new G(" \xB7 ", x));
      g.push(new G(`${l} connecting`, b));
    }
    if (o > 0) {
      if (g.length > 0) g.push(new G(" \xB7 ", x));
      g.push(new G(`${o} failed`, y));
    }
    let I = new I3({
        autofocus: !0,
        controller: this.scrollController,
        child: new SR({
          constraints: new o0(c - 4, c - 4, 0, Number.POSITIVE_INFINITY),
          child: new xR({
            crossAxisAlignment: "start",
            mainAxisSize: "min",
            children: f
          })
        })
      }),
      S = [new G("MCP Servers", n)];
    if (g.length > 0) S.push(new G("  ", void 0)), S.push(...g);
    let O = new uR({
        padding: TR.only({
          left: 2,
          right: 2,
          top: 1,
          bottom: 1
        }),
        child: new xT({
          text: new G(void 0, void 0, S)
        })
      }),
      j = new uR({
        padding: TR.horizontal(1),
        child: new xT({
          text: new G("\u2500".repeat(c - 4), new cT({
            color: R.mutedForeground,
            dim: !0
          }))
        })
      }),
      d = new uR({
        padding: TR.only({
          left: 2,
          right: 2,
          bottom: 1
        }),
        child: new xT({
          text: new G(void 0, x, [new G("Press ", x), new G("Esc", k), new G(" to close", x)])
        })
      }),
      C = new xR({
        crossAxisAlignment: "stretch",
        children: [O, j, new j0({
          child: I
        }), j, d]
      });
    return new N0({
      child: new SR({
        constraints: new o0(c, c, 0, i),
        decoration: {
          color: R.background,
          border: h9.all(new e9(R.border, 1, "rounded"))
        },
        child: C
      })
    });
  }
};
e9R = class e9R extends wR {
  formatMessage() {
    let T = this.widget.props.servers;
    if (T.length === 1) return `New MCP server '${T[0]}' added to workspace settings.`;
    return `New MCP server '${T[0]}' (and ${T.length - 1} other(s)) added to workspace settings.`;
  }
  getOptions() {
    let T = this.widget.props.servers,
      R = [];
    if (T.length === 1) R.push({
      value: "trust-once",
      label: "Trust Server"
    });
    return R.push({
      value: "always-trust",
      label: "Always Trust Workspace"
    }, {
      value: "open-settings",
      label: "Open Settings"
    }, {
      value: "dismiss",
      label: "Dismiss"
    }), R;
  }
  handleSelect = T => {
    if (T === "trust-once") {
      let R = this.widget.props.servers[0];
      if (R) this.widget.props.onTrustOnce(R);
    } else if (T === "always-trust") this.widget.props.onAlwaysTrust();else if (T === "open-settings") this.widget.props.onOpenSettings();else this.widget.props.onDismiss();
  };
  build(T) {
    let R = Z0.of(T).colorScheme,
      a = I9.sizeOf(T),
      e = Math.min(70, a.width - 4),
      t = a.height - 4,
      r = this.formatMessage();
    return new N0({
      child: new SR({
        constraints: new o0(e, e, 0, t),
        decoration: {
          color: R.background,
          border: h9.all(new e9(R.warning, 1, "rounded"))
        },
        padding: TR.all(2),
        child: new xR({
          children: [new xT({
            text: new G("MCP Server Trust Required", new cT({
              bold: !0,
              color: R.warning
            }))
          }), new XT({
            height: 1
          }), new xT({
            text: new G(r, new cT({
              color: R.foreground
            }))
          }), new XT({
            height: 1
          }), new io({
            options: this.getOptions(),
            onSelect: this.handleSelect,
            autofocus: !0,
            showDismissalMessage: !1,
            enableMouseInteraction: !1
          })],
          mainAxisSize: "min"
        })
      })
    });
  }
};
y9R = class y9R extends wR {
  _animationTimer;
  _spinner = new xa();
  _scrollController = new Q3();
  _expanded = !1;
  _viewportHeight = 0;
  get isComplete() {
    return this.widget.toolRun.status === "done";
  }
  get isError() {
    return this.widget.toolRun.status === "error";
  }
  initState() {
    if (super.initState(), !this.isComplete && !this.isError) this._startAnimation();
    this._scrollController.addListener(() => {
      this.setState();
    });
  }
  didUpdateWidget(T) {
    super.didUpdateWidget(T);
    let R = T.toolRun.status === "done" || T.toolRun.status === "error",
      a = this.isComplete || this.isError;
    if (!R && a) this._stopAnimation();else if (R && !a) this._startAnimation();
  }
  dispose() {
    this._stopAnimation(), super.dispose();
  }
  _startAnimation() {
    this._animationTimer = setInterval(() => {
      this.setState(() => {
        this._spinner.step();
      });
    }, 100);
  }
  _stopAnimation() {
    if (this._animationTimer) clearInterval(this._animationTimer), this._animationTimer = void 0;
  }
  build(T) {
    let R = Z0.of(T).colorScheme,
      a = this.widget.toolUse.input.name,
      e = new xT({
        text: new G(this._expanded ? "\u25BC" : "\u25B6", new cT({
          color: R.mutedForeground
        }))
      }),
      t = [new G("Using ", new cT({
        color: R.foreground
      }))];
    if (a) t.push(new G(a, new cT({
      color: R.foreground,
      bold: !0
    })), new G(" skill", new cT({
      color: R.foreground
    })));else t.push(new G("skill", new cT({
      color: R.foreground
    })));
    if (this.isError) t.push(new G(" \u2717", new cT({
      color: R.destructive
    })));else if (!this.isComplete) t.push(new G(" " + this._spinner.toBraille(), new cT({
      color: R.accent
    })));
    let r = new T0({
        mainAxisSize: "min",
        children: [e, new XT({
          width: 1
        }), new xT({
          text: new G("", void 0, t)
        })]
      }),
      h = [new G0({
        onClick: this._handleHeaderClick.bind(this),
        cursor: "pointer",
        child: r
      })];
    if (this._expanded) {
      let i = this._getContent();
      if (i) {
        let c = $R.of(T),
          s = {
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
          A = i.split(`
`).length,
          l = new Z3({
            markdown: i,
            styleScheme: s
          }),
          o;
        if (A <= OgT) o = l;else o = new SR({
          constraints: new o0({
            maxHeight: OgT
          }),
          child: new T0({
            crossAxisAlignment: "stretch",
            children: [new j0({
              child: new I3({
                controller: this._scrollController,
                autofocus: !1,
                child: l
              })
            }), new Oi({
              controller: this._scrollController,
              thumbColor: c.app.scrollbarThumb,
              trackColor: c.app.scrollbarTrack,
              getScrollInfo: () => {
                let n = this._scrollController.maxScrollExtent,
                  p = this._scrollController.offset,
                  _ = this._viewportHeight,
                  m = n + _;
                return {
                  totalContentHeight: Math.max(m, 0),
                  viewportHeight: Math.max(_, 1),
                  scrollOffset: Math.max(p, 0)
                };
              }
            })]
          })
        });
        h.push(new uR({
          padding: TR.only({
            left: 2
          }),
          child: o
        }));
      }
    }
    return new xR({
      mainAxisSize: "min",
      crossAxisAlignment: "start",
      children: h
    });
  }
  _getContent() {
    let {
      toolRun: T
    } = this.widget;
    if (T.status === "done") return T.result.content.map(R => R.text).join(`
`);
    if (T.status === "error") return T.error.message;
    return;
  }
  _handleHeaderClick(T) {
    this.setState(() => {
      this._expanded = !this._expanded;
    });
  }
};
h8R = class h8R extends wR {
  scrollController = (() => {
    let T = new Q3();
    return T.followMode = !0, T;
  })();
  viewportHeight = 1;
  scrollListenerAttached = !1;
  dispose() {
    this.scrollController.dispose(), super.dispose();
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
    let {
        toolUse: R,
        toolRun: a
      } = this.widget.props,
      e = $R.of(T),
      t = e.colors,
      r = new cT({
        color: t.foreground,
        dim: !0
      });
    if (!this.scrollListenerAttached) this.scrollController.addListener(() => {
      this.updateViewportHeight();
    }), this.scrollListenerAttached = !0;
    let h = R.input,
      i = new x3({
        name: "Read Thread",
        status: a.status,
        children: h.threadID ? [new xT({
          text: new G(h.threadID, r),
          selectable: !0
        })] : [],
        content: h.goal ? new uR({
          padding: new TR(2, 0, 2, 1),
          child: new xT({
            text: new G(h.goal, r),
            selectable: !0
          })
        }) : void 0
      }),
      c;
    if (a.status === "done") if (a.result.split(`
`).length < 20) c = new Z3({
      markdown: a.result
    });else c = new SR({
      constraints: new o0({
        maxHeight: 20
      }),
      child: new T0({
        crossAxisAlignment: "stretch",
        children: [new j0({
          child: new I3({
            controller: this.scrollController,
            autofocus: !1,
            child: new Z3({
              markdown: a.result
            })
          })
        }), new Oi({
          controller: this.scrollController,
          thumbColor: e.app.scrollbarThumb,
          trackColor: e.app.scrollbarTrack,
          getScrollInfo: () => {
            let s = this.scrollController.maxScrollExtent,
              A = this.scrollController.offset,
              l = this.viewportHeight,
              o = s + l;
            return {
              totalContentHeight: Math.max(o, 0),
              viewportHeight: Math.max(l, 1),
              scrollOffset: Math.max(A, 0)
            };
          }
        })]
      })
    });
    return new xR({
      crossAxisAlignment: "start",
      children: [i, new uR({
        padding: new TR(2, 0, 2, 0),
        child: c
      })]
    });
  }
};
f8R = class f8R extends wR {
  _controller = null;
  _isDisposed = !1;
  _globalToggleListener;
  _denseToggleListener;
  _renderItems = [];
  _streamingIndexes = new Set();
  _viewportHeight = 25;
  _renderItemCacheKeys = [];
  _widgetCache = new Map();
  _lastCostDisplayState = null;
  _autocompleteHandle = {
    dismiss: () => {}
  };
  _scrollListener = null;
  _controllerUnsubscribe = null;
  _lastDenseViewState = null;
  _renderDelegate = null;
  get controller() {
    return this._controller;
  }
  get _stateController() {
    return this.widget.stateController;
  }
  get _isDenseViewEnabled() {
    return this.widget.denseView;
  }
  _createRenderDelegate() {
    let T = new x8R({
      items: this.widget.items,
      toolProgressByToolUseID: this.widget.toolProgressByToolUseID,
      subagentContentByParentID: this.widget.subagentContentByParentID,
      stateController: this._stateController,
      isInSelectionMode: this.widget.isInSelectionMode,
      showRestoreHint: !!this.widget.onMessageRestoreSubmit,
      isDTWMode: this.widget.isDTWMode,
      completionBuilder: this.widget.completionBuilder,
      onShowImagePreview: this.widget.onShowImagePreview,
      onDoubleAtTrigger: this.widget.onDoubleAtTrigger,
      submitOnEnter: this.widget.submitOnEnter,
      autocompleteHandle: this._autocompleteHandle,
      showThinkingBlocks: !this._isDenseViewEnabled,
      onGetOrdinalFromUserMessageIndex: R => this.getOrdinalFromUserMessageIndex(R),
      onEditConfirmationRequest: (R, a) => {
        this.handleEditConfirmationRequest(R, a);
      },
      onRestoreConfirm: () => {
        this.handleRestoreConfirm();
      },
      onRestoreCancel: () => {
        this.handleRestoreCancel();
      },
      onEditConfirm: () => {
        this.handleEditConfirm();
      },
      onEditCancel: () => {
        this.handleEditCancel();
      },
      onStateUpdate: R => {
        this.setState(() => {
          R();
        });
      },
      onInvalidateSourceIndex: R => {
        this._clearCacheForSourceIndex(R);
      }
    });
    if (this._isDenseViewEnabled) return new n8R({
      items: this.widget.items,
      toolProgressByToolUseID: this.widget.toolProgressByToolUseID,
      subagentContentByParentID: this.widget.subagentContentByParentID,
      stateController: this._stateController,
      hasStartedStreamingResponse: this.widget.hasStartedStreamingResponse,
      threadViewState: this.widget.threadViewState,
      buildThreadItemWidget: (R, a, e) => T.buildThreadItemWidget(R, a, e),
      onStateUpdate: R => {
        this.setState(() => {
          R();
        });
      },
      onInvalidateRenderItemIndex: R => {
        let a = this._getCacheKeyForRenderItem(R);
        this._widgetCache.delete(a);
      }
    });
    return T;
  }
  _getRenderDelegate() {
    if (!this._renderDelegate) this._renderDelegate = this._createRenderDelegate();
    return this._renderDelegate;
  }
  dismiss() {
    k8.instance.addPostFrameCallback(() => {
      this.widget.focusNode?.unfocus();
    }), this.widget.onDismissFocus?.();
  }
  _navigateUp(T, R) {
    if (R <= 0) return null;
    if (T === null) return R - 1;
    if (T <= 0) return 0;
    return T - 1;
  }
  _navigateDown(T, R) {
    if (R <= 0) return null;
    if (T === null) return null;
    if (T >= R - 1) return null;
    return T + 1;
  }
  _ordinalToIndex(T, R) {
    if (R === null) return null;
    if (R < 0 || R >= T.length) return null;
    return T[R] ?? null;
  }
  _getUserCount() {
    return this.widget.navigableItemIndices.length;
  }
  _updateRenderItems() {
    this._renderDelegate = this._createRenderDelegate(), this._renderItems = this._renderDelegate.getRenderItems(), this._renderDelegate.onRenderItemsUpdated?.(this._renderItems), this._rebuildRenderItemCacheKeys();
  }
  _getSourceIndexForRenderItem(T) {
    return this._getRenderDelegate().getSourceIndex(T);
  }
  _rebuildRenderItemCacheKeys() {
    let T = new Map();
    this._renderItemCacheKeys = this._renderItems.map(R => {
      let a = this._getRenderDelegate().getCacheIdentity(R),
        e = T.get(a) ?? 0;
      return T.set(a, e + 1), `${a}:${e}`;
    });
  }
  _toolAuxiliarySignature(T, R = this.widget.toolProgressByToolUseID, a = this.widget.subagentContentByParentID) {
    let e = R.get(T)?.status ?? "none",
      t = o8R(a[T]);
    return `progress:${e}|subagents:${t}`;
  }
  _getCacheKeyForRenderItem(T) {
    return this._renderItemCacheKeys[T] ?? `missing:${T}`;
  }
  _clearSelectedUserMessage() {
    let T = this._stateController.selectedUserMessageOrdinal,
      R = T !== null ? this.getUserMessageIndexFromOrdinal(T) : null;
    this.setState(() => {
      if (R != null) this._clearCacheForSourceIndex(R);
      this._stateController.setSelectedUserMessageOrdinal(null);
    });
  }
  _selectUserMessageByOrdinal(T) {
    let R = this._stateController.selectedUserMessageOrdinal,
      a = T,
      e = R !== null ? this.getUserMessageIndexFromOrdinal(R) : null,
      t = this.getUserMessageIndexFromOrdinal(a);
    if (e !== null) this._clearCacheForSourceIndex(e);
    if (t !== null) this._clearCacheForSourceIndex(t);
    if (this.setState(() => {
      this._stateController.setSelectedUserMessageOrdinal(a);
    }), t !== null) k8.instance.addPostFrameCallback(() => {
      let r = this._getRenderIndexForSourceIndex(t);
      this.scrollToMessage(r ?? t, {
        animated: !0,
        edge: "top",
        duration: 200
      });
    });
  }
  _selectEditingUserMessageByOrdinal(T) {
    let R = this._stateController.editingMessageOrdinal,
      a = R !== null ? this.getUserMessageIndexFromOrdinal(R) : null,
      e = T !== null ? this.getUserMessageIndexFromOrdinal(T) : null;
    if (a !== null) this._clearCacheForSourceIndex(a);
    if (e !== null) this._clearCacheForSourceIndex(e);
    if (T === null) this.setState(() => {
      this._stateController.stopEditing();
    });else {
      let t = this.getUserMessageIndexFromOrdinal(T),
        r = t !== null ? this.widget.items[t] : null,
        h = r?.type === "message" && (r.message.role === "user" || r.message.role === "info") ? Tz0(r.message) : "";
      this.setState(() => {
        this._stateController.startEditing(T, h);
      });
    }
  }
  getUserMessageIndexFromOrdinal(T) {
    return this.widget.navigableItemIndices[T] ?? null;
  }
  getOrdinalFromUserMessageIndex(T) {
    let R = this.widget.navigableItemIndices.indexOf(T);
    return R >= 0 ? R : null;
  }
  getLatestUserMessageOrdinal() {
    let T = this.widget.navigableItemIndices;
    return T.length > 0 ? T.length - 1 : null;
  }
  navigateToUserMessage(T) {
    let R = this._getUserCount(),
      a = this._stateController.selectedUserMessageOrdinal,
      e = T === "up" ? this._navigateUp(a, R) : this._navigateDown(a, R);
    if (e === null && T === "down") {
      this._controller?.animateToBottom(100), this._clearSelectedUserMessage(), this.dismiss();
      return;
    }
    if (e !== null) this._selectUserMessageByOrdinal(e);
  }
  handleNavigateUserMessageUp = () => {
    if (this._stateController.editingMessageOrdinal !== null) return "ignored";
    return this.navigateToUserMessage("up"), "handled";
  };
  handleNavigateUserMessageDown = () => {
    if (this._stateController.editingMessageOrdinal !== null) return "ignored";
    return this.navigateToUserMessage("down"), "handled";
  };
  handleEscape = () => {
    if (this._stateController.editingMessageOrdinal !== null) {
      let T = this._ordinalToIndex(this.widget.userMessageIndices, this._stateController.editingMessageOrdinal);
      if (T != null) this._clearCacheForSourceIndex(T);
      return this.setState(() => {
        this._stateController.stopEditing();
      }), k8.instance.addPostFrameCallback(() => {
        this.widget.focusNode?.requestFocus();
      }), "handled";
    } else if (this._stateController.selectedUserMessageOrdinal !== null) return this._clearSelectedUserMessage(), this.setState(() => {
      this._stateController.stopEditing();
    }), this.dismiss(), this._controller?.animateToBottom(100), "handled";
    return "ignored";
  };
  handleScrollDown = () => {
    if (this._stateController.selectedUserMessageOrdinal !== null) return this._controller?.scrollDown(1), "handled";
    return "ignored";
  };
  handleScrollUp = () => {
    if (this._stateController.selectedUserMessageOrdinal !== null) return this._controller?.scrollUp(1), "handled";
    return "ignored";
  };
  handleEditMessage = () => {
    let T = this._stateController.selectedUserMessageOrdinal;
    if (T !== null) {
      let R = this.getUserMessageIndexFromOrdinal(T),
        a = R !== null ? this.widget.items[R] : null;
      if (a?.type === "message" && ok(a.message) && this.widget.isDTWMode) return "handled";
      return this._selectEditingUserMessageByOrdinal(T), "handled";
    }
    return "ignored";
  };
  handleRestoreMessage = () => {
    if (!this.widget.onMessageRestoreSubmit) return "ignored";
    let T = this._stateController.selectedUserMessageOrdinal;
    if (T !== null) {
      let R = this.getUserMessageIndexFromOrdinal(T);
      if (R === null) return "ignored";
      if (R === 0) return "ignored";
      let a = this.widget.items[R];
      if (a?.type === "message" && (a.message.role === "user" || ok(a.message))) this.showRestoreConfirmation(a.message, R);
      return "handled";
    }
    return "ignored";
  };
  async showRestoreConfirmation(T, R) {
    let a = [];
    if (this.widget.getAffectedFiles) try {
      a = await this.widget.getAffectedFiles(T);
    } catch {
      a = [];
    }
    if (this.setState(() => {
      this._widgetCache.clear(), this._stateController.setIsShowingRestoreConfirmation(!0), this._stateController.setAffectedFiles(a);
    }), this.controller.atBottom) k8.instance.addPostFrameCallback(() => {
      let e = this._getRenderIndexForSourceIndex(R);
      this.scrollToMessage(e ?? R);
    });
  }
  handleRestoreConfirm = () => {
    let T = this._stateController.selectedUserMessageOrdinal;
    if (T !== null) {
      let R = this._ordinalToIndex(this.widget.userMessageIndices, T);
      if (R != null) {
        if (R === 0) return "ignored";
        let a = this.widget.items[R];
        if (a?.type === "message" && (a.message.role === "user" || a.message.role === "info")) this.widget.onMessageRestoreSubmit?.(a.message), this._clearSelectedUserMessage(), this.setState(() => {
          this._widgetCache.clear(), this._stateController.setIsShowingRestoreConfirmation(!1), this._stateController.setAffectedFiles([]);
        }), this.dismiss();
      }
      return "handled";
    }
    return "ignored";
  };
  handleRestoreCancel = () => {
    let T = this._stateController.selectedUserMessageOrdinal;
    if (T !== null) {
      let R = this._ordinalToIndex(this.widget.userMessageIndices, T);
      if (R != null) {
        if (this.setState(() => {
          this._widgetCache.clear(), this._stateController.setIsShowingRestoreConfirmation(!1), this._stateController.setAffectedFiles([]);
        }), this.controller.atBottom) k8.instance.addPostFrameCallback(() => {
          let a = this._getRenderIndexForSourceIndex(R);
          this.scrollToMessage(a ?? R);
        });
      }
    }
    return "handled";
  };
  handleForkMessage = () => {
    if (this._stateController.selectedUserMessageOrdinal !== null && this.widget.onShowForkDeprecation) return this.widget.onShowForkDeprecation(), this._clearSelectedUserMessage(), this.setState(() => {}), this.dismiss(), "handled";
    return "ignored";
  };
  handleEditConfirmationRequest = async (T, R) => {
    if (T.trim() === "" && R.length === 0) return;
    let a = this._stateController.editingMessageOrdinal;
    if (a !== null) {
      let e = this._ordinalToIndex(this.widget.userMessageIndices, a);
      if (e != null) {
        let t = this.widget.items[e],
          r = [];
        if (this.widget.getAffectedFiles && t?.type === "message") try {
          r = await this.widget.getAffectedFiles(t.message);
        } catch {
          r = [];
        }
        if (r.length === 0 && t?.type === "message" && (t.message.role === "user" || t.message.role === "info")) {
          this.widget.onMessageEditSubmit?.(t.message, T, R), this._clearSelectedUserMessage(), this.setState(() => {
            this._widgetCache.clear(), this._stateController.stopEditing();
          }), this.dismiss(), this.controller.animateToBottom(100);
          return;
        }
        if (this.setState(() => {
          this._widgetCache.clear(), this._stateController.setIsShowingEditConfirmation(!0), this._stateController.setPendingEditText(T), this._stateController.setPendingEditImageAttachments(R), this._stateController.setAffectedFiles(r), this._stateController.stopEditing();
        }), this.controller.atBottom) k8.instance.addPostFrameCallback(() => {
          let h = this._getRenderIndexForSourceIndex(e);
          this.scrollToMessage(h ?? e);
        });
      }
    }
  };
  handleEditConfirm = () => {
    let T = this._stateController.selectedUserMessageOrdinal,
      R = this._stateController.pendingEditText;
    if (T !== null && R !== null) {
      let a = this._ordinalToIndex(this.widget.userMessageIndices, T);
      if (a != null) {
        let e = this.widget.items[a];
        if (e?.type === "message" && (e.message.role === "user" || e.message.role === "info")) this.widget.onMessageEditSubmit?.(e.message, R, [...this._stateController.pendingEditImageAttachments]), this._clearSelectedUserMessage(), this.setState(() => {
          this._widgetCache.clear(), this._stateController.setIsShowingEditConfirmation(!1), this._stateController.setPendingEditText(null), this._stateController.setPendingEditImageAttachments([]), this._stateController.setAffectedFiles([]);
        }), this.dismiss(), this.controller.animateToBottom(100);
      }
    }
  };
  handleEditCancel = () => {
    let T = this._stateController.selectedUserMessageOrdinal;
    if (T !== null) {
      let R = this._ordinalToIndex(this.widget.userMessageIndices, T);
      if (R != null) {
        if (this.setState(() => {
          this._widgetCache.clear(), this._stateController.setIsShowingEditConfirmation(!1), this._stateController.setPendingEditText(null), this._stateController.setPendingEditImageAttachments([]), this._stateController.setAffectedFiles([]);
        }), this.controller.atBottom) k8.instance.addPostFrameCallback(() => {
          let a = this._getRenderIndexForSourceIndex(R);
          this.scrollToMessage(a ?? R);
        });
      }
    }
  };
  initState() {
    if (super.initState(), this._lastDenseViewState = this._isDenseViewEnabled, this._updateRenderItems(), this._controller = this.widget.controller || new Q3(), this._scrollListener = () => {
      this._autocompleteHandle.dismiss();
    }, this._controller.addListener(this._scrollListener), this._globalToggleListener = () => {
      this.setState(() => {
        this._stateController.clearThinkingBlockStates(), this._widgetCache.clear();
      });
    }, Ut.instance.addListener(this._globalToggleListener), this._denseToggleListener = () => {
      this.setState(() => {
        this._stateController.clearDenseViewItemStates(), this._widgetCache.clear();
      });
    }, _i.instance.addListener(this._denseToggleListener), this._controllerUnsubscribe = this._stateController.subscribe(() => {
      this.setState(() => {});
    }), this.widget.items.length > 0) k8.instance.requestFrame();
  }
  didUpdateWidget(T) {
    if (super.didUpdateWidget(T), this._lastDenseViewState !== this._isDenseViewEnabled) {
      if (this._lastDenseViewState = this._isDenseViewEnabled, this._stateController.clearDenseViewItemStates(), this._widgetCache.clear(), !this._isDenseViewEnabled) _i.instance.setAllExpanded(!1);
    }
    if (this._updateRenderItems(), !T.isInSelectionMode && this.widget.isInSelectionMode) {
      this.widget.focusNode?.requestFocus();
      let a = this.getLatestUserMessageOrdinal();
      if (a !== null) this._selectUserMessageByOrdinal(a);
    }
    let R = Math.min(T.items.length, this.widget.items.length);
    for (let a = 0; a < R; a++) {
      let e = T.items[a],
        t = this.widget.items[a];
      if (e && t) {
        if (e.type !== t.type) {
          this._clearCacheForSourceIndex(a);
          continue;
        }
        if (KQ(e) !== KQ(t)) this._clearCacheForSourceIndex(a);
      }
    }
    if (T.toolProgressByToolUseID !== this.widget.toolProgressByToolUseID || T.subagentContentByParentID !== this.widget.subagentContentByParentID) for (let [a, e] of this.widget.items.entries()) {
      if (e?.type !== "toolResult") continue;
      let t = this._toolAuxiliarySignature(e.toolUse.id, T.toolProgressByToolUseID, T.subagentContentByParentID),
        r = this._toolAuxiliarySignature(e.toolUse.id);
      if (t !== r) this._clearCacheForSourceIndex(a);
    }
    this._cleanupOrphanedCacheEntries(), this._updateStreamingIndexes();
    for (let a of this._streamingIndexes) if (a >= this._renderItems.length) this._streamingIndexes.delete(a);
  }
  _cleanupOrphanedCacheEntries() {
    let T = new Set(this._renderItemCacheKeys);
    for (let R of this._widgetCache.keys()) if (!T.has(R)) this._widgetCache.delete(R);
  }
  _clearCacheForSourceIndex(T) {
    for (let [R, a] of this._renderItems.entries()) {
      let e = this._getCacheKeyForRenderItem(R);
      if (this._getRenderDelegate().includesSourceIndex(a, T)) this._widgetCache.delete(e);
    }
  }
  _getRenderIndexForSourceIndex(T) {
    for (let [R, a] of this._renderItems.entries()) if (this._getRenderDelegate().includesSourceIndex(a, T)) return R;
    return null;
  }
  _isMessageStreaming(T) {
    if (!i2(T)) return !1;
    if (T.item.type !== "message") return !1;
    let R = T.item.message;
    if (R.role !== "assistant") return !1;
    return R.state.type === "streaming";
  }
  _isToolResultStable(T) {
    if (!i2(T)) return !0;
    if (T.item.type !== "toolResult") return !0;
    return wt(T.item.toolResult.run.status);
  }
  _updateStreamingIndexes() {
    for (let T of this._streamingIndexes) if (T >= this._renderItems.length) this._streamingIndexes.delete(T);
    for (let T = 0; T < this._renderItems.length; T++) {
      let R = this._renderItems[T];
      if (!R) continue;
      let a = this._isMessageStreaming(R);
      if (a && !this._streamingIndexes.has(T)) this._streamingIndexes.add(T);else if (!a && this._streamingIndexes.has(T)) this._streamingIndexes.delete(T);
    }
  }
  _getViewportHeight() {
    let T = this.context.findRenderObject();
    if (T && "size" in T) {
      let R = T.size;
      if (typeof R.height === "number" && R.height > 0) return this._viewportHeight = R.height, R.height;
    }
    return this._viewportHeight;
  }
  dispose() {
    if (this._isDisposed = !0, this._widgetCache.clear(), this._scrollListener && this._controller) this._controller.removeListener(this._scrollListener), this._scrollListener = null;
    if (this._globalToggleListener) Ut.instance.removeListener(this._globalToggleListener);
    if (this._denseToggleListener) _i.instance.removeListener(this._denseToggleListener);
    if (this._controllerUnsubscribe) this._controllerUnsubscribe(), this._controllerUnsubscribe = null;
    if (!this.widget.controller) this._controller?.dispose();
    this.widget.focusNode?.dispose(), super.dispose();
  }
  build(T) {
    let R = $R.of(T),
      a = NJT(T);
    if (this._lastCostDisplayState !== null && this._lastCostDisplayState !== a) this._widgetCache.clear();
    this._lastCostDisplayState = a;
    let e = this._getTotalItemCount(T),
      t = [];
    for (let l = 0; l < e; l++) if (t.push(this._buildItemAtIndex(T, l)), l < e - 1) t.push(new XT({
      height: 1
    }));
    let r = new I3({
        controller: this._controller,
        autofocus: this.widget.autofocus,
        position: "bottom",
        child: new xR({
          key: new k3("message-list-column"),
          crossAxisAlignment: "start",
          children: t
        })
      }),
      h = [new uR({
        padding: TR.only({
          left: 2,
          right: this.widget.showScrollbar ? 3 : 2,
          bottom: 1
        }),
        child: r
      })];
    if (this.widget.showScrollbar && this._controller) {
      let l = new Oi({
        controller: this._controller,
        getScrollInfo: () => this._getScrollbarInfo(),
        thickness: 1,
        thumbColor: R.app.scrollbarThumb,
        trackColor: R.app.scrollbarTrack
      });
      h.push(new ca({
        right: 1,
        top: 0,
        bottom: 0,
        child: new XT({
          width: 1,
          child: l
        })
      }));
    }
    let i = new Ta({
        children: h
      }),
      c = new ro({
        child: i,
        onCopy: this.widget.onCopy,
        onSelectionChanged: this.widget.onSelectionChanged
      }),
      s = new Map([[RD, new x9(this.handleNavigateUserMessageUp)], [aD, new x9(this.handleNavigateUserMessageDown)], [VQ, new x9(this.handleEscape)], [XQ, new x9(this.handleScrollDown)], [YQ, new x9(this.handleScrollUp)], [QQ, new x9(this.handleEditMessage)], [ZQ, new x9(this.handleRestoreMessage)], [JQ, new x9(this.handleForkMessage)]]),
      A = new Map([[x0.key("Tab"), new RD()], [x0.shift("Tab"), new aD()], [x0.key("Escape"), new VQ()], [x0.key("j"), new XQ()], [x0.key("k"), new YQ()], [x0.key("e"), new QQ()], [x0.key("f"), new JQ()]]);
    if (this.widget.onMessageRestoreSubmit) A.set(x0.key("r"), new ZQ());
    if (!ji()) A.set(x0.key("ArrowUp"), new RD()), A.set(x0.key("ArrowDown"), new aD());
    if (this.widget.focusNode) return new C8({
      focusNode: this.widget.focusNode,
      child: new Nt({
        actions: s,
        child: new kc({
          shortcuts: A,
          focusNode: this.widget.focusNode,
          child: c
        })
      })
    });
    return c;
  }
  _getTotalItemCount(T) {
    return this._renderItems.length;
  }
  _shouldDimItem(T) {
    if (this.widget.isInHandoffMode) return !0;
    if (this._stateController.isShowingRestoreConfirmation || this._stateController.isShowingEditConfirmation) {
      let a = this._stateController.selectedUserMessageOrdinal;
      if (a === null) return !1;
      let e = this.getUserMessageIndexFromOrdinal(a);
      if (e === null) return !1;
      return T > e;
    }
    let R = this._stateController.editingMessageOrdinal;
    if (R !== null) {
      let a = this.getUserMessageIndexFromOrdinal(R);
      if (a === null) return !1;
      return T > a;
    }
    return !1;
  }
  _buildItemAtIndex(T, R) {
    let a = this._renderItems[R];
    if (!a) return new SR();
    let e = i2(a) ? a.item : null,
      t = e?.type === "toolResult" && (e.toolResult.run.status === "queued" || e.toolResult.run.status === "in-progress") && !("result" in e.toolResult.run) && !("error" in e.toolResult.run),
      r = this._getSourceIndexForRenderItem(a),
      h = this._shouldDimItem(r),
      i = this._isMessageStreaming(a),
      c = this._isToolResultStable(a);
    if (!t && !i && c) {
      let A = `${this._getRenderDelegate().getRenderSignature(a)}|dim:${h ? 1 : 0}`,
        l = this._getCacheKeyForRenderItem(R),
        o = this._widgetCache.get(l);
      if (o && o.sig === A) return o.widget;
      let n = this._getRenderDelegate().buildWidget(T, a, R),
        p = h ? new CA({
          forceDim: !0,
          child: n
        }) : n;
      return this._widgetCache.set(l, {
        sig: A,
        widget: p
      }), p;
    }
    let s = this._getRenderDelegate().buildWidget(T, a, R);
    return h ? new CA({
      forceDim: !0,
      child: s
    }) : s;
  }
  scrollToTop() {
    if (this._isDisposed || !this._controller) return;
    this._controller.scrollToTop();
  }
  scrollToMessage(T, {
    animated: R = !1,
    offsetPercent: a = 0.25,
    edge: e = "top",
    duration: t
  } = {}) {
    if (this._isDisposed || !this._controller) return !1;
    let r = this._getMessageRelativeOffset(T, e);
    if (r === null) return !1;
    let h = this._getViewportHeight(),
      i = Math.floor(h * a),
      c = r - i;
    if (R) this._controller.animateTo(c, t);else this._controller.jumpTo(c);
    return !0;
  }
  _getColumnElement() {
    let T = this.context.element;
    if (!T) return null;
    let R = new k3("message-list-column"),
      a = e => {
        if (e.widget.key?.equals(R)) return e;
        for (let t of e.children) {
          let r = a(t);
          if (r) return r;
        }
        return null;
      };
    return a(T);
  }
  _getMessageRelativeOffset(T, R) {
    let a = this._getColumnElement();
    if (!a) return null;
    let e = T * 2,
      t = a.children[e];
    if (!t?.renderObject) return null;
    let r = t.renderObject,
      h = a.renderObject;
    if (!h) return null;
    let i = r.localToGlobal({
        x: 0,
        y: 0
      }),
      c = h.localToGlobal({
        x: 0,
        y: 0
      }),
      s = 0;
    if (R === "bottom") s = r.size.height;
    return i.y + s - c.y;
  }
  _getScrollbarInfo() {
    let T = this._controller?.maxScrollExtent ?? 0,
      R = this._getViewportHeight(),
      a = this._controller?.offset ?? 0,
      e = T + R;
    return {
      totalContentHeight: Math.max(e, 0),
      viewportHeight: Math.max(R, 1),
      scrollOffset: Math.max(a, 0)
    };
  }
};
z8R = class z8R extends wR {
  _scrollController = new Q3();
  _viewportHeight = 0;
  getOptions() {
    return [{
      value: "remove",
      label: "Remove skill"
    }, {
      value: "close",
      label: "Close"
    }];
  }
  handleSelect = T => {
    if (!T) {
      this.widget.props.onDismiss();
      return;
    }
    switch (T) {
      case "remove":
        this.widget.props.onRemove();
        break;
      case "close":
        this.widget.props.onDismiss();
        break;
    }
  };
  dispose() {
    this._scrollController.dispose(), super.dispose();
  }
  build(T) {
    let {
        pendingSkill: R,
        skill: a
      } = this.widget.props,
      e = Z0.of(T).colorScheme,
      t = $R.of(T),
      r = I9.sizeOf(T),
      h = r.width,
      i = r.height,
      c = Math.min(h - 12, 80),
      s = Math.min(i - 4, 30),
      A = 16,
      l = s - 16,
      o = [];
    if (a?.description) {
      if (o.push(new xT({
        text: new G(a.description, new cT({
          color: e.foreground
        }))
      })), o.push(new XT({
        height: 1
      })), a.content && l > 2) {
        o.push(new xT({
          text: new G("\u2500".repeat(c - 6), new cT({
            color: e.foreground,
            dim: !0
          }))
        })), o.push(new XT({
          height: 1
        }));
        let p = a.content.split(`
`).length,
          _ = Math.max(Math.min(p, l), 3);
        this._viewportHeight = _;
        let m = new Z3({
            markdown: a.content
          }),
          b = new SR({
            constraints: new o0({
              maxHeight: _
            }),
            child: new T0({
              crossAxisAlignment: "stretch",
              children: [new j0({
                child: new I3({
                  controller: this._scrollController,
                  autofocus: !1,
                  child: m
                })
              }), new Oi({
                controller: this._scrollController,
                thumbColor: t.app.scrollbarThumb,
                trackColor: t.app.scrollbarTrack,
                getScrollInfo: () => {
                  let y = this._scrollController.maxScrollExtent,
                    u = this._scrollController.offset,
                    P = this._viewportHeight,
                    k = y + P;
                  return {
                    totalContentHeight: Math.max(k, 0),
                    viewportHeight: Math.max(P, 1),
                    scrollOffset: Math.max(u, 0)
                  };
                }
              })]
            })
          });
        o.push(b), o.push(new XT({
          height: 1
        }));
      }
    } else o.push(new xT({
      text: new G("(Loading skill details...)", new cT({
        color: e.foreground,
        dim: !0,
        italic: !0
      }))
    })), o.push(new XT({
      height: 1
    }));
    if (R.arguments) o.push(new xT({
      text: new G("", void 0, [new G("Arguments: ", new cT({
        color: e.foreground,
        dim: !0
      })), new G(R.arguments, new cT({
        color: e.foreground
      }))])
    })), o.push(new XT({
      height: 1
    }));
    let n = new xR({
      crossAxisAlignment: "stretch",
      mainAxisSize: "min",
      children: [new xT({
        text: new G("", void 0, [new G(R.name, new cT({
          bold: !0,
          color: e.success,
          underline: !0
        }))])
      }), new XT({
        height: 1
      }), ...o, new io({
        options: this.getOptions(),
        onSelect: this.handleSelect,
        autofocus: !0,
        showDismissalMessage: !1,
        enableMouseInteraction: !0
      })]
    });
    return new C8({
      onKey: p => {
        if (p.key === "Escape") return this.widget.props.onDismiss(), "handled";
        return "ignored";
      },
      child: new N0({
        child: new dH(new SR({
          constraints: new o0(c, c, 0, s),
          decoration: {
            color: e.background,
            border: h9.all(new e9(e.success, 1, "rounded"))
          },
          padding: TR.symmetric(2, 1),
          child: n
        }))
      })
    });
  }
};
T3R = class T3R extends wR {
  viewportHeight = 1;
  scrollListenerAttached = !1;
  initState() {
    if (!this.scrollListenerAttached) this.widget.props.controller.addListener(() => {
      this.updateViewportHeight();
    }), this.scrollListenerAttached = !0;
  }
  build(T) {
    let {
      todos: R,
      controller: a,
      appTheme: e
    } = this.widget.props;
    return new T0({
      crossAxisAlignment: "stretch",
      children: [new j0({
        child: new I3({
          controller: a,
          autofocus: !1,
          child: new Y8R({
            todos: R
          })
        })
      }), new Oi({
        controller: a,
        thumbColor: e.app.scrollbarThumb,
        trackColor: e.app.scrollbarTrack,
        getScrollInfo: () => {
          let {
              maxScrollExtent: t,
              offset: r
            } = a,
            h = this.viewportHeight,
            i = t + h;
          return {
            totalContentHeight: Math.max(i, 0),
            viewportHeight: Math.max(h, 1),
            scrollOffset: Math.max(r, 0)
          };
        }
      })]
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
    if ("size" in T) {
      let e = T.size;
      if (typeof e?.height === "number" && e.height > 0) return e.height;
    }
    return this.viewportHeight;
  }
};