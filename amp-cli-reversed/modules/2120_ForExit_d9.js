class d9 {
  static _instance;
  frameScheduler = k8.instance;
  buildOwner;
  pipelineOwner;
  focusManager = ic.instance;
  mouseManager = ha.instance;
  frameStatsOverlay = new ZXT();
  tui = new XXT();
  rootElement;
  isRunning = !1;
  rootElementMountedCallback;
  forcePaintOnNextFrame = !1;
  shouldPaintCurrentFrame = !1;
  didPaintCurrentFrame = !1;
  eventCallbacks = {
    key: [],
    mouse: [],
    paste: []
  };
  keyInterceptors = [];
  rgbColorChangeCallbacks = [];
  cachedRgbColors = null;
  static get instance() {
    return d9._instance ??= new d9();
  }
  pendingResizeEvent = null;
  constructor() {
    this.buildOwner = new YXT(), this.pipelineOwner = new JXT(), this.frameScheduler.addFrameCallback("frame-start", () => this.beginFrame(), "build", -2000, "WidgetsBinding.beginFrame"), this.frameScheduler.addFrameCallback("resize", () => this.processResizeIfPending(), "build", -1000, "WidgetsBinding.processResizeIfPending"), this.frameScheduler.addFrameCallback("build", () => {
      this.buildOwner.buildScopes(), this.updateRootRenderObject();
    }, "build", 0, "BuildOwner.buildScopes"), this.frameScheduler.addFrameCallback("layout", () => {
      if (this.updateRootConstraints(), this.pipelineOwner.flushLayout()) this.shouldPaintCurrentFrame = !0;
    }, "layout", 0, "PipelineOwner.flushLayout"), this.frameScheduler.addFrameCallback("paint", () => this.paint(), "paint", 0, "WidgetsBinding.paint"), this.frameScheduler.addFrameCallback("render", () => this.render(), "render", 0, "WidgetsBinding.render"), Ly0({
      scheduleBuildFor: T => this.buildOwner.scheduleBuildFor(T)
    }, {
      requestLayout: T => this.pipelineOwner.requestLayout(T),
      requestPaint: T => this.pipelineOwner.requestPaint(T),
      removeFromQueues: T => this.pipelineOwner.removeFromQueues(T)
    }), this.setupErrorHandler();
  }
  setupErrorHandler() {
    process.on("uncaughtException", T => {
      J.error("Framework uncaught exception", T);
    });
  }
  getRgbColors() {
    return this.cachedRgbColors;
  }
  onRgbColorsChanged(T) {
    return this.rgbColorChangeCallbacks.push(T), () => {
      let R = this.rgbColorChangeCallbacks.indexOf(T);
      if (R !== -1) this.rgbColorChangeCallbacks.splice(R, 1);
    };
  }
  notifyRgbColorsChanged() {
    for (let T of this.rgbColorChangeCallbacks) T();
  }
  updateRgbColors(T) {
    this.cachedRgbColors = T;
    let R = this.tui.getScreen();
    R.setDefaultColors({
      type: "rgb",
      value: T.bg
    }, {
      type: "rgb",
      value: T.fg
    }), R.setIndexRgbMapping(T.indices), XVT(IH(), T.bg), this.notifyRgbColorsChanged(), this.requestForcedPaintFrame();
  }
  async runApp(T) {
    if (this.isRunning) throw Error("App is already running");
    try {
      this.isRunning = !0, this.tui.init(), this.tui.enterAltScreen();
      let {
        initFocusTracking: R
      } = await Promise.resolve().then(() => QqT);
      R(this.tui);
      let {
        initIdleTracking: a
      } = await Promise.resolve().then(() => (a5T(), JqT));
      a(this.tui), await this.tui.waitForCapabilities(1000);
      let e = this.tui.getQueryParser(),
        t = e?.getRgbColors();
      if (J.info("Initial RGB colors from terminal", {
        available: !!t
      }), t) this.updateRgbColors(t);
      if (e) e.setColorPaletteChangeCallback(() => {
        let i = e.getRgbColors();
        if (i) this.updateRgbColors(i);
      });
      let r = this.createMediaQueryWrapper(T);
      if (this.rootElement = r.createElement(), this.rootElement.mount(), this.rootElementMountedCallback) this.rootElementMountedCallback(this.rootElement);
      let h = this.rootElement.renderObject;
      if (!h && this.rootElement.children.length > 0) h = this.rootElement.children[0]?.renderObject;
      if (h) this.pipelineOwner.setRootRenderObject(h), this.updateRootConstraints();
      if (this.rootElement.renderObject) this.mouseManager.setRootRenderObject(this.rootElement.renderObject);
      this.mouseManager.setTui(this.tui), J.debug("Setting up event handlers..."), this.setupEventHandlers(), J.debug("Requesting initial frame..."), this.frameScheduler.requestFrame(), J.debug("Waiting for exit...", {
        isRunning: this.isRunning
      }), await this.waitForExit(), J.debug("waitForExit completed");
    } finally {
      J.debug("Cleaning up..."), await this.cleanup();
    }
  }
  stop() {
    if (this.isRunning = !1, this.exitResolve) this.exitResolve(), this.exitResolve = null;
  }
  updateRootConstraints() {
    let T = this.tui.getSize();
    this.pipelineOwner.updateRootConstraints(T);
  }
  updateRootRenderObject() {
    if (!this.rootElement) return;
    let T = this.rootElement.renderObject;
    if (!T && this.rootElement.children.length > 0) T = this.rootElement.children[0]?.renderObject;
    if (T) this.pipelineOwner.setRootRenderObject(T), this.mouseManager.setRootRenderObject(T);
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
        t.update(r);
      }
      this.tui.getScreen().markForRefresh(), this.pipelineOwner.updateRootConstraints(R), this.rootElement.markNeedsRebuild(), this.frameScheduler.requestFrame(), this.frameScheduler.addPostFrameCallback(() => {
        this.mouseManager.reestablishHoverState();
      }, "MouseManager.reestablishHoverState");
    }
  }
  beginFrame() {
    this.didPaintCurrentFrame = !1, this.shouldPaintCurrentFrame = this.forcePaintOnNextFrame || this.buildOwner.hasDirtyElements || this.pipelineOwner.hasNodesNeedingLayout || this.pipelineOwner.hasNodesNeedingPaint || this.tui.getScreen().requiresFullRefresh, this.forcePaintOnNextFrame = !1;
  }
  requestForcedPaintFrame() {
    this.forcePaintOnNextFrame = !0, this.frameScheduler.requestFrame();
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
      this.frameStatsOverlay.recordStats(a, this.tui.getLastRenderDiffStats()), this.frameStatsOverlay.draw(R, a), this.didPaintCurrentFrame = !0;
    } catch (R) {
      J.error("Paint error:", R);
    }
  }
  render() {
    if (!this.didPaintCurrentFrame) return;
    try {
      this.tui.render();
    } catch (T) {
      J.error("Render error:", T);
    }
  }
  renderRenderObject(T, R, a, e) {
    if ("paint" in T && typeof T.paint === "function") T.paint(R, a, e);
  }
  createMediaQueryWrapper(T) {
    let R = this.tui.getCapabilities() || OY(),
      a = this.tui.getSize(),
      e = new BM(a, R);
    return new I9({
      data: e,
      child: T
    });
  }
  setupEventHandlers() {
    this.tui.onResize(T => {
      this.mouseManager.clearHoverState(), this.pendingResizeEvent = T, this.frameScheduler.requestFrame();
    }), this.tui.onKey(T => {
      let R = performance.now();
      for (let e of this.eventCallbacks.key) e(T);
      for (let e of this.keyInterceptors) if (e(T)) {
        let t = performance.now() - R;
        this.frameStatsOverlay.recordKeyEvent(t);
        return;
      }
      if (this.focusManager.handleKeyEvent(T)) {
        let e = performance.now() - R;
        this.frameStatsOverlay.recordKeyEvent(e);
        return;
      }
      this.handleGlobalKeyEvent(T);
      let a = performance.now() - R;
      this.frameStatsOverlay.recordKeyEvent(a);
    }), this.tui.onMouse(T => {
      let R = performance.now();
      for (let e of this.eventCallbacks.mouse) e(T);
      this.mouseManager.handleMouseEvent(T);
      let a = performance.now() - R;
      this.frameStatsOverlay.recordMouseEvent(a);
    }), this.tui.onPaste(T => {
      for (let R of this.eventCallbacks.paste) R(T);
      this.focusManager.handlePasteEvent(T);
    }), this.tui.onCapabilities(T => {
      if (this.rootElement) {
        let R = this.tui.getSize(),
          a = new BM(R, T.capabilities),
          e = this.rootElement;
        if (e.widget instanceof I9) {
          let t = new I9({
            data: a,
            child: e.widget.child
          });
          e.update(t);
        }
        this.rootElement.markNeedsRebuild(), this.frameScheduler.requestFrame();
      }
    });
  }
  handleGlobalKeyEvent(T) {
    if (T.ctrlKey && T.key === "z" && !T.shiftKey && !T.altKey && !T.metaKey) {
      this.tui.handleSuspend();
      return;
    }
  }
  toggleFrameStatsOverlay() {
    let T = !this.frameStatsOverlay.isEnabled();
    this.frameStatsOverlay.setEnabled(T), this.requestForcedPaintFrame();
  }
  exitPromise = null;
  exitResolve = null;
  async waitForExit() {
    if (this.exitPromise !== null) return this.exitPromise;
    return this.exitPromise = new Promise(T => {
      if (this.exitResolve = T, !this.isRunning) T();
    }), this.exitPromise;
  }
  async cleanup() {
    if (this.isRunning = !1, this.rootElement) this.rootElement.unmount(), this.rootElement = void 0;
    this.buildOwner.dispose(), this.pipelineOwner.dispose(), this.focusManager.dispose(), this.mouseManager.dispose(), this.frameScheduler.removeFrameCallback("frame-start"), this.frameScheduler.removeFrameCallback("resize"), this.frameScheduler.removeFrameCallback("build"), this.frameScheduler.removeFrameCallback("layout"), this.frameScheduler.removeFrameCallback("paint"), this.frameScheduler.removeFrameCallback("render"), await this.tui.deinit();
  }
  get tuiInstance() {
    return this.tui;
  }
  get rootElementInstance() {
    return this.rootElement;
  }
  setRootElementMountedCallback(T) {
    this.rootElementMountedCallback = T;
  }
  on(T, R) {
    let a = this.eventCallbacks[T];
    return a.push(R), () => {
      let e = a.indexOf(R);
      if (e !== -1) a.splice(e, 1);
    };
  }
  dispatchSyntheticPaste(T) {
    this.tui.dispatchSyntheticPaste(T);
  }
  addKeyInterceptor(T) {
    return this.keyInterceptors.push(T), () => {
      let R = this.keyInterceptors.indexOf(T);
      if (R !== -1) this.keyInterceptors.splice(R, 1);
    };
  }
}