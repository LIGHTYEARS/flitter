// Module: clipboard-and-input
// Original: segment1[1642742:1658007]
// Type: Scope-hoisted
// Exports: ZxT, Mk0, Dk0, wk0, KXT, VXT, XXT
// Category: framework

turn A / (2 ** l - 1) * 255
}, h = Math.round(r(a)), i = Math.round(r(e)), c = Math.round(r(t));
return this.rgbColors.foreground = {
  r: h,
  g: i,
  b: c
}, !1
}
processOsc11(T) {
  let R = T.match(/^11;rgba?:([0-9a-f]+)\/([0-9a-f]+)\/([0-9a-f]+)/i);
  if (!R || !R[1] || !R[2] || !R[3]) return !1;
  let a = R[1],
    e = R[2],
    t = R[3],
    r = (A) => {
      let l = Number.parseInt(A, 16),
        o = A.length * 4;
      return l / (2 ** o - 1) * 255
    },
    h = Math.round(r(a)),
    i = Math.round(r(e)),
    c = Math.round(r(t));
  this.rgbColors.background = {
    r: h,
    g: i,
    b: c
  };
  let s = 0.299 * h + 0.587 * i + 0.114 * c;
  return this.capabilities.background = s < 128 ? "dark" : "light", !1
}
processOsc12(T) {
  let R = T.match(/^12;rgba?:([0-9a-f]+)\/([0-9a-f]+)\/([0-9a-f]+)/i);
  if (!R || !R[1] || !R[2] || !R[3]) return !1;
  let a = R[1],
    e = R[2],
    t = R[3],
    r = (s) => {
      let A = Number.parseInt(s, 16),
        l = s.length * 4;
      return A / (2 ** l - 1) * 255
    },
    h = Math.round(r(a)),
    i = Math.round(r(e)),
    c = Math.round(r(t));
  return this.rgbColors.cursor = {
    r: h,
    g: i,
    b: c
  }, !1
}
processOsc4(T) {
  let R = T.match(/^4;(\d+);rgba?:([0-9a-f]+)\/([0-9a-f]+)\/([0-9a-f]+)/i);
  if (!R || !R[1] || !R[2] || !R[3] || !R[4]) return !1;
  let a = Number.parseInt(R[1], 10),
    e = R[2],
    t = R[3],
    r = R[4],
    h = (A) => {
      let l = Number.parseInt(A, 16),
        o = A.length * 4;
      return l / (2 ** o - 1) * 255
    },
    i = Math.round(h(e)),
    c = Math.round(h(t)),
    s = Math.round(h(r));
  if (a >= 0 && a <= 7) this.rgbColors.indices[a] = {
    r: i,
    g: c,
    b: s
  };
  return !1
}
setColorPaletteChangeCallback(T) {
  this.onColorPaletteChange = T
}
handleColorPaletteChangeNotification() {
  if (J.info("Color palette changed, re-querying colors..."), this.rgbColors = {
      foreground: null,
      background: null,
      cursor: null,
      indices: [null, null, null, null, null, null, null, null]
    }, this.colorUpdateTimer) clearTimeout(this.colorUpdateTimer);
  this.colorUpdateTimer = setTimeout(() => {
    let T = this.getRgbColors();
    if (this.onColorPaletteChange && T) J.info("Color re-query complete, notifying callback"), this.onColorPaletteChange();
    this.colorUpdateTimer = null
  }, 200)
}
getColorQuerySequences() {
  return ["\x1B]10;?\x07", "\x1B]11;?\x07", "\x1B]12;?\x07", "\x1B]4;0;?\x07", "\x1B]4;1;?\x07", "\x1B]4;2;?\x07", "\x1B]4;3;?\x07", "\x1B]4;4;?\x07", "\x1B]4;5;?\x07", "\x1B]4;6;?\x07", "\x1B]4;7;?\x07"]
}
updateInbandPixelData(T, R, a, e) {
  if (a && e && a > 0 && e > 0) this.inbandPixelData = {
    pixelWidth: a,
    pixelHeight: e,
    columns: T,
    rows: R
  }, this.capabilities.pixelDimensions = !0
}
checkPixelDimensions() {
  if (this.inbandPixelData) {
    this.capabilities.pixelDimensions = !0;
    return
  }
  let T = QxT();
  this.capabilities.pixelDimensions = !!(T && T.pixelWidth > 0 && T.pixelHeight > 0)
}
isComplete() {
  return this.complete
}
getCapabilities() {
  return {
    ...this.capabilities
  }
}
getRgbColors() {
  if (!this.rgbColors.foreground || !this.rgbColors.background || !this.rgbColors.cursor) return J.info("Missing fg, bg, or cursor color", {
    fg: !!this.rgbColors.foreground,
    bg: !!this.rgbColors.background,
    cursor: !!this.rgbColors.cursor
  }), null;
  for (let T = 0; T < 8; T++)
    if (!this.rgbColors.indices[T]) return J.info(`Missing palette color ${T}`), null;
  return J.info("All RGB colors available", {
    fg: this.rgbColors.foreground,
    bg: this.rgbColors.background,
    cursor: this.rgbColors.cursor,
    indicesCount: this.rgbColors.indices.filter((T) => T !== null).length
  }), {
    fg: this.rgbColors.foreground,
    bg: this.rgbColors.background,
    cursor: this.rgbColors.cursor,
    indices: this.rgbColors.indices
  }
}
shouldUsePixelMouse() {
  return this.capabilities.pixelMouse && this.capabilities.pixelDimensions
}
getPixelDimensions() {
  if (this.inbandPixelData) return this.inbandPixelData;
  let T = QxT();
  if (T && T.pixelWidth > 0 && T.pixelHeight > 0) return {
    pixelWidth: T.pixelWidth,
    pixelHeight: T.pixelHeight,
    columns: T.columns,
    rows: T.rows
  };
  return null
}
getPendingQueries() {
  return this.complete ? [] : ["\x1B[c"]
}
detectKittyGraphicsFromEnv() {
  let T = ["kitty", "ghostty", "wezterm"];
  if (Xb()) try {
    let R = "",
      a = "";
    try {
      R = YxT("tmux show-environment -g TERM 2>/dev/null", {
        encoding: "utf8",
        timeout: 1000
      }).trim().replace(/^TERM=/, "").toLowerCase()
    } catch {}
    try {
      a = YxT("tmux show-environment -g TERM_PROGRAM 2>/dev/null", {
        encoding: "utf8",
        timeout: 1000
      }).trim().replace(/^TERM_PROGRAM=/, "").toLowerCase()
    } catch {}
    for (let e of T)
      if (R.includes(e) || a.includes(e)) return J.debug("Detected Kitty graphics support from tmux environment", {
        term: R,
        termProgram: a
      }), !0
  }
  catch {}
  return !1
}
detectRgbSupport() {
  if (process.env.TERM_PROGRAM === "Apple_Terminal") return !1;
  return !0
}
detectCursorShapeSupport() {
  return !this.detectEmacs() && !this.detectJetBrains()
}
detectAnimationSupport() {
  if (this.options.animationDisabled) return "disabled";
  if (process.env.NO_ANIMATION === "1" || process.env.NO_ANIMATIONS === "1") return "disabled";
  if (this.detectEmacs() || this.detectSSH()) return "disabled";
  if (this.detectJetBrains()) return "slow";
  return "fast"
}
detectEmacs() {
  return !!process.env.INSIDE_EMACS
}
detectJetBrains() {
  return process.env.TERMINAL_EMULATOR?.includes("JetBrains") ?? !1
}
detectSSH() {
  return !!(process.env.SSH_CLIENT || process.env.SSH_TTY || process.env.SSH_CONNECTION)
}
detectTmux() {
  return !!process.env.TMUX
}
isITerm2() {
  if (this.capabilities.xtversion?.toLowerCase().includes("iterm2")) return !0;
  return process.env.TERM_PROGRAM === "iTerm.app"
}
getScrollStep() {
  if (this.capabilities.xtversion?.startsWith("ghostty")) return 1;
  if (ji()) return 1;
  return 3
}
}

