class dY {
  options;
  capabilities;
  constructor(T = {}) {
    this.options = T, this.capabilities = {
      syncOutput: !1,
      emojiWidth: !1,
      pixelMouse: !1,
      pixelDimensions: !1,
      xtversion: null,
      canRgb: this.detectRgbSupport(),
      supportsCursorShape: this.detectCursorShapeSupport(),
      animationSupport: this.detectAnimationSupport(),
      kittyKeyboard: !1,
      osc52: !1,
      kittyGraphics: this.detectKittyGraphicsFromEnv(),
      background: "unknown",
      colorPaletteNotifications: !1,
      kittyExplicitWidth: !1,
      underlineSupport: ji() ? "none" : "standard",
      scrollStep: () => this.getScrollStep()
    };
  }
  complete = !1;
  colorUpdateTimer = null;
  onColorPaletteChange;
  inbandPixelData = null;
  kittyWidthQuerySent = !1;
  rgbColors = {
    foreground: null,
    background: null,
    cursor: null,
    indices: [null, null, null, null, null, null, null, null]
  };
  processDecrqss(T, R) {
    if (T === "?2026") this.capabilities.syncOutput = R === "1" || R === "2";
    if (T === "?2027") this.capabilities.emojiWidth = R === "1" || R === "2";
    if (T === "?1016") this.capabilities.pixelMouse = R === "1" || R === "2";
    if (T === "?2031") this.capabilities.colorPaletteNotifications = R === "1" || R === "2";
    if (T === "u") this.capabilities.kittyKeyboard = !0;
    return !1;
  }
  processDeviceAttributes(T, R) {
    if (this.checkPixelDimensions(), this.detectJetBrains() || this.detectTmux()) this.capabilities.emojiWidth = !0;
    return this.complete = !0, !0;
  }
  processXtversion(T) {
    this.capabilities.xtversion = T;
    let R = ["ghostty", "kitty", "wezterm", "foot", "alacritty", "iterm2", "tmux"],
      a = T.toLowerCase();
    if (R.some(e => a.includes(e))) this.capabilities.osc52 = !0;
    return !1;
  }
  processXtgettcap(T, R) {
    if (T.toLowerCase() === "4d73") this.capabilities.osc52 = R.length > 0;
    return !1;
  }
  processKittyGraphics() {
    if (this.isITerm2()) return this.capabilities.kittyGraphics = !1, !1;
    return this.capabilities.kittyGraphics = !0, !1;
  }
  processCursorPositionReport(T, R) {
    if (this.kittyWidthQuerySent) {
      if (T === 1 && R === 2) this.capabilities.kittyExplicitWidth = !0, J.info("Kitty explicit width support detected");
      this.kittyWidthQuerySent = !1;
    }
    return !1;
  }
  markKittyWidthQuerySent() {
    this.kittyWidthQuerySent = !0;
  }
  processOsc10(T) {
    let R = T.match(/^10;rgba?:([0-9a-f]+)\/([0-9a-f]+)\/([0-9a-f]+)/i);
    if (!R || !R[1] || !R[2] || !R[3]) return !1;
    let a = R[1],
      e = R[2],
      t = R[3],
      r = s => {
        let A = Number.parseInt(s, 16),
          l = s.length * 4;
        return A / (2 ** l - 1) * 255;
      },
      h = Math.round(r(a)),
      i = Math.round(r(e)),
      c = Math.round(r(t));
    return this.rgbColors.foreground = {
      r: h,
      g: i,
      b: c
    }, !1;
  }
  processOsc11(T) {
    let R = T.match(/^11;rgba?:([0-9a-f]+)\/([0-9a-f]+)\/([0-9a-f]+)/i);
    if (!R || !R[1] || !R[2] || !R[3]) return !1;
    let a = R[1],
      e = R[2],
      t = R[3],
      r = A => {
        let l = Number.parseInt(A, 16),
          o = A.length * 4;
        return l / (2 ** o - 1) * 255;
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
    return this.capabilities.background = s < 128 ? "dark" : "light", !1;
  }
  processOsc12(T) {
    let R = T.match(/^12;rgba?:([0-9a-f]+)\/([0-9a-f]+)\/([0-9a-f]+)/i);
    if (!R || !R[1] || !R[2] || !R[3]) return !1;
    let a = R[1],
      e = R[2],
      t = R[3],
      r = s => {
        let A = Number.parseInt(s, 16),
          l = s.length * 4;
        return A / (2 ** l - 1) * 255;
      },
      h = Math.round(r(a)),
      i = Math.round(r(e)),
      c = Math.round(r(t));
    return this.rgbColors.cursor = {
      r: h,
      g: i,
      b: c
    }, !1;
  }
  processOsc4(T) {
    let R = T.match(/^4;(\d+);rgba?:([0-9a-f]+)\/([0-9a-f]+)\/([0-9a-f]+)/i);
    if (!R || !R[1] || !R[2] || !R[3] || !R[4]) return !1;
    let a = Number.parseInt(R[1], 10),
      e = R[2],
      t = R[3],
      r = R[4],
      h = A => {
        let l = Number.parseInt(A, 16),
          o = A.length * 4;
        return l / (2 ** o - 1) * 255;
      },
      i = Math.round(h(e)),
      c = Math.round(h(t)),
      s = Math.round(h(r));
    if (a >= 0 && a <= 7) this.rgbColors.indices[a] = {
      r: i,
      g: c,
      b: s
    };
    return !1;
  }
  setColorPaletteChangeCallback(T) {
    this.onColorPaletteChange = T;
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
      this.colorUpdateTimer = null;
    }, 200);
  }
  getColorQuerySequences() {
    return ["\x1B]10;?\x07", "\x1B]11;?\x07", "\x1B]12;?\x07", "\x1B]4;0;?\x07", "\x1B]4;1;?\x07", "\x1B]4;2;?\x07", "\x1B]4;3;?\x07", "\x1B]4;4;?\x07", "\x1B]4;5;?\x07", "\x1B]4;6;?\x07", "\x1B]4;7;?\x07"];
  }
  updateInbandPixelData(T, R, a, e) {
    if (a && e && a > 0 && e > 0) this.inbandPixelData = {
      pixelWidth: a,
      pixelHeight: e,
      columns: T,
      rows: R
    }, this.capabilities.pixelDimensions = !0;
  }
  checkPixelDimensions() {
    if (this.inbandPixelData) {
      this.capabilities.pixelDimensions = !0;
      return;
    }
    let T = QxT();
    this.capabilities.pixelDimensions = !!(T && T.pixelWidth > 0 && T.pixelHeight > 0);
  }
  isComplete() {
    return this.complete;
  }
  getCapabilities() {
    return {
      ...this.capabilities
    };
  }
  getRgbColors() {
    if (!this.rgbColors.foreground || !this.rgbColors.background || !this.rgbColors.cursor) return J.info("Missing fg, bg, or cursor color", {
      fg: !!this.rgbColors.foreground,
      bg: !!this.rgbColors.background,
      cursor: !!this.rgbColors.cursor
    }), null;
    for (let T = 0; T < 8; T++) if (!this.rgbColors.indices[T]) return J.info(`Missing palette color ${T}`), null;
    return J.info("All RGB colors available", {
      fg: this.rgbColors.foreground,
      bg: this.rgbColors.background,
      cursor: this.rgbColors.cursor,
      indicesCount: this.rgbColors.indices.filter(T => T !== null).length
    }), {
      fg: this.rgbColors.foreground,
      bg: this.rgbColors.background,
      cursor: this.rgbColors.cursor,
      indices: this.rgbColors.indices
    };
  }
  shouldUsePixelMouse() {
    return this.capabilities.pixelMouse && this.capabilities.pixelDimensions;
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
    return null;
  }
  getPendingQueries() {
    return this.complete ? [] : ["\x1B[c"];
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
        }).trim().replace(/^TERM=/, "").toLowerCase();
      } catch {}
      try {
        a = YxT("tmux show-environment -g TERM_PROGRAM 2>/dev/null", {
          encoding: "utf8",
          timeout: 1000
        }).trim().replace(/^TERM_PROGRAM=/, "").toLowerCase();
      } catch {}
      for (let e of T) if (R.includes(e) || a.includes(e)) return J.debug("Detected Kitty graphics support from tmux environment", {
        term: R,
        termProgram: a
      }), !0;
    } catch {}
    return !1;
  }
  detectRgbSupport() {
    if (process.env.TERM_PROGRAM === "Apple_Terminal") return !1;
    return !0;
  }
  detectCursorShapeSupport() {
    return !this.detectEmacs() && !this.detectJetBrains();
  }
  detectAnimationSupport() {
    if (this.options.animationDisabled) return "disabled";
    if (process.env.NO_ANIMATION === "1" || process.env.NO_ANIMATIONS === "1") return "disabled";
    if (this.detectEmacs() || this.detectSSH()) return "disabled";
    if (this.detectJetBrains()) return "slow";
    return "fast";
  }
  detectEmacs() {
    return !!process.env.INSIDE_EMACS;
  }
  detectJetBrains() {
    return process.env.TERMINAL_EMULATOR?.includes("JetBrains") ?? !1;
  }
  detectSSH() {
    return !!(process.env.SSH_CLIENT || process.env.SSH_TTY || process.env.SSH_CONNECTION);
  }
  detectTmux() {
    return !!process.env.TMUX;
  }
  isITerm2() {
    if (this.capabilities.xtversion?.toLowerCase().includes("iterm2")) return !0;
    return process.env.TERM_PROGRAM === "iTerm.app";
  }
  getScrollStep() {
    if (this.capabilities.xtversion?.startsWith("ghostty")) return 1;
    if (ji()) return 1;
    return 3;
  }
}