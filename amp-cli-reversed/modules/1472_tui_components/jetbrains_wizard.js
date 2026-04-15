Rt = class Rt extends SR {
  overlays;
  constructor({
    key: T,
    child: R,
    padding: a,
    overlays: e = [],
    overlayGroupSpacing: t = 1,
    decoration: r,
    constraints: h,
    width: i,
    height: c,
    margin: s
  }) {
    let A = Rt._buildOverlayWidgets(e, t);
    super({
      key: T,
      child: new Ta({
        children: [new SR({
          width: i,
          height: c,
          constraints: h,
          margin: s,
          decoration: r,
          padding: a,
          child: R
        }), ...A]
      })
    });
    this.overlays = e;
  }
  static _buildOverlayWidgets(T, R) {
    let a = {
      top: Rt._createEmptyOverlayBuckets(),
      bottom: Rt._createEmptyOverlayBuckets()
    };
    for (let t of T) a[t.position][t.alignment].push(t);
    let e = [];
    for (let t of ["top", "bottom"]) {
      let r = t === "top" ? 0 : void 0,
        h = t === "bottom" ? 0 : void 0,
        i = a[t],
        c = Rt._buildSideOverlayWidget({
          leftOverlays: i.left,
          rightOverlays: i.right,
          overlayGroupSpacing: R,
          top: r,
          bottom: h
        });
      if (c) e.push(c);
      let s = Rt._buildCenteredOverlayWidget({
        centerOverlays: i.center,
        overlayGroupSpacing: R,
        isTop: t === "top"
      });
      if (s) e.push(s);
    }
    return e;
  }
  static _createEmptyOverlayBuckets() {
    return {
      left: [],
      center: [],
      right: []
    };
  }
  static _buildSideOverlayWidget({
    leftOverlays: T,
    rightOverlays: R,
    overlayGroupSpacing: a,
    top: e,
    bottom: t
  }) {
    let r = Rt._buildOverlayGroupWidget(T, "left", a),
      h = Rt._buildOverlayGroupWidget(R, "right", a);
    if (!r && !h) return;
    let i = 2 + (T[0]?.offsetX ?? 0),
      c = 2 + (R[0]?.offsetX ?? 0),
      s = [],
      {
        leftFlex: A,
        rightFlex: l
      } = Rt._computeSideFlexes(r?.preferredWidth, h?.preferredWidth);
    if (r) s.push(Rt._buildEdgeOverlaySlot(r.widget, "left", A));
    if (r && h) s.push(new XT({
      width: 1
    }));
    if (h) s.push(Rt._buildEdgeOverlaySlot(h.widget, "right", l));
    return new ca({
      left: i,
      right: c,
      top: e,
      bottom: t,
      child: new T0({
        children: s
      })
    });
  }
  static _buildEdgeOverlaySlot(T, R, a) {
    return new j0({
      flex: a,
      child: new dH(new T0({
        mainAxisAlignment: R === "left" ? "start" : "end",
        children: [new Fm({
          fit: "loose",
          child: T
        })]
      }))
    });
  }
  static _buildCenteredOverlayWidget({
    centerOverlays: T,
    overlayGroupSpacing: R,
    isTop: a
  }) {
    let e = Rt._buildOverlayGroupWidget(T, "center", R);
    if (!e) return;
    return new wtT({
      child: e.widget,
      isTop: a
    });
  }
  static _buildOverlayGroupWidget(T, R, a) {
    if (T.length === 0) return;
    let e = [];
    for (let [r, h] of T.entries()) {
      if (!(h.child instanceof xT)) return Rt._buildGroupedFallbackWidget(T, a);
      if (r > 0 && a > 0) e.push(new G(" ".repeat(a)));
      e.push(h.child.text);
    }
    let t = new G("", void 0, e);
    return {
      widget: new xT({
        text: t,
        textAlign: R,
        maxLines: 1,
        overflow: "ellipsis"
      }),
      preferredWidth: Math.max(1, q8(t.toPlainText()))
    };
  }
  static _buildGroupedFallbackWidget(T, R) {
    let a = [],
      e = 0;
    for (let t of T) {
      if (a.length > 0 && R > 0) a.push(new XT({
        width: R
      })), e += R;
      a.push(t.child), e += x$(t.child);
    }
    return {
      widget: new T0({
        mainAxisSize: "min",
        children: a
      }),
      preferredWidth: Math.max(1, e)
    };
  }
  static _computeSideFlexes(T, R) {
    if (!T || !R) return {
      leftFlex: 1,
      rightFlex: 1
    };
    let a = T + R,
      e = 0.25,
      t = T / a,
      r = Math.min(1 - e, Math.max(e, t)),
      h = 100,
      i = Math.max(1, Math.round(r * h)),
      c = Math.max(1, h - i);
    return {
      leftFlex: i,
      rightFlex: c
    };
  }
};
K1T = class K1T extends wR {
  _controller;
  _viewportKey = new ph("list-view-viewport");
  _viewportHeight = 20;
  _viewportWidth = 0;
  _itemIdentities = [];
  _itemIndexesByIdentity = new Map();
  _keptAliveItemIdentities = new Set();
  _extents = [];
  _prefixSums = [0];
  _measuredExtents = new Map();
  _boundOnScrollChanged = this._handleScrollChanged.bind(this);
  get controller() {
    return this._controller;
  }
  get viewportHeight() {
    return this._viewportHeight;
  }
  get totalContentHeight() {
    return this._prefixSums[this._prefixSums.length - 1] ?? 0;
  }
  initState() {
    if (super.initState(), this._viewportHeight = this.widget.initialViewportHeight, this._controller = this.widget.controller ?? new Q3(), this._configureController(), this._controller.addListener(this._boundOnScrollChanged), this._refreshItemMetadata(!1), this.widget.position === "bottom") {
      let T = Math.max(0, this.totalContentHeight - this._viewportHeight);
      this._controller.updateMaxScrollExtent(T), this._controller.jumpTo(T);
    }
  }
  didUpdateWidget(T) {
    if (super.didUpdateWidget(T), T.controller !== this.widget.controller) {
      if (this._controller.removeListener(this._boundOnScrollChanged), !T.controller) this._controller.dispose();
      this._controller = this.widget.controller ?? new Q3(), this._configureController(), this._controller.addListener(this._boundOnScrollChanged);
    }
    if (T.position !== this.widget.position) this._configureController();
    let R = T.itemKeyBuilder !== this.widget.itemKeyBuilder || T.estimatedItemExtent !== this.widget.estimatedItemExtent || T.estimatedItemExtentBuilder !== this.widget.estimatedItemExtentBuilder || T.itemSpacing !== this.widget.itemSpacing,
      a = R || T.children !== this.widget.children || T.itemCount !== this.widget.itemCount;
    if (T.enableSelection && !this.widget.enableSelection) this._keptAliveItemIdentities.clear();
    if (a) this._refreshItemMetadata(R);
  }
  build(T) {
    let R = this._getRealizedRanges(),
      a = [],
      e = 0;
    for (let h of R) {
      let i = Math.max(0, (this._prefixSums[h.start] ?? 0) - (this._prefixSums[e] ?? 0));
      if (i > 0) a.push(new XT({
        key: new k3(`list-view-gap-${e}-${h.start}`),
        height: i
      }));
      for (let c = h.start; c < h.end; c++) a.push(this._buildItem(T, c));
      e = h.end;
    }
    let t = Math.max(0, this.totalContentHeight - (this._prefixSums[e] ?? this.totalContentHeight));
    if (t > 0) a.push(new XT({
      key: new k3(`list-view-gap-${e}-${this._getItemCount()}`),
      height: t
    }));
    let r = new NM({
      key: this._viewportKey,
      onSizeChange: this._handleViewportSize,
      child: new I3({
        controller: this._controller,
        autofocus: this.widget.autofocus,
        position: this.widget.position,
        keyboardScrolling: this.widget.keyboardScrolling,
        child: new xR({
          key: new k3("list-view-column"),
          crossAxisAlignment: "start",
          children: a
        })
      })
    });
    if (this.widget.showScrollbar) r = new Ta({
      children: [new uR({
        padding: TR.only({
          right: this.widget.scrollbarThickness
        }),
        child: r
      }), new ca({
        right: 0,
        top: 0,
        bottom: 0,
        child: new XT({
          width: this.widget.scrollbarThickness,
          child: new W1T({
            controller: this._controller,
            getScrollInfo: () => {
              if (this._measuredExtents.size === 0) return {
                totalContentHeight: 0,
                viewportHeight: this._viewportHeight,
                scrollOffset: 0
              };
              let h = this.totalContentHeight,
                i = h - this._viewportHeight,
                c = this._controller.atBottom ? i : this._controller.offset;
              return {
                totalContentHeight: h,
                viewportHeight: this._viewportHeight,
                scrollOffset: c
              };
            },
            thickness: this.widget.scrollbarThickness
          })
        })
      })]
    });
    if (!this.widget.enableSelection) return r;
    return new ro({
      child: r,
      onCopy: this.widget.onCopy,
      onSelectionChanged: this._handleSelectionChanged,
      scrollController: this._controller,
      getScrollBounds: this._getScrollBounds
    });
  }
  scrollToIndex(T, R = {}) {
    let a = Math.max(0, Math.min(T, this._extents.length - 1)),
      e = this.getEstimatedOffsetForIndex(a),
      t = this.getEstimatedExtentForIndex(a),
      r = (R.edge ?? "top") === "bottom" ? Math.max(0, e + t - this._viewportHeight) : e;
    if (R.animated) {
      this._controller.animateTo(r, {
        duration: R.duration,
        curve: R.curve ?? "easeInOutCubic"
      });
      return;
    }
    this._controller.jumpTo(r);
  }
  getEstimatedIndexForOffset(T = this._controller.offset) {
    return this._findIndexAtOffset(Math.max(0, T));
  }
  getEstimatedOffsetForIndex(T) {
    let R = Math.max(0, Math.min(T, this._extents.length));
    return this._prefixSums[R] ?? 0;
  }
  getEstimatedExtentForIndex(T) {
    return this._extents[T] ?? 0;
  }
  dispose() {
    if (this._controller.removeListener(this._boundOnScrollChanged), !this.widget.controller) this._controller.dispose();
    super.dispose();
  }
  _buildItem(T, R) {
    let a = this._itemIdentities[R] ?? this._identityForIndex(R),
      e = this._keyForIndex(R),
      t = this._spacingForIndex(R),
      r = this._buildItemWidget(T, R),
      h = t > 0 ? new uR({
        padding: TR.only({
          bottom: t
        }),
        child: r
      }) : r;
    if (!this.widget.enableSelection) return new NM({
      key: e,
      onSizeChange: i => {
        this._handleItemSizeChange(R, i.height);
      },
      child: h
    });
    return new u1T({
      key: e,
      onKeepAliveChange: i => {
        this._handleItemKeepAliveChange(a, i);
      },
      child: new NM({
        onSizeChange: i => {
          this._handleItemSizeChange(R, i.height);
        },
        child: h
      })
    });
  }
  _buildItemWidget(T, R) {
    let a = this.widget.children?.[R];
    if (a) return a;
    let e = this.widget.itemBuilder;
    if (!e) throw Error("ListView itemBuilder is missing");
    return e(T, R);
  }
  _getItemCount() {
    return this.widget.children?.length ?? this.widget.itemCount ?? 0;
  }
  _refreshItemMetadata(T) {
    if (T) this._measuredExtents.clear();
    let R = this._getItemCount(),
      a = [],
      e = new Map(),
      t = [],
      r = new Map();
    for (let h = 0; h < R; h++) {
      let i = this._identityForIndex(h);
      a.push(i), e.set(i, h);
      let c = this._measuredExtents.get(i);
      if (c !== void 0) r.set(i, c);
      t.push(c ?? this._estimatedExtentForIndex(h));
    }
    this._measuredExtents = r, this._itemIdentities = a, this._itemIndexesByIdentity = e;
    for (let h of this._keptAliveItemIdentities) if (!e.has(h)) this._keptAliveItemIdentities.delete(h);
    this._extents = t, this._prefixSums = Array(R + 1).fill(0), this._recomputePrefixSumsFrom(0);
  }
  _handleViewportSize = T => {
    let R = Math.max(1, T.height),
      a = T.width !== this._viewportWidth,
      e = R !== this._viewportHeight;
    if (!a && !e) return;
    this.setState(() => {
      if (this._viewportWidth = T.width, this._viewportHeight = R, a) this._refreshItemMetadata(!1);
    });
  };
  _handleItemSizeChange(T, R) {
    let a = this._itemIdentities[T];
    if (!a) return;
    let e = Math.max(1, R),
      t = this._extents[T] ?? this._estimatedExtentForIndex(T);
    if (t === e) return;
    let r = this._controller.atBottom,
      h = this._extents.length > 0 ? this._findIndexAtOffset(this._controller.offset) : 0;
    if (this._measuredExtents.set(a, e), this._extents[T] = e, this._recomputePrefixSumsFrom(T), this._controller.followMode && r) {
      let i = Math.max(0, this.totalContentHeight - this._viewportHeight);
      this._controller.updateMaxScrollExtent(i), this._controller.jumpTo(i);
    } else if (T < h) this._controller.jumpTo(this._controller.offset + (e - t));
    this.setState();
  }
  _handleScrollChanged() {
    this.setState();
  }
  _configureController() {
    this._controller.followMode = this.widget.position === "bottom";
  }
  _handleSelectionChanged = T => {
    this.widget.onSelectionChanged?.(T);
  };
  _handleItemKeepAliveChange(T, R) {
    if (!this.mounted) return;
    if (this._keptAliveItemIdentities.has(T) === R) return;
    this.setState(() => {
      if (R) {
        this._keptAliveItemIdentities.add(T);
        return;
      }
      this._keptAliveItemIdentities.delete(T);
    });
  }
  _getRealizedRanges() {
    let T = this._getItemCount();
    if (T === 0) return [];
    if (this.widget.disableVirtualization || this._measuredExtents.size === 0 && this.widget.position === "bottom") return [{
      start: 0,
      end: T
    }];
    let R = new Set(),
      a = this._getViewportRealizedRange();
    for (let i = a.start; i < a.end; i++) R.add(i);
    for (let i of this._keptAliveItemIdentities) {
      let c = this._itemIndexesByIdentity.get(i);
      if (c !== void 0) R.add(c);
    }
    let e = [...R].sort((i, c) => i - c);
    if (e.length === 0) return [];
    let t = [],
      r = e[0] ?? 0,
      h = r + 1;
    for (let i = 1; i < e.length; i++) {
      let c = e[i];
      if (c === void 0) continue;
      if (c === h) {
        h++;
        continue;
      }
      t.push({
        start: r,
        end: h
      }), r = c, h = c + 1;
    }
    return t.push({
      start: r,
      end: h
    }), t;
  }
  _getViewportRealizedRange() {
    let T = this._getItemCount();
    if (T === 0) return {
      start: 0,
      end: 0
    };
    let R = Math.max(0, this._controller.offset - this.widget.cacheExtent),
      a = this._controller.offset + this._viewportHeight + this.widget.cacheExtent,
      e = this._findIndexAtOffset(R),
      t = Math.min(T, this._findIndexAtOffset(a) + 1);
    return {
      start: e,
      end: t
    };
  }
  _findIndexAtOffset(T) {
    if (this._extents.length === 0) return 0;
    let R = 0,
      a = this._extents.length - 1;
    while (R <= a) {
      let e = Math.floor((R + a) / 2),
        t = this._prefixSums[e] ?? 0,
        r = this._prefixSums[e + 1] ?? t;
      if (T < t) {
        a = e - 1;
        continue;
      }
      if (T >= r) {
        R = e + 1;
        continue;
      }
      return e;
    }
    return Math.max(0, Math.min(R, this._extents.length - 1));
  }
  _recomputePrefixSumsFrom(T) {
    if (this._prefixSums.length !== this._extents.length + 1 || T <= 0) this._prefixSums = Array(this._extents.length + 1).fill(0), T = 0;
    for (let R = T; R < this._extents.length; R++) this._prefixSums[R + 1] = (this._prefixSums[R] ?? 0) + (this._extents[R] ?? 0);
  }
  _identityForIndex(T) {
    return this._keyForIndex(T).toString();
  }
  _keyForIndex(T) {
    return this.widget.itemKeyBuilder?.(T) ?? this.widget.children?.[T]?.key ?? new k3(`list-view-item-${T}`);
  }
  _estimatedExtentForIndex(T) {
    let R = this.widget.estimatedItemExtentBuilder?.(T) ?? this.widget.estimatedItemExtent;
    return Math.max(1, R + this._spacingForIndex(T));
  }
  _spacingForIndex(T) {
    return T < this._getItemCount() - 1 ? this.widget.itemSpacing : 0;
  }
  _getScrollBounds = () => {
    let T = this._viewportKey.currentElement?.renderObject;
    if (!(T instanceof O9)) return null;
    let R = T.localToGlobal({
      x: 0,
      y: 0
    });
    return {
      left: R.x,
      top: R.y,
      right: R.x + T.size.width,
      bottom: R.y + T.size.height
    };
  };
};
irT = class irT extends nS0 {
  constructor() {
    super("copy");
    this.Compiler = void 0, this.Parser = void 0, this.attachers = [], this.compiler = void 0, this.freezeIndex = -1, this.frozen = void 0, this.namespace = {}, this.parser = void 0, this.transformers = sS0();
  }
  copy() {
    let T = new irT(),
      R = -1;
    while (++R < this.attachers.length) {
      let a = this.attachers[R];
      T.use(...a);
    }
    return T.data(LF.default(!0, {}, this.namespace)), T;
  }
  data(T, R) {
    if (typeof T === "string") {
      if (arguments.length === 2) return wF("data", this.frozen), this.namespace[T] = R, this;
      return lS0.call(this.namespace, T) && this.namespace[T] || void 0;
    }
    if (T) return wF("data", this.frozen), this.namespace = T, this;
    return this.namespace;
  }
  freeze() {
    if (this.frozen) return this;
    let T = this;
    while (++this.freezeIndex < this.attachers.length) {
      let [R, ...a] = this.attachers[this.freezeIndex];
      if (a[0] === !1) continue;
      if (a[0] === !0) a[0] = void 0;
      let e = R.call(T, ...a);
      if (typeof e === "function") this.transformers.use(e);
    }
    return this.frozen = !0, this.freezeIndex = Number.POSITIVE_INFINITY, this;
  }
  parse(T) {
    this.freeze();
    let R = z4(T),
      a = this.parser || this.Parser;
    return MF("parse", a), a(String(R), R);
  }
  process(T, R) {
    let a = this;
    return this.freeze(), MF("process", this.parser || this.Parser), DF("process", this.compiler || this.Compiler), R ? e(void 0, R) : new Promise(e);
    function e(t, r) {
      let h = z4(T),
        i = a.parse(h);
      a.run(i, h, function (s, A, l) {
        if (s || !A || !l) return c(s);
        let o = A,
          n = a.stringify(o, l);
        if (_S0(n)) l.value = n;else l.result = n;
        c(s, l);
      });
      function c(s, A) {
        if (s || !A) r(s);else if (t) t(A);else Ue(R, "`done` is defined if `resolve` is not"), R(void 0, A);
      }
    }
  }
  processSync(T) {
    let R = !1,
      a;
    return this.freeze(), MF("processSync", this.parser || this.Parser), DF("processSync", this.compiler || this.Compiler), this.process(T, e), QfT("processSync", "process", R), Ue(a, "we either bailed on an error or have a tree"), a;
    function e(t, r) {
      R = !0, XfT(t), a = r;
    }
  }
  run(T, R, a) {
    YfT(T), this.freeze();
    let e = this.transformers;
    if (!a && typeof R === "function") a = R, R = void 0;
    return a ? t(void 0, a) : new Promise(t);
    function t(r, h) {
      Ue(typeof R !== "function", "`file` can\u2019t be a `done` anymore, we checked");
      let i = z4(R);
      e.run(T, i, c);
      function c(s, A, l) {
        let o = A || T;
        if (s) h(s);else if (r) r(o);else Ue(a, "`done` is defined if `resolve` is not"), a(void 0, o, l);
      }
    }
  }
  runSync(T, R) {
    let a = !1,
      e;
    return this.run(T, R, t), QfT("runSync", "run", a), Ue(e, "we either bailed on an error or have a tree"), e;
    function t(r, h) {
      XfT(r), e = h, a = !0;
    }
  }
  stringify(T, R) {
    this.freeze();
    let a = z4(R),
      e = this.compiler || this.Compiler;
    return DF("stringify", e), YfT(T), e(T, a);
  }
  use(T, ...R) {
    let a = this.attachers,
      e = this.namespace;
    if (wF("use", this.frozen), T === null || T === void 0) ;else if (typeof T === "function") i(T, R);else if (typeof T === "object") {
      if (Array.isArray(T)) h(T);else r(T);
    } else throw TypeError("Expected usable value, not `" + T + "`");
    return this;
    function t(c) {
      if (typeof c === "function") i(c, []);else if (typeof c === "object") {
        if (Array.isArray(c)) {
          let [s, ...A] = c;
          i(s, A);
        } else r(c);
      } else throw TypeError("Expected usable value, not `" + c + "`");
    }
    function r(c) {
      if (!("plugins" in c) && !("settings" in c)) throw Error("Expected usable value but received an empty preset, which is probably a mistake: presets typically come with `plugins` and sometimes with `settings`, but this has neither");
      if (h(c.plugins), c.settings) e.settings = LF.default(!0, e.settings, c.settings);
    }
    function h(c) {
      let s = -1;
      if (c === null || c === void 0) ;else if (Array.isArray(c)) while (++s < c.length) {
        let A = c[s];
        t(A);
      } else throw TypeError("Expected a list of plugins, not `" + c + "`");
    }
    function i(c, s) {
      let A = -1,
        l = -1;
      while (++A < a.length) if (a[A][0] === c) {
        l = A;
        break;
      }
      if (l === -1) a.push([c, ...s]);else if (s.length > 0) {
        let [o, ...n] = s,
          p = a[l][1];
        if (QY(p) && QY(o)) o = LF.default(!0, p, o);
        a[l] = [c, o, ...n];
      }
    }
  }
};
KH = class KH extends Ve {
  completionBuilder;
  constructor({
    completionBuilder: T,
    child: R
  }) {
    super({
      child: R
    });
    this.completionBuilder = T;
  }
  updateShouldNotify(T) {
    return !1;
  }
  static of(T) {
    let R = T.dependOnInheritedWidgetOfExactType(KH)?.widget;
    if (!R) throw Error("No CompletionBuilderProvider found in widget tree");
    return R.completionBuilder;
  }
};
IZT = class IZT extends B0 {
  hints;
  agentLoopState;
  statusMessageOverride;
  constructor(T) {
    super();
    this.hints = T.hints, this.agentLoopState = T.agentLoopState, this.statusMessageOverride = T.statusMessageOverride ?? null;
  }
  build(T) {
    let R = $R.of(T),
      a = [],
      e = HE0(this.agentLoopState),
      t = DE0(this.hints),
      r = this.statusMessageOverride;
    if (t) {
      if (e) PIT(R, a);
      NE0(a, UE0(t, T));
    } else if (r) BE0(R, r, a);else if (e) PIT(R, a), wE0(R, e, a);
    if (a.length === 0) return new XT({
      width: 0,
      height: 0
    });
    return new T0({
      children: a,
      mainAxisSize: "min",
      mainAxisAlignment: "start"
    });
  }
};
wJT = class wJT extends wR {
  showCosts = Uv;
  showDetailedCosts = Uv;
  subscription = null;
  initState() {
    super.initState(), this.subscription = v3(ln(this.widget.props.configService).pipe(da(T => T !== "pending")), this.widget.props.configService.config).pipe(JR(([T, R]) => {
      let a = X9(T) ? T.user.email : "",
        e = a.toLowerCase().endsWith("@sourcegraph.com") || a.toLowerCase().endsWith("@ampcode.com"),
        t = Uv || e,
        r = R.settings.showCosts ?? !0,
        h = R.settings["agent.showUsageDebugInfo"] ?? !1;
      return {
        showCosts: r,
        showDetailedCosts: t && h
      };
    }), E9((T, R) => T.showCosts === R.showCosts && T.showDetailedCosts === R.showDetailedCosts)).subscribe(T => {
      J.debug("CostDisplayProvider setState called", {
        previousShowCosts: this.showCosts,
        previousShowDetailedCosts: this.showDetailedCosts,
        newShowCosts: T.showCosts,
        newShowDetailedCosts: T.showDetailedCosts
      }), this.setState(() => {
        this.showCosts = T.showCosts, this.showDetailedCosts = T.showDetailedCosts;
      });
    });
  }
  dispose() {
    this.subscription?.unsubscribe(), this.subscription = null, super.dispose();
  }
  build(T) {
    return new aW({
      showCosts: this.showCosts,
      showDetailedCosts: this.showDetailedCosts,
      child: this.widget.props.child
    });
  }
};
gS = class gS extends Ve {
  controller;
  themeName;
  constructor({
    controller: T,
    child: R
  }) {
    super({
      child: R
    });
    this.controller = T, this.themeName = T.themeName;
  }
  updateShouldNotify(T) {
    return this.themeName !== T.themeName || this.controller !== T.controller;
  }
  static maybeOf(T) {
    let R = T.dependOnInheritedWidgetOfExactType(gS);
    if (!R) return null;
    return R.widget.controller;
  }
  static of(T) {
    let R = gS.maybeOf(T);
    if (!R) throw Error("ThemeControllerProvider not found in widget tree");
    return R;
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
kn = class kn extends Ve {
  value;
  constructor({
    value: T,
    child: R
  }) {
    super({
      child: R
    });
    this.value = Object.freeze(T);
  }
  updateShouldNotify(T) {
    return !1;
  }
  static maybeOf(T) {
    return T.dependOnInheritedWidgetOfExactType(kn)?.widget?.value;
  }
  static require(T) {
    let R = kn.maybeOf(T);
    if (!R) throw Error("TuiContextProvider.require() called with a context that does not contain a TuiContextProvider.");
    return R;
  }
};
eRR = class eRR extends B0 {
  ideStatus;
  onShowIdePicker;
  constructor({
    ideStatus: T,
    onShowIdePicker: R,
    key: a
  }) {
    super(a ? {
      key: a
    } : {});
    this.ideStatus = T, this.onShowIdePicker = R;
  }
  build(T) {
    if (this.ideStatus === null || !this.ideStatus.enabled) return this.statusIdle();
    let R = this.ideStatus,
      a = R.connectionState;
    if (!a || a === "never-connected") return this.statusIdle();
    if (a === "reconnecting") return this.statusReconnecting(R, T);
    if (a === "disconnected") return this.statusDisconnected(R, T);
    let e = R.authenticated,
      t = R.selections?.[0],
      r = !lCT(t) && t ? t.range.endLine - t.range.startLine + 1 : 0,
      h = [];
    if (!e) {
      if (R.errorMessage) h.push(R.errorMessage);else if (R.connected === !1) h.push("IDE Not Connected");else h.push("IDE Error");
    } else if (!R.openFile && !t) h.push(`${R.ideName ? R.ideName : "Unknown IDE"}`);
    if (R.openFile) h.push(ngT.basename(NN0(R.openFile, R.openFile)));
    if (t && r > 0) h.push(`${r} selected ${o9(r, "line")}`);
    let i = h.join(" \u2022 "),
      c = e ? "\u2713" : "\xD7",
      {
        app: s
      } = $R.of(T),
      A = e ? s.ideConnected : s.ideDisconnected,
      l = `${c} ${i}${!e ? " \u2022 Use /ide to connect" : ""}`;
    return this.idePickerText(l, A);
  }
  statusIdle() {
    return new XT({
      width: 0,
      height: 0
    });
  }
  statusDisconnected(T, R) {
    if ((T.reconnectElapsedMs ?? 0) >= 60000) return this.statusIdle();
    let a = "IDE disconnected. Use /ide to connect";
    return this.idePickerText(a, $R.of(R).colors.mutedForeground);
  }
  statusReconnecting(T, R) {
    let a = T.ideName || "IDE",
      e = T.workspace ? ` in ${ngT.basename(T.workspace)}` : "",
      t = `Reconnecting to ${a}${e}...`,
      r = T.reconnectElapsedMs ?? 0,
      {
        colors: h,
        app: i
      } = $R.of(R);
    return this.idePickerText(t, r < 5000 ? i.ideWarning : h.mutedForeground);
  }
  idePickerText(T, R) {
    let a = new xT({
        text: new G(T, new cT({
          color: R
        })),
        maxLines: 1
      }),
      e = this.onShowIdePicker ? new G0({
        onClick: this.onShowIdePicker,
        cursor: "pointer",
        child: a
      }) : a;
    return new T0({
      children: [e],
      mainAxisSize: "min"
    });
  }
};
hRR = class hRR extends NR {
  plugins;
  constructor({
    plugins: T,
    key: R
  }) {
    super(R ? {
      key: R
    } : {});
    this.plugins = T;
  }
  createState() {
    return new iRR();
  }
};
iRR = class iRR extends wR {
  animationFrame = 0;
  animationTimer = null;
  animationFrames = ["\u223F", "\u223E", "\u223D", "\u224B", "\u2248", "\u223C"];
  initState() {
    this.startAnimationIfNeeded();
  }
  didUpdateWidget(T) {
    this.startAnimationIfNeeded();
  }
  dispose() {
    this.stopAnimation();
  }
  startAnimationIfNeeded() {
    let T = this.hasLoadingPlugins();
    if (T && !this.animationTimer) this.startAnimation();else if (!T && this.animationTimer) this.stopAnimation();
  }
  startAnimation() {
    if (this.animationTimer) return;
    this.animationTimer = setInterval(() => {
      this.setState(() => {
        this.animationFrame = (this.animationFrame + 1) % this.animationFrames.length;
      });
    }, qN0);
  }
  stopAnimation() {
    if (this.animationTimer) clearInterval(this.animationTimer), this.animationTimer = null;
  }
  hasLoadingPlugins() {
    return this.widget.plugins.some(T => T.status === "loading");
  }
  build(T) {
    let R = this.widget.plugins;
    if (R.length === 0) return new XT({
      width: 0,
      height: 0
    });
    let a = $R.of(T).colors,
      e = 0,
      t = 0,
      r = 0;
    for (let A of R) switch (A.status) {
      case "active":
        e++;
        break;
      case "loading":
        r++;
        break;
      case "error":
        t++;
        break;
    }
    let h = R.length,
      i = r === 0;
    if (i && t === 0) return new XT({
      width: 0,
      height: 0
    });
    let c = [];
    if (!i) {
      let A = this.animationFrames[this.animationFrame];
      c.push(new xT({
        text: new G(A, new cT({
          color: a.foreground,
          dim: !0
        })),
        maxLines: 1
      })), c.push(y3.horizontal(1));
    }
    let s = [];
    if (s.push(new G("Plugins ", new cT({
      color: a.foreground,
      dim: !0
    }))), i && t > 0) s.push(new G(`${t}`, new cT({
      color: a.destructive
    })), new G(" failed", new cT({
      color: a.destructive
    })));else if (!i) {
      s.push(new G(`${e}`, new cT({
        color: a.foreground,
        dim: !0
      })), new G(`/${h}`, new cT({
        color: a.foreground,
        dim: !0
      })));
      let A = R.find(l => l.status === "loading");
      if (A) {
        let l = zN0(A.uri);
        s.push(new G(" ", new cT({
          color: a.foreground
        })), new G(l, new cT({
          color: a.foreground,
          dim: !0
        })), new G("\u2026", new cT({
          color: a.foreground,
          dim: !0
        })));
      }
    }
    return c.push(new xT({
      text: new G(void 0, void 0, s),
      maxLines: 1
    })), new T0({
      children: c,
      mainAxisSize: "min"
    });
  }
};
nRR = class nRR extends B0 {
  threadViewState;
  threadTokenUsage;
  threadID;
  hasUserMessages;
  threadAgentMode;
  hasStartedStreamingResponse;
  onFileChangesClick;
  onShowIdePicker;
  ideStatus;
  mcpServers;
  plugins;
  isNarrow;
  uiHint;
  submittingPromptMessage;
  waitingForConfirmation;
  showingEphemeralError;
  executingCommand;
  executingCommandNoun;
  executingCommandVerb;
  executingCommandMessage;
  runningBashInvocations;
  compactionState;
  constructor({
    threadViewState: T,
    threadTokenUsage: R,
    threadID: a,
    hasUserMessages: e = !1,
    threadAgentMode: t,
    hasStartedStreamingResponse: r = !1,
    onFileChangesClick: h,
    onShowIdePicker: i,
    ideStatus: c = null,
    mcpServers: s = [],
    plugins: A = [],
    isNarrow: l = !1,
    uiHint: o,
    submittingPromptMessage: n = !1,
    waitingForConfirmation: p = !1,
    showingEphemeralError: _ = !1,
    executingCommand: m = null,
    executingCommandNoun: b = null,
    executingCommandVerb: y = null,
    executingCommandMessage: u = null,
    runningBashInvocations: P = !1,
    compactionState: k = "idle",
    key: x
  } = {}) {
    super(x ? {
      key: x
    } : {});
    this.threadViewState = T, this.threadTokenUsage = R, this.threadID = a, this.hasUserMessages = e, this.threadAgentMode = t, this.hasStartedStreamingResponse = r, this.onFileChangesClick = h, this.onShowIdePicker = i, this.ideStatus = c, this.mcpServers = s, this.plugins = A, this.isNarrow = l, this.uiHint = o, this.submittingPromptMessage = n, this.waitingForConfirmation = p, this.showingEphemeralError = _, this.executingCommand = m, this.executingCommandNoun = b, this.executingCommandVerb = y, this.executingCommandMessage = u, this.runningBashInvocations = P, this.compactionState = k;
  }
  build(T) {
    let R = [],
      a = this.hasUserMessages;
    if (WN0(this.mcpServers) && !a) R.push(new tRR({
      mcpServers: this.mcpServers
    })), R.push(y3.horizontal(2));
    if (FN0(this.plugins) && !a) R.push(new hRR({
      plugins: this.plugins
    })), R.push(y3.horizontal(2));
    let e = !1;
    if (this.threadViewState) {
      let t = new XrT({
        threadViewState: this.threadViewState,
        tokenUsage: this.threadTokenUsage,
        threadAgentMode: this.threadAgentMode,
        hasStartedStreamingResponse: this.hasStartedStreamingResponse,
        submittingPromptMessage: this.submittingPromptMessage,
        waitingForConfirmation: this.waitingForConfirmation,
        showingEphemeralError: this.showingEphemeralError,
        executingCommand: this.executingCommand,
        executingCommandNoun: this.executingCommandNoun,
        executingCommandVerb: this.executingCommandVerb,
        executingCommandMessage: this.executingCommandMessage,
        runningBashInvocations: this.runningBashInvocations,
        compactionState: this.compactionState
      });
      if (YN0(t)) e = !0;
      R.push(t);
    }
    if (this.uiHint) {
      if (e) R.push(y3.horizontal(2));
      R.push(new oRR({
        hint: this.uiHint
      }));
    }
    if (R.push(y3.flexible()), this.ideStatus) R.push(new eRR({
      ideStatus: this.ideStatus,
      onShowIdePicker: this.onShowIdePicker
    })), R.push(y3.horizontal(1));
    if (this.threadViewState && !this.isNarrow && this.threadID && Vt(this.threadID)) R.push(new JTR({
      threadViewState: this.threadViewState,
      threadID: this.threadID,
      onFileChangesClick: this.onFileChangesClick
    }));
    return new T0({
      children: R,
      mainAxisSize: "min",
      mainAxisAlignment: "start"
    });
  }
};
fRR = class fRR extends wR {
  _highlightIndex = null;
  _visibleStart = 0;
  _visibleEnd = 0;
  _tooltipLeft = 0;
  _tooltipTop = 0;
  _tooltipWidth = 0;
  _tooltipHeight = 0;
  didUpdateWidget(T) {
    let R = T.chartData.series[0]?.points.length ?? 0,
      a = this.widget.chartData.series[0]?.points.length ?? 0;
    if (a !== R) this._visibleStart = 0, this._visibleEnd = a;
  }
  _getTotalPointCount() {
    return this.widget.chartData.series[0]?.points.length ?? 0;
  }
  _ensureVisibleRange() {
    let T = this._getTotalPointCount();
    if (this._visibleEnd === 0 || this._visibleEnd > T) this._visibleStart = 0, this._visibleEnd = T;
  }
  _getVisibleData() {
    this._ensureVisibleRange();
    let {
        chartData: T
      } = this.widget,
      R = this._visibleStart,
      a = this._visibleEnd;
    if (R === 0 && a >= this._getTotalPointCount()) return T;
    return {
      ...T,
      series: T.series.map(e => ({
        ...e,
        points: e.points.slice(R, a)
      }))
    };
  }
  _isInsideTooltip(T, R) {
    if (this._highlightIndex === null) return !1;
    return T >= this._tooltipLeft && T < this._tooltipLeft + this._tooltipWidth && R >= this._tooltipTop && R < this._tooltipTop + this._tooltipHeight;
  }
  _handleHover = T => {
    if (!QP.isEnabled(this.context)) {
      this._clearHighlight();
      return;
    }
    if (this._isInsideTooltip(T.localPosition.x, T.localPosition.y)) return;
    let R = this._getVisibleData(),
      a = R.series[0]?.points ?? [];
    if (a.length === 0) return;
    let e = xU0(R.chartType, T.localPosition.x, T.localPosition.y, this._getChartWidth(), this._getChartHeight(), a.length, this.widget.showAxes);
    if (e !== this._highlightIndex) this.setState(() => {
      this._highlightIndex = e;
    });
  };
  _handleScroll = T => {
    if (!QP.isEnabled(this.context)) return !1;
    if (!T.modifiers.ctrl) return !1;
    if (this._getTotalPointCount() <= DQ) return !1;
    if (this.widget.chartData.chartType === "horizontal-bar") return !1;
    if (this._ensureVisibleRange(), T.modifiers.shift || T.direction === "left" || T.direction === "right") return this._handlePan(T);
    return this._handleZoom(T);
  };
  _handleZoom(T) {
    let R = this._getTotalPointCount(),
      a = T.direction === "up",
      e = this._getCursorFraction(T.localPosition.x),
      t = PU0(this._visibleStart, this._visibleEnd, R, a, e);
    if (!t) return !1;
    return this.setState(() => {
      this._visibleStart = t.start, this._visibleEnd = t.end, this._highlightIndex = null;
    }), !0;
  }
  _handlePan(T) {
    let R = this._getTotalPointCount(),
      a = T.direction === "down" || T.direction === "right",
      e = kU0(this._visibleStart, this._visibleEnd, R, a);
    if (!e) return !1;
    return this.setState(() => {
      this._visibleStart = e.start, this._visibleEnd = e.end, this._highlightIndex = null;
    }), !0;
  }
  _getCursorFraction(T) {
    let R = this.widget.showAxes ? ra : 0,
      a = this._getChartWidth() - R;
    if (a <= 0) return 0.5;
    let e = T - R;
    return Math.max(0, Math.min(1, e / a));
  }
  _handleExit = T => {
    this._clearHighlight();
  };
  _clearHighlight() {
    if (this._highlightIndex !== null) this.setState(() => {
      this._highlightIndex = null;
    });
  }
  _getChartWidth() {
    let T = this.context.findRenderObject();
    return T instanceof O9 ? T.size.width : 80;
  }
  _getChartHeight() {
    let T = this.context.findRenderObject();
    return T instanceof O9 ? T.size.height : 16;
  }
  build(T) {
    let R = QP.isEnabled(T) ? this._highlightIndex : null,
      a = this._getVisibleData(),
      e = this.widget.chartData.sourceQuery,
      t = this.widget.showSourceQuery && !!e,
      r = new IRR({
        chartData: a,
        highlightIndex: t ? null : R,
        showAxes: this.widget.showAxes,
        colors: this.widget.colors
      }),
      h = [new G0({
        key: new k3("chart-mouse"),
        onHover: this._handleHover,
        onExit: this._handleExit,
        onScroll: this._handleScroll,
        child: r
      })];
    if (t) h.push(new ca({
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      child: this._buildSourceQueryOverlay(T, e)
    }));else {
      let i = R !== null ? this._buildTooltip(T, a) : null;
      h.push(i ?? new XT({
        width: 0,
        height: 0
      }));
    }
    return new Ta({
      children: h
    });
  }
  _buildTooltip(T, R) {
    let a = this._highlightIndex;
    if (a === null) return null;
    let {
        showAxes: e,
        colors: t
      } = this.widget,
      r = R.series,
      h = r[0]?.points ?? [];
    if (a < 0 || a >= h.length) return null;
    let i = h[a];
    if (!i) return null;
    let c = this._getChartWidth(),
      s = this._getChartHeight(),
      A = R.valueFormatter ?? MQ,
      l = $U0(T, i, a, r, t, A, R.chartType),
      o = fU0(R.chartType, a, c, s, h.length, e, i.value, IU0(r));
    if (!o) return null;
    let n = R.chartType === "stacked-bar" || R.chartType === "stacked-area",
      p = gU0(i, a, r, A, n),
      _ = r.length > 1 ? r.length + 1 + (n ? 1 : 0) : 1,
      m = Math.floor(c / 2),
      b;
    if (o.x <= m) b = Math.max(0, o.x - p);else b = Math.min(o.x + 1, c - p);
    b = Math.max(0, b);
    let y;
    if (o.y >= _ + 1) y = o.y - _ - 1;else y = Math.min(o.y + 1, s - _);
    return y = Math.max(0, y), this._tooltipLeft = b, this._tooltipTop = y, this._tooltipWidth = p + 2, this._tooltipHeight = _ + 2, new ca({
      left: b,
      top: y,
      child: l
    });
  }
  _buildSourceQueryOverlay(T, R) {
    let a = Z0.of(T),
      e = $R.of(T),
      t = R.split(`
`),
      r = [];
    for (let h = 0; h < t.length; h++) {
      let i = t[h].replace(/\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|ON|AND|OR|AS|IN|NOT|NULL|IS|BETWEEN|LIKE|EXISTS|UNION|DISTINCT|COUNT|SUM|AVG|MIN|MAX|DATE|TIMESTAMP_TRUNC|TIMESTAMP_SUB|CURRENT_TIMESTAMP|INTERVAL|CASE|WHEN|THEN|ELSE|END|WITH|INSERT|UPDATE|DELETE|SET|VALUES|INTO|CREATE|ALTER|DROP|TRUE|FALSE|ASC|DESC)\b/gi, "\x00$1\x01").split(/(\x00[^\x01]+\x01)/);
      for (let c of i) if (c.startsWith("\x00") && c.endsWith("\x01")) r.push(new G(c.slice(1, -1), new cT({
        color: e.app.keybind,
        bold: !0
      })));else r.push(new G(c, new cT({
        color: a.colorScheme.foreground
      })));
      if (h < t.length - 1) r.push(new G(`
`));
    }
    return new SR({
      decoration: {
        color: a.colorScheme.background,
        border: h9.all(new e9(e.app.keybind, 1, "rounded"))
      },
      child: new uR({
        padding: TR.symmetric(0, 1),
        child: new xT({
          text: new G(void 0, void 0, r)
        })
      })
    });
  }
};
QRR = class QRR extends wR {
  plugins = [];
  subscription = null;
  initState() {
    this.subscription = this.widget.props.pluginService.plugins.subscribe(T => {
      this.plugins = T, this.setState(() => {});
    });
  }
  dispose() {
    this.subscription?.unsubscribe(), super.dispose();
  }
  getRelativePath(T) {
    let R = T.startsWith("file://") ? T.slice(7) : T,
      a = this.widget.props.cwd;
    if (R.startsWith(a)) return R.slice(a.length + 1);
    return R;
  }
  statusIcon(T) {
    let R = Xa.default(),
      {
        colors: a,
        app: e
      } = R;
    switch (T) {
      case "loading":
        return {
          icon: "\u25CC",
          color: a.warning
        };
      case "active":
        return {
          icon: "\u2713",
          color: e.toolSuccess
        };
      case "error":
        return {
          icon: "\u2717",
          color: e.toolError
        };
    }
  }
  build(T) {
    let R = $R.of(T),
      {
        app: a
      } = R;
    if (this.plugins.length === 0) return new xT({
      text: new G("No plugins found.", new cT({
        dim: !0
      }))
    });
    let e = [],
      t = this.plugins.length,
      r = this.plugins.filter(c => c.status === "active").length,
      h = this.plugins.reduce((c, s) => c + s.registeredCommands.length, 0),
      i = this.plugins.reduce((c, s) => c + s.registeredTools.length, 0);
    if (e.push(new G(`${r}/${t} ${o9(t, "plugin")} active`, new cT({
      bold: !0
    }))), h > 0 || i > 0) e.push(new G(` (${h} ${o9(h, "command")}, ${i} ${o9(i, "tool")})`, new cT({
      dim: !0
    })));
    e.push(new G(`

`));
    for (let c of this.plugins) {
      let {
          icon: s,
          color: A
        } = this.statusIcon(c.status),
        l = this.getRelativePath(c.uri.toString());
      if (e.push(new G(`${s} `, new cT({
        color: A
      }))), e.push(new G(l, new cT({
        bold: !0
      }))), e.push(new G(` ${c.status}`, new cT({
        dim: !0
      }))), e.push(new G(`
`)), c.status === "active" && c.registeredEvents.length > 0) e.push(new G("  Events: ", new cT({
        dim: !0
      }))), e.push(new G(c.registeredEvents.join(", "), new cT({
        color: a.link
      }))), e.push(new G(`
`));
      if (c.registeredCommands.length > 0) c.registeredCommands.forEach((o, n) => {
        let p = n === 0 ? "  Commands: " : "            ";
        e.push(new G(p, new cT({
          dim: !0
        }))), e.push(new G(`${o.category}: ${o.title}`, new cT({
          color: a.link
        }))), e.push(new G(`
`));
      });
      if (c.registeredTools.length > 0) c.registeredTools.forEach((o, n) => {
        let p = n === 0 ? "  Tools:    " : "            ";
        e.push(new G(p, new cT({
          dim: !0
        }))), e.push(new G(o.name, new cT({
          color: a.link
        }))), e.push(new G(`
`));
      });
      e.push(new G(`
`));
    }
    return new I3({
      child: new xT({
        text: new G("", void 0, e)
      })
    });
  }
};
j0R = class j0R extends wR {
  hideAddCreditsActionForCurrentError = !1;
  didUpdateWidget(T) {
    let R = this.getErrorIdentity(T.error),
      a = this.getErrorIdentity(this.widget.error);
    if (this.areErrorIdentitiesEqual(R, a)) return;
    this.hideAddCreditsActionForCurrentError = !1;
  }
  getErrorIdentity(T) {
    return {
      type: T.error?.type,
      message: T.message
    };
  }
  areErrorIdentitiesEqual(T, R) {
    if (!T || !R) return T === R;
    return T.type === R.type && T.message === R.message;
  }
  buildClipboardText(T) {
    let R = ev(this.widget.error).trim(),
      a = [T.title, T.description];
    if (R && R !== T.description) a.push(`Original error: ${R}`);
    return a.join(`

`);
  }
  async copyErrorToClipboard(T) {
    let R = this.buildClipboardText(T),
      a = !1;
    try {
      a = await eA.writeText(R);
    } catch {
      a = !1;
    }
    this.widget.onCopy?.(R, a);
  }
  build(T) {
    let R = Z0.of(T).colorScheme,
      a = OaT(this.widget.error, this.widget.options),
      e = (this.hideAddCreditsActionForCurrentError ? a.actions.filter(r => r !== "add-credits") : a.actions).filter(r => r !== "dismiss").map(r => ({
        value: r,
        label: guT(r, {
          retryCountdown: r === "retry" ? this.widget.error.retryCountdownSeconds : void 0,
          ampURL: this.widget.options.ampURL ?? kn.maybeOf(T)?.ampURL
        })
      }));
    e.push({
      value: "copy",
      label: "Copy to Clipboard"
    }), e.push({
      value: "dismiss",
      label: guT("dismiss")
    });
    let t = this.buildBodyWithLinks(T, a.description);
    return new io({
      title: a.title,
      body: t,
      options: e,
      onSelect: r => {
        let h = r ?? "dismiss";
        if (h === "copy") {
          this.copyErrorToClipboard(a);
          return;
        }
        if (h !== "add-credits" && this.hideAddCreditsActionForCurrentError) this.setState(() => {
          this.hideAddCreditsActionForCurrentError = !1;
        });
        if (h === "add-credits" && !this.hideAddCreditsActionForCurrentError) this.setState(() => {
          this.hideAddCreditsActionForCurrentError = !0;
        });
        this.widget.onResponse(h);
      },
      borderColor: R.destructive,
      autofocus: !0,
      showDismissalMessage: !1,
      enableMouseInteraction: !1
    });
  }
  buildBodyWithLinks(T, R) {
    if (!R) return;
    let a = /(https?:\/\/[^\s]+)/g,
      e = [],
      t = 0;
    for (let r of R.matchAll(a)) {
      let h = r[0],
        i = r.index ?? 0;
      if (i > t) e.push(new G(R.slice(t, i)));
      let c = H3.createSpan(h, h);
      e.push(new G(c.text, c.style, c.children, c.hyperlink, () => {
        je(T, h);
      })), t = i + h.length;
    }
    if (e.length === 0) return R;
    if (t < R.length) e.push(new G(R.slice(t)));
    return new xT({
      text: new G(void 0, void 0, e),
      selectable: !0
    });
  }
};
D0R = class D0R extends wR {
  options = [];
  error = null;
  isLoading = !0;
  initialSelectedIndex = 0;
  loadToken = 0;
  initState() {
    this.loadConfigs();
  }
  async loadConfigs() {
    let T = ++this.loadToken;
    this.error = null, this.isLoading = !0, this.options = [], this.initialSelectedIndex = 0;
    try {
      let R = kn.maybeOf(this.context)?.jetbrainsMode,
        a = await OD({
          includeAll: !0,
          jetbrainsOnly: R
        });
      if (!this.mounted || T !== this.loadToken) return;
      let e = 0,
        t = Us.getSelectedConfig(),
        r = t?.workspaceFolders[0];
      this.options = a.map((h, i) => {
        let c = h.workspaceFolders[0],
          s = c ?? "Unknown project",
          A = s == "/" ? "Any file" : this.toHomeRelative(s),
          l = t !== void 0 && h.pid === t.pid && (c !== void 0 && r !== void 0 && c === r || c === void 0 && r === void 0),
          o = l ? `${h.ideName} (connected)` : h.ideName;
        if (l) e = i;
        return {
          value: {
            config: h
          },
          label: o,
          description: A
        };
      }), this.initialSelectedIndex = e;
    } catch (R) {
      if (!this.mounted || T !== this.loadToken) return;
      J.error("Failed to load IDE configurations:", R), this.error = "Failed to load IDE configurations";
    } finally {
      if (this.mounted && T === this.loadToken) this.isLoading = !1, this.setState();
    }
  }
  toHomeRelative(T) {
    let R = nH0();
    if (T === R) return "~";
    if (T.startsWith(R + lH0.sep)) return "~" + T.slice(R.length);
    return T;
  }
  handleKeyEvent = T => {
    if (T.key === "Escape" || T.key === "c" && T.ctrlKey) return this.widget.props.onCancel(), "handled";
    return "ignored";
  };
  build(T) {
    if (this.error) return this.buildErrorBox(this.error, T);
    return this.buildSelectionBox(T);
  }
  buildErrorBox(T, R) {
    let a = Z0.of(R).colorScheme,
      e = I9.of(R),
      t = new cT({
        color: a.primary,
        bold: !0
      }),
      r = new cT({
        color: a.foreground
      }),
      h = new cT({
        color: a.secondary
      }),
      i = new cT({
        color: $R.of(R).app.keybind
      }),
      c = e.size.width,
      s = e.size.height,
      A = c - 4,
      l = s - 4,
      o = Math.min(60, A),
      n = new C8({
        autofocus: this.widget.props.autofocus ?? !0,
        onKey: this.handleKeyEvent,
        child: new uR({
          padding: TR.all(2),
          child: new xR({
            crossAxisAlignment: "start",
            mainAxisSize: "min",
            children: [new N0({
              child: new xT({
                text: new G("No IDEs available", t)
              })
            }), new XT({
              height: 1
            }), new xT({
              text: new G(T, r)
            }), new XT({
              height: 1
            }), new xR({
              crossAxisAlignment: "start",
              mainAxisSize: "min",
              children: [new H3({
                uri: "https://ampcode.com/manual#ide",
                text: "https://ampcode.com/manual#ide",
                style: h
              })]
            }), new XT({
              height: 2
            }), new N0({
              child: new xT({
                text: new G("", r, [new G("Press ", r), new G("Escape", i), new G(" or ", r), new G("Ctrl+C", i), new G(" to close", r)])
              })
            })]
          })
        })
      });
    return new N0({
      child: new SR({
        constraints: new o0(o, o, 0, l),
        decoration: new p8(a.background, h9.all(new e9(a.primary, 1, "rounded"))),
        child: n
      })
    });
  }
  buildSelectionBox(T) {
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
        color: $R.of(T).app.keybind
      }),
      h = new cT({
        color: R.secondary
      }),
      i = a.size.width,
      c = a.size.height,
      s = i - 4,
      A = c - 4,
      l = Math.min(60, s),
      o = Math.min(A - 4, c - 8),
      n = Math.floor(Math.max(1, o / 2)),
      p = this.options.length > 0,
      _ = this.isLoading,
      m = kn.maybeOf(T)?.jetbrainsMode,
      b = [new N0({
        child: new xT({
          text: new G(_ ? "Detecting IDEs..." : p ? "Connect Amp CLI to an IDE" : "No IDEs available", e)
        })
      }), new XT({
        height: 1
      })];
    if (_) b.push(new xT({
      text: new G(m ? "Looking for JetBrains IDEs with the Amp plugin..." : "Looking for supported editors...", t)
    }));else if (p) b.push(new C0R({
      options: this.options,
      onSelect: u => {
        if (u) this.widget.props.onSelect(u.config, "user-initiated");else this.widget.props.onCancel();
      },
      border: null,
      maxVisibleItems: n,
      autofocus: this.widget.props.autofocus ?? !0,
      showDismissalMessage: !1,
      selectedIndex: this.initialSelectedIndex
    }));else {
      let u = m ? "No JetBrains IDE configurations found. Make sure you have a JetBrains IDE with the Amp plugin running." : "No IDE configurations found. Make sure you have a supported editor running. JetBrains also requires the Amp plugin.";
      b.push(new xT({
        text: new G(u, t)
      }), new XT({
        height: 1
      }), new xR({
        crossAxisAlignment: "start",
        mainAxisSize: "min",
        children: [new H3({
          uri: "https://ampcode.com/manual#ide",
          text: "https://ampcode.com/manual#ide",
          style: h
        })]
      }));
    }
    b.push(new XT({
      height: 2
    }), new N0({
      child: new xT({
        text: new G("", t, [new G("Press ", t), new G("Escape", r), new G(" or ", t), new G("Ctrl+C", r), new G(" to close", t)])
      })
    }));
    let y = new C8({
      autofocus: this.widget.props.autofocus ?? !0,
      onKey: this.handleKeyEvent,
      child: new uR({
        padding: TR.all(2),
        child: new xR({
          crossAxisAlignment: "start",
          mainAxisSize: "min",
          children: b
        })
      })
    });
    return new N0({
      child: new SR({
        constraints: new o0(l, l, 0, A),
        decoration: new p8(R.background, h9.all(new e9(R.primary, 1, "rounded"))),
        child: y
      })
    });
  }
};
B0R = class B0R extends wR {
  previewState = {
    status: "loading"
  };
  loadingSpinner = new xa();
  loadingSpinnerInterval = null;
  loadGeneration = 0;
  getCapabilities() {
    try {
      return d9.instance.tuiInstance.getCapabilities();
    } catch {
      return null;
    }
  }
  initState() {
    super.initState(), this.loadPreviewImage();
  }
  didUpdateWidget(T) {
    if (super.didUpdateWidget(T), this.imagePreviewIdentity(T.props.image) !== this.imagePreviewIdentity(this.widget.props.image)) this.loadPreviewImage();
  }
  dispose() {
    this.loadGeneration += 1, this.stopLoadingSpinner(), super.dispose();
  }
  imagePreviewIdentity(T) {
    if (T.source.type === "base64") return `base64:${T.sourcePath}:${T.source.data.length}`;
    return `url:${T.source.url}`;
  }
  syncLoadingSpinner() {
    if (this.previewState.status === "loading") {
      if (!this.loadingSpinnerInterval) this.loadingSpinnerInterval = setInterval(() => {
        if (this.loadingSpinner.step(), this.mounted) this.setState();
      }, 120);
      return;
    }
    this.stopLoadingSpinner();
  }
  stopLoadingSpinner() {
    if (this.loadingSpinnerInterval) clearInterval(this.loadingSpinnerInterval), this.loadingSpinnerInterval = null;
  }
  loadPreviewImage = async () => {
    let T = ++this.loadGeneration;
    if (this.previewState = {
      status: "loading"
    }, this.syncLoadingSpinner(), this.mounted) this.setState();
    try {
      let R = await KQT(this.widget.props.image);
      if (!this.mounted || T !== this.loadGeneration) return;
      this.previewState = {
        status: "loaded",
        preview: R
      };
    } catch (R) {
      if (!this.mounted || T !== this.loadGeneration) return;
      this.previewState = {
        status: "error",
        message: R instanceof Error ? R.message : String(R)
      };
    } finally {
      if (this.mounted && T === this.loadGeneration) this.syncLoadingSpinner(), this.setState();
    }
  };
  supportsKittyGraphics() {
    return this.getCapabilities()?.kittyGraphics ?? !1;
  }
  getOptions() {
    return [{
      value: "remove",
      label: "Remove image"
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
  build(T) {
    let R = this.widget.props.imageIndex,
      a = this.supportsKittyGraphics(),
      e = $R.of(T),
      t = e.colors,
      r = I9.sizeOf(T),
      h = r.width,
      i = r.height,
      c = h - 24,
      s = 11,
      A = "Unknown",
      l = "Unknown",
      o = null,
      n = null;
    if (this.previewState.status === "loaded") A = tQ(this.previewState.preview.mediaType), l = xgT(this.previewState.preview.fileSizeBytes), o = this.previewState.preview.originURL && !rQ(this.previewState.preview.originURL) ? this.previewState.preview.originURL : null, n = this.previewState.preview.image;else if (this.widget.props.image.source.type === "base64") {
      A = tQ(this.widget.props.image.source.mediaType);
      let y = Math.round(this.widget.props.image.source.data.length * 3 / 4);
      l = xgT(y);
    } else A = "URL", l = "loading...", o = rQ(this.widget.props.image.source.url) ? null : this.widget.props.image.source.url;
    let p = [],
      _ = i - 11 - 12;
    if (this.previewState.status === "loading") p.push(new xT({
      text: new G("", void 0, [new G("Loading image ", new cT({
        color: t.foreground,
        dim: !0
      })), new G(this.loadingSpinner.toBraille(), new cT({
        color: t.foreground,
        dim: !0
      }))])
    })), p.push(new XT({
      height: 1
    }));else if (this.previewState.status === "error") p.push(new xT({
      text: new G(`Error: ${this.previewState.message}`, new cT({
        color: e.app.toolError
      }))
    })), p.push(new XT({
      height: 1
    }));else if (a && n && _ >= 2) {
      let y = c - 6,
        u = _;
      p.push(new N0({
        child: new FH({
          image: n,
          width: y,
          height: u,
          backgroundColor: t.background
        })
      })), p.push(new XT({
        height: 1
      }));
    } else if (!a) p.push(new xT({
      text: new G("(Terminal does not support inline images)", new cT({
        color: t.foreground,
        dim: !0,
        italic: !0
      }))
    })), p.push(new XT({
      height: 1
    }));
    if (o !== null) p.push(new xT({
      text: new G(o, new cT({
        color: t.foreground,
        dim: !0
      }))
    })), p.push(new XT({
      height: 1
    }));
    let m = new xR({
        crossAxisAlignment: "stretch",
        mainAxisSize: "min",
        children: [new xT({
          text: new G("", void 0, [new G(`Image ${R + 1}`, new cT({
            bold: !0,
            color: t.primary
          })), new G(`  ${A}, ${l}`, new cT({
            color: t.foreground,
            dim: !0
          }))])
        }), new XT({
          height: 1
        }), ...p, new io({
          options: this.getOptions(),
          onSelect: this.handleSelect,
          autofocus: !0,
          showDismissalMessage: !1,
          enableMouseInteraction: !0
        })]
      }),
      b = i - 12;
    return new C8({
      canRequestFocus: !1,
      onKey: y => {
        if (y.key === "Escape") return this.widget.props.onDismiss(), "handled";
        return "ignored";
      },
      child: new N0({
        child: new SR({
          constraints: new o0(c, c, 0, b),
          decoration: {
            color: t.background,
            border: h9.all(new e9(t.primary, 1, "rounded"))
          },
          padding: TR.symmetric(2, 1),
          child: m
        })
      })
    });
  }
};
K0R = class K0R extends NR {
  configService;
  ideClient;
  onExit;
  onContinue;
  constructor({
    key: T,
    configService: R,
    ideClient: a,
    onExit: e,
    onContinue: t
  }) {
    super({
      key: T
    });
    this.configService = R, this.ideClient = a, this.onExit = e, this.onContinue = t;
  }
  createState() {
    return new V0R();
  }
};
V0R = class V0R extends wR {
  stateNotifier = new Nv(new hhT());
  pluginVersionNotifier = new Nv("");
  ideStateNotifier = new Nv(null);
  ideStatusSubscription = null;
  ideStatusTimeoutId = null;
  initState() {
    super.initState(), this.stateNotifier.addListener(() => {
      this.setState(() => {}), this.nextStep();
    }), this.ideStateNotifier.addListener(() => {
      this.setState(() => {}), this.nextStep();
    }), this.pluginVersionNotifier.addListener(() => {
      this.setState(() => {}), this.nextStep();
    }), this.ideStatusSubscription = this.widget.ideClient.status.subscribe(T => {
      this.ideStateNotifier.value = T;
    }), this.ideStatusTimeoutId = setTimeout(() => {
      this.ideStateNotifier.value = {
        connected: !1
      };
    }, 2000), F0R().then(T => {
      this.pluginVersionNotifier.value = T;
    });
  }
  dispose() {
    if (this.ideStatusSubscription) this.ideStatusSubscription.unsubscribe();
    if (this.ideStatusTimeoutId) clearTimeout(this.ideStatusTimeoutId);
    this.stateNotifier.dispose(), this.ideStateNotifier.dispose(), this.pluginVersionNotifier.dispose(), super.dispose();
  }
  performDiscovery = async () => {
    let T = XH0(this.ideStateNotifier.value, this.pluginVersionNotifier.value);
    if (!T.success) {
      this.stateNotifier.value = this.stateNotifier.value.clone().transitionToError(`JetBrains IDE discovery failed: ${T.error}

${T.helpMessage}`);
      return;
    }
    if (!T.requiresManualInstall && T.products.length === 0) {
      this.widget.onContinue();
      return;
    }
    this.stateNotifier.value = this.stateNotifier.value.clone().transitionToSelection(T.requiresManualInstall ?? !1, T.products);
  };
  performDownload = async () => {
    try {
      let T = this.stateNotifier.value.isRequiresManualInstall(),
        R;
      if (T) R = await eW0(cA);else R = await rhT(cA);
      this.stateNotifier.value = this.stateNotifier.value.clone().transitionToInstall(R);
    } catch (T) {
      this.stateNotifier.value = this.stateNotifier.value.clone().transitionToError(`Download failed: ${T}`);
    }
  };
  performInstallation = async () => {
    let T = this.stateNotifier.value.getProducts();
    try {
      await YH0(T, cA, this.pluginVersionNotifier.value), this.stateNotifier.value = this.stateNotifier.value.clone().transitionToSuccess();
    } catch (R) {
      this.stateNotifier.value = this.stateNotifier.value.clone().transitionToError(`Installation failed: ${R}`);
    }
  };
  nextStep() {
    let T = this.stateNotifier.value.getStep();
    if (T === "discovery" && this.ideStateNotifier.value?.connected !== void 0 && this.pluginVersionNotifier.value) this.performDiscovery();else if (T === "downloading") this.performDownload();else if (T === "installing") this.performInstallation();
  }
  handleSelection = async T => {
    switch (T) {
      case null:
      case "skip":
        this.widget.onContinue();
        break;
      case "never":
        await this.widget.configService.updateSettings("jetbrains.skipInstall", !0, "global"), this.widget.onContinue();
        break;
      case "manual-install":
      case "install":
        this.stateNotifier.value = this.stateNotifier.value.clone().transitionToDownload(T === "manual-install");
        break;
    }
  };
  getSelectOptions = () => {
    let T = this.stateNotifier.value.getProducts(),
      R = $gT(T),
      a = [{
        value: "manual-install",
        label: "Download Only",
        description: "Download to the current directory for manual installation"
      }, {
        value: "skip",
        label: "Skip",
        description: ""
      }, {
        value: "never",
        label: "Always Skip",
        description: 'Skip and set "amp.jetbrains.skipInstall": true'
      }];
    if (!this.stateNotifier.value.isRequiresManualInstall()) {
      let e = iW0(T).map(t => `${t.name}${cW0(t.versions)}`).join(", ");
      a.unshift({
        value: "install",
        label: R ? "Install" : "Upgrade",
        description: `Download and ${R ? "install into" : "upgrade for"} ${e}`
      });
    }
    return a;
  };
  wrapWithConstraints(T, R, a, e) {
    return new SR({
      constraints: new o0(a, a, 0, e),
      child: T
    });
  }
  build(T) {
    let R = Z0.of(T),
      a = I9.of(T),
      e = this.stateNotifier.value.getStep(),
      t = a.size.width,
      r = a.size.height,
      h = t - 4,
      i = r - 4;
    if (e === "error") {
      let c = new uR({
          padding: TR.all(2),
          child: new xR({
            crossAxisAlignment: "start",
            mainAxisSize: "min",
            children: [new xT({
              text: new G("Error: " + this.stateNotifier.value.getError(), new cT({
                color: R.colorScheme.destructive
              }))
            }), new XT({
              height: 1
            }), new xT({
              text: new G("Press any key to continue...", new cT({
                color: R.colorScheme.foreground,
                dim: !0
              }))
            })]
          })
        }),
        s = this.wrapWithConstraints(c, R, h, i);
      return new C8({
        autofocus: !0,
        onKey: A => {
          return this.widget.onExit(), "handled";
        },
        child: s
      });
    }
    if (e === "selection") {
      let c = $gT(this.stateNotifier.value.getProducts()),
        s = new uR({
          padding: TR.all(1),
          child: new io({
            options: this.getSelectOptions(),
            onSelect: this.handleSelection,
            title: `${c ? "No" : "Outdated"} Amp JetBrains plugin detected. Would you like to ${c ? "install" : "upgrade"}?`,
            showDismissalMessage: !1
          })
        });
      return this.wrapWithConstraints(s, R, h, i);
    }
    if (e === "downloading") return new SR({
      decoration: new p8(R.colorScheme.background),
      child: new uR({
        padding: TR.all(2),
        child: new xT({
          text: new G("Downloading JetBrains plugin...", new cT({
            color: R.colorScheme.foreground
          }))
        })
      })
    });
    if (this.stateNotifier.value.getStep() === "installing") {
      let c = [];
      for (let s of this.stateNotifier.value.getProducts()) {
        let A = s.installType === "fresh" ? "new install" : `upgrade from ${s.installedVersion} to ${this.pluginVersionNotifier.value}`;
        c.push(new xT({
          text: new G(`Installing to ${s.name} ${s.version} (${A})...`, new cT({
            color: R.colorScheme.foreground
          }))
        }));
      }
      return new SR({
        decoration: new p8(R.colorScheme.background),
        child: new uR({
          padding: TR.all(2),
          child: new xR({
            crossAxisAlignment: "start",
            mainAxisSize: "min",
            children: [new xT({
              text: new G("Downloading JetBrains plugin...", new cT({
                color: R.colorScheme.foreground
              }))
            }), new xT({
              text: new G("Installing...", new cT({
                color: R.colorScheme.foreground
              }))
            }), new uR({
              padding: TR.only({
                left: 2
              }),
              child: new xR({
                crossAxisAlignment: "start",
                children: c
              })
            })]
          })
        })
      });
    }
    if (this.stateNotifier.value.getStep() === "success") {
      let c = [];
      for (let A of this.stateNotifier.value.getProducts()) {
        let l = A.installType === "fresh" ? "new install" : `upgrade from ${A.installedVersion} to ${this.pluginVersionNotifier.value}`;
        c.push(new xT({
          text: new G(`${A.name} ${A.version} (${l})`, new cT({
            color: R.colorScheme.success
          }))
        }));
      }
      let s = new SR({
        decoration: new p8(R.colorScheme.background),
        child: new uR({
          padding: TR.all(2),
          child: new xR({
            crossAxisAlignment: "start",
            mainAxisSize: "min",
            children: [new xT({
              text: new G("Installation Complete!", new cT({
                color: R.colorScheme.success
              }))
            }), new XT({
              height: 1
            }), new xT({
              text: new G("Installed to:", new cT({
                color: R.colorScheme.foreground
              }))
            }), new uR({
              padding: TR.only({
                left: 2
              }),
              child: new xR({
                crossAxisAlignment: "start",
                children: c
              })
            }), new XT({
              height: 1
            }), new xT({
              text: new G(`Restart your JetBrains IDE${o9(this.stateNotifier.value.getProducts().length, "", "s")}${!ji() ? " and Amp" : ""} now.`, new cT({
                color: R.colorScheme.foreground
              }))
            }), new XT({
              height: 1
            }), new xT({
              text: new G("Press any key to exit...", new cT({
                color: R.colorScheme.foreground,
                dim: !0
              }))
            })]
          })
        })
      });
      return new C8({
        autofocus: !0,
        onKey: A => {
          return this.widget.onExit(), "handled";
        },
        child: s
      });
    }
    if (this.stateNotifier.value.getStep() === "manual-installation") {
      let c = new SR({
        decoration: new p8(R.colorScheme.background),
        child: new uR({
          padding: TR.all(2),
          child: new xR({
            crossAxisAlignment: "start",
            mainAxisSize: "min",
            children: [new xT({
              text: new G(`The plugin has been downloaded to
${this.stateNotifier.value.getDownloadPath()}.`, new cT({
                color: R.colorScheme.foreground
              }))
            }), new XT({
              height: 1
            }), new xT({
              text: new G(`Go to Settings > Plugins > Cogwheel > Install Plugin from Disk or see
https://www.jetbrains.com/help/idea/managing-plugins.html#install_plugin_from_disk`, new cT({
                color: R.colorScheme.foreground
              }))
            }), new XT({
              height: 1
            }), new xT({
              text: new G(`Finally restart your JetBrains IDE${!ji() && " and Amp"}.`, new cT({
                color: R.colorScheme.foreground
              }))
            }), new XT({
              height: 1
            }), new xT({
              text: new G("Press any key to exit...", new cT({
                color: R.colorScheme.foreground,
                dim: !0
              }))
            })]
          })
        })
      });
      return new C8({
        autofocus: !0,
        onKey: s => {
          return this.widget.onExit(), "handled";
        },
        child: c
      });
    }
    return new SR({
      decoration: new p8(R.colorScheme.background),
      child: new uR({
        padding: TR.all(2),
        child: new xT({
          text: new G("Discovering JetBrains IDEs...", new cT({
            color: R.colorScheme.foreground
          }))
        })
      })
    });
  }
};
qv = class qv extends NR {
  toolUse;
  toolRun;
  name;
  detail;
  inputSection;
  outputSection;
  subagentContent;
  hideHeader;
  constructor(T) {
    super();
    this.toolUse = T.toolUse, this.toolRun = T.toolRun, this.name = T.name, this.detail = T.detail, this.inputSection = T.inputSection, this.outputSection = T.outputSection, this.subagentContent = T.subagentContent, this.hideHeader = T.hideHeader ?? !1;
  }
  createState() {
    return new L9R();
  }
};
shT = class shT extends NR {
  toolUse;
  toolRun;
  subagentContent;
  name;
  inputPrompt;
  outputResult;
  hideHeader;
  constructor(T) {
    super();
    this.toolUse = T.toolUse, this.toolRun = T.toolRun, this.subagentContent = T.subagentContent, this.name = T.name, this.inputPrompt = T.inputPrompt, this.outputResult = T.outputResult, this.hideHeader = T.hideHeader ?? !1;
  }
  createState() {
    return new D9R();
  }
};
uhT = class uhT extends wR {
  get tuiContext() {
    return kn.require(this.context);
  }
  debugThreadViewState = process.env.AMP_DEBUG_THREAD_VIEW === "1";
  lastThreadStatusDebugSignature = null;
  themeColors = null;
  themeApp = null;
  ideStatus = null;
  threadLoadSubscription = null;
  isConfirmingExit = !1;
  isExiting = !1;
  isConfirmingClearInput = !1;
  isConfirmingCancelProcessing = !1;
  statusMessage = null;
  statusMessageTimer = null;
  isShowingHelp = !1;
  isShowingShortcutsHelp = !1;
  isShowingContextAnalyzeModal = !1;
  isShowingSkillListModal = !1;
  skillListData = null;
  shortcutsHintUsed = !1;
  deepReasoningEffort = "high";
  anthropicSpeed = void 0;
  openAISpeed = void 0;
  deepReasoningEffortSubscription = null;
  anthropicSpeedSubscription = null;
  openAISpeedSubscription = null;
  sessionState = Jk;
  isShowingConsoleOverlay = !1;
  isShowingMCPStatusModal = !1;
  isShowingConfirmationOverlay = !1;
  isShowingFileChangesOverlay = !1;
  isShowingContextDetailOverlay = !1;
  threadCostInfo = void 0;
  threadCostInfoThreadID = void 0;
  lastInferenceState = void 0;
  elapsedTimeTimer = null;
  confirmationOverlayContent = "";
  exitConfirmTimeout = null;
  clearInputConfirmTimeout = null;
  cancelProcessingConfirmTimeout = null;
  historyIndex = -1;
  historyDraft = null;
  bashInvocations = [];
  pendingBashInvocations = new Map();
  bashInvocationShownAt = new Map();
  bashInvocationRemoveTimers = new Map();
  currentTitle = void 0;
  currentShellModeStatus = void 0;
  imageAttachments = [];
  isUploadingImageAttachments = !1;
  isSubmittingPromptMessage = !1;
  pendingSkills = [];
  pendingSkillsSubscription = null;
  skillListSubscription = null;
  skillWarningsSubscription = null;
  skillErrorsSubscription = null;
  availableSkillCount = 0;
  availableSkillCountReady = !1;
  showSkillsCountInPromptBar = !0;
  showSkillsCountInPromptBarSubscription = null;
  skillWarningCount = 0;
  skillErrorCount = 0;
  pendingApprovals = [];
  pendingApprovalsSubscription = null;
  submitOnEnter = !0;
  submitOnEnterSubscription = null;
  displayMessage = null;
  executingCommand = null;
  isShowingJetBrainsInstaller = !1;
  isShowingIdePicker = !1;
  isShowingPalette = !1;
  isShowingPromptHistoryPicker = !1;
  paletteShowOptions = null;
  paletteOnThreadMentionSelected = null;
  threadsForPicker = [];
  parentThreadTitles = new Map();
  parentThreadTitleLoadsInFlight = new Set();
  isLoadingThreads = !1;
  threadLoadError = !1;
  threadPreviewController = new X8R();
  previewThread = null;
  todoScrollController = (() => {
    let T = new Q3();
    return T.followMode = !1, T;
  })();
  contextAnalyzeDeps = null;
  contextAnalyzeFromDTW = null;
  openContextAnalyzeModal = () => {
    let T = this.widget.dependencies.activeThreadHandle.getThreadID();
    if (!T) return;
    if (this.widget.dependencies.threadPool.isThreadActorsMode?.()) {
      this.contextAnalyzeDeps = null, this.contextAnalyzeFromDTW = R => oc0({
        ampURL: this.tuiContext.ampURL,
        configService: this.widget.dependencies.configService,
        threadID: T,
        signal: R
      }), this.setState(() => {
        this.isShowingContextAnalyzeModal = !0;
      });
      return;
    } else if (this.widget.dependencies.threadPool.isDTWMode?.()) {
      this.contextAnalyzeDeps = null, this.contextAnalyzeFromDTW = R => RKT({
        ampURL: this.tuiContext.ampURL,
        configService: this.widget.dependencies.configService,
        threadID: T,
        workerURL: process.env.AMP_WORKER_URL,
        signal: R
      }), this.setState(() => {
        this.isShowingContextAnalyzeModal = !0;
      });
      return;
    }
    this.contextAnalyzeFromDTW = null, this.widget.dependencies.createSystemPromptDeps().then(R => {
      this.contextAnalyzeDeps = R, this.setState(() => {
        this.isShowingContextAnalyzeModal = !0;
      });
    });
  };
  filterThreadPickerByWorkspace = !0;
  currentGitBranch = null;
  messageViewFocusNode = new l8({
    debugLabel: "MessageViewFocus"
  });
  autocompleteFocusNode = new l8({
    debugLabel: "AutocompleteFocus"
  });
  autocompleteFocusNodeListener = null;
  isTextfieldAndAutocompleteFocused = !1;
  hasReplayedEarlyInput = !1;
  submitDisabledHint = null;
  submitDisabledHintTimer = null;
  showImageUnsupportedHint = !1;
  imageUnsupportedHintTimer = null;
  currentSubmitQueuesBehindActiveTurn = !1;
  immediateQueuedInterjectRequested = !1;
  imagePreview = null;
  fileImagePreviewPath = null;
  painterImagePreview = null;
  painterSaveDialog = null;
  messageViewController = new TZ();
  previewMessageViewController = new TZ();
  handleMainMessageViewCopy = (T, R) => {
    this._handleTextCopy(T, R);
  };
  handleEphemeralErrorCopy = (T, R) => {
    this.toastController.show(R ? "Error copied to clipboard" : "Failed to copy error to clipboard", R ? "success" : "error", 2000);
  };
  handleMainMessageViewDismissFocus = () => {
    if (this.setState(() => {
      this.isMessageViewInSelectionMode = !1, this.imagePreview = null;
    }), !this.isShowingIdePicker) this.autocompleteFocusNode.requestFocus();
  };
  messageViewControllerUnsubscribe = null;
  lastEditingMessageOrdinal = null;
  skillPreview = null;
  cachedSkillForPreview = null;
  newsFeedReader = null;
  newsFeedEntries = [];
  newsFeedSubscription = null;
  bottomGridUserHeight = void 0;
  bottomGridDragStartY = null;
  bottomGridDragStartHeight = null;
  previousThreadIdForHint = null;
  handoffController = null;
  handoffState = {
    isInHandoffMode: !1,
    isGeneratingHandoff: !1,
    isConfirmingAbortHandoff: !1,
    pendingHandoffPrompt: null,
    spinner: null,
    countdownSeconds: null
  };
  isInQueueMode = !1;
  pendingMCPServers = [];
  mcpTrustSubscription = null;
  pendingOAuthRequestQueue = new XTR();
  pendingAuthLogin = null;
  authStatus = "pending";
  authStatusSubscription = null;
  authModalKeyInterceptorUnsubscribe = null;
  queuedInterjectKeyInterceptorUnsubscribe = null;
  isCreatingAuthLoginSession = !1;
  queuedPromptAfterAuth = null;
  pendingInputDialog = null;
  pendingConfirmDialog = null;
  mcpServers = [];
  mcpServersSubscription = null;
  pluginInfos = [];
  pluginInfosSubscription = null;
  agentModeController;
  prospectiveAgentMode = null;
  freeTierStatus = {
    canUseAmpFree: !1,
    isDailyGrantEnabled: !1
  };
  agentModePulseSeq = 0;
  lastEffectiveAgentMode = "smart";
  deepModeEffortHintController = new WTR({
    getDeepReasoningEffort: () => this.deepReasoningEffort,
    getEffectiveAgentMode: () => this.getEffectiveAgentMode(),
    canShowHintInCurrentThread: () => this.widget.dependencies.activeThreadHandle.isThreadEmpty(),
    requestRender: () => {
      if (!this.mounted) return;
      this.setState(() => {});
    },
    isMounted: () => this.mounted
  });
  updateState = "hidden";
  updateServiceSubscription = null;
  toastController = new BQT();
  isMessageViewInSelectionMode = !1;
  isShowingForkDeprecationModal = !1;
  mysteriousMessage = null;
  isShowingMysteriousMessageModal = !1;
  mysteriousMessageSubscription = null;
  mysterySequenceManager = null;
  mysterySequenceProgress = null;
  mysteryKeyInterceptorUnsubscribe = null;
  static MYSTERY_SEQUENCE = ["ctrl+x", "y", "z"];
  splashOrbExplosion = null;
  splashOrbExplosionSeq = 0;
  freeTierStatusSubscription = null;
  allConnectedThreadActivityStatusesSubscription = null;
  threadInitializationStatusSubscription = null;
  allConnectedThreadActivityStatuses = {};
  threadInitializationMessage = null;
  threadTitlesSubscription = null;
  threadTitles = {};
  activeThreadSubscription = null;
  legacyHandoffNavigationSubscription = null;
  pluginCommands = [];
  pluginCommandsSubscription = null;
  async initNewsFeed() {
    let T = async a => {
        return fi(a, void 0, this.widget.dependencies.configService);
      },
      R = rN0();
    this.newsFeedReader = new UTR(R, T, "/news.rss"), this.newsFeedSubscription = this.newsFeedReader.stream().subscribe({
      next: a => {
        if (a.length > 0) this.setState(() => {
          this.newsFeedEntries = [...a, ...this.newsFeedEntries];
        });
      },
      error: a => {
        J.error("News feed error:", a);
      }
    });
  }
  navigateBack = async () => {
    await this.widget.dependencies.threadPool.navigateBack(), this.onThreadSwitch();
  };
  navigateForward = async () => {
    await this.widget.dependencies.threadPool.navigateForward(), this.onThreadSwitch();
  };
  onThreadSwitch() {
    this.handoffController?.resetUIState(), this.exitQueueMode(), this.isMessageViewInSelectionMode = !1, this.imagePreview = null;
  }
  canInterruptQueuedInference() {
    let {
        activeThreadHandle: T,
        threadPool: R,
        threadState: a
      } = this.widget.dependencies,
      e = T.getQueuedMessages().some(t => !T$T(t));
    return R.queueOnSubmitByDefault && Boolean(T.interruptQueuedMessage) && e && N7(a.viewState);
  }
  interruptNextQueuedMessage = async () => {
    let {
        activeThreadHandle: T
      } = this.widget.dependencies,
      R = T.getQueuedMessages().find(e => !T$T(e)),
      a = R ? z9.safeParse(R.queuedMessage.dtwMessageID).data ?? z9.safeParse(R.id).data : void 0;
    if (!a || !T.interruptQueuedMessage) return;
    await T.interruptQueuedMessage(a);
  };
  handleQueuedInterjectKey = T => {
    switch (LN0({
      event: T,
      promptFocused: this.isTextfieldAndAutocompleteFocused,
      promptText: this.textController.text,
      hasImageAttachments: this.imageAttachments.length > 0,
      canInterruptQueuedInference: this.canInterruptQueuedInference(),
      isSubmittingPromptMessage: this.isSubmittingPromptMessage,
      currentSubmitQueuesBehindActiveTurn: this.currentSubmitQueuesBehindActiveTurn
    })) {
      case "interrupt-now":
        return this.interruptNextQueuedMessage().catch(R => {
          J.error("Failed to interrupt queued message from Enter shortcut", R);
        }), !0;
      case "interrupt-after-submit":
        return this.immediateQueuedInterjectRequested = !0, !0;
      case "ignore":
        return !1;
    }
  };
  scheduleQueuedInterjectAfterSubmit() {
    k8.instance.addPostFrameCallback(() => {
      if (!this.mounted) return;
      this.interruptNextQueuedMessage().catch(T => {
        J.error("Failed to interrupt queued message after immediate Enter", T);
      });
    }, "TuiUIState.scheduleQueuedInterjectAfterSubmit");
  }
  startAndSwitchToNewThread = async () => {
    let T = this.widget.dependencies.activeThreadHandle.getThreadID();
    await this.widget.dependencies.threadPool.createThread(), this.setState(() => {
      this.onThreadSwitch(), this.previousThreadIdForHint = T ?? null;
    });
  };
  canChangeAgentModeInPromptEditor() {
    let T = !this.widget.dependencies.activeThreadHandle.isThreadEmpty(),
      R = this.messageViewController.editingMessageOrdinal === 0,
      {
        isInHandoffMode: a,
        isGeneratingHandoff: e
      } = this.handoffState;
    return !T || R || a && !e;
  }
  getProspectiveAgentMode() {
    return this.prospectiveAgentMode;
  }
  setProspectiveAgentMode(T) {
    let R = this.agentModeController.clampToVisibleMode(T);
    if (this.prospectiveAgentMode === R) return;
    this.prospectiveAgentMode = R, this.setState(() => {});
  }
  getEffectiveAgentMode() {
    return (this.canChangeAgentModeInPromptEditor() ? this.getProspectiveAgentMode() : null) ?? this.agentModeController.getEffectiveMode();
  }
  isProcessing() {
    let {
      activeThreadHandle: T,
      threadState: R
    } = this.widget.dependencies;
    if (!T.getThreadID()) return !1;
    if (R.viewState.state !== "active") return !1;
    if (R.viewState.interactionState === "handoff") return !0;
    if (Boolean(R.viewState.inferenceState === "running")) return !0;
    return R.items.filter(a => a.type === "toolResult").filter(a => a.toolResult.run.status === "in-progress" || a.toolResult.run.status === "queued").length > 0;
  }
  showSubmitDisabledHint(T) {
    if (this.submitDisabledHintTimer) clearTimeout(this.submitDisabledHintTimer);
    this.setState(() => {
      this.submitDisabledHint = T;
    }), this.submitDisabledHintTimer = setTimeout(() => {
      this.setState(() => {
        this.submitDisabledHint = null;
      }), this.submitDisabledHintTimer = null;
    }, 3000);
  }
  getUIHint() {
    let T = this.themeColors?.colorScheme;
    if (!T) return null;
    let R = this.themeApp;
    if (!R) return null;
    if (this.submitDisabledHint) return new G(this.submitDisabledHint, new cT({
      color: T.foreground,
      dim: !0
    }));
    if (this.isExiting) return new G("Exiting...", new cT({
      color: T.foreground,
      dim: !0
    }));
    if (this.isConfirmingExit) return new G("", void 0, [new G("Ctrl+C", new cT({
      color: R.keybind
    })), new G(" again to exit", new cT({
      color: T.foreground,
      dim: !0
    }))]);
    if (this.isConfirmingClearInput) return new G("", void 0, [new G("Esc", new cT({
      color: R.keybind
    })), new G(" again to clear input", new cT({
      color: T.foreground,
      dim: !0
    }))]);
    if (this.isShowingHelp) return new G("", void 0, [new G("Escape", new cT({
      color: R.keybind
    })), new G(" to close help", new cT({
      color: T.foreground,
      dim: !0
    }))]);
    if (this.showImageUnsupportedHint) {
      let o = this.getEffectiveAgentMode(),
        n = f$(o);
      return new G("", void 0, [new G("Images aren't supported in ", new cT({
        color: T.warning,
        dim: !1
      })), new G(o, new cT({
        color: n
      })), new G(" mode.", new cT({
        color: T.warning,
        dim: !1
      }))]);
    }
    if (this.isProcessing() || this.bashInvocations.length > 0 || this.pendingBashInvocations.size > 0) {
      if (this.isConfirmingCancelProcessing) return new G("", void 0, [new G("Esc", new cT({
        color: R.keybind
      })), new G(" again to cancel", new cT({
        color: T.foreground,
        dim: !0
      }))]);
      if (this.canInterruptQueuedInference()) return new G("", void 0, [new G("Enter", new cT({
        color: R.keybind
      })), new G(" to interject", new cT({
        color: T.foreground,
        dim: !0
      }))]);
      return new G("", void 0, [new G("Esc", new cT({
        color: R.keybind
      })), new G(" to cancel", new cT({
        color: T.foreground,
        dim: !0
      }))]);
    }
    let {
      threadState: a
    } = this.widget.dependencies;
    if (this.statusMessage) {
      if (this.debugThreadViewState) J.info("[tui-ui] footer status override", {
        source: "statusMessage",
        statusMessage: this.statusMessage,
        inferenceState: a.viewState.state === "active" ? a.viewState.inferenceState : void 0
      });
      return new G(this.statusMessage, new cT({
        color: T.foreground,
        dim: !0
      }));
    }
    let e = yz0(this.updateState, T);
    if (e) {
      if (this.debugThreadViewState) J.info("[tui-ui] footer status override", {
        source: "updateState",
        inferenceState: a.viewState.state === "active" ? a.viewState.inferenceState : void 0
      });
      return new G("", void 0, e);
    }
    let t = this.getCurrentConfirmation(),
      r = R$T(a),
      h = this.widget.dependencies.threadPool.getCompactionStatus?.(),
      i = this.widget.dependencies.activeThreadHandle,
      c = i.isStreaming(),
      s = new XrT({
        threadViewState: a.viewState,
        tokenUsage: r,
        threadAgentMode: i.getAgentMode(),
        hasStartedStreamingResponse: c,
        compactionState: h?.compactionState ?? "idle",
        submittingPromptMessage: this.isSubmittingPromptMessage,
        waitingForConfirmation: !!t,
        showingEphemeralError: Boolean(a.viewState.state === "active" && a.viewState.ephemeralError),
        runningBashInvocations: this.bashInvocations.length > 0,
        executingCommand: this.executingCommand?.name ?? null,
        executingCommandNoun: this.executingCommand?.noun ?? null,
        executingCommandVerb: this.executingCommand?.verb ?? null,
        executingCommandMessage: this.executingCommand?.statusMessage ?? null
      }),
      A = yB(s);
    if (this.debugThreadViewState) {
      let o = JSON.stringify({
        inferenceState: a.viewState.state === "active" ? a.viewState.inferenceState : void 0,
        interactionState: a.viewState.interactionState,
        statusType: A.type
      });
      if (o !== this.lastThreadStatusDebugSignature) this.lastThreadStatusDebugSignature = o, J.info("[tui-ui] footer thread status", JSON.parse(o));
    }
    let l = !this.shortcutsHintUsed || this.sessionState.launchCount < 10;
    if (A.type === "none" && !this.isShowingShortcutsHelp && this.textController.text === "" && l) return new G("", void 0, [new G("?", new cT({
      color: R.keybind
    })), new G(" for shortcuts", new cT({
      color: T.foreground,
      dim: !0
    }))]);
    return null;
  }
  getParentThreadInfo() {
    let T = this.previewThread ?? this.widget.dependencies.threadState.mainThread;
    if (!T) return null;
    let R = vD(T).filter(h => h.type === "fork" || h.type === "handoff");
    if (R.length === 0) return null;
    let a = R[0],
      e = a.threadID,
      t = this.threadsForPicker.find(h => h.id === e);
    if (!t?.title) this.ensureParentThreadTitleLoaded(e);
    let r = t?.title ?? this.parentThreadTitles.get(e) ?? e.slice(-8);
    return {
      type: a.type === "handoff" ? "handoff" : "fork",
      title: r,
      threadID: e
    };
  }
  ensureParentThreadTitleLoaded(T) {
    if (this.parentThreadTitles.has(T) || this.parentThreadTitleLoadsInFlight.has(T)) return;
    this.parentThreadTitleLoadsInFlight.add(T), this.widget.dependencies.threadService.getPrimitiveProperty(T, "title").then(R => {
      if (!this.mounted || !R) return;
      this.setState(() => {
        this.parentThreadTitles.set(T, R);
      });
    }).catch(R => {
      J.debug("Failed to load parent thread title", {
        threadID: T,
        error: R
      });
    }).finally(() => {
      this.parentThreadTitleLoadsInFlight.delete(T);
    });
  }
  areRecordValuesEqual(T, R) {
    if (T === R) return !0;
    let a = Object.entries(T),
      e = Object.entries(R);
    if (a.length !== e.length) return !1;
    for (let [t, r] of a) {
      if (!Object.hasOwn(R, t)) return !1;
      if (!Object.is(r, R[t])) return !1;
    }
    return !0;
  }
  getThreadViewStatesSnapshot() {
    let T = {
        ...this.allConnectedThreadActivityStatuses
      },
      R = this.widget.dependencies.activeThreadHandle.getThreadID();
    if (R) T[R] = this.widget.dependencies.threadState.viewState;
    return T;
  }
  isTranscriptEmpty() {
    let {
      threadState: T
    } = this.widget.dependencies;
    return T.items.length === 0;
  }
  isStartupThreadLoading() {
    if (!this.tuiContext.startupThreadID) return !1;
    let {
      threadPool: T
    } = this.widget.dependencies;
    return T.hasPendingInitialization?.() === !0;
  }
  handleMessageRestoreSubmit = async T => {
    let {
      activeThreadHandle: R
    } = this.widget.dependencies;
    if (!R.getThreadID()) return;
    let a = R.getMessages().findIndex(e => e === T);
    if (a === void 0 || a === -1) return;
    try {
      this.cancelBashInvocations(), await R.cancelTurn(), await R.restoreTo(a), this.scrollMessageViewToBottom(), this.setState(() => {
        this.imageAttachments = [];
      });
    } catch (e) {
      J.error("Failed to edit message:", e);
    }
  };
  showForkDeprecationMessage = () => {
    this.setState(() => {
      this.isShowingForkDeprecationModal = !0;
    });
  };
  dismissForkDeprecationModal = () => {
    this.setState(() => {
      this.isShowingForkDeprecationModal = !1;
    });
  };
  handleMessageEditSubmit = async (T, R, a) => {
    let {
        activeThreadHandle: e
      } = this.widget.dependencies,
      t = e.getThreadID(),
      r = e.getMessages(),
      h = e.getAgentMode();
    if (!t) return;
    let i = r.findIndex(A => A.messageId !== void 0 && A.messageId === T.messageId);
    if (i === -1) return;
    let c = i === 0,
      s = c ? this.getEffectiveAgentMode() : h;
    if (this.shouldRequireAuthForPromptSubmit()) {
      this.showSubmitDisabledHint("Sign in required before editing and resubmitting messages"), this.ensureAuthLoginSession();
      return;
    }
    try {
      this.cancelBashInvocations(), await e.cancelTurn(), this.widget.dependencies.history.add(R, process.cwd());
      let A = YP(R);
      if (A && e.invokeBashTool) await e.restoreTo(i), this.invokeBashCommand(A.cmd, {
        visibility: A.visibility
      });else {
        let l = [{
          type: "text",
          text: R
        }];
        if (a.length > 0) l.push(...a);
        let o = s;
        if (h && !c && o !== h) {
          J.error(`Cannot edit message: This thread uses ${h} mode. To change mode, create a new thread.`);
          return;
        }
        await e.sendMessage({
          content: l,
          agentMode: o,
          editIndex: i
        });
      }
      this.scrollMessageViewToBottom();
    } catch (A) {
      J.error("Failed to edit message:", A);
    }
  };
  getAffectedFiles = async T => {
    let {
      activeThreadHandle: R
    } = this.widget.dependencies;
    try {
      if (!R.getThreadID()) return [];
      let a = R.getMessages().findIndex(e => e === T);
      if (a === -1) return [];
      return (await R.getFilesAffectedByTruncation(a)).map(Kt);
    } catch (a) {
      return J.error("Failed to get affected files:", a), [];
    }
  };
  textController = new wc();
  messageScrollControllers = new Map();
  getMessageScrollController(T) {
    if (!this.messageScrollControllers.has(T)) this.messageScrollControllers.set(T, new Q3());
    return this.messageScrollControllers.get(T);
  }
  scrollMessageViewToBottom() {
    let T = this.widget.dependencies.activeThreadHandle.getThreadID();
    if (!T) return;
    this.getMessageScrollController(T).scrollToBottom();
  }
  _handleSelectionChanged = T => {
    this.setState(() => {});
  };
  updateTerminalTitle() {
    let T = this.widget.dependencies.activeThreadHandle.getThreadTitle();
    if (T !== this.currentTitle) {
      this.currentTitle = T;
      let R = process.cwd().replace(process.env.HOME || "", "~"),
        a = T ? `amp - ${T} - ${R}` : "";
      process.stdout.write(JVT(a));
    }
  }
  _handleTextCopy(T, R) {
    if (T && T.length > 0) {
      let a = R ? "Selection copied to clipboard" : "Failed to copy selection to clipboard",
        e = R ? "success" : "error";
      this.toastController.show(a, e, 2000);
    }
  }
  textFieldKey = new k3("text-field");
  ideStatusSubscription = null;
  paletteCommands;
  paletteConfig;
  completionBuilder = null;
  textChangeListener = () => {
    let T = this.textController.text;
    if (T === "") this.textController.resetScrollOffset();
    if (T !== "") this.deepModeEffortHintController.dismissForInteraction();
    if (this.handoffState.countdownSeconds !== null) this.handoffController?.stopCountdown();
    if (T === "/" && !this.handoffState.isGeneratingHandoff) {
      this.showCommandPalette(), this.textController.clear(), this.toastController.show("Use [[Ctrl-O]] to open the command palette", "warning");
      return;
    }
    let R = YP(T),
      a = T === "" && this.bottomGridUserHeight !== void 0,
      e = this.handoffState.isInHandoffMode || !this.widget.dependencies.activeThreadHandle.invokeBashTool ? void 0 : R?.visibility;
    this.setState(() => {
      if (this.currentShellModeStatus = e, a) this.bottomGridUserHeight = void 0;
    });
  };
  navigateHistoryPrevious = () => {
    let T = this.widget.dependencies.history.previous();
    if (T !== null) {
      if (this.historyIndex === -1) this.historyDraft = this.textController.text;
      this.historyIndex++, this.textController.text = T, this.textController.moveCursorToStart();
    }
  };
  navigateHistoryNext = () => {
    let T = this.widget.dependencies.history.next();
    if (T !== null) this.historyIndex--, this.textController.text = T, this.textController.moveCursorToEnd();else if (this.historyIndex > -1) this.historyIndex = -1, this.textController.text = this.historyDraft || "", this.textController.moveCursorToEnd(), this.historyDraft = null;
  };
  resetHistory = () => {
    this.widget.dependencies.history.reset(), this.historyIndex = -1, this.historyDraft = null;
  };
  openJetBrainsInstaller = () => {
    this.setState(() => {
      this.isShowingJetBrainsInstaller = !0;
    });
  };
  dismissJetBrainsInstaller = () => {
    this.setState(() => {
      this.isShowingJetBrainsInstaller = !1;
    });
  };
  openIdePicker = () => {
    this.setState(() => {
      this.isShowingIdePicker = !0;
    });
  };
  dismissIdePicker = () => {
    this.setState(() => {
      this.isShowingIdePicker = !1;
    }), k8.instance.addPostFrameCallback(() => {
      this.autocompleteFocusNode.requestFocus();
    });
  };
  handleIdeSelection = async (T, R) => {
    let a = this.widget.dependencies.ideClient.getSelectedConfig();
    if (a && this.isSameIdeConfig(a, T)) {
      this.dismissIdePicker();
      return;
    }
    try {
      await this.connectToSelectedIde(T, R);
    } catch (e) {
      let t = e instanceof Error ? e.message : String(e);
      this.setState(() => {
        this.displayMessage = Error(`Failed to connect to IDE: ${t}`);
      });
    }
    this.widget.dependencies.ideClient.selectConfig(T), this.dismissIdePicker();
  };
  isSameIdeConfig(T, R) {
    if (T.connection !== R.connection || T.ideName !== R.ideName || T.pid !== R.pid || T.port !== R.port || T.authToken !== R.authToken || T.workspaceId !== R.workspaceId) return !1;
    if (T.workspaceFolders.length !== R.workspaceFolders.length) return !1;
    return T.workspaceFolders.every(a => R.workspaceFolders.includes(a));
  }
  async connectToSelectedIde(T, R) {
    await this.widget.dependencies.ideClient.start(T, !0, R);
  }
  previewControllerListener = T => {
    this.setState(() => {
      this.previewThread = T;
    });
  };
  showStandaloneThreadPicker = () => {
    this.showCommandPalette({
      type: "standalone",
      commandId: "continue",
      onSubmit: () => {
        this.threadPreviewController.clear(), this.setState(() => {
          this.isShowingPalette = !1, this.paletteShowOptions = null;
        }), k8.instance.addPostFrameCallback(() => {
          if (!this.isMessageViewInSelectionMode && !this.isShowingPalette) this.autocompleteFocusNode.requestFocus();
        });
      },
      onCancel: () => {
        this.exitApplication();
      }
    });
  };
  toggleThreadPickerWorkspaceFilter = () => {
    this.setState(() => {
      this.filterThreadPickerByWorkspace = !this.filterThreadPickerByWorkspace;
    });
  };
  handleDoubleAtTrigger = T => {
    let {
        text: R,
        cursorPosition: a
      } = T,
      e = R.slice(0, a).lastIndexOf("@@"),
      t = T !== this.textController;
    if (J.info("[handleDoubleAtTrigger] called", {
      isEditingPreviousMessage: t,
      text: R,
      cursor: a,
      atAtIndex: e
    }), t) this.setState(() => {
      this.paletteOnThreadMentionSelected = r => {
        let h = this.messageViewController.editingController;
        if (!h) {
          J.warn("[paletteOnThreadMentionSelected] no editing controller found");
          return;
        }
        this.insertThreadMention(h, r);
      };
    });else this.setState(() => {
      this.paletteOnThreadMentionSelected = null;
    });
    this.showCommandPalette({
      type: "standalone",
      commandId: "mention-thread",
      onBeforeExecute: t ? void 0 : () => {
        if (e !== -1) {
          let r = T.text,
            h = r.slice(0, e) + r.slice(e + 2);
          T.text = h, T.cursorPosition = e;
        }
      },
      onSubmit: () => {
        this.setState(() => {
          this.paletteOnThreadMentionSelected = null;
        }), this.dismissPalette();
      },
      onCancel: () => {
        this.setState(() => {
          this.paletteOnThreadMentionSelected = null;
        }), this.dismissPalette();
      }
    });
  };
  insertThreadMention(T, R) {
    let {
        text: a,
        cursorPosition: e
      } = T,
      t = a.slice(0, e).lastIndexOf("@@");
    if (t !== -1) {
      let r = a.slice(e),
        h = r.length === 0,
        i = `@${R}${h ? " " : ""}`,
        c = a.slice(0, t) + i + r,
        s = t + i.length;
      T.text = c, T.cursorPosition = s;
    } else T.insertText(`@${R} `);
  }
  showCommandPalette(T) {
    if (this.handoffState.isGeneratingHandoff) return;
    let R = !this.isShowingPalette;
    if (this.setState(() => {
      if (this.isShowingPalette = R, this.paletteShowOptions = R ? T ?? null : null, !R) this.threadsForPicker = [], this.isLoadingThreads = !1;
    }), R) this.loadThreadsForPicker();else this.unloadThreadsForPicker();
  }
  isShowingStandalonePalette() {
    return this.isShowingPalette && this.paletteShowOptions?.type === "standalone";
  }
  getPaletteCommands() {
    if (!this.paletteCommands) {
      if (!this.paletteConfig) throw Error("Config not yet available");
      this.paletteCommands = new e0R(this.widget.dependencies.configService, T => {
        this.setState(() => {
          this.executingCommand = T;
        });
      }, () => {
        this.setState(() => {
          this.executingCommand = null;
        });
      }, this.paletteConfig);
    }
    return this.paletteCommands;
  }
  getCompletionBuilder() {
    if (!this.completionBuilder) this.completionBuilder = new mrT(this.widget.dependencies.fuzzyServer);
    return this.completionBuilder;
  }
  unloadThreadsForPicker() {
    if (this.threadLoadSubscription) this.threadLoadSubscription.unsubscribe(), this.threadLoadSubscription = null;
    this.threadPreviewController.clearStatsCache(), this.widget.dependencies.threadService.invalidateThreadListCache();
  }
  dismissPalette = () => {
    if (this.isExiting) return;
    this.setState(() => {
      this.isShowingPalette = !1, this.paletteShowOptions = null, this.threadsForPicker = [], this.isLoadingThreads = !1;
    }), this.unloadThreadsForPicker();
  };
  lastRootContext;
  getCommandPaletteContext = T => {
    let {
      threadState: R,
      recentThreadIDs: a
    } = this.widget.dependencies;
    if (!R.mainThread) return null;
    let e = T ?? this.lastRootContext;
    if (!e) return null;
    let t = zR.file(process.cwd()),
      r = d0(t);
    return {
      recentThreadIDs: a,
      currentThreadID: R.mainThread.id,
      contextFallback: e,
      context: T,
      threadPool: this.widget.dependencies.threadPool,
      createSystemPromptDeps: this.widget.dependencies.createSystemPromptDeps,
      activeThreadHandle: this.widget.dependencies.activeThreadHandle,
      editorState: this.textController,
      isProcessing: this.isProcessing(),
      thread: R.mainThread,
      ampURL: this.tuiContext.ampURL,
      logFile: this.tuiContext.logFile,
      threadService: this.widget.dependencies.threadService,
      configService: this.widget.dependencies.configService,
      skillService: this.widget.dependencies.skillService,
      openInEditor: this.openInEditor,
      takeImageAttachments: () => {
        let h = this.imageAttachments;
        return this.setState(() => {
          this.imageAttachments = [];
        }), h;
      },
      setImageAttachments: h => {
        this.setState(() => {
          this.imageAttachments = h;
        });
      },
      editorDispatch: h => {
        switch (h.type) {
          case "set-input":
            this.textController.clear(), this.textController.insertText(h.input);
            break;
          case "set-input-with-cursor":
            this.textController.clear(), this.textController.insertText(h.input), this.textController.cursorPosition = h.cursorPosition;
            break;
          case "insert-text":
            this.textController.insertText(h.text);
            break;
          case "clear":
            this.textController.clear();
            break;
        }
      },
      submitMessage: h => {
        this.onTextSubmitted(h).catch(i => {
          this.handleSubmitFlowError(i);
        });
      },
      exitApp: this.exitApplication,
      openHelp: () => {
        this.setState(() => {
          this.isShowingHelp = !0;
        });
      },
      openContextAnalyze: () => {
        this.openContextAnalyzeModal();
      },
      openSkillList: () => {
        this.setState(() => {
          this.isShowingSkillListModal = !0;
        });
      },
      settingsStorage: this.widget.dependencies.settingsStorage,
      clientId: this.tuiContext.clientId,
      mcpService: this.widget.dependencies.mcpService,
      toolboxService: this.widget.dependencies.toolboxService,
      createThread: async () => {
        await this.startAndSwitchToNewThread();
      },
      navigateBack: this.navigateBack,
      navigateForward: this.navigateForward,
      canNavigateBack: this.widget.dependencies.threadPool.canNavigateBack(),
      canNavigateForward: this.widget.dependencies.threadPool.canNavigateForward(),
      canUseAmpFree: this.freeTierStatus.canUseAmpFree,
      isDailyGrantEnabled: this.freeTierStatus.isDailyGrantEnabled,
      switchToThread: async h => {
        await this.switchToExistingThread(h), this.setState(() => {
          this.isMessageViewInSelectionMode = !1, this.imagePreview = null;
        });
        return;
      },
      handleHandoff: async (h, i) => {
        let {
          goal: c,
          images: s
        } = i;
        if (!c) return {
          ok: !1,
          error: Error("Goal is required")
        };
        try {
          let A = this.widget.dependencies.activeThreadHandle,
            l = A.getThreadID();
          if (!l) return {
            ok: !1,
            error: Error("No active thread")
          };
          let o = setTimeout(() => h.abort(new pW("Handoff took too long and was aborted (timeout: 60s)")), 60000);
          try {
            let n = await this.widget.dependencies.threadPool.createHandoff(l, {
              goal: c,
              images: s,
              agentMode: A.getAgentMode(),
              queuedMessages: [...A.getQueuedMessages()],
              signal: h.signal
            });
            return clearTimeout(o), await this.switchToExistingThread(n), {
              ok: !0
            };
          } catch (n) {
            if (clearTimeout(o), n instanceof Error && (n.name === "AbortError" || n.message.includes("aborted"))) throw h.signal.reason;
            throw n;
          }
        } catch (A) {
          return J.error("Failed to create handoff thread", {
            error: A
          }), {
            ok: !1,
            error: A instanceof Error ? A : Error(String(A))
          };
        }
      },
      getGuidanceFiles: h => {
        return this.widget.dependencies.activeThreadHandle.getGuidanceFiles(h);
      },
      openIdePicker: () => {
        this.openIdePicker();
      },
      openPromptHistoryPicker: () => {
        this.setState(() => {
          this.isShowingPromptHistoryPicker = !0;
        });
      },
      getAgentMode: () => {
        return this.getProspectiveAgentMode();
      },
      setAgentMode: h => {
        this.setProspectiveAgentMode(h);
      },
      toggleAgentMode: this.toggleAgentMode,
      toggleDeepReasoningEffort: this.toggleDeepReasoningEffort,
      getEffectiveAgentMode: () => this.getEffectiveAgentMode(),
      getEditorText: () => this.textController.text,
      userEmail: X9(this.authStatus) ? this.authStatus.user.email : void 0,
      workspace: this.tuiContext.workspace ?? null,
      completionBuilder: this.getCompletionBuilder(),
      threads: this.threadsForPicker,
      previewController: this.threadPreviewController,
      isLoadingThreads: this.isLoadingThreads,
      threadLoadError: this.threadLoadError,
      filterByWorkspace: this.filterThreadPickerByWorkspace,
      currentWorkspace: r,
      threadViewStates: this.getThreadViewStatesSnapshot(),
      newsFeedEntries: this.newsFeedEntries,
      showMCPStatusModal: () => {
        this.setState(() => {
          this.isShowingMCPStatusModal = !0;
        });
      },
      internalAPIClient: this.widget.dependencies.internalAPIClient,
      features: X9(this.authStatus) ? this.authStatus.features : this.tuiContext.features,
      showStatusMessage: (h, i = 2000) => {
        this.showStatusMessage(h, i);
      },
      showToast: (h, i = "success", c) => {
        this.toastController.show(h, i, c);
      },
      getThemeName: () => GD0(e).themeName,
      isMessageViewInteractionActive: this.isMessageViewInSelectionMode || this.messageViewController.editingMessageOrdinal !== null,
      enterHandoffMode: this.enterHandoffMode,
      isInHandoffMode: this.handoffState.isInHandoffMode,
      enterQueueMode: this.enterQueueMode,
      submitQueue: this.submitQueue,
      isInQueueMode: this.isInQueueMode,
      addPendingSkill: h => {
        this.widget.dependencies.activeThreadHandle.addPendingSkill(h);
      },
      onThreadMentionSelected: this.paletteOnThreadMentionSelected ?? void 0,
      canChangeAgentModeInPromptEditor: () => this.canChangeAgentModeInPromptEditor(),
      pluginCommands: this.pluginCommands,
      executePluginCommand: this.widget.dependencies.pluginService ? (h, i, c) => this.widget.dependencies.pluginService.commands.execute(h, i, {
        threadID: c
      }) : void 0,
      reloadPlugins: this.widget.dependencies.pluginService ? () => this.widget.dependencies.pluginService.reload() : void 0,
      pluginService: this.widget.dependencies.pluginService
    };
  };
  getActiveOAuthRequest() {
    return this.pendingOAuthRequestQueue.activeItem;
  }
  removeOAuthRequest(T) {
    this.setState(() => {
      this.pendingOAuthRequestQueue.remove(T);
    });
  }
  resolveOAuthRequest(T, R) {
    T.resolve(R), this.removeOAuthRequest(T);
  }
  rejectOAuthRequest(T, R) {
    T.reject(R), this.removeOAuthRequest(T);
  }
  selectPreviousOAuthRequest = () => {
    this.setState(() => {
      this.pendingOAuthRequestQueue.selectPrevious();
    });
  };
  selectNextOAuthRequest = () => {
    this.setState(() => {
      this.pendingOAuthRequestQueue.selectNext();
    });
  };
  loadThreadsForPicker() {
    if (this.threadLoadSubscription) return;
    this.setState(() => {
      this.isLoadingThreads = !0, this.threadLoadError = !1;
    });
    let T = new V8R(this.widget.dependencies.threadService);
    this.threadLoadSubscription = T.observeThreadSummaries("", {
      includeArchived: !0
    }).subscribe({
      next: R => {
        this.setState(() => {
          this.threadsForPicker = R, this.isLoadingThreads = !1;
        });
      },
      error: R => {
        J.error("Failed to load threads", {
          error: R
        }), this.setState(() => {
          this.isLoadingThreads = !1, this.threadLoadError = !0;
        });
      }
    });
  }
  updateGitBranch = async () => {
    let T = await fz0(process.cwd());
    this.setState(() => {
      this.currentGitBranch = T;
    });
  };
  removeBashInvocation = T => {
    let R = this.pendingBashInvocations.get(T);
    if (R) {
      clearTimeout(R.showTimer), this.pendingBashInvocations.delete(T);
      return;
    }
    let a = this.bashInvocationShownAt.get(T);
    if (a !== void 0) {
      let e = Date.now() - a,
        t = 500;
      if (e < 500) {
        if (!this.bashInvocationRemoveTimers.has(T)) this.bashInvocationRemoveTimers.set(T, setTimeout(() => {
          this.bashInvocationRemoveTimers.delete(T), this.doRemoveBashInvocation(T);
        }, 500 - e));
        return;
      }
    }
    this.doRemoveBashInvocation(T);
  };
  doRemoveBashInvocation = T => {
    this.bashInvocationShownAt.delete(T), this.setState(() => {
      this.bashInvocations = this.bashInvocations.filter(R => R.id !== T);
    });
  };
  invokeBashCommand = (T, {
    visibility: R
  }) => {
    if (!this.widget.dependencies.activeThreadHandle.invokeBashTool) return;
    let a = Date.now(),
      e = `bash-${a}-${Math.random().toString(36).substring(7)}`,
      t = {
        cmd: T
      },
      r = new AbortController(),
      h = {
        id: e,
        args: t,
        toolRun: {
          status: "in-progress"
        },
        startTime: a,
        abortController: r,
        hidden: R === ex
      },
      i = setTimeout(() => {
        let c = this.pendingBashInvocations.get(e);
        if (c) this.pendingBashInvocations.delete(e), this.bashInvocationShownAt.set(e, Date.now()), this.setState(() => {
          this.bashInvocations = [...this.bashInvocations, c.invocation];
        });
      }, 75);
    this.pendingBashInvocations.set(e, {
      invocation: h,
      showTimer: i
    }), this.widget.dependencies.activeThreadHandle.invokeBashTool(t, {
      hidden: R === ex,
      abortController: r
    }).subscribe({
      next: c => {
        let s = this.pendingBashInvocations.get(e);
        if (s) {
          s.invocation = {
            ...s.invocation,
            toolRun: c
          };
          return;
        }
        this.setState(() => {
          this.bashInvocations = this.bashInvocations.map(A => A.id === e ? {
            ...A,
            toolRun: c
          } : A);
        });
      },
      error: () => this.removeBashInvocation(e),
      complete: () => this.removeBashInvocation(e)
    });
  };
  cancelBashInvocations = () => {
    for (let [R, a] of this.pendingBashInvocations) clearTimeout(a.showTimer), a.invocation.abortController.abort(), this.pendingBashInvocations.delete(R);
    for (let [R, a] of this.bashInvocationRemoveTimers) clearTimeout(a), this.bashInvocationRemoveTimers.delete(R), this.bashInvocationShownAt.delete(R);
    let T = this.bashInvocations.find(R => R.toolRun.status === "in-progress");
    if (T) T.abortController.abort();
  };
  showContextDetailOverlay = () => {
    this.setState(() => {
      this.isShowingContextDetailOverlay = !0;
    }), this.fetchThreadCostInfo();
  };
  fetchThreadCostInfo = $70(() => {
    let T = this.widget.dependencies.activeThreadHandle.getThreadID();
    if (!T) return;
    this.widget.dependencies.internalAPIClient.threadDisplayCostInfo({
      threadID: T
    }, {
      config: this.widget.dependencies.configService
    }).then(R => {
      if (R.ok) this.setState(() => {
        this.threadCostInfo = R.result, this.threadCostInfoThreadID = T;
      });
    }).catch(() => {
      this.setState(() => {
        this.threadCostInfo = void 0, this.threadCostInfoThreadID = T;
      });
    });
  }, 150);
  maybeRefetchThreadCostInfo = T => {
    let R = this.lastInferenceState === "running",
      a = T === "running",
      e = T === "idle" && R,
      t = a && !R;
    if (e) this.fetchThreadCostInfo();
    if (t) this.startElapsedTimeTimer();else if (R && !a) this.stopElapsedTimeTimer();
    this.lastInferenceState = T;
  };
  startElapsedTimeTimer = () => {
    if (this.elapsedTimeTimer) return;
    this.elapsedTimeTimer = setInterval(() => {
      let T = this.widget.dependencies.threadState.viewState;
      if (!(T.state === "active" && T.inferenceState === "running")) {
        this.stopElapsedTimeTimer();
        return;
      }
      this.setState(() => {});
    }, 1000);
  };
  stopElapsedTimeTimer = () => {
    if (this.elapsedTimeTimer) clearInterval(this.elapsedTimeTimer), this.elapsedTimeTimer = null;
  };
  toggleAgentMode = () => {
    if (!this.canChangeAgentModeInPromptEditor()) return;
    let T = this.canChangeAgentModeInPromptEditor(),
      R = this.getEffectiveAgentMode(),
      a = this.agentModeController.nextToggleMode(R, T);
    if (a) this.prospectiveAgentMode = a, this.setState(() => {
      this.showImageUnsupportedHint = !1, this.agentModePulseSeq++;
    });
  };
  handleMessageViewControllerUpdate = () => {
    let T = this.messageViewController.editingMessageOrdinal;
    if (T === this.lastEditingMessageOrdinal) return;
    if (this.lastEditingMessageOrdinal !== null && T === null) this.prospectiveAgentMode = null;
    this.lastEditingMessageOrdinal = T, this.setState(() => {});
  };
  showStatusMessage(T, R = 2000) {
    if (this.statusMessageTimer) clearTimeout(this.statusMessageTimer);
    this.setState(() => {
      this.statusMessage = T;
    }), this.statusMessageTimer = setTimeout(() => {
      this.setState(() => {
        this.statusMessage = null;
      }), this.statusMessageTimer = null;
    }, R);
  }
  applyDeepReasoningEffort(T) {
    this.deepReasoningEffort = T, Ms("agent.deepReasoningEffort", T);
  }
  commitDeepReasoningEffort(T) {
    let R = this.deepReasoningEffort;
    if (this.applyDeepReasoningEffort(T), T === R) return Promise.resolve(!0);
    return this.widget.dependencies.configService.updateSettings("agent.deepReasoningEffort", T, "global").then(() => !0).catch(a => {
      return this.applyDeepReasoningEffort(R), J.error("Failed to persist deep reasoning setting", {
        error: a
      }), this.showStatusMessage("Failed to save deep reasoning effort"), !1;
    });
  }
  getNextDeepReasoningEffort(T) {
    return T === "medium" ? "high" : T === "high" ? "xhigh" : "medium";
  }
  toggleDeepReasoningEffort = async () => {
    this.deepModeEffortHintController.dismissForInteraction();
    let T = this.getEffectiveAgentMode();
    if (!qo(T)) {
      this.showStatusMessage("Deep reasoning effort is only available in deep or internal mode");
      return;
    }
    if (!this.widget.dependencies.activeThreadHandle.getThreadID()) return;
    let R = this.getNextDeepReasoningEffort(this.deepReasoningEffort);
    if (!(await this.commitDeepReasoningEffort(R))) return;
    this.showStatusMessage(`Deep reasoning effort: ${R}`), this.setState(() => {
      this.agentModePulseSeq++;
    });
  };
  formatAgentModeLabel(T) {
    if (T !== "deep") return T;
    if (this.deepReasoningEffort === "high") return "deep\xB2";
    if (this.deepReasoningEffort === "xhigh") return "deep\xB3";
    return "deep";
  }
  handleInsertImage = async T => {
    let R = this.getEffectiveAgentMode();
    if (!TCT(R)) {
      if (this.imageUnsupportedHintTimer) clearTimeout(this.imageUnsupportedHintTimer);
      return this.setState(() => {
        this.showImageUnsupportedHint = !0;
      }), this.imageUnsupportedHintTimer = setTimeout(() => {
        this.setState(() => {
          this.showImageUnsupportedHint = !1;
        }), this.imageUnsupportedHintTimer = null;
      }, 5000), !1;
    }
    if (this.imageAttachments.length >= pb) return !1;
    let a = await GH(T);
    if (typeof a === "object") return this.setState(() => {
      this.imageAttachments = [...this.imageAttachments, a];
    }), !1;
    return this.setState(() => {
      this.displayMessage = Error(`Failed to attach image: ${a}`);
    }), !1;
  };
  handlePopImage = () => {
    if (this.imageAttachments.length > 0) this.setState(() => {
      this.imageAttachments = this.imageAttachments.slice(0, -1);
    });
  };
  handleImageClick = T => {
    let R = this.imageAttachments[T];
    if (R) this.setState(() => {
      this.imagePreview = {
        image: R,
        index: T,
        onRemove: () => {
          let a = this.imageAttachments.indexOf(R);
          if (a !== -1) this.setState(() => {
            this.imageAttachments = this.imageAttachments.filter((e, t) => t !== a), this.imagePreview = null;
          });
        }
      };
    });
  };
  handleImagePreviewDismiss = () => {
    this.setState(() => {
      this.imagePreview = null;
    });
  };
  handleShowFileImagePreview = T => {
    this.setState(() => {
      this.fileImagePreviewPath = T;
    });
  };
  handleFileImagePreviewDismiss = () => {
    this.setState(() => {
      this.fileImagePreviewPath = null;
    });
  };
  handleShowPainterImagePreview = (T, R) => {
    this.setState(() => {
      this.painterImagePreview = {
        image: T,
        filePath: R
      };
    });
  };
  handlePainterImagePreviewDismiss = () => {
    this.setState(() => {
      this.painterImagePreview = null;
    });
  };
  handleShowPainterSaveDialog = (T, R) => {
    this.setState(() => {
      this.painterSaveDialog = {
        image: T,
        filePath: R
      };
    });
  };
  handlePainterSaveDialogDismiss = () => {
    this.setState(() => {
      this.painterSaveDialog = null;
    });
  };
  handleSkillClick = T => {
    let R = this.pendingSkills[T];
    if (R) this.setState(() => {
      this.cachedSkillForPreview = null, this.skillPreview = {
        skillIndex: T,
        onRemove: () => {
          this.widget.dependencies.activeThreadHandle.removePendingSkill(R.name), this.setState(() => {
            this.skillPreview = null, this.cachedSkillForPreview = null;
          });
        }
      };
    }), this.widget.dependencies.skillService.getSkills().then(a => {
      let e = a.find(t => t.name === R.name) ?? null;
      if (this.skillPreview !== null) this.setState(() => {
        this.cachedSkillForPreview = e;
      });
    });
  };
  handleSkillPreviewDismiss = () => {
    this.setState(() => {
      this.skillPreview = null, this.cachedSkillForPreview = null;
    });
  };
  handleShowEditingImagePreview = (T, R, a) => {
    this.setState(() => {
      this.imagePreview = {
        image: T,
        index: R,
        onRemove: a
      };
    });
  };
  handleImagePreviewRemove = () => {
    if (this.imagePreview) this.imagePreview.onRemove(), this.setState(() => {
      this.imagePreview = null;
    });
  };
  handleShowMysteryModal = () => {
    if (this.mysteriousMessage) this.setState(() => {
      this.isShowingMysteriousMessageModal = !0;
    });
  };
  handleSplashOrbExplode = T => {
    this.splashOrbExplosionSeq += 1, this.setState(() => {
      this.splashOrbExplosion = {
        seq: this.splashOrbExplosionSeq,
        originX: T.x,
        originY: T.y
      };
    });
  };
  handleSplashOrbExplosionComplete = () => {
    if (!this.splashOrbExplosion) return;
    this.setState(() => {
      this.splashOrbExplosion = null;
    });
  };
  handleDestructMysteriousMessage = () => {
    if (!this.mysteriousMessage) return;
    let T = this.mysteriousMessage.id;
    this.widget.dependencies.internalAPIClient.markAsReadMysteriousMessage({
      messageId: T
    }, {
      config: this.widget.dependencies.configService
    }).then(R => {
      if (!R.ok) J.error("Failed to destruct mysterious message", R.error);else this.setState(() => {
        this.mysteriousMessage = null, this.isShowingMysteriousMessageModal = !1;
      });
    }).catch(R => {
      J.error("Failed to destruct mysterious message", R);
    });
  };
  exitMessageViewInteraction = () => {
    this.messageViewController.setSelectedUserMessageOrdinal(null), this.messageViewController.setIsShowingRestoreConfirmation(!1), this.messageViewController.setIsShowingEditConfirmation(!1), this.messageViewController.setPendingEditText(null), this.messageViewController.setPendingEditImageAttachments([]), this.messageViewController.setAffectedFiles([]), this.messageViewController.stopEditing(), this.setState(() => {
      this.isMessageViewInSelectionMode = !1, this.imagePreview = null;
    }), this.scrollMessageViewToBottom(), k8.instance.addPostFrameCallback(() => {
      if (!this.isShowingPalette && !this.isShowingIdePicker) this.autocompleteFocusNode.requestFocus();
    });
  };
  enterHandoffMode = () => {
    this.dismissPalette(), this.exitMessageViewInteraction(), this.handoffController?.enter();
  };
  exitHandoffMode = () => {
    this.handoffController?.exit();
  };
  submitHandoff = async T => {
    let R = this.imageAttachments;
    if (this.resetHistory(), !this.handoffController) {
      this.showSubmitDisabledHint("Handoff controller not initialized");
      return;
    }
    let a = await this.handoffController.submit(T, R, this.getProspectiveAgentMode());
    if (!a.ok && a.error.message !== "Cancelled") this.displayMessage = a.error, this.setState(() => {});else if (a.ok) this.setState(() => {
      this.imageAttachments = [];
    }), setTimeout(() => {
      this.handoffController?.startCountdown(() => {
        this.autoSubmitHandoffDraft().catch(e => {
          this.handleSubmitFlowError(e);
        });
      });
    }, 0);
  };
  autoSubmitHandoffDraft = async () => {
    let T = this.textController.text;
    if (T.trim()) this.textController.clear(), await this.sendUserMessage(T);
  };
  enterQueueMode = () => {
    this.dismissPalette(), this.exitMessageViewInteraction(), this.setState(() => {
      this.isInQueueMode = !0;
    });
  };
  exitQueueMode = () => {
    this.setState(() => {
      this.isInQueueMode = !1;
    });
  };
  submitQueue = async T => {
    if (this.exitMessageViewInteraction(), this.widget.dependencies.activeThreadHandle.getQueuedMessages().length >= bK) {
      this.toastController.show(`Queue is full (max ${bK} messages)`, "error", 3000);
      return;
    }
    let R = this.imageAttachments,
      a = await this.uploadImageAttachmentsIfNeeded(R);
    this.resetHistory(), this.setState(() => {
      this.imageAttachments = [];
    }), this.textController.clear();
    let e = [{
      type: "text",
      text: T
    }];
    if (a.length > 0) e.push(...a);
    await this.widget.dependencies.activeThreadHandle.queueMessage(e), this.exitQueueMode();
  };
  isAuthRequiredStatus(T) {
    if (!oA(T)) return !1;
    let R = T.error.message.toLowerCase();
    return R.includes("user not found") || R.includes("auth-required") || R.includes("unauthorized") || R.includes("forbidden") || R.includes("401") || R.includes("403") || R.includes("api key") || R.includes("access token");
  }
  shouldRequireAuthForPromptSubmit() {
    if (!this.tuiContext.hasAPIKeyAtStartup && !X9(this.authStatus)) return !0;
    return this.isAuthRequiredStatus(this.authStatus) && !X9(this.authStatus);
  }
  queuePromptUntilAuthenticated(T, R = [...this.imageAttachments], a) {
    if (this.queuedPromptAfterAuth = {
      text: T,
      images: R
    }, a?.clearInput ?? !0) this.textController.clear(), this.textController.resetScrollOffset(), this.resetHistory(), this.setState(() => {
      this.imageAttachments = [];
    });
    this.showStatusMessage("Sign in required. Prompt queued and will send after login.", 2500), this.ensureAuthLoginSession();
  }
  ensureAuthLoginSession = async () => {
    if (this.pendingAuthLogin || this.isCreatingAuthLoginSession || X9(this.authStatus)) return;
    this.isCreatingAuthLoginSession = !0;
    try {
      let T = u70(32).toString("hex"),
        R = await Hw(this.tuiContext.ampURL, T),
        a = await Hw(this.tuiContext.ampURL, T, !1),
        e = new AbortController();
      this.setState(() => {
        this.pendingAuthLogin = {
          authToken: T,
          browserURL: R,
          manualURL: a,
          abortController: e,
          isOpeningBrowser: !1,
          isAuthenticating: !0,
          errorMessage: null
        };
      }), hk0(this.tuiContext.ampURL, T, this.widget.dependencies.secretStorage, e).then(() => {
        this.showStatusMessage("Login successful", 2000), this.checkAuthStatusAfterLogin();
      }).catch(t => {
        if (e.signal.aborted) return;
        let r = t instanceof Error ? t.message : "Login failed. Please try again.";
        this.setState(() => {
          if (!this.pendingAuthLogin) return;
          this.pendingAuthLogin.errorMessage = r, this.pendingAuthLogin.isAuthenticating = !1;
        });
      });
    } catch (T) {
      let R = T instanceof Error ? T.message : "Unable to start login flow. Please try again.";
      this.setState(() => {
        if (!this.pendingAuthLogin) {
          this.displayMessage = Error(R);
          return;
        }
        this.pendingAuthLogin.errorMessage = R, this.pendingAuthLogin.isAuthenticating = !1;
      });
    } finally {
      this.isCreatingAuthLoginSession = !1;
    }
  };
  openAuthLoginBrowser = async () => {
    if (!this.pendingAuthLogin) return;
    let T = this.pendingAuthLogin.browserURL,
      R = this.pendingAuthLogin.abortController;
    this.setState(() => {
      if (!this.pendingAuthLogin) return;
      this.pendingAuthLogin.isOpeningBrowser = !0, this.pendingAuthLogin.errorMessage = null;
    });
    try {
      await Wb(T, R.signal);
    } catch (a) {
      let e = a instanceof Error ? a.message : "Unable to open browser. Copy the manual link.";
      this.setState(() => {
        if (!this.pendingAuthLogin) return;
        this.pendingAuthLogin.errorMessage = e;
      });
    } finally {
      this.setState(() => {
        if (!this.pendingAuthLogin) return;
        this.pendingAuthLogin.isOpeningBrowser = !1;
      });
    }
  };
  copyAuthLoginLink = async () => {
    let T = this.pendingAuthLogin?.manualURL;
    if (!T) return;
    try {
      await d9.instance.tuiInstance.clipboard.writeText(T), this.showStatusMessage("Login link copied to clipboard", 2000);
    } catch (R) {
      J.error("Failed to copy login link", {
        error: R
      }), this.showStatusMessage("Failed to copy login link", 2000);
    }
  };
  checkAuthStatusAfterLogin = async () => {
    try {
      let T = await this.widget.dependencies.configService.getLatest(),
        R = k2(T),
        a = await this.widget.dependencies.internalAPIClient.getUserInfo({}, {
          config: this.widget.dependencies.configService,
          signal: AbortSignal.timeout(R)
        });
      if (!a.ok) {
        this.setState(() => {
          if (!this.pendingAuthLogin) return;
          this.pendingAuthLogin.errorMessage = "Still waiting for login confirmation. Finish login in your browser, then press I again.";
        });
        return;
      }
      this.setState(() => {
        this.authStatus = {
          user: a.result,
          features: a.result.features,
          workspace: a.result.team,
          mysteriousMessage: a.result.mysteriousMessage
        }, this.pendingAuthLogin = null;
      }), await this.maybeResumeQueuedPromptAfterAuth();
    } catch (T) {
      J.error("Failed to verify login state", {
        error: T
      }), this.setState(() => {
        if (!this.pendingAuthLogin) return;
        this.pendingAuthLogin.errorMessage = "Unable to verify login yet. Press I again in a moment.";
      });
    }
  };
  cancelAuthLoginSession = () => {
    if (this.pendingAuthLogin) this.pendingAuthLogin.abortController.abort(Error("Authentication cancelled"));
    this.setState(() => {
      this.pendingAuthLogin = null;
    });
  };
  maybeResumeQueuedPromptAfterAuth = async () => {
    if (!X9(this.authStatus)) return;
    let T = this.queuedPromptAfterAuth;
    if (!T) return;
    this.queuedPromptAfterAuth = null, await this.proceedWithUserMessage(T.text, T.images);
  };
  handleAuthModalKey = T => {
    if (!this.pendingAuthLogin || this.pendingInputDialog) return !1;
    let R = T.key.length === 1 ? T.key.toLowerCase() : T.key;
    if (R === "Enter" || R === "o") return this.openAuthLoginBrowser(), !0;
    if (R === "c") return this.copyAuthLoginLink(), !0;
    if (R === "i") return this.checkAuthStatusAfterLogin(), !0;
    if (R === "p") return this.promptForAuthLoginCode(), !0;
    return !1;
  };
  promptForAuthLoginCode = async () => {
    if (!this.pendingAuthLogin) return;
    let {
        authToken: T,
        abortController: R
      } = this.pendingAuthLogin,
      a = await new Promise(e => {
        this.setState(() => {
          this.isShowingPalette = !1, this.paletteShowOptions = null, this.pendingInputDialog = {
            options: {
              title: "Paste Login Code",
              helpText: "Paste the login code from the browser page. This is not your API key.",
              submitButtonText: "Verify"
            },
            resolve: e
          };
        });
      });
    if (!a || !this.pendingAuthLogin) return;
    try {
      let {
        accessToken: e
      } = CXT(a, T);
      await this.widget.dependencies.secretStorage.set("apiKey", e, this.tuiContext.ampURL), R.abort(Error("Authentication completed from pasted code")), this.showStatusMessage("Login code accepted", 2000), await this.checkAuthStatusAfterLogin();
    } catch (e) {
      let t = e instanceof Error ? e.message : "Invalid login code.";
      this.setState(() => {
        if (!this.pendingAuthLogin) return;
        this.pendingAuthLogin.errorMessage = t, this.pendingAuthLogin.isAuthenticating = !1;
      });
    }
  };
  openInEditor = async T => {
    try {
      let R = await y70(Eo.join(g70(), "amp-edit-")),
        a = Eo.join(R, "message.amp.md");
      await f70(a, T, "utf-8"), await Zb(a);
      try {
        let e = await P70(a, "utf-8");
        this.textController.text = e;
      } catch (e) {
        if (e?.code !== "ENOENT") J.error("Failed to read temporary file", e);
      }
      try {
        await x70(a), await k70(R);
      } catch (e) {
        J.warn("Failed to clean up temporary file", e);
      }
    } catch (R) {
      J.error("Error opening editor:", R);
    }
  };
  onTextSubmitted = async T => {
    if (this.isSubmittingPromptMessage) return;
    if (!T.trim() && this.imageAttachments.length === 0) {
      if (!this.canInterruptQueuedInference()) return;
      try {
        await this.interruptNextQueuedMessage();
        return;
      } catch (e) {
        J.error("Failed to interrupt queued message from empty submit", e);
      }
      return;
    }
    let R = T.trim();
    if (R === ":q") {
      this.widget.dependencies.setExitNotice?.("Vim reflex detected. Exiting politely."), await this.exitApplication();
      return;
    }
    if (R === "exit" || R === "quit") {
      await this.exitApplication();
      return;
    }
    if (this.handoffState.isInHandoffMode) {
      await this.submitHandoff(T);
      return;
    }
    if (this.isInQueueMode) {
      await this.submitQueue(T);
      return;
    }
    let a = YP(T);
    if (a && this.widget.dependencies.activeThreadHandle.invokeBashTool) if (!a.cmd) {
      this.showSubmitDisabledHint("No command provided");
      return;
    } else if (this.isProcessing()) {
      this.showSubmitDisabledHint("Unable to use shell mode while agent is active");
      return;
    } else {
      this.invokeBashCommand(a.cmd, {
        visibility: a.visibility
      }), this.widget.dependencies.history.add(T, process.cwd()), this.textController.clear(), this.textController.resetScrollOffset(), this.resetHistory();
      return;
    }
    if (this.shouldRequireAuthForPromptSubmit()) {
      this.queuePromptUntilAuthenticated(T);
      return;
    }
    await this.submitPromptMessage(T);
  };
  submitPromptMessage = async T => {
    let R = [...this.imageAttachments];
    this.currentSubmitQueuesBehindActiveTurn = this.widget.dependencies.threadPool.queueOnSubmitByDefault && Boolean(this.widget.dependencies.activeThreadHandle.interruptQueuedMessage) && N7(this.widget.dependencies.threadState.viewState), this.immediateQueuedInterjectRequested = !1;
    let a = () => {
      let e = CN0({
        submittedText: T,
        currentDraftText: this.textController.text,
        currentCursorPosition: this.textController.cursorPosition
      });
      if (this.textController.text = e.nextDraftText, this.textController.cursorPosition = e.nextCursorPosition, R.length > 0) this.setState(() => {
        this.imageAttachments = [...R, ...this.imageAttachments];
      });
    };
    this.setState(() => {
      this.isSubmittingPromptMessage = !0, this.imageAttachments = [];
    }), this.textController.clear(), this.textController.resetScrollOffset(), this.resetHistory();
    try {
      if (await this.updateGitBranch(), !(await this.proceedWithUserMessage(T, R))) {
        a();
        return;
      }
      if (this.immediateQueuedInterjectRequested) this.scheduleQueuedInterjectAfterSubmit();
    } catch (e) {
      throw a(), e;
    } finally {
      this.currentSubmitQueuesBehindActiveTurn = !1, this.immediateQueuedInterjectRequested = !1, this.setState(() => {
        this.isSubmittingPromptMessage = !1;
      });
    }
  };
  agentModeListener = () => {
    let T = this.getProspectiveAgentMode(),
      R = this.canChangeAgentModeInPromptEditor();
    if (!this.widget.dependencies.activeThreadHandle.getThreadID()) return;
    if (this.handoffState.countdownSeconds !== null) this.handoffController?.stopCountdown();
    if (!R && T && T !== this.sessionState.agentMode) this.persistAgentMode(T);
    this.prospectiveAgentMode = this.agentModeController.clampToVisibleMode(this.prospectiveAgentMode);
    let a = this.lastEffectiveAgentMode,
      e = this.getEffectiveAgentMode();
    this.lastEffectiveAgentMode = e, this.deepModeEffortHintController.onAgentModeTransition(a, e), this.setState(() => {});
  };
  handoffListener = T => {
    let R = this.handoffState.isInHandoffMode && !T.isInHandoffMode;
    this.setState(() => {
      if (this.handoffState = T, R) this.prospectiveAgentMode = null;
    });
  };
  initState() {
    if (Es.getInstance().interceptConsole(), this.threadPreviewController.setThreadService(this.widget.dependencies.threadService), this.threadPreviewController.addListener(this.previewControllerListener), this.handoffController = new qTR({
      getActiveThreadHandle: () => this.widget.dependencies.activeThreadHandle,
      getThreadPool: () => this.widget.dependencies.threadPool,
      switchToThread: t => {
        return this.textController.clear(), this.switchToExistingThread(t);
      }
    }), this.handoffController.addListener(this.handoffListener), this.tuiContext.openThreadSwitcher) this.showStandaloneThreadPicker();
    if (this.authStatus = this.tuiContext.initialServerStatus, this.sessionState = this.tuiContext.sessionState ?? Jk, this.shortcutsHintUsed = this.sessionState.shortcutsHintUsed, this.messageViewControllerUnsubscribe ??= this.messageViewController.subscribe(this.handleMessageViewControllerUpdate), this.agentModeController = new HTR({
      sessionState: this.sessionState,
      freeTierStatus: this.freeTierStatus,
      workspace: this.tuiContext.workspace ?? null,
      userEmail: X9(this.authStatus) ? this.authStatus.user.email : void 0,
      config$: this.widget.dependencies.configService.config,
      getThread: () => this.widget.dependencies.threadState.mainThread
    }), this.prospectiveAgentMode = this.agentModeController.clampToVisibleMode(this.tuiContext.initialAgentMode ?? this.sessionState.agentMode), this.agentModeController.addListener(this.agentModeListener), this.lastEffectiveAgentMode = this.getEffectiveAgentMode(), this.authStatusSubscription = ln(this.widget.dependencies.configService).subscribe(t => {
      if (this.setState(() => {
        if (this.authStatus = t, X9(t)) this.pendingAuthLogin = null;
      }), this.agentModeController.updateVisibilityContext({
        userEmail: X9(t) ? t.user.email : void 0
      }), X9(t)) {
        this.maybeResumeQueuedPromptAfterAuth();
        return;
      }
      if (this.isAuthRequiredStatus(t)) this.ensureAuthLoginSession();
    }), this.authModalKeyInterceptorUnsubscribe = d9.instance.addKeyInterceptor(t => this.handleAuthModalKey(t)), !this.tuiContext.hasAPIKeyAtStartup) this.ensureAuthLoginSession();
    this.autocompleteFocusNodeListener = t => {
      k8.instance.addPostFrameCallback(() => {
        if (!this.mounted) return;
        this.setState(() => {
          this.isTextfieldAndAutocompleteFocused = t.hasFocus;
        });
      }, "TuiUIState.autocompleteFocusNodeListener");
    }, this.autocompleteFocusNode.addListener(this.autocompleteFocusNodeListener), Promise.all([this.tuiContext.freeTierStatusPromise ?? Promise.resolve(void 0), m0(this.widget.dependencies.configService.config)]).then(([t, r]) => {
      if (t) this.freeTierStatus = t, this.agentModeController.updateVisibilityContext({
        freeTierStatus: t
      });
      this.paletteConfig = r;
      let h = O2(r.settings),
        i = r.settings["anthropic.speed"],
        c = r.settings["openai.speed"];
      this.showSkillsCountInPromptBar = r.settings["internal.cli.showSkillsCountInPromptBar"] !== !1, this.applyDeepReasoningEffort(h), this.anthropicSpeed = i, this.openAISpeed = c, this.deepReasoningEffortSubscription = this.widget.dependencies.configService.config.pipe(JR(s => O2(s.settings)), E9()).subscribe(s => {
        if (s !== this.deepReasoningEffort) this.applyDeepReasoningEffort(s), this.setState(() => {
          this.agentModePulseSeq++;
        });
      }), this.anthropicSpeedSubscription = this.widget.dependencies.configService.config.pipe(JR(s => ({
        settings: s.settings
      })), E9((s, A) => s.settings["anthropic.speed"] === A.settings["anthropic.speed"])).subscribe(({
        settings: s
      }) => {
        let A = s["anthropic.speed"];
        if (A !== this.anthropicSpeed) this.anthropicSpeed = A, this.setState(() => {
          this.agentModePulseSeq++;
        });
      }), this.openAISpeedSubscription = this.widget.dependencies.configService.config.pipe(JR(s => ({
        settings: s.settings
      })), E9((s, A) => s.settings["openai.speed"] === A.settings["openai.speed"])).subscribe(({
        settings: s
      }) => {
        let A = s["openai.speed"];
        if (A !== this.openAISpeed) this.openAISpeed = A, this.setState(() => {
          this.agentModePulseSeq++;
        });
      }), this.showSkillsCountInPromptBarSubscription = this.widget.dependencies.configService.config.pipe(JR(s => ({
        settings: s.settings
      })), E9((s, A) => s.settings["internal.cli.showSkillsCountInPromptBar"] === A.settings["internal.cli.showSkillsCountInPromptBar"])).subscribe(({
        settings: s
      }) => {
        let A = s["internal.cli.showSkillsCountInPromptBar"] !== !1;
        if (A !== this.showSkillsCountInPromptBar) this.setState(() => {
          this.showSkillsCountInPromptBar = A;
        });
      }), this.submitOnEnter = r.settings.submitOnEnter ?? !0, this.submitOnEnterSubscription = this.widget.dependencies.configService.config.pipe(JR(s => ({
        settings: s.settings
      })), E9((s, A) => s.settings.submitOnEnter === A.settings.submitOnEnter)).subscribe(({
        settings: s
      }) => {
        let A = s.submitOnEnter ?? !0;
        if (A !== this.submitOnEnter) this.setState(() => {
          this.submitOnEnter = A;
        });
      }), this.deepModeEffortHintController.maybeShowForInitialDeepMode(), this.setState(() => {});
    }), this.updateGitBranch(), this.allConnectedThreadActivityStatusesSubscription = this.widget.dependencies.threadPool.allConnectedThreadActivityStatuses$.subscribe(t => {
      if (this.areRecordValuesEqual(this.allConnectedThreadActivityStatuses, t)) return;
      this.setState(() => {
        this.allConnectedThreadActivityStatuses = t;
      });
    }), this.threadTitlesSubscription = this.widget.dependencies.threadPool.threadTitles$.subscribe(t => {
      if (this.areRecordValuesEqual(this.threadTitles, t)) return;
      this.setState(() => {
        this.threadTitles = t;
      });
    }), this.threadInitializationStatusSubscription = this.widget.dependencies.threadPool.initializationStatus$?.subscribe(t => {
      let r = t.pending ? t.message : null;
      if (r === this.threadInitializationMessage) return;
      this.setState(() => {
        this.threadInitializationMessage = r;
      });
    }) ?? null, this.activeThreadSubscription = this.widget.dependencies.threadPool.threadHandles$.pipe(E9(), L9(t => t ? t.thread$ : AR.of(null))).subscribe(t => {
      let r = t?.id;
      if (this.threadCostInfoThreadID !== r) {
        if (this.threadCostInfo = void 0, this.threadCostInfoThreadID = r, r && ve(t) > 0) this.fetchThreadCostInfo();
      }
      let h = t ? this.widget.dependencies.threadState.viewState : void 0;
      this.maybeRefetchThreadCostInfo(h?.state === "active" ? h.inferenceState : void 0);
    }), this.legacyHandoffNavigationSubscription = this.widget.dependencies.threadPool.legacyHandoffNavigation$?.subscribe(t => {
      this.handleHandoffNavigation(t);
    }) ?? null, this.freeTierStatusSubscription = N4R(async () => {
      let t = await this.widget.dependencies.configService.getLatest(),
        r = k2(t),
        h = await this.widget.dependencies.internalAPIClient.getUserFreeTierStatus({}, {
          config: this.widget.dependencies.configService,
          signal: AbortSignal.timeout(r)
        });
      if (!h.ok) throw h.error;
      return h.result;
    }).subscribe({
      next: t => {
        if (t) this.setState(() => {
          this.freeTierStatus = t;
        }), this.agentModeController.updateVisibilityContext({
          freeTierStatus: t
        });
      },
      error: t => {
        J.debug("Failed to fetch free tier status", t);
      }
    });
    let {
      mcpTrustHandler: T
    } = this.widget.dependencies;
    if (this.mcpTrustSubscription = T.pendingServers$.subscribe(t => {
      this.setState(() => {
        this.pendingMCPServers = t;
      });
    }), XkT(t => {
      this.setState(() => {
        this.pendingOAuthRequestQueue.enqueue(t);
      });
    }), this.mcpServersSubscription = this.widget.dependencies.mcpService.servers.subscribe(t => {
      this.setState(() => {
        this.mcpServers = t;
      });
    }), this.pendingSkillsSubscription = this.widget.dependencies.activeThreadHandle.pendingSkills$.subscribe(t => {
      this.setState(() => {
        this.pendingSkills = t;
      });
    }), this.widget.dependencies.pluginService) {
      let t = this.widget.dependencies.pluginService;
      this.pluginCommandsSubscription = xj(t.plugins, t.commands.changed).subscribe(() => {
        let r = t.commands.list();
        this.setState(() => {
          this.pluginCommands = r;
        });
      }), this.pluginInfosSubscription = t.plugins.subscribe(r => {
        this.setState(() => {
          this.pluginInfos = r;
        });
      });
    }
    this.skillListSubscription = this.widget.dependencies.skillService.skills.subscribe(t => {
      let r = t.filter(h => !h.baseDir.startsWith("builtin://")).length;
      this.setState(() => {
        this.availableSkillCount = r, this.availableSkillCountReady = !0;
      });
    }), this.skillWarningsSubscription = this.widget.dependencies.skillService.skillWarnings.subscribe(t => {
      this.setState(() => {
        this.skillWarningCount = t.length;
      });
    }), this.skillErrorsSubscription = this.widget.dependencies.skillService.skillErrors.subscribe(t => {
      this.setState(() => {
        this.skillErrorCount = t.length;
      });
    }), this.pendingApprovalsSubscription = this.widget.dependencies.activeThreadHandle.pendingApprovals$.subscribe(t => {
      this.setState(() => {
        this.pendingApprovals = t;
      });
    }), this.ideStatusSubscription = this.widget.dependencies.ideClient.status.subscribe(t => {
      this.setState(() => {
        this.ideStatus = t;
      });
    }), this.updateServiceSubscription = this.widget.dependencies.updateService.state.subscribe(t => {
      this.setState(() => {
        this.updateState = t;
      });
    }), this.mysteriousMessageSubscription = ln(this.widget.dependencies.configService).pipe(da(t => t !== "pending"), JR(t => X9(t) ? t.mysteriousMessage ?? null : null), E9((t, r) => t?.id === r?.id)).subscribe(t => {
      this.setState(() => {
        if (t?.id !== this.mysteriousMessage?.id) this.isShowingMysteriousMessageModal = !1;
        if (this.mysteriousMessage = t, t && !this.mysterySequenceManager) this.mysterySequenceManager = new FXT(new Map([[new zXT(uhT.MYSTERY_SEQUENCE), new jY()]])), this.mysteryKeyInterceptorUnsubscribe = d9.instance.addKeyInterceptor(r => {
          if (!this.mysterySequenceManager) return !1;
          if (this.isShowingMysteriousMessageModal) return !1;
          let h = this.mysterySequenceManager.handleKeyEvent(r);
          if (h.consumed) {
            if (h.intent) this.handleShowMysteryModal();
            return this.setState(() => {
              this.mysterySequenceProgress = h.progress;
            }), !0;
          } else if (this.mysterySequenceProgress) this.setState(() => {
            this.mysterySequenceProgress = null;
          });
          return !1;
        });else if (!t) this.mysteryKeyInterceptorUnsubscribe?.(), this.mysteryKeyInterceptorUnsubscribe = null, this.mysterySequenceManager?.dispose(), this.mysterySequenceManager = null, this.mysterySequenceProgress = null;
      });
    }), this.textController.addListener(this.textChangeListener), this.queuedInterjectKeyInterceptorUnsubscribe = d9.instance.addKeyInterceptor(t => this.handleQueuedInterjectKey(t)), d9.instance.addKeyInterceptor(t => {
      if (t.key === "?") {
        if (this.textController.text === "" && this.textController.cursorPosition === 0 && !this.isShowingHelp && !this.isShowingPalette && this.isTextfieldAndAutocompleteFocused) {
          if (this.setState(() => {
            this.isShowingShortcutsHelp = !this.isShowingShortcutsHelp;
          }), !this.shortcutsHintUsed) this.shortcutsHintUsed = !0, this.sessionState = {
            ...this.sessionState,
            shortcutsHintUsed: !0
          }, iB(r => ({
            ...r,
            shortcutsHintUsed: !0
          }));
          return !0;
        }
      }
      if (this.isShowingShortcutsHelp) {
        if (this.setState(() => {
          this.isShowingShortcutsHelp = !1;
        }), t.key === "Escape") return !0;
        return !1;
      }
      return !1;
    }), this.updateTerminalTitle();
    let R = this.widget.dependencies.ideClient.getSelectedConfig();
    if (R) this.connectToSelectedIde(R, "auto-startup").catch(t => {
      let r = t instanceof Error ? t.message : String(t);
      this.setState(() => {
        this.displayMessage = Error(`Failed to connect to IDE: ${r}`);
      });
    });else if (this.tuiContext.showIdePickerHint) this.toastController.show("Use /ide to connect to an IDE", "success", 5000);else if (this.tuiContext.showJetBrainsInstaller) this.openJetBrainsInstaller();
    let a = this.widget.dependencies.activeThreadHandle,
      e = a.getThreadID();
    if (!e) {
      this.initNewsFeed();
      return;
    }
    if (a.shouldAutoSubmitDraft()) setTimeout(() => {
      this.autoSubmitInitialDraft(e);
    }, 100);
    this.initNewsFeed();
  }
  async autoSubmitInitialDraft(T) {
    if (this.widget.dependencies.activeThreadHandle.getThreadID() !== T) return;
    let R = await this.getDraftForThread(T);
    if (!R) return;
    let a = R.text.trim();
    if (!a && R.images.length === 0) return;
    J.info("Auto-submitting initial handoff draft", {
      name: "handoff",
      threadID: T,
      hasDraftText: Boolean(a),
      draftImageCount: R.images.length
    }), this.textController.clear(), await this.proceedWithUserMessage(a, [...R.images]);
  }
  handleSubmitFlowError(T) {
    J.error("Failed to submit prompt message", T);
    let R = T instanceof Error ? T.message : String(T),
      a = R ? `Failed to submit message: ${R}` : "Failed to submit message";
    this.showStatusMessage(a, 5000);
  }
  handleHandoffNavigation = async T => {
    try {
      await this.switchToExistingThread(T);
      let R = this.widget.dependencies.activeThreadHandle;
      if (!R.getThreadID()) {
        J.error("Failed to get new thread after handoff navigation");
        return;
      }
      if (R.shouldAutoSubmitDraft()) {
        let a = await this.getDraftForThread(T);
        if (!a) return;
        let e = a.text.trim();
        if (!e && a.images.length === 0) return;
        J.info("Auto-submitting handoff draft", {
          name: "handoff",
          threadID: T,
          hasDraftText: Boolean(e),
          draftImageCount: a.images.length
        }), this.textController.clear(), await this.proceedWithUserMessage(e, [...a.images]);
      }
    } catch (R) {
      J.error("Failed to handle handoff navigation", {
        name: "handoff",
        newThreadID: T,
        error: R
      });
    }
  };
  dispose() {
    if (this.ideStatusSubscription) this.ideStatusSubscription.unsubscribe();
    if (this.updateServiceSubscription) this.updateServiceSubscription.unsubscribe();
    if (this.agentModeController.removeListener(this.agentModeListener), this.agentModeController.dispose(), this.deepModeEffortHintController.dispose(), this.messageViewControllerUnsubscribe) this.messageViewControllerUnsubscribe(), this.messageViewControllerUnsubscribe = null;
    if (this.handoffController) this.handoffController.removeListener(this.handoffListener), this.handoffController.dispose();
    if (this.freeTierStatusSubscription) this.freeTierStatusSubscription.unsubscribe();
    if (this.allConnectedThreadActivityStatusesSubscription) this.allConnectedThreadActivityStatusesSubscription.unsubscribe();
    if (this.threadInitializationStatusSubscription) this.threadInitializationStatusSubscription.unsubscribe();
    if (this.threadTitlesSubscription) this.threadTitlesSubscription.unsubscribe();
    if (this.activeThreadSubscription) this.activeThreadSubscription.unsubscribe(), this.activeThreadSubscription = null;
    if (this.legacyHandoffNavigationSubscription) this.legacyHandoffNavigationSubscription.unsubscribe(), this.legacyHandoffNavigationSubscription = null;
    if (this.mcpTrustSubscription) this.mcpTrustSubscription.unsubscribe();
    if (this.authStatusSubscription) this.authStatusSubscription.unsubscribe(), this.authStatusSubscription = null;
    XkT(null);
    for (let T of this.pendingOAuthRequestQueue.clear()) T.reject(Error("OAuth authorization cancelled"));
    if (this.authModalKeyInterceptorUnsubscribe?.(), this.authModalKeyInterceptorUnsubscribe = null, this.queuedInterjectKeyInterceptorUnsubscribe?.(), this.queuedInterjectKeyInterceptorUnsubscribe = null, this.pendingAuthLogin) this.pendingAuthLogin.abortController.abort(Error("TUI disposed")), this.pendingAuthLogin = null;
    if (this.mcpServersSubscription) this.mcpServersSubscription.unsubscribe();
    if (this.pendingSkillsSubscription) this.pendingSkillsSubscription.unsubscribe();
    if (this.pluginCommandsSubscription) this.pluginCommandsSubscription.unsubscribe();
    if (this.pluginInfosSubscription) this.pluginInfosSubscription.unsubscribe();
    if (this.skillListSubscription) this.skillListSubscription.unsubscribe();
    if (this.skillWarningsSubscription) this.skillWarningsSubscription.unsubscribe();
    if (this.skillErrorsSubscription) this.skillErrorsSubscription.unsubscribe();
    if (this.pendingApprovalsSubscription) this.pendingApprovalsSubscription.unsubscribe();
    if (this.unloadThreadsForPicker(), this.newsFeedSubscription) this.newsFeedSubscription.unsubscribe();
    if (this.deepReasoningEffortSubscription) this.deepReasoningEffortSubscription.unsubscribe(), this.deepReasoningEffortSubscription = null;
    if (this.anthropicSpeedSubscription) this.anthropicSpeedSubscription.unsubscribe(), this.anthropicSpeedSubscription = null;
    if (this.openAISpeedSubscription) this.openAISpeedSubscription.unsubscribe(), this.openAISpeedSubscription = null;
    if (this.submitOnEnterSubscription) this.submitOnEnterSubscription.unsubscribe(), this.submitOnEnterSubscription = null;
    if (this.showSkillsCountInPromptBarSubscription) this.showSkillsCountInPromptBarSubscription.unsubscribe(), this.showSkillsCountInPromptBarSubscription = null;
    if (this.stopElapsedTimeTimer(), this.mysteriousMessageSubscription) this.mysteriousMessageSubscription.unsubscribe();
    if (this.mysteryKeyInterceptorUnsubscribe?.(), this.mysterySequenceManager?.dispose(), this.threadPreviewController.removeListener(this.previewControllerListener), this.threadPreviewController.dispose(), this.toastController.dispose(), this.exitConfirmTimeout) clearTimeout(this.exitConfirmTimeout), this.exitConfirmTimeout = null;
    if (this.clearInputConfirmTimeout) clearTimeout(this.clearInputConfirmTimeout), this.clearInputConfirmTimeout = null;
    if (this.autocompleteFocusNodeListener) this.autocompleteFocusNode.removeListener(this.autocompleteFocusNodeListener), this.autocompleteFocusNodeListener = null;
    this.textController.removeListener(this.textChangeListener);
    for (let T of this.messageScrollControllers.values()) T.dispose();
    this.messageScrollControllers.clear();
  }
  getCurrentConfirmation() {
    if (this.pendingApprovals.length > 0) {
      let T = this.pendingApprovals[0];
      return {
        type: "tool-use",
        tools: [{
          useBlock: {
            type: "tool_use",
            id: T.toolUseId,
            name: T.toolName,
            complete: !0,
            input: T.args
          },
          toAllow: T.toAllow ?? []
        }],
        subthreadID: void 0,
        reason: T.reason ?? `Tool requires approval: ${T.toolName}`,
        isSubagent: T.context === "subagent",
        subagentToolName: T.subagentToolName
      };
    }
    return null;
  }
  updateProgressBar() {}
  onConfirmationResponse = async T => {
    let R = this.getCurrentConfirmation();
    if (!R || R.type !== "tool-use") {
      J.error("No current tool confirmation found");
      return;
    }
    let a = R.tools[0]?.useBlock;
    if (!a) {
      J.error("No tool use block found in confirmation");
      return;
    }
    if (T?.type === "deny-with-feedback") {
      let {
        feedback: r
      } = T;
      try {
        if (this.pendingApprovals.find(h => h.toolUseId === a.id)) await this.widget.dependencies.activeThreadHandle.resolveApproval(a.id, !1, r.trim() || void 0);else await this.widget.dependencies.activeThreadHandle.resolveApproval(a.id, !1, r.trim() || void 0);
      } catch (h) {
        J.error("Failed to send deny with feedback:", h);
      }
      return;
    }
    let e = T?.type === "simple" ? T.value : null;
    if (e === "allow-all-session") Ms("dangerouslyAllowAll", !0);
    if (e === "allow-all-persistent") try {
      await this.widget.dependencies.settingsStorage.set("dangerouslyAllowAll", !0, "global");
    } catch (r) {
      if (r && r instanceof Error) this.setState(() => {
        this.displayMessage = r;
      });else J.error("Failed to write dangerouslyAllowAll setting:", r);
      return;
    }
    if (e === "always-guarded") {
      let r = R.tools[0]?.toAllow ?? [],
        h = (await this.widget.dependencies.settingsStorage.get("guardedFiles.allowlist")) || [],
        i = [...r, ...h];
      await this.widget.dependencies.settingsStorage.set("guardedFiles.allowlist", i, "global");
    }
    if (e === "connect-github") {
      let r = new URL("/settings#code-host-connections", this.tuiContext.ampURL).toString();
      await je(this.context, r);
      return;
    }
    if (e === "disable-librarian") {
      let r = (await this.widget.dependencies.settingsStorage.get("tools.disable")) ?? [];
      if (!r.includes(uc)) await this.widget.dependencies.settingsStorage.set("tools.disable", [...r, uc], "global");
    }
    let t = e !== null && ["yes", "allow-all-session", "allow-all-persistent", "always-guarded"].includes(e);
    try {
      await this.widget.dependencies.activeThreadHandle.resolveApproval(a.id, t);
    } catch (r) {
      J.error("Failed to send tool confirmation:", r);
    }
  };
  showConfirmationOverlay = T => {
    this.setState(() => {
      this.isShowingConfirmationOverlay = !0, this.confirmationOverlayContent = T;
    });
  };
  getCurrentEphemeralError() {
    let {
        threadState: T
      } = this.widget.dependencies,
      R = T.viewState;
    if (R.state !== "active" || !R.ephemeralError) return null;
    return R.ephemeralError;
  }
  handleEphemeralErrorResponse = async T => {
    let {
      activeThreadHandle: R
    } = this.widget.dependencies;
    switch (T) {
      case "retry":
        await R.retryTurn();
        break;
      case "dismiss":
        R.dismissEphemeralError();
        break;
      case "new-thread":
        R.dismissEphemeralError(), await this.startAndSwitchToNewThread();
        break;
      case "handoff":
        R.dismissEphemeralError(), this.enterHandoffMode();
        break;
      case "add-credits":
        {
          let a = new URL("/pay", this.tuiContext.ampURL);
          await je(this.context, a), this.showStatusMessage("Payment page opened. After paying, choose Retry.");
          break;
        }
    }
    this.setState(() => {});
  };
  handleDisplayMessageDismiss = () => {
    this.setState(() => {
      this.displayMessage = null;
    });
  };
  handleMCPTrustOpenSettings = async () => {
    let {
      mcpTrustHandler: T,
      settingsStorage: R
    } = this.widget.dependencies;
    await T.deny();
    try {
      await Zb(R.getSettingsFilePath());
    } catch (a) {
      let e = a instanceof Error ? a.message : String(a);
      await this.showErrorMessage(`Failed to open settings: ${e}`);
    }
  };
  cancelStreamingMessage = async () => {
    await this.widget.dependencies.activeThreadHandle.cancelStreaming();
  };
  switchToExistingThread = async T => {
    let R = Date.now();
    try {
      J.info(`[switchToExistingThread] Switching to thread: ${T}`);
      let a = Date.now();
      await this.widget.dependencies.threadPool.switchThread(T), J.info(`[switchToExistingThread] switchToThread resolved in ${Date.now() - a}ms`);
      let e = await this.widget.dependencies.threadService.get(T),
        t = e ? null : await this.getActiveThreadHandleForThread(T),
        r = t ? await m0(t.thread$).catch(() => null) : null,
        h = e ?? r;
      if (!h || h.id !== T) throw Error("No active thread after switch");
      J.info(`[switchToExistingThread] Got thread ${T}, thread.agentMode: ${h.agentMode}`);
      let i = Date.now();
      this.onThreadSwitch(), J.info(`[switchToExistingThread] onThreadSwitch completed in ${Date.now() - i}ms`);
      let c = await this.getDraftForThread(T);
      if (c && ve(h) === 0) {
        if (this.textController.clear(), c.text) this.textController.insertText(c.text);
        if (c.images.length > 0) this.setState(() => {
          this.imageAttachments = [...c.images];
        });
      }
      J.info(`[switchToExistingThread] Completed in ${Date.now() - R}ms`);
    } catch (a) {
      J.error("Failed to switch to thread", {
        threadId: T,
        error: a
      });
      let e = a instanceof Error ? a.message : String(a);
      throw Error(`Failed to switch to thread: ${T}. ${e}`, {
        cause: a
      });
    }
  };
  async getActiveThreadHandleForThread(T) {
    return m0(this.widget.dependencies.threadPool.threadHandles$.pipe(da(R => R !== null), L9(R => R.thread$.pipe(JR(a => ({
      handle: R,
      threadID: a.id
    })))), da(({
      threadID: R
    }) => R === T), JR(({
      handle: R
    }) => R))).catch(() => null);
  }
  async getDraftForThread(T) {
    let R = await this.getActiveThreadHandleForThread(T);
    if (!R) return null;
    return R.getDraft().catch(() => null);
  }
  async uploadImageAttachment(T) {
    let R = await fi("/api/attachments", {
        method: "POST",
        body: JSON.stringify({
          data: T.data,
          mediaType: T.mediaType
        })
      }, this.widget.dependencies.configService),
      a = null;
    try {
      a = await R.json();
    } catch {
      a = null;
    }
    if (!R.ok) {
      if (kz0(a)) throw Error(a.error);
      throw Error(`Failed to upload image (HTTP ${R.status})`);
    }
    if (!Pz0(a)) throw Error("Failed to upload image: invalid response from server");
    return a.url;
  }
  async uploadImageAttachmentWithRetry(T) {
    let R = 0;
    while (!0) try {
      return await this.uploadImageAttachment(T);
    } catch (a) {
      R += 1;
      let e = sN0(R);
      if (!cN0(a) || e === null) throw a;
      J.warn(`Attachment upload attempt ${R} failed; retrying in ${e}ms`, a), await new Promise(t => setTimeout(t, e));
    }
  }
  async uploadImageAttachmentsIfNeeded(T) {
    if (this.widget.dependencies.threadPool.isDTWMode?.() !== !0 || T.length === 0) return [...T];
    if (!T.some(R => R.source.type === "base64")) return [...T];
    this.setState(() => {
      this.isUploadingImageAttachments = !0;
    });
    try {
      return await Promise.all(T.map(async R => {
        if (R.source.type === "url") return R;
        let a = await this.uploadImageAttachmentWithRetry(R.source);
        if (xz0(a)) return R;
        return {
          type: "image",
          source: {
            type: "url",
            url: a
          },
          sourcePath: R.sourcePath
        };
      }));
    } finally {
      this.setState(() => {
        this.isUploadingImageAttachments = !1;
      });
    }
  }
  sendUserMessage = async T => {
    let R = await this.proceedWithUserMessage(T);
    if (R) this.setState(() => {
      this.imageAttachments = [];
    });
    return R;
  };
  proceedWithUserMessage = async (T, R) => {
    let {
      activeThreadHandle: a
    } = this.widget.dependencies;
    if (this.cancelBashInvocations(), this.shouldRequireAuthForPromptSubmit()) return this.queuePromptUntilAuthenticated(T, R ?? [...this.imageAttachments], {
      clearInput: R === void 0
    }), !1;
    this.handoffController?.clearPendingPrompt();
    let e = a.isThreadEmpty(),
      t = this.getEffectiveAgentMode(),
      r = a.getAgentMode();
    if (r && !e && t !== r) return await this.showErrorMessage(`This thread uses ${r} mode. To change mode, edit the first message or create a new thread.`), !1;
    let h = R ?? this.imageAttachments,
      i = [{
        type: "text",
        text: T
      }];
    if (h.length > 0) i.push(...h);
    let c = this.widget.dependencies.threadPool.isDTWMode?.() === !0 && h.length > 0;
    if (await a.sendMessage({
      content: i,
      prepareContentForSend: c ? async s => {
        let A = s.filter(n => n.type === "image");
        if (A.length === 0) return s;
        let l = await this.uploadImageAttachmentsIfNeeded(A),
          o = 0;
        return s.map(n => {
          if (n.type !== "image") return n;
          let p = l[o];
          return o += 1, p ?? n;
        });
      } : void 0,
      agentMode: t
    }), this.widget.dependencies.history.add(T, process.cwd()), e) await this.persistAgentMode(t);
    return this.scrollMessageViewToBottom(), k8.instance.addPostFrameCallback(() => {
      if (!this.isMessageViewInSelectionMode && !this.isShowingPalette && !this.isShowingIdePicker) this.autocompleteFocusNode.requestFocus();
    }), !0;
  };
  async showErrorMessage(T) {
    this.setState(() => {
      this.displayMessage = Error(T);
    });
  }
  exitApplication = async () => {
    this.setState(() => {
      this.isExiting = !0;
    });
    let T = this.widget.dependencies.activeThreadHandle,
      R = T.getThreadID();
    if (R && T.getEmptyHandoffParentThreadID()) await this.widget.dependencies.threadPool.deleteThread?.(R).catch(() => {});
    d9.instance.stop();
  };
  async persistAgentMode(T) {
    let R = await iB(a => ({
      ...a,
      agentMode: T
    }));
    this.sessionState = R;
  }
  onExitPressed = () => {
    if (this.isConfirmingExit) {
      if (this.exitConfirmTimeout) clearTimeout(this.exitConfirmTimeout), this.exitConfirmTimeout = null;
      this.exitApplication();
    } else {
      if (this.setState(() => {
        this.isConfirmingExit = !0;
      }), this.exitConfirmTimeout) clearTimeout(this.exitConfirmTimeout);
      this.exitConfirmTimeout = setTimeout(() => {
        this.setState(() => {
          this.isConfirmingExit = !1;
        }), this.exitConfirmTimeout = null;
      }, 1000);
    }
  };
  toHomeRelative(T) {
    let R = I70();
    if (T === R) return "~";
    if (T.startsWith(R + Eo.sep)) return "~" + T.slice(R.length);
    return T;
  }
  shorten(T) {
    let R = T.split(Eo.sep).filter(Boolean);
    if (R.length <= 5) return T;
    return [R.slice(0, 2).join(Eo.sep), "\u2026", R.slice(-2).join(Eo.sep)].join(Eo.sep);
  }
  buildDisplayText(T, R, a, e) {
    let t = R ? ` (${R})` : "",
      r = T + t;
    if (q8(r, e) <= a) return r;
    let h = T.split(Eo.sep);
    if (h.length > 2) {
      let i = [h[0], "\u2026", h[h.length - 1]].join(Eo.sep) + t;
      if (q8(i, e) <= a) return i;
    }
    return Mw(r, a, e);
  }
  buildBorderTransparentTextWidget(T, R, a) {
    let e = [],
      t = "",
      r = 0,
      h = () => {
        if (!t) return;
        e.push(new xT({
          text: new G(t, R)
        })), t = "";
      },
      i = () => {
        if (r <= 0) return;
        e.push(new XT({
          width: r
        })), r = 0;
      };
    for (let c of B9(T)) {
      if (c.trim() === "") {
        h(), r += J8(c, a);
        continue;
      }
      i(), t += c;
    }
    if (h(), i(), e.length === 0) return new XT({
      width: q8(T, a)
    });
    if (e.length === 1) return e[0] ?? new XT({
      width: 0
    });
    return new T0({
      mainAxisSize: "min",
      children: e
    });
  }
  build(T) {
    this.lastRootContext = T;
    let R = this.widget.dependencies.pluginPlatform;
    if (R && !R.showToast) {
      let NT = this.toastController;
      R.showToast = KT => NT.show(KT, "success");
    }
    if (R && !R.showOpenedURLToast) {
      let NT = this.toastController;
      R.showOpenedURLToast = KT => NT.show(`Opened URL: ${KT}`, "success", 8000);
    }
    if (R && !R.appendToThreadHandler) {
      let NT = this.widget.dependencies;
      R.appendToThreadHandler = async KT => {
        for (let $T of KT) await NT.activeThreadHandle.queueMessage([{
          type: "text",
          text: $T.content
        }]);
      };
    }
    if (R && !R.showInputDialog) R.showInputDialog = NT => {
      return new Promise(KT => {
        this.setState(() => {
          this.isShowingPalette = !1, this.paletteShowOptions = null, this.pendingInputDialog = {
            options: NT,
            resolve: KT
          };
        });
      });
    };
    if (R && !R.showConfirmDialog) R.showConfirmDialog = NT => {
      return new Promise(KT => {
        this.setState(() => {
          this.isShowingPalette = !1, this.paletteShowOptions = null, this.pendingConfirmDialog = {
            options: NT,
            resolve: KT
          };
        });
      });
    };
    let a = I9.of(T),
      e = $R.of(T),
      t = e.base;
    this.themeColors = t;
    let {
      colors: r,
      app: h
    } = e;
    this.themeApp = h;
    let i = this.widget.dependencies.activeThreadHandle,
      c = !1,
      {
        threadState: s
      } = this.widget.dependencies;
    this.updateTerminalTitle(), this.updateProgressBar();
    let A = this.getCurrentConfirmation(),
      l = s.items,
      o = this.widget.dependencies.toolProgressByToolUseID,
      n = Iz0(s.subagentContentByParentID, o),
      p = s.todosList,
      _ = i.getAgentMode(),
      m = !i.isThreadEmpty(),
      b = i.isStreaming(),
      y = i.getThreadID(),
      u = this.isTranscriptEmpty(),
      P = u && this.isStartupThreadLoading(),
      k = this.threadInitializationMessage?.startsWith("Importing thread") ?? !1,
      x = this.widget.dependencies.threadPool.isDTWMode?.() === !0,
      f = NT => new AhT({
        key: new k3(`preview-message-view-${NT.id}`),
        items: grT(NT).items,
        toolProgressByToolUseID: new Map(),
        controller: this.threadPreviewController.scrollController,
        autofocus: !1,
        denseView: qo(NT.agentMode),
        hasStartedStreamingResponse: gz0(NT),
        focusNode: new l8({
          debugLabel: "PreviewFocus"
        }),
        onShowImagePreview: () => {},
        stateController: this.previewMessageViewController,
        submitOnEnter: this.submitOnEnter,
        isDTWMode: x
      }),
      v = this.previewThread,
      g = v ? v.messages.length > 2000 ? new xR({
        mainAxisSize: "max",
        children: [new j0({
          child: new XT()
        }), new uR({
          padding: TR.all(2),
          child: new N0({
            child: new xT({
              text: new G("Thread too long for preview", new cT({
                color: r.mutedForeground,
                dim: !0
              }))
            })
          })
        })]
      }) : f(v) : u ? new brT({
        agentMode: this.getEffectiveAgentMode(),
        mysteriousMessage: this.mysteriousMessage,
        mysterySequenceProgress: this.mysterySequenceProgress,
        onShowMysteryModal: this.handleShowMysteryModal,
        onOrbExplode: this.handleSplashOrbExplode
      }) : new G8R({
        threadID: y,
        items: l,
        subagentContentByParentID: n,
        toolProgressByToolUseID: o,
        controller: y ? this.getMessageScrollController(y) : new Q3(),
        autofocus: !1,
        onCopy: this.handleMainMessageViewCopy,
        denseView: qo(_),
        hasStartedStreamingResponse: b,
        onMessageEditSubmit: this.handleMessageEditSubmit,
        ...(x ? {} : {
          onMessageRestoreSubmit: this.handleMessageRestoreSubmit
        }),
        onShowForkDeprecation: this.showForkDeprecationMessage,
        getAffectedFiles: this.getAffectedFiles,
        focusNode: this.messageViewFocusNode,
        onDismissFocus: this.handleMainMessageViewDismissFocus,
        isInSelectionMode: this.isMessageViewInSelectionMode,
        isInHandoffMode: this.handoffState.isInHandoffMode,
        completionBuilder: this.getCompletionBuilder(),
        onShowImagePreview: this.handleShowEditingImagePreview,
        onSelectionChanged: this._handleSelectionChanged,
        onDoubleAtTrigger: this.handleDoubleAtTrigger,
        stateController: this.messageViewController,
        submitOnEnter: this.submitOnEnter,
        threadViewState: s.viewState,
        isDTWMode: x
      }),
      I = Math.max(Math.floor(a.size.height * 0.4), 12),
      S = this.getCurrentEphemeralError(),
      O = a.size.width < 40,
      j = R$T(s),
      d = this.widget.dependencies.threadPool.getCompactionStatus?.(),
      C = BJT(T),
      L = this.buildBottomWidget(S, A, r, e, s, p, I, c, j, a, C),
      w = new nRR({
        threadViewState: s.viewState,
        threadTokenUsage: j,
        compactionState: d?.compactionState ?? "idle",
        threadID: y ?? null,
        hasUserMessages: m,
        threadAgentMode: _,
        hasStartedStreamingResponse: b,
        onFileChangesClick: () => {
          this.setState(() => {
            this.isShowingFileChangesOverlay = !this.isShowingFileChangesOverlay;
          });
        },
        onShowIdePicker: this.openIdePicker,
        ideStatus: this.ideStatus,
        mcpServers: this.mcpServers,
        plugins: this.pluginInfos,
        isNarrow: O,
        uiHint: this.getUIHint() ?? void 0,
        submittingPromptMessage: this.isSubmittingPromptMessage,
        waitingForConfirmation: !!A,
        showingEphemeralError: Boolean(s.viewState.state === "active" && s.viewState.ephemeralError),
        runningBashInvocations: this.bashInvocations.length > 0,
        executingCommand: this.executingCommand?.name ?? null,
        executingCommandNoun: this.executingCommand?.noun ?? null,
        executingCommandVerb: this.executingCommand?.verb ?? null,
        executingCommandMessage: this.executingCommand?.statusMessage ?? null
      }),
      D = new QTR({
        bashInvocations: this.bashInvocations
      }),
      B = [],
      M = Am0(this.tuiContext.buildTimestamp);
    if (M) {
      let NT = g3T(M.ageMs, {
        verbose: !0
      });
      B.push(new SR({
        decoration: new p8(r.destructive),
        child: new uR({
          padding: TR.horizontal(1),
          child: new xT({
            text: new G("", new cT({
              color: r.foreground,
              bold: !0
            }), [new G(`Your Amp version is ${NT} old \u2014 run `), new G("amp update", new cT({
              color: r.warning
            })), new G(" or see ampcode.com/manual")]),
            textAlign: "center"
          })
        })
      }));
    }
    B.push(new j0({
      child: g
    }), D);
    let V = new SR({
        constraints: new o0(0, a.size.width, 0, I),
        child: L
      }),
      Q = this.getParentThreadInfo();
    if (Q) {
      let NT = Q.type === "handoff" ? h.handoffMode : r.primary,
        KT = 40,
        $T = B9(Q.title),
        OT = $T.length > 40 ? $T.slice(0, 39).join("") + "\u2026" : Q.title;
      B.push(new E8R({
        type: Q.type,
        title: OT,
        threadID: Q.threadID,
        labelColor: NT,
        mutedColor: r.mutedForeground,
        foregroundColor: r.foreground,
        onNavigate: _T => this.switchToExistingThread(_T)
      }));
    }
    B.push(V, new XT({
      height: 1,
      child: new uR({
        padding: TR.horizontal(1),
        child: w
      })
    }));
    let W = new xR({
        crossAxisAlignment: "stretch",
        mainAxisSize: "max",
        children: B
      }),
      eT = new SR({
        constraints: o0.tight(a.size.width, a.size.height),
        decoration: new p8(r.background),
        child: W
      }),
      iT = new x9(() => {
        if (this.isShowingPalette) return this.dismissPalette(), "handled";
        if (this.isShowingMCPStatusModal) return this.setState(() => {
          this.isShowingMCPStatusModal = !1;
        }), "handled";
        if (this.pendingAuthLogin) return this.cancelAuthLoginSession(), "handled";
        let NT = this.getActiveOAuthRequest();
        if (NT) return this.rejectOAuthRequest(NT, Error("OAuth authorization cancelled")), "handled";
        if (this.isShowingPromptHistoryPicker) return this.setState(() => {
          this.isShowingPromptHistoryPicker = !1;
        }), "handled";
        if (this.pendingMCPServers.length > 0) return this.widget.dependencies.mcpTrustHandler.deny(), "handled";
        if (this.getCurrentEphemeralError()) return this.handleEphemeralErrorResponse("dismiss"), "handled";
        if (this.displayMessage) return this.handleDisplayMessageDismiss(), "handled";
        if (this.isShowingHelp) return this.setState(() => {
          this.isShowingHelp = !1;
        }), "handled";
        if (this.isShowingContextAnalyzeModal) return this.setState(() => {
          this.isShowingContextAnalyzeModal = !1, this.contextAnalyzeDeps = null, this.contextAnalyzeFromDTW = null;
        }), "handled";
        if (this.isShowingSkillListModal) return this.setState(() => {
          this.isShowingSkillListModal = !1;
        }), "handled";
        if (this.isShowingFileChangesOverlay) return this.setState(() => {
          this.isShowingFileChangesOverlay = !1;
        }), "handled";
        if (this.isShowingContextDetailOverlay) return this.setState(() => {
          this.isShowingContextDetailOverlay = !1;
        }), "handled";
        if (this.isShowingIdePicker) return this.dismissIdePicker(), "handled";
        if (this.isShowingJetBrainsInstaller) return this.dismissJetBrainsInstaller(), "handled";
        if (this.isShowingConfirmationOverlay) return this.setState(() => {
          this.isShowingConfirmationOverlay = !1, this.confirmationOverlayContent = "";
        }), "handled";
        if (this.isShowingConsoleOverlay) return this.setState(() => {
          this.isShowingConsoleOverlay = !1;
        }), "handled";
        if (this.handoffState.countdownSeconds !== null) return this.handoffController?.stopCountdown(), "handled";
        if (this.handoffState.isInHandoffMode) {
          if (this.handoffState.isGeneratingHandoff) this.handoffController?.cancelGeneration();else this.exitHandoffMode();
          return "handled";
        }
        if (this.isInQueueMode) return this.exitQueueMode(), "handled";
        if (this.textController.hasSelection) return this.textController.clearSelection(), "handled";
        if (this.isConfirmingClearInput) {
          if (this.textController.clear(), this.textController.resetScrollOffset(), this.widget.dependencies.activeThreadHandle.clearPendingSkills(), this.setState(() => {
            this.isConfirmingClearInput = !1, this.imageAttachments = [];
          }), this.clearInputConfirmTimeout) clearTimeout(this.clearInputConfirmTimeout), this.clearInputConfirmTimeout = null;
          return "handled";
        }
        if (this.handoffState.isConfirmingAbortHandoff && this.handoffController) {
          let KT = this.handoffController.getPendingPrompt(),
            $T = this.imageAttachments;
          return this.textController.clear(), this.textController.resetScrollOffset(), this.widget.dependencies.activeThreadHandle.clearPendingSkills(), this.setState(() => {
            this.imageAttachments = [];
          }), this.handoffController.confirmAbort().then(OT => {
            if (OT && KT) this.textController.text = KT, this.handoffController?.clearPendingPrompt();
            if (OT && $T.length > 0) this.setState(() => {
              this.imageAttachments = $T;
            });
          }), "handled";
        }
        if (this.isConfirmingCancelProcessing) {
          if (this.bashInvocations.length > 0) this.cancelBashInvocations();
          if (this.cancelStreamingMessage().catch(KT => {
            J.error("Failed to cancel streaming message:", KT);
          }), this.setState(() => {
            this.isConfirmingCancelProcessing = !1;
          }), this.cancelProcessingConfirmTimeout) clearTimeout(this.cancelProcessingConfirmTimeout), this.cancelProcessingConfirmTimeout = null;
          return "handled";
        }
        if (this.executingCommand) return J.info("Canceling executing command:", this.executingCommand.name), this.executingCommand.abortController.abort(), "handled";
        if (this.bashInvocations.length > 0 || this.isProcessing()) {
          if (this.setState(() => {
            this.isConfirmingCancelProcessing = !0;
          }), this.cancelProcessingConfirmTimeout) clearTimeout(this.cancelProcessingConfirmTimeout);
          return this.cancelProcessingConfirmTimeout = setTimeout(() => {
            this.setState(() => {
              this.isConfirmingCancelProcessing = !1;
            }), this.cancelProcessingConfirmTimeout = null;
          }, 1000), "handled";
        }
        if (this.handoffController && this.widget.dependencies.activeThreadHandle.getEmptyHandoffParentThreadID()) return this.handoffController.startAbortConfirmation(), "handled";
        if (this.textController.text.trim() !== "" || this.imageAttachments.length > 0) {
          if (this.setState(() => {
            this.isConfirmingClearInput = !0;
          }), this.clearInputConfirmTimeout) clearTimeout(this.clearInputConfirmTimeout);
          return this.clearInputConfirmTimeout = setTimeout(() => {
            this.setState(() => {
              this.isConfirmingClearInput = !1;
            }), this.clearInputConfirmTimeout = null;
          }, 1000), "handled";
        }
        return "ignored";
      }),
      aT = new x9(() => {
        return this.onExitPressed(), "handled";
      }),
      oT = new x9(() => {
        return this.setState(() => {
          this.isShowingConsoleOverlay = !this.isShowingConsoleOverlay;
        }), "handled";
      }),
      TT = new x9(() => {
        return this.setState(() => {
          this.isShowingMCPStatusModal = !this.isShowingMCPStatusModal;
        }), "handled";
      }),
      tT = new x9(() => {
        if (Ut.instance.toggleAll(), qo(i.getAgentMode())) _i.instance.toggleAll();
        return "handled";
      }),
      lT = new x9(() => {
        if (!this.isTextfieldAndAutocompleteFocused) return "ignored";
        return this.setState(() => {
          this.isShowingPromptHistoryPicker = !0;
        }), "handled";
      }),
      N = new x9(() => {
        return d9.instance.toggleFrameStatsOverlay(), "handled";
      }),
      q = new x9(() => {
        return d9.instance.tuiInstance.getScreen().markForRefresh(), k8.instance.requestFrame(), "handled";
      }),
      F = new x9(() => {
        return this.toggleAgentMode(), "handled";
      }),
      E = new x9(() => {
        return this.toggleDeepReasoningEffort(), "handled";
      }),
      U = new x9(() => {
        let NT = this.isShowingPalette && this.previewThread ? this.threadPreviewController.scrollController : (() => {
          let KT = i.getThreadID();
          return KT ? this.getMessageScrollController(KT) : null;
        })();
        if (NT) {
          let KT = Math.max(Math.floor(a.size.height * 0.4), 10),
            $T = a.size.height - KT;
          NT.animatePageUp($T, 100);
        }
        return "handled";
      }),
      Z = new x9(() => {
        let NT = this.isShowingPalette && this.previewThread ? this.threadPreviewController.scrollController : (() => {
          let KT = i.getThreadID();
          return KT ? this.getMessageScrollController(KT) : null;
        })();
        if (NT) {
          let KT = Math.max(Math.floor(a.size.height * 0.4), 10),
            $T = a.size.height - KT;
          NT.animatePageDown($T, 100);
        }
        return "handled";
      }),
      X = new x9(() => {
        let NT = this.isShowingPalette && this.previewThread ? this.threadPreviewController.scrollController : (() => {
          let KT = i.getThreadID();
          return KT ? this.getMessageScrollController(KT) : null;
        })();
        if (NT) {
          let KT = Math.max(Math.floor(a.size.height * 0.4), 10),
            $T = a.size.height - KT;
          NT.animatePageUp(Math.floor($T / 2), 100);
        }
        return "handled";
      }),
      rT = new x9(() => {
        let NT = this.isShowingPalette && this.previewThread ? this.threadPreviewController.scrollController : (() => {
          let KT = i.getThreadID();
          return KT ? this.getMessageScrollController(KT) : null;
        })();
        if (NT) {
          let KT = Math.max(Math.floor(a.size.height * 0.4), 10),
            $T = a.size.height - KT;
          NT.animatePageDown(Math.floor($T / 2), 100);
        }
        return "handled";
      }),
      hT = new x9(() => {
        let NT = this.isShowingPalette && this.previewThread ? this.threadPreviewController.scrollController : (() => {
          let KT = i.getThreadID();
          return KT ? this.getMessageScrollController(KT) : null;
        })();
        if (NT) NT.animateTo(0, 100);
        return "handled";
      }),
      pT = new x9(() => {
        let NT = this.isShowingPalette && this.previewThread ? this.threadPreviewController.scrollController : (() => {
          let KT = i.getThreadID();
          return KT ? this.getMessageScrollController(KT) : null;
        })();
        if (NT) NT.animateTo(Number.MAX_SAFE_INTEGER, 100);
        return "handled";
      }),
      mT = new x9(() => {
        if (!this.isTextfieldAndAutocompleteFocused) return "ignored";
        if (this.handoffState.isInHandoffMode) return "ignored";
        if (this.isInQueueMode) return "ignored";
        if (!i.getMessages().some(NT => NT.role === "user" || ok(NT))) return "ignored";
        return this.setState(() => {
          this.isMessageViewInSelectionMode = !0;
        }), "handled";
      }),
      yT = new x9(NT => {
        if (NT.direction === "previous") this.navigateHistoryPrevious();else this.navigateHistoryNext();
        return "handled";
      }),
      uT = new x9(() => {
        if (!this.isTextfieldAndAutocompleteFocused) return "ignored";
        return VTR().then(async NT => {
          if (NT) await this.handleInsertImage(NT);
        }), "handled";
      }),
      bT = new Map([[x0.ctrl("c"), new fY()], [x0.ctrl("l"), new $Y()], [x0.ctrl("o"), new CQ()], [x0.ctrl("v"), new kY()], [x0.alt("s"), new LM()], [x0.ctrl("s"), new LM()], [x0.alt("p"), new gY()], [x0.ctrl("r"), new SY()], [x0.alt("t"), new IY()], [x0.alt("w"), new MM()], [x0.ctrl("t"), new MM()], [x0.key("PageUp"), new vQ()], [x0.key("PageDown"), new jQ()], [x0.alt("k"), new SQ()], [x0.alt("j"), new OQ()], [x0.key("Home"), new dQ()], [x0.key("End"), new EQ()], [x0.key("Escape"), new xY()], [x0.ctrl("p"), new DM("previous")], [x0.ctrl("n"), new DM("next")], [x0.key("Tab"), new YM()]]);
    if (bT.set(x0.alt("d"), new vY()), !ji()) bT.set(x0.key("ArrowUp"), new YM());
    let jT = new x9(() => {
        if (this.isShowingStandalonePalette()) return "handled";
        return this.showCommandPalette(), "handled";
      }),
      fT = new x9(() => {
        return this.toggleThreadPickerWorkspaceFilter(), "handled";
      }),
      MT = new x9(() => {
        if (this.mysteriousMessage) this.handleShowMysteryModal();
        return "handled";
      }),
      UT = new Map([[xY, iT], [$Y, q], [LM, F], [vY, E], [CQ, jT], [kY, uT], [WXT, oT], [qXT, TT], [IY, tT], [gY, N], [MM, fT], [SY, lT], [fY, aT], [vQ, U], [jQ, Z], [SQ, X], [OQ, rT], [dQ, hT], [EQ, pT], [YM, mT], [DM, yT], [jY, MT]]),
      QT = [eT];
    if (this.splashOrbExplosion) {
      let NT = f$(this.getEffectiveAgentMode());
      QT.push(new j8R({
        key: new k3(`splash-orb-explosion-${this.splashOrbExplosion.seq}`),
        originX: this.splashOrbExplosion.originX,
        originY: this.splashOrbExplosion.originY,
        sparkleColors: [NT, r.warning],
        onComplete: this.handleSplashOrbExplosionComplete
      }));
    }
    if (P || k) QT.push(new N0({
      child: new Ko({
        message: this.threadInitializationMessage ?? "Loading thread..."
      })
    }));
    if (this.isShowingConsoleOverlay) QT.push(new m0R());
    let hR = this.getCommandPaletteContext(T);
    if (this.isShowingHelp && this.paletteConfig) {
      let NT = this.getPaletteCommands().getAllCommands(hR ?? void 0),
        KT = hR === null ? NT : NT.filter($T => {
          return ($T.isShown?.(hR) ?? !0) === !0;
        });
      QT.push(new d0R({
        commands: KT,
        submitOnEnter: this.submitOnEnter
      }));
    }
    if (this.isShowingContextAnalyzeModal) {
      let {
          configService: NT
        } = this.widget.dependencies,
        KT = this.widget.dependencies.threadState.mainThread,
        $T = this.contextAnalyzeDeps,
        OT = this.contextAnalyzeFromDTW;
      if (KT && ($T || OT)) {
        let _T = $T ? {
          configService: NT,
          agentModeOverride: this.getEffectiveAgentMode(),
          buildSystemPromptDeps: $T
        } : null;
        QT.push(new k0R({
          deps: _T,
          thread: KT,
          dtwAnalyze: OT ?? void 0,
          onDismiss: () => {
            this.setState(() => {
              this.isShowingContextAnalyzeModal = !1, this.contextAnalyzeDeps = null, this.contextAnalyzeFromDTW = null;
            });
          }
        }));
      } else this.setState(() => {
        this.isShowingContextAnalyzeModal = !1, this.contextAnalyzeDeps = null, this.contextAnalyzeFromDTW = null;
      });
    }
    if (this.isShowingSkillListModal && !this.isShowingPalette) Promise.all([this.widget.dependencies.skillService.getSkills(), this.widget.dependencies.skillService.getSkillErrors(), this.widget.dependencies.skillService.getSkillWarnings()]).then(([NT, KT, $T]) => {
      if (this.isShowingSkillListModal && this.mounted) this.skillListData = {
        skills: NT,
        errors: KT,
        warnings: $T
      }, this.setState();
    }), QT.push(new H8R({
      skills: this.skillListData?.skills ?? [],
      errors: this.skillListData?.errors ?? [],
      warnings: this.skillListData?.warnings ?? [],
      cwd: process.cwd(),
      onDismiss: () => {
        this.setState(() => {
          this.isShowingSkillListModal = !1, this.skillListData = null;
        });
      },
      onAddSkill: () => {
        this.showCommandPalette({
          type: "standalone",
          commandId: "skill-add",
          onSubmit: () => {
            this.setState(() => {
              this.isShowingPalette = !1, this.paletteShowOptions = null, this.isShowingSkillListModal = !1, this.skillListData = null;
            });
          },
          onCancel: () => {
            this.setState(() => {
              this.isShowingPalette = !1, this.paletteShowOptions = null;
            });
          }
        });
      },
      onDocs: () => {
        Wb("https://ampcode.com/manual#agent-skills");
      },
      onInsertPrompt: NT => {
        this.setState(() => {
          this.isShowingSkillListModal = !1, this.skillListData = null, this.textController.text = NT;
        });
      },
      onInvokeSkill: NT => {
        this.widget.dependencies.activeThreadHandle.addPendingSkill({
          name: NT
        });
      }
    }));
    if (this.isShowingMCPStatusModal) QT.push(new J0R({
      servers: this.mcpServers,
      onDismiss: () => {
        this.setState(() => {
          this.isShowingMCPStatusModal = !1;
        });
      }
    }));
    if (this.isShowingPromptHistoryPicker) QT.push(new L8R({
      entries: this.widget.dependencies.history.getAll(),
      currentCwd: process.cwd(),
      onAccept: NT => {
        this.setState(() => {
          this.isShowingPromptHistoryPicker = !1, this.textController.text = NT, this.textController.cursorPosition = NT.length;
        });
      },
      onDismiss: () => {
        this.setState(() => {
          this.isShowingPromptHistoryPicker = !1;
        });
      }
    }));
    if (this.isShowingMysteriousMessageModal && this.mysteriousMessage) QT.push(new I8R({
      message: this.mysteriousMessage,
      onDestruct: this.handleDestructMysteriousMessage
    }));
    if (this.isShowingForkDeprecationModal) QT.push(new S0R({
      onDismiss: this.dismissForkDeprecationModal
    }));
    if (this.pendingMCPServers.length > 0) {
      let {
        mcpTrustHandler: NT
      } = this.widget.dependencies;
      QT.push(new a9R({
        servers: this.pendingMCPServers,
        onAlwaysTrust: NT.trustAlways.bind(NT),
        onTrustOnce: NT.trustOnce.bind(NT),
        onOpenSettings: this.handleMCPTrustOpenSettings,
        onDismiss: NT.deny.bind(NT)
      }));
    }
    if (this.pendingAuthLogin) QT.push(new lRR({
      manualURL: this.pendingAuthLogin.manualURL,
      isAuthenticating: this.pendingAuthLogin.isAuthenticating || this.pendingAuthLogin.isOpeningBrowser,
      errorMessage: this.pendingAuthLogin.errorMessage
    }));
    let cR = this.getActiveOAuthRequest();
    if (cR) QT.push(new $8R({
      request: cR,
      requestIndex: this.pendingOAuthRequestQueue.activeIndex,
      totalRequests: this.pendingOAuthRequestQueue.count,
      onPreviousRequest: this.selectPreviousOAuthRequest,
      onNextRequest: this.selectNextOAuthRequest,
      onSubmit: NT => {
        this.resolveOAuthRequest(cR, NT);
      }
    }));
    if (this.pendingInputDialog) {
      let NT = this.pendingInputDialog;
      QT.push(new N0R({
        options: NT.options,
        onSubmit: KT => {
          this.setState(() => {
            this.pendingInputDialog = null;
          }), NT.resolve(KT);
        },
        onCancel: () => {
          this.setState(() => {
            this.pendingInputDialog = null;
          }), NT.resolve(void 0);
        }
      }));
    }
    if (this.pendingConfirmDialog) {
      let NT = this.pendingConfirmDialog;
      QT.push(new o0R({
        options: NT.options,
        onConfirm: () => {
          this.setState(() => {
            this.pendingConfirmDialog = null;
          }), NT.resolve(!0);
        },
        onCancel: () => {
          this.setState(() => {
            this.pendingConfirmDialog = null;
          }), NT.resolve(!1);
        }
      }));
    }
    if (this.isShowingFileChangesOverlay) QT.push(new RRR({
      threadData: s
    }));
    if (this.isShowingContextDetailOverlay) {
      let NT = this.threadCostInfo?.costBreakdownURL;
      QT.push(new f0R({
        tokenUsage: j ?? void 0,
        costInfo: this.threadCostInfo,
        onDismiss: () => {
          this.setState(() => {
            this.isShowingContextDetailOverlay = !1;
          });
        },
        onOpenCostBreakdown: NT ? () => {
          je(T, NT);
        } : void 0
      }));
    }
    if (this.isShowingConfirmationOverlay) QT.push(new l0R({
      details: this.confirmationOverlayContent
    }));
    if (this.imagePreview !== null) QT.push(new N0({
      child: new w0R({
        image: this.imagePreview.image,
        imageIndex: this.imagePreview.index,
        onDismiss: this.handleImagePreviewDismiss,
        onRemove: this.handleImagePreviewRemove
      })
    }));
    if (this.fileImagePreviewPath !== null) QT.push(new N0({
      child: new qM({
        filePath: this.fileImagePreviewPath,
        onDismiss: this.handleFileImagePreviewDismiss
      })
    }));
    if (this.painterImagePreview !== null) QT.push(new N0({
      child: new qM({
        filePath: this.painterImagePreview.filePath,
        onDismiss: this.handlePainterImagePreviewDismiss
      })
    }));
    if (this.painterSaveDialog !== null) QT.push(new N0({
      child: new qM({
        filePath: this.painterSaveDialog.filePath,
        imageBlock: this.painterSaveDialog.image,
        onDismiss: this.handlePainterSaveDialogDismiss
      })
    }));
    if (this.skillPreview !== null) {
      let NT = this.pendingSkills[this.skillPreview.skillIndex];
      if (NT) QT.push(new N0({
        child: new q8R({
          pendingSkill: NT,
          skill: this.cachedSkillForPreview,
          onDismiss: this.handleSkillPreviewDismiss,
          onRemove: this.skillPreview.onRemove
        })
      }));
    }
    if (hR && this.isShowingPalette && this.paletteConfig) QT.push(new N0({
      child: new c0R({
        commandContext: hR,
        mainThread: s.mainThread,
        commands: this.getPaletteCommands(),
        onDismiss: this.dismissPalette,
        showOptions: this.paletteShowOptions ?? void 0
      })
    }));
    if (this.isShowingIdePicker) QT.push(new M0R({
      onCancel: this.dismissIdePicker,
      onSelect: this.handleIdeSelection
    }));
    let kT = new Ta({
      children: QT
    });
    if (this.isShowingJetBrainsInstaller) return new xS({
      child: new Nt({
        actions: UT,
        child: new kc({
          shortcuts: bT,
          debugLabel: "jetbrains-installer-shortcuts",
          child: new K0R({
            configService: this.widget.dependencies.configService,
            ideClient: this.widget.dependencies.ideClient,
            onExit: () => process.exit(0),
            onContinue: this.dismissJetBrainsInstaller
          })
        })
      })
    });
    let GT = !this.isShowingPalette && !this.isShowingIdePicker;
    return new IW({
      switchToThread: NT => this.switchToExistingThread(NT),
      child: new vb({
        threadViewStates: this.getThreadViewStatesSnapshot(),
        threadTitles: this.threadTitles,
        threadSummaries: this.threadsForPicker,
        child: new VH({
          onShowImagePreview: this.handleShowFileImagePreview,
          child: new bW({
            onShowImagePreview: this.handleShowPainterImagePreview,
            onShowSaveDialog: this.handleShowPainterSaveDialog,
            child: new cb({
              controller: this.toastController,
              child: new xS({
                child: new QP({
                  enabled: GT,
                  child: new NQT({
                    controller: this.toastController,
                    child: new Nt({
                      actions: UT,
                      child: new kc({
                        shortcuts: bT,
                        debugLabel: "main-app-shortcuts",
                        child: kT
                      })
                    })
                  })
                })
              })
            })
          })
        })
      })
    });
  }
  buildScrollableTodoList(T, R, a) {
    return new J8R({
      todos: T,
      enabled: R,
      controller: this.todoScrollController,
      appTheme: a
    });
  }
  buildBottomWidget(T, R, a, e, t, r, h, i, c, s, A) {
    let l = this.widget.dependencies.activeThreadHandle;
    if (T) return new v0R({
      error: T,
      options: {
        freeTierEnabled: this.freeTierStatus.canUseAmpFree,
        userEmail: X9(this.authStatus) ? this.authStatus.user.email : void 0
      },
      onCopy: this.handleEphemeralErrorCopy,
      onResponse: this.handleEphemeralErrorResponse
    });
    if (R) {
      if (this.displayMessage) this.handleDisplayMessageDismiss();
      return new A0R({
        confirmationRequest: R,
        onResponse: this.onConfirmationResponse,
        onShowOverlay: this.showConfirmationOverlay
      });
    }
    if (this.displayMessage) return new t9R({
      message: this.displayMessage,
      onDismiss: this.handleDisplayMessageDismiss
    });
    let o = this.handoffState.isInHandoffMode || !this.widget.dependencies.activeThreadHandle.invokeBashTool ? [] : YTR(e),
      n = this.agentModeController.isInRestrictedFreeMode(),
      p = this.isTextfieldAndAutocompleteFocused && !n && !this.isShowingStandalonePalette() && !this.handoffState.isGeneratingHandoff;
    if (p && !this.hasReplayedEarlyInput) {
      this.hasReplayedEarlyInput = !0;
      let X = d9.instance.tuiInstance.getEarlyInputText();
      if (X) this.textController.insertText(X);
    }
    let _ = this.submitOnEnter ? {
        character: "Enter"
      } : {
        character: "Enter",
        modifiers: {
          meta: !0
        }
      },
      m = new Td({
        key: this.textFieldKey,
        controller: this.textController,
        triggers: [new ef()],
        completionBuilder: this.getCompletionBuilder(),
        onSubmitted: X => {
          this.onTextSubmitted(X).catch(rT => {
            this.handleSubmitFlowError(rT);
          });
        },
        submitKey: _,
        theme: a,
        placeholder: n ? "Amp Free is not enabled. Press Ctrl+S to switch modes." : void 0,
        enabled: p,
        shellPromptRules: o,
        focusNode: this.autocompleteFocusNode,
        autofocus: !this.isMessageViewInSelectionMode && !this.isShowingStandalonePalette() && !this.isShowingIdePicker && !this.isShowingSkillListModal,
        clipboard: d9.instance.tuiInstance.clipboard,
        onCopy: this._handleTextCopy.bind(this),
        onInsertImage: this.handleInsertImage,
        imageAttachments: this.imageAttachments,
        popImage: this.handlePopImage,
        onImageClick: this.isUploadingImageAttachments || this.isSubmittingPromptMessage ? void 0 : this.handleImageClick,
        showImageUploadSpinner: this.isUploadingImageAttachments,
        previousThreadId: this.previousThreadIdForHint && l.getMessages().length === 0 ? this.previousThreadIdForHint : void 0,
        onPreviousThreadHintAccepted: () => {
          let X = this.previousThreadIdForHint;
          if (X) this.setState(() => {
            this.previousThreadIdForHint = null;
          }), this.textController.text = `following: @${X} `;
        },
        onDoubleAtTrigger: X => {
          this.handleDoubleAtTrigger(X);
        },
        pendingSkills: this.pendingSkills,
        onClearPendingSkill: X => {
          this.widget.dependencies.activeThreadHandle.removePendingSkill(X);
        },
        popSkill: () => {
          let X = this.pendingSkills[this.pendingSkills.length - 1];
          if (X) this.widget.dependencies.activeThreadHandle.removePendingSkill(X.name);
        },
        onSkillClick: this.handleSkillClick,
        topWidget: this.isShowingShortcutsHelp ? new U8R({
          submitOnEnter: this.submitOnEnter
        }) : void 0
      }),
      b = l.getQueuedMessages(),
      y = Array.isArray(r) && r.length > 0,
      u = Array.isArray(b) && b.length > 0,
      P = this.widget.dependencies.threadPool,
      k = P.isDTWMode?.() === !0,
      x = P.isThreadActorsMode?.() === !0,
      f = u ? new D8R({
        queuedMessages: b,
        onInterruptQueuedMessage: k ? X => this.widget.dependencies.activeThreadHandle.interruptQueuedMessage?.(X) : void 0
      }) : void 0,
      v = y ? this.buildScrollableTodoList(r, this.isTextfieldAndAutocompleteFocused && !n, e) : void 0,
      g = [],
      I = null,
      S = 0,
      O = s.capabilities.emojiWidth,
      j = x ? "actors" : k ? "dtw" : void 0,
      d = k ? P.getTransportConnectionState?.() : void 0,
      C = k ? P.getTransportConnectionRole?.() : void 0,
      L = l.getMessages().length > 0,
      w = d === "disconnected" && !L ? "ready" : d;
    if (d === "connected") w = C === "executor" ? "executor" : "observer";
    if (j && w !== void 0) g.push({
      child: new xT({
        text: new G(`(${j}: ${w})`, new cT({
          color: a.mutedForeground,
          dim: !0
        }))
      }),
      position: "top-left"
    });
    let D = this.currentShellModeStatus;
    if (D) g.push({
      child: new xT({
        text: new G(D === "hidden" ? "shell mode (incognito)" : "shell mode", new cT({
          color: D === "hidden" ? e.app.shellModeHidden : e.app.shellMode
        }))
      }),
      position: "top-left"
    });
    if (this.handoffState.isInHandoffMode) {
      let X = new cT({
          color: e.app.handoffMode
        }),
        rT = this.handoffState.isGeneratingHandoff && this.handoffState.spinner ? new G("", void 0, [new G("handoff ", X), new G(this.handoffState.spinner.toBraille(), X)]) : new G("handoff (submit a goal for the new thread)", X);
      if (g.push({
        child: new xT({
          text: rT
        }),
        position: "top-left"
      }), this.handoffState.isGeneratingHandoff) {
        let hT = new cT({
          color: a.foreground,
          dim: !0
        });
        g.push({
          child: new xT({
            text: new G("", void 0, [new G("Esc", new cT({
              color: e.app.keybind
            })), new G(" to cancel", hT)])
          }),
          position: "bottom-left"
        }), S = q8("Esc to cancel", O);
      }
    }
    if (this.handoffState.countdownSeconds !== null) {
      let X = new cT({
          color: a.foreground,
          dim: !0
        }),
        rT = `Auto-submitting in ${this.handoffState.countdownSeconds}s`,
        hT = this.handoffState.countdownSeconds < 10 ? 1 : 0;
      g.push({
        child: new uR({
          padding: TR.only({
            right: hT
          }),
          child: new xT({
            text: new G(rT, new cT({
              color: e.app.handoffMode
            }))
          })
        }),
        position: "bottom-left"
      }), g.push({
        child: new xT({
          text: new G("", void 0, [new G("type", new cT({
            color: e.app.keybind
          })), new G(" to edit", X)])
        }),
        position: "bottom-left"
      }), S = q8("Auto-submitting in 10s", O) + 2 + q8("type to edit", O);
    }
    if (this.isInQueueMode) {
      let X = new cT({
        color: e.app.queueMode
      });
      g.push({
        child: new xT({
          text: new G("queue", X)
        }),
        position: "top-left"
      });
    }
    let B = this.widget.dependencies.activeThreadHandle.getEmptyHandoffParentThreadID() ?? null,
      M = s.capabilities.animationSupport,
      V = M === "disabled" ? 0 : M === "slow" ? 30 : 60,
      Q = this.getEffectiveAgentMode(),
      W = f$(Q),
      eT = null,
      iT = null,
      aT = !1,
      oT = this.agentModeController.getVisibleModes();
    if (!D && !this.isInQueueMode && oT.length > 1) {
      let X = this.previewThread,
        rT = this.canChangeAgentModeInPromptEditor(),
        hT = this.getProspectiveAgentMode(),
        pT = l.getAgentMode() ?? "smart",
        mT = X ? X.agentMode ?? pT : rT ? hT ?? pT : pT,
        yT = this.formatAgentModeLabel(mT),
        uT = mT === "smart" && this.anthropicSpeed === "fast",
        bT = u3T(this.openAISpeed, X9(this.authStatus) ? this.authStatus.features : this.tuiContext.features),
        jT = qo(mT) && bT === "fast",
        fT = uT ? "+fast(6x$)" : jT ? "+fast(2x$)" : void 0,
        MT = fT ? `${yT}${fT}` : yT,
        UT = f$(mT),
        QT = X ? ve(X) > 0 : !l.isThreadEmpty(),
        hR = "top-right";
      if (X) {
        eT = q8(MT, O);
        let cR = fT ? new G("", void 0, [new G(yT, new cT({
          color: UT
        })), new G(fT, new cT({
          color: a.warning
        }))]) : new G(yT, new cT({
          color: UT
        }));
        g.push({
          child: new xT({
            text: cR
          }),
          position: "top-right"
        });
      } else {
        let cR = this.handoffState.isGeneratingHandoff,
          kT = new cT({
            color: UT,
            dim: cR
          }),
          GT = new xT({
            text: fT ? new G("", void 0, [new G(yT, kT), new G(fT, new cT({
              color: a.warning,
              dim: cR
            }))]) : new G(yT, kT)
          }),
          NT = q8(MT, O),
          KT = rT ? new G0({
            child: GT,
            onClick: () => this.toggleAgentMode(),
            cursor: "pointer"
          }) : GT,
          $T = [];
        if (eT = NT, mT === "deep" && !QT && !this.handoffState.isGeneratingHandoff && this.deepModeEffortHintController.isVisibleOrFalling()) {
          let OT = this.deepModeEffortHintController.getHintWidth(O),
            _T = 1;
          aT = this.deepModeEffortHintController.isVisible() && this.deepModeEffortHintController.isShimmering();
          let WT = this.deepModeEffortHintController.isFalling(),
            iR = aT ? this.deepModeEffortHintController.buildShimmerMaskedTextSpan(a.foreground) : null,
            nT = WT ? this.deepModeEffortHintController.buildFallingMaskedTextSpan(a.foreground) : null,
            JT = new cT({
              color: a.foreground,
              dim: !0
            }),
            RR = aT && iR ? iR.toPlainText() : WT && nT ? nT.toPlainText() : this.deepModeEffortHintController.getHintText(),
            ST = this.deepModeEffortHintController.isVisible() || this.deepModeEffortHintController.isFalling() ? this.buildBorderTransparentTextWidget(RR, JT, O) : new XT({
              width: OT
            });
          $T.push(ST, new XT({
            width: 1
          })), eT += OT + 1, iT = a.foreground;
        }
        if ($T.push(KT), this.showSkillsCountInPromptBar) {
          let OT = this.availableSkillCountReady ? this.availableSkillCount : this.widget.dependencies.skillService.listInstalled().length,
            _T = this.skillWarningCount > 0 || this.skillErrorCount > 0,
            WT = `${_T ? "! " : ""}${OT} ${o9(OT, "skill")}`,
            iR = 2,
            nT = q8(WT, O);
          eT += 2 + nT;
          let JT = new cT({
            color: _T ? a.warning : a.foreground,
            dim: !_T
          });
          $T.push(new XT({
            width: 2
          }), new G0({
            child: this.buildBorderTransparentTextWidget(WT, JT, O),
            onClick: () => {
              this.setState(() => {
                this.isShowingSkillListModal = !0;
              });
            },
            cursor: "pointer"
          }));
        }
        g.push({
          child: new T0({
            mainAxisSize: "min",
            children: $T
          }),
          position: "top-right"
        });
      }
    }
    let TT = V > 0 && this.agentModePulseSeq > 0 && !D && !this.isInQueueMode && !B && oT.length > 1,
      tT = [];
    if (TT) {
      let X = xi(Q)?.uiHints?.fasterAnimation ? 3 : 1,
        rT = (eT ?? 0) + 1,
        hT = rT > 0 ? 2 + rT : 1,
        pT = new ca({
          top: 0,
          left: 1,
          right: hT,
          height: 1,
          child: new X0R({
            color: W,
            backgroundColor: a.background,
            trigger: this.agentModePulseSeq,
            fps: V,
            speed: X,
            trail: 5,
            leftOffset: 0,
            direction: "right-to-left"
          })
        });
      tT.push(pT);
    }
    if (aT && iT && eT !== null) {
      let X = this.deepModeEffortHintController.buildShimmerOverlay(eT, iT);
      if (X) tT.push(X);
    }
    if (this.deepModeEffortHintController.isFalling() && iT && eT !== null) {
      let X = this.deepModeEffortHintController.buildFallingOverlay(eT, iT);
      if (X) tT.push(X);
    }
    if (tT.length > 0) I = new ca({
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      child: new Ta({
        children: tT
      })
    });
    if (B && this.handoffState.countdownSeconds === null) {
      let X = this.handoffState.isConfirmingAbortHandoff ? " again to abort " : " to abort ";
      g.push({
        child: new xT({
          text: new G("", void 0, [new G("Esc", new cT({
            color: e.app.keybind
          })), new G(X, new cT({
            color: a.foreground,
            dim: !0
          })), new G("handoff", new cT({
            color: e.app.handoffMode
          }))])
        }),
        position: "bottom-left"
      }), S = q8(`Esc${X}handoff`, O);
    }
    if (!B && this.previousThreadIdForHint && l.getMessages().length === 0 && this.textController.text.trim() === "") g.push({
      child: new xT({
        text: new G("", void 0, [new G("press ", new cT({
          color: a.foreground,
          dim: !0
        })), new G("enter", new cT({
          color: e.app.keybind
        })), new G(" to reference the previous thread", new cT({
          color: a.foreground,
          dim: !0
        }))])
      }),
      position: "bottom-left"
    }), S = q8("press enter to reference the previous thread", O);
    let lT = l.getInitialTreeURI(),
      N;
    if (lT) N = zR.parse(lT).fsPath;else N = process.cwd();
    let q = this.toHomeRelative(N),
      F = this.shorten(q),
      E = S > 0 ? s.size.width - S - 6 : s.size.width - 4,
      U = this.buildDisplayText(F, this.currentGitBranch || void 0, E, O);
    g.push({
      child: new xT({
        text: new G(U, new cT({
          color: a.foreground,
          dim: !0
        }))
      }),
      position: "bottom-right"
    });
    let Z = this.previewThread;
    if (!l.isThreadEmpty() && !D && !this.handoffState.isInHandoffMode && !Z) {
      let X = [],
        rT = new cT({
          color: a.foreground,
          dim: !0
        }),
        hT = new G(" \xB7 ", rT);
      if (c) {
        let bT = c.totalInputTokens / c.maxInputTokens,
          jT = Math.round(bT * 100),
          fT = Math.max(0, Math.min(jT, 100)),
          MT = cRR(bT, c.maxInputTokens),
          UT = rT;
        if (MT === "danger") UT = new cT({
          color: a.destructive
        });else if (MT === "warning") UT = new cT({
          color: a.warning
        });else if (MT === "recommendation") UT = new cT({
          color: e.app.recommendation
        });
        if (X.length > 0) X.push(hT);
        if (c.maxInputTokens >= 1000) {
          let QT = Math.round(c.maxInputTokens / 1000);
          X.push(new G(`${fT}% of ${QT}k`, UT));
        } else X.push(new G(`${fT}%`, UT));
      }
      if (A && this.threadCostInfo) {
        let bT = xrT(this.threadCostInfo, {
          colors: {
            foreground: a.foreground
          },
          dim: !0
        });
        if (bT.length > 0) {
          if (X.length > 0) X.push(hT);
          X.push(...bT);
        }
      }
      let pT = t.viewState,
        mT = pT.state === "active" ? pT.turnStartTime : void 0,
        yT = pT.state === "active" ? pT.turnElapsedMs : void 0,
        uT = null;
      if (l.getAgentMode() === "deep") {
        let bT = mT ? Date.now() - mT : yT;
        if (bT !== void 0) {
          let jT = D4R(bT);
          uT = new xT({
            text: new G(jT, rT)
          });
        }
      }
      if (X.length > 0 || uT) {
        let bT = [];
        if (X.length > 0) {
          let jT = new xT({
            text: new G("", void 0, X)
          });
          bT.push(A ? new G0({
            child: jT,
            onClick: this.showContextDetailOverlay,
            cursor: "pointer"
          }) : jT);
        }
        if (uT) {
          if (X.length > 0) bT.push(new xT({
            text: new G(" \xB7 ", rT)
          }));
          bT.push(uT);
        }
        g.push({
          child: new T0({
            mainAxisSize: "min",
            children: bT
          }),
          position: "top-left"
        });
      }
    }
    return new YrT({
      leftChild: new j0({
        child: m
      }),
      rightChild1: f,
      rightChild2: v,
      maxHeight: h,
      overlayTexts: g,
      overlayLayer: I,
      backgroundColor: a.background,
      borderColor: n || !this.isTextfieldAndAutocompleteFocused || this.handoffState.isGeneratingHandoff ? a.border : void 0,
      hasBanner: i,
      userHeight: this.bottomGridUserHeight,
      onInitializeHeight: X => {
        this.setState(() => {
          this.bottomGridUserHeight = Math.min(X, h);
        });
      },
      onDrag: X => {
        if (this.bottomGridDragStartY === null) this.bottomGridDragStartY = Math.floor(X.localPosition.y), this.bottomGridDragStartHeight = this.bottomGridUserHeight;
        let rT = Math.floor(X.localPosition.y) - this.bottomGridDragStartY,
          hT = Math.max(4, this.bottomGridDragStartHeight - rT),
          pT = Math.min(hT, h),
          mT = Math.floor(pT);
        if (this.bottomGridUserHeight !== mT) this.setState(() => {
          this.bottomGridUserHeight = mT;
        });
      },
      onDragRelease: () => {
        this.bottomGridDragStartY = null, this.bottomGridDragStartHeight = null;
      },
      enableResize: !i
    });
  }
};