function ZxT() {
  if (wM() !== "linux") return !1;
  return Boolean(process.env.WSL_DISTRO_NAME) || Ok0("/proc/sys/fs/binfmt_misc/WSLInterop")
}
class KXT {
  capabilities = null;
  pendingReadPromise = null;
  readResolve = null;
  readTimeout = null;
  tmuxSetClipboard = "unknown";
  setCapabilities(T) {
    if (this.capabilities = T, Xb()) this.detectTmuxSetClipboard()
  }
  detectTmuxSetClipboard() {
    E_("tmux", ["show-options", "-s", "-v", "set-clipboard"], {
      timeout: 1000
    }, (T, R) => {
      if (!T) {
        let a = R.trim();
        if (a === "on" || a === "external" || a === "off") this.tmuxSetClipboard = a
      }
    })
  }
  isTmuxOsc52Allowed() {
    return this.tmuxSetClipboard === "on" || this.tmuxSetClipboard === "unknown"
  }
  isOsc52Supported() {
    return this.capabilities?.osc52 ?? !1
  }
  async commandExists(T) {
    try {
      return await Pg("which", [T]), !0
    } catch {
      return !1
    }
  }
  async writeToPbcopy(T) {
    try {
      let R = E_("pbcopy");
      return R.stdin?.write(T), R.stdin?.end(), await new Promise((a, e) => {
        R.on("close", (t) => {
          if (t === 0) a();
          else e(Error(`pbcopy exited with code ${t}`))
        })
      }), !0
    } catch {
      return !1
    }
  }
  async writeToWlCopy(T) {
    try {
      let R = E_("wl-copy");
      return R.stdin?.write(T), R.stdin?.end(), await new Promise((a, e) => {
        R.on("close", (t) => {
          if (t === 0) a();
          else e(Error(`wl-copy exited with code ${t}`))
        })
      }), !0
    } catch {
      return !1
    }
  }
  async writeToXclip(T) {
    try {
      let R = E_("xclip", ["-selection", "clipboard"]);
      return R.stdin?.write(T), R.stdin?.end(), await new Promise((a, e) => {
        R.on("close", (t) => {
          if (t === 0) a();
          else e(Error(`xclip exited with code ${t}`))
        })
      }), !0
    } catch {
      return !1
    }
  }
  async writeToClipExe(T) {
    try {
      let R = E_("clip.exe");
      return R.stdin?.write(T), R.stdin?.end(), await new Promise((a, e) => {
        R.on("close", (t) => {
          if (t === 0) a();
          else e(Error(`clip.exe exited with code ${t}`))
        })
      }), !0
    } catch {
      return !1
    }
  }
  async writeToPowerShell(T) {
    try {
      let R = E_("powershell.exe", ["-NoProfile", "-Command", "$Input | Set-Clipboard"]);
      return R.stdin?.write(T), R.stdin?.end(), await new Promise((a, e) => {
        R.on("close", (t) => {
          if (t === 0) a();
          else e(Error(`powershell.exe exited with code ${t}`))
        })
      }), !0
    } catch {
      return !1
    }
  }
  async readFromOSC52WithQuery(T) {
    if (!this.isOsc52Supported()) return null;
    if (this.pendingReadPromise !== void 0) return this.pendingReadPromise;
    this.pendingReadPromise = new Promise((a) => {
      this.readResolve = a, this.readTimeout = setTimeout(() => {
        this.readResolve = null, this.pendingReadPromise = null, a(null)
      }, 2000), process.stdout.write(T)
    });
    let R = await this.pendingReadPromise;
    return this.pendingReadPromise = null, R
  }
  async readFromOSC52() {
    return this.readFromOSC52WithQuery(Ck0)
  }
  handleOSC52Response(T) {
    if (this.readResolve && this.readTimeout) {
      clearTimeout(this.readTimeout), this.readTimeout = null;
      try {
        let R = Buffer.from(T, "base64").toString("utf8");
        this.readResolve(R)
      } catch {
        this.readResolve(null)
      }
      this.readResolve = null, this.pendingReadPromise = null
    }
  }
  async readFromPbpaste() {
    try {
      let {
        stdout: T
      } = await Pg("pbpaste");
      return T
    } catch {
      return null
    }
  }
  async readFromWlPaste(T) {
    try {
      let R = ["--no-newline"];
      if (T === "primary") R.push("--primary");
      let {
        stdout: a
      } = await Pg("wl-paste", R);
      return a
    } catch {
      return null
    }
  }
  async readFromXclip(T) {
    try {
      let {
        stdout: R
      } = await Pg("xclip", ["-selection", T, "-o"]);
      return R
    } catch {
      return null
    }
  }
  async readFromPowerShell() {
    try {
      let {
        stdout: T
      } = await Pg("powershell.exe", ["-NoProfile", "-Command", "Get-Clipboard"]);
      return T
    } catch {
      return null
    }
  }
  async readFromOSC52Primary() {
    return this.readFromOSC52WithQuery(Lk0)
  }
  async readText() {
    if (this.isOsc52Supported()) {
      let R = await this.readFromOSC52();
      if (R !== null) return R
    }
    let T = wM();
    if (T === "darwin") {
      let R = await this.readFromPbpaste();
      if (R !== null) return R
    } else if (T === "win32") {
      let R = await this.readFromPowerShell();
      if (R !== null) return R
    } else {
      if (await this.commandExists("wl-paste")) {
        let R = await this.readFromWlPaste("clipboard");
        if (R !== null) return R
      }
      if (await this.commandExists("xclip")) {
        let R = await this.readFromXclip("clipboard");
        if (R !== null) return R
      }
      if (ZxT()) {
        let R = await this.readFromPowerShell();
        if (R !== null) return R
      }
    }
    return null
  }
  async readPrimarySelection() {
    let T = wM();
    if (T === "darwin" || T === "win32") return this.readText();
    if (this.isOsc52Supported()) {
      let R = await this.readFromOSC52Primary();
      if (R !== null) return R
    }
    if (await this.commandExists("wl-paste")) {
      let R = await this.readFromWlPaste("primary");
      if (R !== null) return R
    }
    if (await this.commandExists("xclip")) {
      let R = await this.readFromXclip("primary");
      if (R !== null) return R
    }
    return null
  }
  async writeText(T) {
    let R = Xb(),
      a = !1;
    if (this.isOsc52Supported() && (!R || this.isTmuxOsc52Allowed())) {
      let t = Buffer.from(T).toString("base64"),
        r = Ek0(t);
      if (process.stdout.write(r), a = !0, !R) return !0
    }
    let e = wM();
    if (e === "darwin") {
      if (await this.writeToPbcopy(T)) return !0
    } else if (e === "win32") {
      if (await this.writeToPowerShell(T)) return !0;
      if (await this.writeToClipExe(T)) return !0
    } else {
      if (await this.commandExists("wl-copy") && await this.writeToWlCopy(T)) return !0;
      if (await this.commandExists("xclip") && await this.writeToXclip(T)) return !0;
      if (ZxT()) {
        if (await this.writeToPowerShell(T)) return !0
      }
    }
    if (a) return !0;
    return !1
  }
}

