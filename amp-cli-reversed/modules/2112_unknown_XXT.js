class XXT {
  parser = null;
  initialized = !1;
  inAltScreen = !1;
  suspended = !1;
  tty;
  screen;
  renderer;
  queryParser = null;
  capabilities = null;
  capabilityPromise = null;
  capabilityResolve = null;
  capabilityTimeout = null;
  terminalSize = {
    width: 80,
    height: 24
  };
  jetBrainsWheelFilter;
  keyHandlers = [];
  mouseHandlers = [];
  resizeHandlers = [];
  focusHandlers = [];
  pasteHandlers = [];
  capabilityHandlers = [];
  boundHandleResize = this.handleResize.bind(this);
  boundCleanup = this.cleanup.bind(this);
  boundHandleResume = this.handleResume.bind(this);
  resizeDebounceTimer = null;
  pendingResize = !1;
  lastRenderDiffStats = {
    repaintedCellCount: 0,
    totalCellCount: 1920,
    repaintedPercent: 0,
    bytesWritten: 0
  };
  options = {};
  constructor() {
    this.screen = new Zx(80, 24), this.renderer = new ktT(), this.tty = eXT(), this.jetBrainsWheelFilter = new VXT(T => {
      for (let R of this.mouseHandlers) R(T);
    });
  }
  setOptions(T) {
    this.options = {
      ...this.options,
      ...T
    };
  }
  init() {
    if (this.initialized) throw Error("TUI is already initialized");
    try {
      if (this.parser = new $H(), this.parser.onKey(this.handleKeyEvent.bind(this)), this.parser.onPaste(this.handlePasteEvent.bind(this)), this.parser.onOsc(this.handleOscEvent.bind(this)), this.queryParser = new dY(this.options.queryOptions), this.parser.onDeviceAttributes(T => {
        if (this.queryParser && this.initialized) {
          if (this.queryParser.processDeviceAttributes(T.primary, T.secondary)) this.finishInitialization();
        }
      }), this.parser.onDecrqss(T => {
        if (this.queryParser && this.initialized) this.queryParser.processDecrqss(T.request, T.response);
      }), this.parser.onDcs(T => {
        if (this.queryParser && this.initialized) {
          if (T.final === "|" && T.private === ">") this.queryParser.processXtversion(T.data);
          if (T.final === "r" && T.intermediates === "+" && T.params.length > 0 && T.params[0]?.value === 1) this.parseXtgettcapResponse(T.data);
        }
      }), this.parser.onApc(T => {
        if (this.queryParser && this.initialized) {
          if (T.data.startsWith("G")) this.queryParser.processKittyGraphics();
        }
      }), this.parser.onCursorPositionReport(T => {
        if (this.queryParser && this.initialized) this.queryParser.processCursorPositionReport(T.row, T.col);
      }), this.parser.onColorPaletteChange(T => {
        if (this.queryParser && this.initialized) {
          J.info("Color palette change detected, re-querying colors");
          let R = this.queryParser.getColorQuerySequences();
          for (let a of R) process.stdout.write(a);
          this.queryParser.handleColorPaletteChangeNotification();
        }
      }), this.parser.onMouse(T => {
        if (ji() && !this.jetBrainsWheelFilter.handleWheelEvent(T)) return;
        for (let R of this.mouseHandlers) R(T);
      }), this.parser.onFocus(T => {
        for (let R of this.focusHandlers) R(T);
      }), this.parser.onResize(T => {
        this.handleInbandResize(T);
      }), this.tty.on("data", T => {
        this.parser?.parse(T);
      }), this.tty.resume(), process.on("SIGWINCH", this.boundHandleResize), process.stdout.isTTY) process.stdout.on("resize", this.boundHandleResize);
      this.updateTerminalSize(), this.screen.resize(this.terminalSize.width, this.terminalSize.height), this.setupCleanupHandlers(), this.initialized = !0, this.enableMouse(), this.enableBracketedPaste(), this.createCapabilityPromise(), this.startCapabilityDetection();
    } catch (T) {
      throw this.deinit(), T;
    }
  }
  deinit() {
    if (this.initialized) {
      let T = "";
      if (T += this.renderer.reset() + this.renderer.disableMouse() + this.renderer.disableEmojiWidth() + this.renderer.disableInBandResize() + this.renderer.disableBracketedPaste() + this.renderer.disableKittyKeyboard() + this.renderer.disableModifyOtherKeys() + this.renderer.setCursorShape(0) + this.renderer.showCursor(), this.capabilities?.colorPaletteNotifications) T += "\x1B[?2031l";
      if (this.capabilities?.xtversion?.startsWith("ghostty")) T += this.renderer.setProgressBarOff();
      if (this.inAltScreen) T += this.renderer.exitAltScreen(), this.inAltScreen = !1;
      process.stdout.write(T);
    }
    if (this.resizeDebounceTimer) clearTimeout(this.resizeDebounceTimer), this.resizeDebounceTimer = null;
    if (this.capabilityTimeout) clearTimeout(this.capabilityTimeout), this.capabilityTimeout = null;
    this.keyHandlers.length = 0, this.mouseHandlers.length = 0, this.resizeHandlers.length = 0, this.focusHandlers.length = 0, this.pasteHandlers.length = 0, this.capabilityHandlers.length = 0, process.removeListener("SIGWINCH", this.boundHandleResize), process.stdout.removeListener("resize", this.boundHandleResize), process.removeListener("SIGINT", this.boundCleanup), process.removeListener("SIGTERM", this.boundCleanup), process.removeListener("exit", this.boundCleanup), process.removeListener("SIGCONT", this.boundHandleResume), this.tty.dispose(), this.parser = null, this.queryParser = null, this.capabilities = null, this.capabilityPromise = null, this.capabilityResolve = null, this.initialized = !1;
  }
  getEarlyInputText() {
    return this.tty.getEarlyInputText();
  }
  onKey(T) {
    this.keyHandlers.push(T);
  }
  offKey(T) {
    let R = this.keyHandlers.indexOf(T);
    if (R !== -1) this.keyHandlers.splice(R, 1);
  }
  onMouse(T) {
    this.mouseHandlers.push(T);
  }
  offMouse(T) {
    let R = this.mouseHandlers.indexOf(T);
    if (R !== -1) this.mouseHandlers.splice(R, 1);
  }
  onResize(T) {
    this.resizeHandlers.push(T);
  }
  offResize(T) {
    let R = this.resizeHandlers.indexOf(T);
    if (R !== -1) this.resizeHandlers.splice(R, 1);
  }
  onFocus(T) {
    this.focusHandlers.push(T);
  }
  offFocus(T) {
    let R = this.focusHandlers.indexOf(T);
    if (R !== -1) this.focusHandlers.splice(R, 1);
  }
  onPaste(T) {
    this.pasteHandlers.push(T);
  }
  offPaste(T) {
    let R = this.pasteHandlers.indexOf(T);
    if (R !== -1) this.pasteHandlers.splice(R, 1);
  }
  onCapabilities(T) {
    this.capabilityHandlers.push(T);
  }
  offCapabilities(T) {
    let R = this.capabilityHandlers.indexOf(T);
    if (R !== -1) this.capabilityHandlers.splice(R, 1);
  }
  isInitialized() {
    return this.initialized;
  }
  getCapabilities() {
    return this.capabilities;
  }
  getQueryParser() {
    return this.queryParser;
  }
  async waitForCapabilities(T = 1000) {
    if (!this.initialized) throw Error("TUI is not initialized");
    if (this.capabilities) return this.capabilities;
    if (!this.capabilityPromise) throw Error("Capability detection not started");
    return this.capabilityPromise;
  }
  getSize() {
    return {
      ...this.terminalSize
    };
  }
  getScreen() {
    return this.screen;
  }
  getLastRenderDiffStats() {
    return this.lastRenderDiffStats;
  }
  render() {
    if (!this.initialized) throw Error("TUI not initialized");
    if (this.suspended) return;
    let T = this.screen.getDiff(),
      R = this.screen.getSize(),
      a = R.width * R.height,
      e = T.length,
      t = a > 0 ? e / a * 100 : 0;
    this.lastRenderDiffStats = {
      repaintedCellCount: e,
      totalCellCount: a,
      repaintedPercent: t,
      bytesWritten: 0
    };
    let r = this.screen.getCursor();
    if (T.length > 0 || r !== null) {
      let h = new ytT();
      h.append(this.renderer.startSync()), h.append(this.renderer.hideCursor()), h.append(this.renderer.reset()), h.append(this.renderer.moveTo(0, 0));
      let i = this.renderer.render(T);
      if (h.append(i), r) {
        if (h.append(this.renderer.moveTo(r.x, r.y)), this.screen.isCursorVisible()) h.append(this.renderer.setCursorShape(this.screen.getCursorShape())), h.append(this.renderer.showCursor());else h.append(this.renderer.hideCursor());
      } else h.append(this.renderer.hideCursor());
      h.append(this.renderer.endSync());
      let c = h.toString();
      this.lastRenderDiffStats = {
        ...this.lastRenderDiffStats,
        bytesWritten: Buffer.byteLength(c, "utf8")
      }, process.stdout.write(c), this.screen.present();
    }
  }
  clearScreen() {
    let T = this.renderer.clearScreen() + this.renderer.hideCursor();
    process.stdout.write(T), this.renderer.resetState();
  }
  showCursor() {
    process.stdout.write(this.renderer.showCursor());
  }
  hideCursor() {
    process.stdout.write(this.renderer.hideCursor());
  }
  setCursor(T, R) {
    this.screen.setCursor(T, R);
  }
  clearCursor() {
    this.screen.clearCursor();
  }
  setCursorShape(T) {
    this.screen.setCursorShape(T);
  }
  setMouseCursor(T) {
    let R = `\x1B]22;${T}\x07`;
    process.stdout.write(R);
  }
  resetMouseCursor() {
    this.setMouseCursor(B3.DEFAULT);
  }
  enableBracketedPaste() {
    process.stdout.write(this.renderer.enableBracketedPaste());
  }
  disableBracketedPaste() {
    process.stdout.write(this.renderer.disableBracketedPaste());
  }
  enableKittyKeyboard() {
    process.stdout.write(this.renderer.enableKittyKeyboard());
  }
  disableKittyKeyboard() {
    process.stdout.write(this.renderer.disableKittyKeyboard());
  }
  enableModifyOtherKeys() {
    process.stdout.write(this.renderer.enableModifyOtherKeys());
  }
  disableModifyOtherKeys() {
    process.stdout.write(this.renderer.disableModifyOtherKeys());
  }
  async writeClipboard(T) {
    return eA.writeText(T);
  }
  get clipboard() {
    return eA;
  }
  enterAltScreen() {
    if (!this.initialized) throw Error("TUI not initialized");
    if (!this.inAltScreen) process.stdout.write(this.renderer.enterAltScreen()), this.inAltScreen = !0;
  }
  exitAltScreen() {
    if (this.inAltScreen) process.stdout.write(this.renderer.exitAltScreen()), this.inAltScreen = !1;
  }
  isInAltScreen() {
    return this.inAltScreen;
  }
  enableMouse() {
    if (this.initialized) {
      let T = this.queryParser?.shouldUsePixelMouse() ?? !1,
        R = this.renderer.enableMouse(T);
      process.stdout.write(R);
    }
  }
  disableMouse() {
    if (this.initialized) process.stdout.write(this.renderer.disableMouse());
  }
  enableEmojiWidth() {
    if (this.initialized) {
      let T = this.renderer.enableEmojiWidth();
      process.stdout.write(T);
    }
  }
  disableEmojiWidth() {
    if (this.initialized) process.stdout.write(this.renderer.disableEmojiWidth());
  }
  enableInBandResize() {
    if (this.initialized) {
      let T = this.renderer.enableInBandResize();
      process.stdout.write(T);
    }
  }
  disableInBandResize() {
    if (this.initialized) process.stdout.write(this.renderer.disableInBandResize());
  }
  enableColorPaletteNotifications() {
    if (this.initialized) J.info("Enabling mode 2031 (color palette change notifications)"), process.stdout.write("\x1B[?2031h");
  }
  disableColorPaletteNotifications() {
    if (this.initialized) process.stdout.write("\x1B[?2031l");
  }
  setMouseShape(T) {
    if (this.initialized) process.stdout.write(this.renderer.setMouseShape(T));
  }
  suspend() {
    if (!this.initialized || this.suspended) return;
    let T = "";
    if (T += this.renderer.reset() + this.renderer.disableMouse() + this.renderer.disableEmojiWidth() + this.renderer.disableInBandResize() + this.renderer.disableBracketedPaste() + this.renderer.disableKittyKeyboard() + this.renderer.disableModifyOtherKeys() + this.renderer.setCursorShape(0) + this.renderer.showCursor(), this.capabilities?.colorPaletteNotifications) T += "\x1B[?2031l";
    if (this.capabilities?.xtversion?.startsWith("ghostty")) T += this.renderer.setProgressBarOff();
    if (this.inAltScreen) T += this.renderer.exitAltScreen(), this.inAltScreen = !1;
    if (process.stdout.write(T), this.tty.pause(), this.suspended = !0, process.stdout.isTTY) process.stdout.uncork();
  }
  resume() {
    if (!this.initialized || !this.suspended) return;
    if (this.tty.resume(), this.parser) this.parser.reset();
    if (this.enterAltScreen(), this.hideCursor(), this.enableMouse(), this.enableBracketedPaste(), this.capabilities?.emojiWidth) this.enableEmojiWidth();
    if (this.capabilities?.kittyKeyboard) this.enableKittyKeyboard();
    this.enableModifyOtherKeys(), this.enableInBandResize(), this.screen.markForRefresh(), this.suspended = !1;
  }
  isSuspended() {
    return this.suspended;
  }
  handleSuspend() {
    if (!this.initialized || this.suspended) return;
    this.suspend();
    try {
      process.kill(0, "SIGTSTP"), J.debug(`Successfully suspended process ${process.pid}`);
    } catch (T) {
      J.debug(`Failed to suspend process ${process.pid}: ${T}`);
    }
  }
  handleResume() {
    if (!this.initialized || !this.suspended) return;
    this.resume(), setImmediate(() => {
      if (this.initialized && !this.suspended) this.render();
    });
  }
  updateTerminalSize() {
    if (!this.tty.stdin || !JxT(this.tty.stdin)) {
      this.terminalSize = {
        width: 80,
        height: 24
      };
      return;
    }
    let T = Uk0(process.stdout);
    if (T) this.terminalSize = T;
  }
  handleKeyEvent(T) {
    for (let R of this.keyHandlers) R(T);
  }
  handlePasteEvent(T) {
    this.dispatchSyntheticPaste(T.text);
  }
  dispatchSyntheticPaste(T) {
    let R = {
      type: "paste",
      text: wk0(T)
    };
    for (let a of this.pasteHandlers) a(R);
  }
  handleOscEvent(T) {
    if (T.data.startsWith("10;") && this.queryParser) {
      this.queryParser.processOsc10(T.data);
      return;
    }
    if (T.data.startsWith("11;") && this.queryParser) {
      this.queryParser.processOsc11(T.data);
      return;
    }
    if (T.data.startsWith("12;") && this.queryParser) {
      this.queryParser.processOsc12(T.data);
      return;
    }
    if (T.data.startsWith("4;") && this.queryParser) {
      this.queryParser.processOsc4(T.data);
      return;
    }
    if (T.data.startsWith("52;c;")) {
      let R = T.data.slice(5);
      if (R && R !== "?") eA.handleOSC52Response(R);
    }
  }
  createCapabilityPromise() {
    this.capabilityPromise = new Promise(T => {
      this.capabilityResolve = T;
    });
  }
  startCapabilityDetection() {
    if (!this.tty.stdin || !JxT(this.tty.stdin)) {
      if (this.capabilityResolve) this.capabilityResolve(null);
      return;
    }
    if (this.queryParser = new dY(this.options.queryOptions), process.env.TERM_PROGRAM === "Apple_Terminal") {
      let T = OY({
        canRgb: !1
      });
      this.capabilities = T;
      let R = {
        type: "capability",
        capabilities: this.capabilities
      };
      this.renderer.updateCapabilities(this.capabilities);
      for (let a of this.capabilityHandlers) a(R);
      if (this.capabilityResolve) this.capabilityResolve(T), this.capabilityResolve = null;
      return;
    }
    for (let T of Sk0) {
      if (T.shouldSend && !T.shouldSend()) continue;
      if (process.stdout.write(T.sequence), T.description === "Query Kitty explicit width support") this.queryParser.markKittyWidthQuerySent();
    }
    this.capabilityTimeout = setTimeout(() => {
      if (!this.capabilities && this.capabilityResolve && this.queryParser) this.finishInitialization();
    }, 2000);
  }
  finishInitialization() {
    if (!this.initialized || !this.queryParser || this.capabilities) return;
    if (this.capabilities = this.queryParser.getCapabilities(), this.capabilityTimeout) clearTimeout(this.capabilityTimeout), this.capabilityTimeout = null;
    let T = {
      type: "capability",
      capabilities: this.capabilities
    };
    this.renderer.updateCapabilities(this.capabilities), XVT(this.capabilities.background);
    for (let R of this.capabilityHandlers) R(T);
    if (this.capabilityResolve) J.info("Terminal capabilities detected:", this.capabilities), this.capabilityResolve(this.capabilities), this.capabilityResolve = null;
    if (this.queryParser.shouldUsePixelMouse()) {
      let R = this.queryParser.getPixelDimensions();
      if (R) {
        let a = R.pixelWidth / R.columns,
          e = R.pixelHeight / R.rows;
        this.parser?.setSgrToMouseConverter(t => AY(t, !0, a, e));
      }
    }
    if (this.capabilities.emojiWidth) this.enableEmojiWidth();
    if (this.capabilities.kittyKeyboard) this.enableKittyKeyboard();
    if (this.enableModifyOtherKeys(), this.enableInBandResize(), this.capabilities.colorPaletteNotifications) this.enableColorPaletteNotifications();
    eA.setCapabilities(this.capabilities);
  }
  parseXtgettcapResponse(T) {
    if (!this.queryParser) return;
    let R = T.indexOf("=");
    if (R !== -1) {
      let a = T.slice(0, R),
        e = T.slice(R + 1);
      if (this.queryParser.processXtgettcap(a, e)) this.finishInitialization();
    }
  }
  handleResize() {
    if (this.pendingResize = !0, this.resizeDebounceTimer) clearTimeout(this.resizeDebounceTimer);
    this.resizeDebounceTimer = setTimeout(() => {
      this.processResize();
    }, 10);
  }
  handleInbandResize(T) {
    if (this.terminalSize = {
      width: T.width,
      height: T.height
    }, this.queryParser && T.pixelWidth && T.pixelHeight) {
      let R = this.queryParser.shouldUsePixelMouse();
      this.queryParser.updateInbandPixelData(T.width, T.height, T.pixelWidth, T.pixelHeight);
      let a = this.queryParser.shouldUsePixelMouse();
      if (!R && a) this.disableMouse(), this.enableMouse();
      if (a) {
        let e = T.pixelWidth / T.width,
          t = T.pixelHeight / T.height;
        this.parser?.setSgrToMouseConverter(r => AY(r, !0, e, t));
      }
    }
    this.screen.resize(T.width, T.height), setImmediate(() => {
      for (let R of this.resizeHandlers) try {
        R(T);
      } catch (a) {
        J.error("Error in resize handler:", a);
      }
    });
  }
  processResize() {
    if (!this.pendingResize || !this.initialized) return;
    let T = {
      ...this.terminalSize
    };
    if (this.updateTerminalSize(), T.width === this.terminalSize.width && T.height === this.terminalSize.height) {
      this.pendingResize = !1;
      return;
    }
    this.finishResize(), this.pendingResize = !1;
  }
  finishResize() {
    this.screen.resize(this.terminalSize.width, this.terminalSize.height);
    let T = {
      type: "resize",
      width: this.terminalSize.width,
      height: this.terminalSize.height
    };
    setImmediate(() => {
      for (let R of this.resizeHandlers) try {
        R(T);
      } catch (a) {
        J.error("Error in resize handler:", a);
      }
    });
  }
  setupCleanupHandlers() {
    process.setMaxListeners(0), process.on("SIGINT", this.boundCleanup), process.on("SIGTERM", this.boundCleanup), process.on("exit", this.boundCleanup), process.on("SIGCONT", this.boundHandleResume);
  }
  cleanup() {
    try {
      this.deinit();
    } catch {}
  }
}