function Mk0(T) {
  return T.replace(/\r\n|\r/g, `
`)
}

function Dk0(T) {
  return T.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, "")
}

function wk0(T) {
  let R = T;
  return R = Mk0(R), R = Dk0(R), R
}
class VXT {
  eventBuffer = [];
  bufferTimer = null;
  filterDirection = null;
  lastEventTime = 0;
  onEmitEvent = () => {};
  constructor(T) {
    this.onEmitEvent = T
  }
  handleWheelEvent(T) {
    if (T.button !== "wheel_up" && T.button !== "wheel_down") return !0;
    let R = Date.now();
    if (this.filterDirection !== null)
      if (R - this.lastEventTime > Nk0) this.filterDirection = null;
      else return this.lastEventTime = R, T.button === this.filterDirection;
    if (this.lastEventTime = R, this.eventBuffer.push(T), !this.bufferTimer) this.bufferTimer = setTimeout(() => {
      this.processBuffer()
    }, Bk0);
    return !1
  }
  processBuffer() {
    if (this.bufferTimer = null, this.eventBuffer.length === 0) return;
    if (this.eventBuffer.some((T) => T.button === "wheel_down")) {
      this.filterDirection = "wheel_down";
      for (let T of this.eventBuffer)
        if (T.button === "wheel_down") this.onEmitEvent(T)
    } else {
      this.filterDirection = "wheel_up";
      for (let T of this.eventBuffer) this.onEmitEvent(T)
    }
    this.eventBuffer = []
  }
}
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
    this.screen = new Zx(80, 24), this.renderer = new ktT, this.tty = eXT(), this.jetBrainsWheelFilter = new VXT((T) => {
      for (let R of this.mouseHandlers) R(T)
    })
  }
  setOptions(T) {
    this.options = {
      ...this.options,
      ...T
    }
  }
  init() {
    if (this.initialized) throw Error("TUI is already initialized");
    try {
      if (this.parser = new $H, this.parser.onKey(this.handleKeyEvent.bind(this)), this.parser.onPaste(this.handlePasteEvent.bind(this)), this.parser.onOsc(this.handleOscEvent.bind(this)), this.queryParser = new dY(this.options.queryOptions), this.parser.onDeviceAttributes((T) => {
          if (this.queryParser && this.initialized) {
            if (this.queryParser.processDeviceAttributes(T.primary, T.secondary)) this.finishInitialization()
          }
        }), this.parser.onDecrqss((T) => {
          if (this.queryParser && this.initialized) this.queryParser.processDecrqss(T.request, T.response)
        }), this.parser.onDcs((T) => {
          if (this.queryParser && this.initialized) {
            if (T.final === "|" && T.private === ">") this.queryParser.processXtversion(T.data);
            if (T.final === "r" && T.intermediates === "+" && T.params.length > 0 && T.params[0]?.value === 1) this.parseXtgettcapResponse(T.data)
          }
        }), this.parser.onApc((T) => {
          if (this.queryParser && this.initialized) {
            if (T.data.startsWith("G")) this.queryParser.processKittyGraphics()
          }
        }), this.parser.onCursorPositionReport((T) => {
          if (this.queryParser && this.initialized) this.queryParser.processCursorPositionReport(T.row, T.col)
        }), this.parser.onColorPaletteChange((T) => {
          if (this.queryParser && this.initialized) {
            J.info("Color palette change detected, re-querying colors");
            let R = this.queryParser.getColorQuerySequences();
            for (let a of R) process.stdout.write(a);
            this.queryParser.handleColorPaletteChangeNotification()
          }
        }), this.parser.onMouse((T) => {
          if (ji() && !this.jetBrainsWheelFilter.handleWheelEvent(T)) return;
          for (let R of this.mouseHandlers) R(T)
        }), this.parser.onFocus((T) => {
          for (let R of this.focusHandlers) R(T)
        }), this.parser.onResize((T) => {
          this.handleInbandResize(T)
        }), this.tty.on("data", (T) => {
          this.parser?.parse(T)
        }), this.tty.resume(), process.on("SIGWINCH", this.boundHandleResize), process.stdout.isTTY) process.stdout.on("resize", this.boundHandleResize);
      this.updateTerminalSize(), this.screen.resize(this.terminalSize.width, this.terminalSize.height), this.setupCleanupHandlers(), this.initialized = !0, this.enableMouse(), this.enableBracketedPaste(), this.createCapabilityPromise(), this.startCapabilityDetection()
    } catch (T) {
      throw this.deinit(), T
    }
  }
  deinit() {
    if (this.initialized) {
      let T = "";
      if (T += this.renderer.reset() + this.renderer.disableMouse() + this.renderer.disableEmojiWidth() + this.renderer.disableInBandResize() + this.renderer.disableBracketedPaste() + this.renderer.disableKittyKeyboard() + this.renderer.disableModifyOtherKeys() + this.renderer.setCursorShape(0) + this.renderer.showCursor(), this.capabilities?.colorPaletteNotifications) T += "\x1B[?2031l";
      if (this.capabilities?.xtversion?.startsWith("ghostty")) T += this.renderer.setProgressBarOff();
      if (this.inAltScreen) T += this.renderer.exitAltScreen(), this.inAltScreen = !1;
      process.stdout.write(T)
    }
    if (this.resizeDebounceTimer) clearTimeout(this.resizeDebounceTimer), this.resizeDebounceTimer = null;
    if (this.capabilityTimeout) clearTimeout(this.capabilityTimeout), this.capabilityTimeout = null;
    this.keyHandlers.length = 0, this.mouseHandlers.length = 0, this.resizeHandlers.length = 0, this.focusHandlers.length = 0, this.pasteHandlers.length = 0, this.capabilityHandlers.length = 0, process.removeListener("SIGWINCH", this.boundHandleResize), process.stdout.removeListener("resize", this.boundHandleResize), process.removeListener("SIGINT", this.boundCleanup), process.removeListener("SIGTERM", this.boundCleanup), process.removeListener("exit", this.boundCleanup), process.removeListener("SIGCONT", this.boundHandleResume), this.tty.dispose(), this.parser = null, this.queryParser = null, this.capabilities = null, this.capabilityPromise = null, this.capabilityResolve = null, this.initialized = !1
  }
  getEarlyInputText() {
    return this.tty.getEarlyInputText()
  }
  onKey(T) {
    this.keyHandlers.push(T)
  }
  offKey(T) {
      let R = this.keyHandlers.indexOf(T);
      if (R !== -1) this.keyHandlers.spli