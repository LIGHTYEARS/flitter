// Module: tui-widget-framework
// Original: segment1[1533108:1580500]
// Type: Scope-hoisted
// Exports: Km0, e8, PtT, pu0, yu0, Pu0, Iu0, gu0, JVT, $u0, SxT, vu0, ju0, Dw, Su0, du0, Xb, Lu0, FP, RXT
// Category: framework

Data.length = 0, this.context.dcsData.length = 0;
break;
case "collect": if (R >= 60 && R <= 63) this.context.private.push(String.fromCharCode(R));
else this.context.intermediates.push(String.fromCharCode(R));
break;
case "param": if (R >= 48 && R <= 57)
  if (this.context.currentSubparams.length > 0) this.context.subparamBuffer.push(String.fromCharCode(R));
  else this.context.paramBuffer.push(String.fromCharCode(R));
else if (R === 59) this.finishParameter();
else if (R === 58) this.finishSubparameter();
break;
case "esc_dispatch": this.emitEvent({
  type: "escape",
  intermediates: this.context.intermediates.join(""),
  final: String.fromCharCode(R)
});
break;
case "csi_dispatch": this.finishParameter(), this.emitEvent({
  type: "csi",
  private: this.context.private.join(""),
  intermediates: this.context.intermediates.join(""),
  final: String.fromCharCode(R),
  params: [...this.context.params]
});
break;
case "hook": this.finishParameter(), this.context.dcsData.length = 0, this.context.final = String.fromCharCode(R);
break;
case "put": this.context.dcsData.push(String.fromCharCode(R));
break;
case "unhook": this.emitEvent({
  type: "dcs",
  private: this.context.private.join(""),
  intermediates: this.context.intermediates.join(""),
  final: this.context.final,
  params: [...this.context.params],
  data: this.context.dcsData.join("")
}), this.context.dcsEscSeen = R === 27;
break;
case "osc_start": this.context.oscData.length = 0, this.context.oscEscSeen = !1;
break;
case "osc_put": this.context.oscData.push(String.fromCharCode(R));
break;
case "osc_end": this.emitEvent({
  type: "osc",
  data: this.context.oscData.join("")
});
break;
case "apc_start": this.context.apcData.length = 0;
break;
case "apc_put": this.context.apcData.push(String.fromCharCode(R));
break;
case "apc_end": this.emitEvent({
  type: "apc",
  data: this.context.apcData.join("")
});
break
}
}
finishSubparameter() {
  if (this.context.currentSubparams.length === 0)
    if (this.context.paramBuffer.length > 0) {
      let T = parseInt(this.context.paramBuffer.join(""), 10);
      this.context.currentSubparams.push(isNaN(T) ? 0 : T), this.context.paramBuffer.length = 0
    }
  else this.context.currentSubparams.push(0);
  else if (this.context.subparamBuffer.length > 0) {
    let T = parseInt(this.context.subparamBuffer.join(""), 10);
    this.context.currentSubparams.push(isNaN(T) ? 0 : T), this.context.subparamBuffer.length = 0
  } else this.context.currentSubparams.push(0)
}
finishParameter() {
  if (this.context.currentSubparams.length > 0) {
    this.finishSubparameter();
    let [T, ...R] = this.context.currentSubparams, a = {
      value: T ?? 0
    };
    if (R.length > 0) a.subparams = R;
    this.context.params.push(a), this.context.currentSubparams = []
  } else if (this.context.paramBuffer.length > 0) {
    let T = parseInt(this.context.paramBuffer.join(""), 10);
    this.context.params.push({
      value: isNaN(T) ? 0 : T
    }), this.context.paramBuffer.length = 0
  } else this.context.params.push({
    value: 0
  })
}
addToPrintBuffer(T) {
  this.context.printBuffer.push(T), this.tryEmitGraphemes()
}
tryEmitAccumulatedGraphemes() {
  if (this.context.textBuffer.length > 1000) {
    this.flushTextBuffer();
    return
  }
  if (this.context.flushTimeout) clearTimeout(this.context.flushTimeout);
  this.context.flushTimeout = setTimeout(() => {
    if (this.context.textBuffer.length > 0) this.flushTextBuffer()
  }, 1)
}
tryEmitGraphemes() {
  if (this.context.printBuffer.length === 0) return;
  let T = 0,
    R = this.context.printBuffer;
  for (let a = 0; a < R.length; a++) {
    let e = R[a];
    if (e === void 0) continue;
    if (e < 128) T = a + 1;
    else if ((e & 224) === 192) {
      let t = R[a + 1];
      if (a + 1 < R.length && t !== void 0 && (t & 192) === 128) T = a + 2, a++;
      else break
    } else if ((e & 240) === 224) {
      let t = R[a + 1],
        r = R[a + 2];
      if (a + 2 < R.length && t !== void 0 && (t & 192) === 128 && r !== void 0 && (r & 192) === 128) T = a + 3, a += 2;
      else break
    } else if ((e & 248) === 240) {
      let t = R[a + 1],
        r = R[a + 2],
        h = R[a + 3];
      if (a + 3 < R.length && t !== void 0 && (t & 192) === 128 && r !== void 0 && (r & 192) === 128 && h !== void 0 && (h & 192) === 128) T = a + 4, a += 3;
      else break
    } else if ((e & 192) === 128) {
      this.emitEvent({
        type: "print",
        grapheme: "\uFFFD"
      }), this.context.printBuffer.splice(0, a + 1), this.tryEmitGraphemes();
      return
    } else {
      this.emitEvent({
        type: "print",
        grapheme: "\uFFFD"
      }), this.context.printBuffer.splice(0, a + 1), this.tryEmitGraphemes();
      return
    }
  }
  if (T > 0) {
    let a = new Uint8Array(R.slice(0, T)),
      e = new TextDecoder("utf-8", {
        fatal: !1
      }).decode(a);
    if (this.context.textBuffer += e, this.tryEmitAccumulatedGraphemes(), this.context.printBuffer.splice(0, T), this.context.printBuffer.length > 0) this.tryEmitGraphemes()
  }
}
flushPrintBuffer() {
  if (this.context.printBuffer.length > 0) {
    let T = new Uint8Array(this.context.printBuffer),
      R = new TextDecoder("utf-8", {
        fatal: !1
      }).decode(T);
    if (R.length > 0) this.context.textBuffer += R
  }
  this.context.printBuffer = []
}
flushTextBuffer() {
  if (this.context.flushTimeout) clearTimeout(this.context.flushTimeout), delete this.context.flushTimeout;
  if (this.context.textBuffer.length > 0) {
    let T = B9(this.context.textBuffer);
    for (let R of T) this.emitEvent({
      type: "print",
      grapheme: R
    });
    this.context.textBuffer = ""
  }
}
emitEvent(T) {
  for (let R of this.eventHandlers) R(T)
}
reset() {
  this.flushPrintBuffer(), this.flushTextBuffer(), this.context = {
    state: "ground",
    private: [],
    intermediates: [],
    final: "",
    params: [],
    paramBuffer: [],
    subparamBuffer: [],
    currentSubparams: [],
    oscData: [],
    dcsData: [],
    apcData: [],
    printBuffer: [],
    textBuffer: "",
    oscEscSeen: !1,
    apcEscSeen: !1,
    dcsEscSeen: !1
  }
}
getState() {
  return this.context.state
}
}
class Es {
  static instance = null;
  logs = [];
  maxLogs = 1000;
  listeners = new Set;
  constructor() {}
  static getInstance() {
    if (!Es.instance) Es.instance = new Es;
    return Es.instance
  }
  addLog(T, R, ...a) {
    let e = {
      timestamp: new Date,
      level: T,
      message: R,
      args: a
    };
    if (this.logs.push(e), this.logs.length > this.maxLogs) this.logs.shift();
    this.notifyListeners()
  }
  notifyListeners() {
    let T = this.getLogs();
    for (let R of this.listeners) try {
      R(T)
    }
    catch (a) {
      let e = this.originalConsole?.error;
      if (e) e("Error in log change listener:", a)
    }
  }
  getLogs() {
    return [...this.logs]
  }
  clear() {
    this.logs = [], this.notifyListeners()
  }
  addListener(T) {
    this.listeners.add(T)
  }
  removeListener(T) {
    this.listeners.delete(T)
  }
  interceptConsole() {
    let T = {
      error: console.error.bind(console),
      warn: console.warn.bind(console),
      info: console.info.bind(console),
      log: console.log.bind(console),
      debug: console.debug.bind(console)
    };
    console.error = (R, ...a) => {
      this.addLog("error", R, ...a)
    }, console.warn = (R, ...a) => {
      this.addLog("warn", R, ...a)
    }, console.info = (R, ...a) => {
      this.addLog("info", R, ...a)
    }, console.log = (R, ...a) => {
      this.addLog("info", R, ...a)
    }, console.debug = (R, ...a) => {
      this.addLog("debug", R, ...a)
    }, this.originalConsole = T
  }
  restoreConsole() {
    let T = this.originalConsole;
    if (T) console.error = T.error, console.warn = T.warn, console.info = T.info, console.log = T.log, console.debug = T.debug
  }
}

function Km0() {
  try {
    if (Es.getInstance().restoreConsole(), process.stdout.write("\x1B[?1002l"), process.stdout.write("\x1B[?1003l"), process.stdout.write("\x1B[?1004l"), process.stdout.write("\x1B[?1006l"), process.stdout.write("\x1B[?1016l"), process.stdout.write("\x1B[?2004l"), process.stdout.write("\x1B[?2031l"), process.stdout.write("\x1B[?2048l"), process.stdout.write("\x1B[<u"), process.stdout.write("\x1B[?1049l"), process.stdout.write("\x1B[0 q"), process.stdout.write("\x1B[?25h"), process.stdout.write("\x1B[999;1H"), process.stdout.write("\x1B[0m"), !process.env.TERM_PROGRAM?.startsWith("iTerm")) process.stdout.write("\x1B]9;4;0\x1B\\")
  } catch (T) {}
}

function e8(T, ...R) {
  if (!T) {
    let a = R.join(" "),
      e = Error(a);
    J.error("TUI Assert failed", {
      assertion: a,
      stackTrace: e.stack,
      meta: R
    });
    let t = process.env.AMP_DEBUG,
      r = process.env.VITEST;
    if (t || r) {
      if (r) throw e;
      Km0(), console.error("FATAL TUI ERROR:", a), console.error("Stack trace:", e.stack), console.error("Context:", {
        meta: R
      }), process.exit(1)
    }
  }
}
class ytT {
  parts = [];
  append(...T) {
    this.parts.push(...T)
  }
  toString() {
    return this.parts.join("")
  }
  reset() {
    this.parts.length = 0
  }
  get length() {
    return this.parts.length
  }
  get isEmpty() {
    return this.parts.length === 0
  }
}

function PtT(T, R, a) {
  let e = `${T},${R},${a}`,
    t = jxT.get(e);
  if (t !== void 0) return t;
  let r = 16,
    h = 1 / 0;
  for (let i = 0; i < vxT.length; i++) {
    let [c, s, A] = vxT[i], l = (T - c) ** 2 + (R - s) ** 2 + (a - A) ** 2;
    if (l < h) h = l, r = i + 16
  }
  return jxT.set(e, r), r
}

function pu0(T = {}) {
  let R = 5;
  if (T.reportEventTypes) R |= 2;
  if (T.reportAllKeys) R |= 8;
  if (T.reportAssociatedText) R |= 16;
  return t9 + `>${R}u`
}

function yu0(T) {
  if (T === "\t") return !1;
  let R = T.codePointAt(0);
  if (R === void 0) return !1;
  if (R >= 0 && R <= 8 || R >= 10 && R <= 31 || R === 127) return !0;
  if (R >= 128 && R <= 159) return !0;
  if (R === 8232 || R === 8233) return !0;
  if (R === 65279) return !0;
  return !1
}

function Pu0(T) {
  let R = T.codePointAt(0);
  if (R === void 0) return "\uFFFD";
  if (R >= 0 && R <= 31) return String.fromCodePoint(9216 + R);
  if (R === 127) return "\u2421";
  return "\uFFFD"
}

function Iu0(T) {
  return ru0 + (T ? iu0 : "")
}

function gu0() {
  return hu0 + cu0
}

function JVT(T) {
  return uu0(T)
}

function $u0() {
  return ZVT
}

function SxT(T, R, a) {
  if (!T) return "";
  switch (T.type) {
    case "none":
      return "";
    case "default":
      return t9 + (R ? "39" : "49") + "m";
    case "index":
      return t9 + `${R?"38":"48"};5;${T.value}m`;
    case "rgb": {
      if (a && !a.canRgb) {
        let {
          r: i,
          g: c,
          b: s
        } = T.value, A = PtT(i, c, s);
        return t9 + `${R?"38":"48"};5;${A}m`
      }
      let e = R ? "38" : "48",
        {
          r: t,
          g: r,
          b: h
        } = T.value;
      return t9 + `${e};2;${t};${r};${h}m`
    }
    default:
      return ""
  }
}

function vu0(T, R, a) {
  let e = "";
  if (!Dw(T.fg, R.fg)) {
    if (T.fg === void 0 && R.fg !== void 0) e += t9 + "39m";
    else e += SxT(T.fg, !0, a);
    R.fg = T.fg
  }
  if (!Dw(T.bg, R.bg)) {
    let t = T.bg?.type === "none",
      r = R.bg?.type === "none";
    if ((T.bg === void 0 || t) && R.bg !== void 0 && !r) e += t9 + "49m";
    else if (!t) e += SxT(T.bg, !1, a);
    R.bg = T.bg
  }
  if (T.bold !== R.bold) {
    if (e += T.bold ? t9 + "1m" : t9 + "22m", R.bold = T.bold, !T.bold && T.dim) e += t9 + "2m"
  }
  if (T.italic !== R.italic) e += T.italic ? t9 + "3m" : t9 + "23m", R.italic = T.italic;
  if (T.underline !== R.underline) {
    if (a?.underlineSupport !== "none") e += T.underline ? t9 + "4m" : t9 + "24m";
    R.underline = T.underline
  }
  if (T.strikethrough !== R.strikethrough) e += T.strikethrough ? t9 + "9m" : t9 + "29m", R.strikethrough = T.strikethrough;
  if (T.reverse !== R.reverse) e += T.reverse ? t9 + "7m" : t9 + "27m", R.reverse = T.reverse;
  if (T.dim !== R.dim) {
    if (e += T.dim ? t9 + "2m" : t9 + "22m", R.dim = T.dim, !T.dim && T.bold) e += t9 + "1m"
  }
  return e
}

function ju0(T, R) {
  let a = "";
  if (!gH(T, R.hyperlink)) {
    if (R.hyperlink) a += _Y();
    if (T) a += Mm0(T);
    R.hyperlink = T
  }
  return a
}

function Dw(T, R) {
  if (T === R) return !0;
  if (T === void 0 || R === void 0) return !1;
  if (T.type !== R.type) return !1;
  switch (T.type) {
    case "none":
      return !0;
    case "default":
      return !0;
    case "index":
      return R.value === T.value;
    case "rgb": {
      let a = R.value;
      return a.r === T.value.r && a.g === T.value.g && a.b === T.value.b
    }
    default:
      return !1
  }
}

function Su0(T, R) {
  return Dw(T.fg, R.fg) && Dw(T.bg, R.bg) && T.bold === R.bold && T.italic === R.italic && T.underline === R.underline && T.strikethrough === R.strikethrough && T.reverse === R.reverse && T.dim === R.dim
}

function du0(T, R) {
  if (T.char === "\t") {
    if (T.width === mtT) return Ou0;
    return " ".repeat(Math.max(1, T.width))
  }
  if (R?.kittyExplicitWidth && T.width > 1) return `\x1B]66;w=${T.width};${T.char}\x1B\\`;
  return T.char
}
class ktT {
  capabilities;
  currentStyle = {};
  currentX = 0;
  currentY = 0;
  constructor(T) {
    this.capabilities = T
  }
  updateCapabilities(T) {
    this.capabilities = T
  }
  render(T) {
    if (T.length === 0) return "";
    let R = new ytT,
      a = null,
      e, t = -1,
      r = -1;
    for (let h of T) {
      let i = h.cell.char,
        c = yu0(i),
        s = c ? Pu0(i) : i;
      if (e8(!c, `Cell contains disallowed control at (${h.x}, ${h.y}):`, `U+${i.codePointAt(0)?.toString(16).toUpperCase().padStart(4,"0")}`), !(a !== null && h.y === r && h.x === t && Su0(a, h.cell.style) && gH(e, h.cell.hyperlink))) {
        if (this.currentX !== h.x || this.currentY !== h.y) R.append($xT(h.y, h.x)), this.currentX = h.x, this.currentY = h.y;
        R.append(vu0(h.cell.style, this.currentStyle, this.capabilities)), R.append(ju0(h.cell.hyperlink, this.currentStyle)), a = h.cell.style, e = h.cell.hyperlink
      }
      let A = c ? {
          ...h.cell,
          char: s
        } :
        h.cell;
      R.append(du0(A, this.capabilities)), this.currentX += h.cell.width, t = h.x + h.cell.width, r = h.y
    }
    return R.toString()
  }
  clearScreen() {
    return this.currentX = 0, this.currentY = 0, this.currentStyle = {}, gxT + _Y() + Zm0 + Xm0
  }
  hideCursor() {
    return Ym0
  }
  showCursor() {
    return Qm0
  }
  setCursorShape(T) {
    if (this.capabilities?.supportsCursorShape === !1) return "";
    return fu0(T)
  }
  reset() {
    return this.currentStyle = {}, gxT + _Y()
  }
  moveTo(T, R) {
    return this.currentX = T, this.currentY = R, $xT(R, T)
  }
  getCursorPosition() {
    return {
      x: this.currentX,
      y: this.currentY
    }
  }
  resetState() {
    this.currentStyle = {}, this.currentX = 0, this.currentY = 0
  }
  startSync() {
    return Jm0
  }
  endSync() {
    return Tu0
  }
  enterAltScreen() {
    return eu0 + this.clearScreen()
  }
  exitAltScreen() {
    return tu0
  }
  resetCursor() {
    return Vm0
  }
  enableMouse(T = !1) {
    return Iu0(T)
  }
  disableMouse() {
    return gu0()
  }
  enableEmojiWidth() {
    return su0
  }
  disableEmojiWidth() {
    return ou0
  }
  enableInBandResize() {
    return nu0
  }
  disableInBandResize() {
    return lu0
  }
  enableBracketedPaste() {
    return Ru0
  }
  disableBracketedPaste() {
    return au0
  }
  enableKittyKeyboard(T = {}) {
    return pu0(T)
  }
  disableKittyKeyboard() {
    return Au0
  }
  enableModifyOtherKeys() {
    return _u0
  }
  disableModifyOtherKeys() {
    return bu0
  }
  setMouseShape(T) {
    return mu0(T)
  }
  setProgressBarIndeterminate() {
    return ku0
  }
  setProgressBarOff() {
    return ZVT
  }
  setProgressBarPaused() {
    return xu0
  }
}

function Xb() {
  if (process.env.TMUX || process.env.TMUX_PANE) return !0;
  return process.env.TERM?.toLowerCase()?.includes("tmux") ?? !1
}

function Lu0() {
  if (!Xb()) return !1;
  try {
    return Cu0('tmux display-message -p "#{pane_active}"', {
      timeout: 500,
      encoding: "utf8"
    }).trim() !== "1"
  } catch {
    return !1
  }
}

function FP(T) {
  if (!Xb()) return T;
  return `\x1BPtmux;${T.replace(/\x1b/g,"\x1B\x1B")}\x1B\\`
}

function RXT() {
  return Gu0("bun:ffi")
}

function Ku0() {
  let {
    dlopen: T,
    FFIType: R
  } = RXT();
  return T("kernel32.dll", {
    GetConsoleMode: {
      args: [R.u64, R.ptr],
      returns: R.i32
    },
    GetStdHandle: {
      args: [R.i32],
      returns: R.u64
    },
    SetConsoleMode: {
      args: [R.u64, R.u32],
      returns: R.i32
    }
  })
}

function xtT() {
  if (B4) return B4;
  return B4 = Ku0(), B4
}

function dxT(T) {
  let R = xtT().symbols.GetStdHandle(T);
  if (R === 0n || R === Nu0) throw Error(`GetStdHandle(${T}) returned an invalid handle`);
  return R
}

function ExT(T, R) {
  let a = new Uint32Array(1);
  if (xtT().symbols.GetConsoleMode(T, RXT().ptr(a)) === 0) throw Error(`GetConsoleMode(${R}) failed`);
  return a[0] ?? 0
}

function ug(T, R, a) {
  if (xtT().symbols.SetConsoleMode(T, R) === 0) throw Error(`SetConsoleMode(${a}) failed`)
}

function Vu0(T) {
  let R = T | zu0 | Hu0;
  return R &= ~(qu0 | Wu0 | Uu0), R
}

function Xu0(T) {
  return T | Fu0
}

function Yu0() {
  return null
}

function Qu0() {
  let T = "1.3.10";
  if (!T) return !1;
  let R = T.split(".").map(Number),
    a = R[0] ?? 0,
    e = R[1] ?? 0,
    t = R[2] ?? 0;
  if (!Number.isFinite(a) || !Number.isFinite(e) || !Number.isFinite(t)) return !1;
  if (a !== 1 || e !== 2) return !1;
  return t < 22
}

function aXT(T) {
  let R = "",
    a = 0;
  while (a < T.length) {
    let e = T.charCodeAt(a);
    if (e === 27) {
      if (a++, a >= T.length) break;
      let t = T.charCodeAt(a);
      if (t === 91) {
        a++;
        while (a < T.length) {
          let r = T.charCodeAt(a);
          if (a++, r >= 64 && r <= 126) break
        }
        continue
      }
      if (t === 93) {
        a++;
        while (a < T.length) {
          let r = T.charCodeAt(a);
          if (r === 7) {
            a++;
            break
          }
          if (r === 27 && a + 1 < T.length && T.charCodeAt(a + 1) === 92) {
            a += 2;
            break
          }
          a++
        }
        continue
      }
      if (t === 80) {
        a++;
        while (a < T.length) {
          if (T.charCodeAt(a) === 27 && a + 1 < T.length && T.charCodeAt(a + 1) === 92) {
            a += 2;
            break
          }
          a++
        }
        continue
      }
      if (t === 95 || t === 88 || t === 94) {
        a++;
        while (a < T.length) {
          if (T.charCodeAt(a) === 27 && a + 1 < T.length && T.charCodeAt(a + 1) === 92) {
            a += 2;
            break
          }
          a++
        }
        continue
      }
      if (t === 78 || t === 79) {
        a += 2;
        continue
      }
      if (t >= 64 && t <= 126) {
        a++;
        continue
      }
      continue
    }
    if (e === 127 || e === 8) {
      R = R.slice(0, -1), a++;
      continue
    }
    if (e < 32) {
      a++;
      continue
    }
    R += T[a], a++
  }
  return R
}

function Zu0() {
  let T = !1,
    R = {
      stdin: null,
      dataCallback: null,
      earlyInputBuffer: [],
      init() {
        if (this.stdin !== null) return;
        if (P8.stream) {
          if (J.info("[tty] taking over early stdin stream"), this.stdin = P8.stream, this.stdin.removeAllListeners("data"), P8.takenOver = !0, P8.buffer.length > 0) this.earlyInputBuffer.push(...P8.buffer), P8.buffer = [];
          this.stdin.on("data", (t) => {
            if (!T) this.earlyInputBuffer.push(Buffer.from(t));
            if (this.dataCallback) this.dataCallback(t)
          }), P8.stream = null;
          return
        }
        let a = Mu0("/dev/tty", "r");
        if (!OxT.isatty(a)) throw Error("/dev/tty is not a TTY device");
        let e = new OxT.ReadStream(a);
        this.stdin = e, e.setRawMode(!0), e.on("data", (t) => {
          if (!T) this.earlyInputBuffer.push(Buffer.from(t));
          if (this.dataCallback) this.dataCallback(t)
        })
      },
      on(a, e) {
        this.dataCallback = e
      },
      pause() {
        if (this.stdin) this.stdin.setRawMode(!1), this.stdin.removeAllListeners("data"), this.stdin.destroy();
        this.stdin = null
      },
      resume() {
        this.init()
      },
      dispose() {
        if (this.stdin) this.stdin.setRawMode(!1), this.stdin.removeAllListeners("data"), this.stdin.destroy();
        this.stdin = null, this.dataCallback = null, this.earlyInputBuffer = []
      },
      getEarlyInputText() {
        if (T = !0, this.earlyInputBuffer.length === 0) return "";
        let a = Buffer.concat(this.earlyInputBuffer).toString("utf8");
        return this.earlyInputBuffer = [], aXT(a)
      }
    };
  return R.init(), R
}

function Ju0() {
  let T = !1,
    R = null;

  function a() {
    if (R) return;
    try {
      R = Yu0()
    } catch (r) {
      J.warn("Failed to enable Windows VT input for TUI mouse reporting", {
        error: r
      })
    }
  }

  function e() {
    if (!R) return;
    try {
      R.restore()
    } catch (r) {
      J.warn("Failed to restore Windows console modes after TUI mouse reporting", {
        error: r
      })
    } finally {
      R = null
    }
  }
  let t = {
    stdin: null,
    dataCallback: null,
    earlyInputBuffer: [],
    init() {
      if (this.stdin !== null) return;
      if (this.stdin = process.stdin, a(), this.stdin.isTTY) this.stdin.setRawMode(!0);
      if (P8.buffer.length > 0) this.earlyInputBuffer.push(...P8.buffer), P8.buffer = [];
      if (P8.stream) P8.stream.removeAllListeners("data"), P8.stream = null, P8.takenOver = !0;
      this.stdin.on("data", (r) => {
        if (!T) this.earlyInputBuffer.push(Buffer.from(r));
        if (this.dataCallback) this.dataCallback(r)
      })
    },
    on(r, h) {
      this.dataCallback = h
    },
    pause() {
      if (e(), this.stdin && this.stdin.isTTY) this.stdin.setRawMode(!1);
      this.stdin?.pause()
    },
    resume() {
      if (a(), this.stdin && this.stdin.isTTY) this.stdin.setRawMode(!0);
      this.stdin?.resume()
    },
    dispose() {
      if (e(), this.stdin && this.stdin.isTTY) this.stdin.setRawMode(!1);
      if (this.stdin) this.stdin.removeAllListeners("data");
      this.stdin = null, this.dataCallback = null, this.earlyInputBuffer = []
    },
    getEarlyInputText() {
      if (T = !0, this.earlyInputBuffer.length === 0) return "";
      let r = Buffer.concat(this.earlyInputBuffer).toString("utf8");
      return this.earlyInputBuffer = [], aXT(r)
    }
  };
  return t.init(), t
}

function eXT() {
  if (Qu0()) return J.warn("Detected Bun <1.2.22 which has known /dev/tty issues. Please upgrade to Bun 1.2.22 or later for proper TTY support. Using process.stdin instead."), Ju0();
  return Zu0()
}

function LxT() {
  let T = null;
  try {
    if (process.stdout.isTTY) {
      let R = process.stdout.getWindowSize();
      T = [R[0], R[1]]
    }
  } catch {}
  return {
    isTTY: process.stdout.isTTY,
    columns: process.stdout.columns ?? null,
    rows: process.stdout.rows ?? null,
    windowSize: T,
    hasRefreshSize: typeof process.stdout._refreshSize === "function"
  }
}

function hy0() {
  if (process.stdout.isTTY) return {
    stream: process.stdout,
    target: "stdout",
    dispose: () => {}
  };
  if (process.stderr.isTTY) return {
    stream: process.stderr,
    target: "stderr",
    dispose: () => {}
  };
  try {
    let T = um0("/dev/tty", "w");
    if (Pm0.isatty(T)) return {
      stream: {
        write(R) {
          return ym0(T, R), !0
        }
      },
      target: "dev-tty",
      dispose: () => {
        _xT(T)
      }
    };
    _xT(T)
  } catch {}
  return {
    stream: process.stdout,
    target: "stdout",
    dispose: () => {}
  }
}

function L3(T, R) {
  if (!process.stdout.writable || process.stdout.destroyed) {
    R?.();
    return
  }
  let a = `${JSON.stringify(T)}
`;
  try {
    if (R) {
      if (!process.stdout.write(a)) {
        process.stdout.once("drain", R);
        return
      }
      R();
      return
    }
    process.stdout.write(a)
  } catch {
    R?.()
  }
}

function bY(T) {
  return Array.from(T, (R) => {
    if (R >= 32 && R <= 126 && R !== 92) return String.fromCharCode(R);
    if (R === 92) return "\\\\";
    return `\\x${R.toString(16).padStart(2,"0")}`
  }).join("")
}

function iy0(T) {
  return T.ctrlKey && T.key.toLowerCase() === "c" && T.eventType !== "repeat" && T.eventType !== "release"
}

function MxT(T) {
  try {
    let R = KVT(`tmux show-options -gv ${T}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 1000
    }).trim();
    return R === "" ? null : R
  } catch {
    return null
  }
}

function cy0() {
  try {
    let T = KVT("tmux display-message -p '#{client_termfeatures}'", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 1000
    }).trim();
    return T === "" ? [] : T.split(",").filter(Boolean)
  } catch {
    return null
  }
}

function Rh(T, R, a, e, t) {
  if (e.raw) {
    let r = Buffer.from(R);
    L3({
      type: "control",
      name: a,
      stage: t ?? null,
      bytes: r.toString("hex"),
      escaped: bY(r)
    })
  }
  T.stream.write(R)
}
async function sy0(T = {}) {
  let R = eXT(),
    a = new $H,
    e = new ktT,
    t = hy0(),
    r = Xb(),
    h = r ? {
      clientTermFeatures: cy0(),
      extendedKeysFormat: MxT("extended-keys-format"),
      extendedKeysMode: MxT("extended-keys")
    } :
    null,
    i = h?.clientTermFeatures?.includes("extkeys") ?? !1;
  if (T.raw) L3({
    type: "debug",
    controlTarget: t.target,
    platform: "darwin",
    stdoutIsTTY: process.stdout.isTTY,
    stderrIsTTY: process.stderr.isTTY,
    term: process.env.TERM ?? null,
    termProgram: process.env.TERM_PROGRAM ?? null,
    termProgramVersion: process.env.TERM_PROGRAM_VERSION ?? null,
    tmux: r,
    tmuxClientTermFeatures: h?.clientTermFeatures ?? null,
    tmuxExtendedKeys: r ? i : null,
    tmuxExtendedKeysFormat: h?.extendedKeysFormat ?? null,
    tmuxExtendedKeysMode: h?.extendedKeysMode ?? null
  });
  let c = !1,
    s = null,
    A = null,
    l = !1,
    o = !1,
    n = () => {
      L3({
        type: "signal",
        signal: "SIGWINCH",
        stdout: LxT()
      })
    },
    p = () => {
      L3({
        type: "stdout_resize",
        stdout: LxT()
      })
    },
    _ = new Promise((I) => {
      s = I
    }),
    m = () => {
      if (!A) return null;
      let I = A;
      A = null, clearTimeout(I.timeout);
      let S = {
        stage: I.stage,
        kittyQueryResponse: I.kittyQueryResponse,
        deviceAttributes: I.deviceAttributes
      };
      return L3({
        type: "startup_probe",
        stage: S.stage,
        timeoutMs: CxT,
        kittyQueryResponse: S.kittyQueryResponse,
        deviceAttributes: S.deviceAttributes
      }), I.resolve(S), S
    },
    b = (I) => {
      if (!A || I.request !== "u") return;
      if (A.kittyQueryResponse = I.response, A.deviceAttributes !== null) m()
    },
    y = (I) => {
      if (!A) return;
      if (A.deviceAttributes = {
          primary: I.primary,
          secondary: [...I.secondary]
        }, A.kittyQueryResponse !== null) m()
    },
    u = (I) => {
      if (A) m();
      return new Promise((S) => {
        A = {
          stage: I,
          kittyQueryResponse: null,
          deviceAttributes: null,
          resolve: S,
          timeout: setTimeout(() => {
            m()
          }, CxT)
        }, Rh(t, ey0, "kitty-query", T, I), Rh(t, Ty0, "device-attributes-query", T, I)
      })
    },
    P = () => {
      if (c) return;
      if (c = !0, o) process.off("SIGWINCH", n);
      if (process.stdout.isTTY) process.stdout.off("resize", p);
      process.off("SIGINT", x), process.off("SIGTERM", f), process.off("exit", P), m();
      try {
        if (l) Rh(t, ry0, "win32-input-mode-disable", T);
        if (Rh(t, ay0, "focus-disable", T), Rh(t, e.disableInBandResize(), "inband-resize-disable", T), Rh(t, e.disableBracketedPaste(), "bracketed-paste-disable", T), r) Rh(t, e.disableModifyOtherKeys(), "tmux-extended-keys-disable", T);
        Rh(t, e.disableKittyKeyboard(), "kitty-keyboard-disable", T)
      } catch {}
      t.dispose(), R.dispose()
    },
    k = (I) => {
      if (c) return;
      process.exitCode = I, P(), s?.()
    },
    x = () => {
      k(130)
    },
    f = () => {
      k(143)
    };
  process.once("SIGINT", x), process.once("SIGTERM", f), process.once("exit", P);
  try {
    process.on("SIGWINCH", n), o = !0
  } catch (I) {
    L3({
      type: "signal_subscription_error",
      signal: "SIGWINCH",
      error: I instanceof Error ? I.message : String(I)
    })
  }
  if (process.stdout.isTTY) process.stdout.on("resize", p);
  a.onKey((I) => {
    let S = {
      type: "key",
      key: I.key,
      code: I.code ?? null,
      modifiers: {
        shift: I.shiftKey,
        ctrl: I.ctrlKey,
        alt: I.altKey,
        meta: I.metaKey
      },
      eventType: I.eventType ?? null
    };
    if (iy0(I)) {
      L3(S, () => k(0));
      return
    }
    L3(S)
  }), a.onDcs((I) => {
    L3(I)
  }), a.onOsc((I) => {
    L3(I)
  }), a.onApc((I) => {
    L3(I)
  }), a.onPaste((I) => {
    L3(I)
  }), a.onSgrMouse((I) => {
    L3(I)
  }), a.onFocus((I) => {
    L3(I)
  }), a.onMouse((I) => {
    L3(I)
  }), a.onResize((I) => {
    L3(I)
  }), a.onColorPaletteChange((I) => {
    L3(I)
  }), a.onCursorPositionReport((I) => {
    L3(I)
  }), a.onDeviceAttributes((I) => {
    y(I), L3(I)
  }), a.onDecrqss((I) => {
    if (b(I), I.request === "u") {
      L3({
        type: "kitty_query_response",
        response: I.response
      });
      return
    }
    L3(I)
  }), R.on("data", (I) => {
    if (T.raw) L3({
      type: "raw",
      bytes: Buffer.from(I).toString("hex"),
      escaped: bY(I)
    });
    a.parse(I)
  });
  let v = [...R.earlyInputBuffer];
  R.earlyInputBuffer.length = 0;
  for (let I of v) {
    if (T.raw) L3({
      type: "raw",
      bytes: I.toString("hex"),
      escaped: bY(I)
    });
    a.parse(I)
  }
  await u("before_enable"), Rh(t, Ry0, "focus-enable", T), Rh(t, e.enableInBandResize(), "inband-resize-enable", T), Rh(t, e.enableBracketedPaste(), "bracketed-paste-enable", T), Rh(t, e.enableKittyKeyboard({
    reportEventTypes: !0
  }), "kitty-keyboard-enable", T);
  let g = await u("after_enable");
  if (r) L3({
    type: "tmux_info",
    extendedKeysFormat: h?.extendedKeysFormat ?? null,
    extendedKeysMode: h?.extendedKeysMode ?? null,
    hasExtkeysFeature: i,
    note: "tmux does not proxy kitty query/event-type support; enabling modifyOtherKeys mode 2 for press-only extended keys"
  }), Rh(t, ty0, "tmux-extended-keys-enable", T);
  await _
}
class xa {
  state = [!0, !1, !0, !1, !0, !1, !0, !1];
  previousState = [];
  generation = 0;
  maxGenerations = 15;
  neighborMap = [
    [1, 3, 4, 5, 7],
    [0, 2, 4, 5, 6],
    [1, 3, 5, 6, 7],
    [0, 2, 4, 6, 7],
    [0, 1, 3, 5, 7],
    [0, 1, 2, 4, 6],
    [1, 2, 3, 5, 7],
    [0, 2, 3, 4, 6]
  ];
  step() {
    let T = this.state.map((r, h) => {
        let i = this.neighborMap[h].filter((c) => this.state[c]).length;
        if (r) return i === 2 || i === 3;
        return i === 3 || i === 6
      }),
      R = T.every((r, h) => r === this.state[h]),
      a = this.previousState.length > 0 && T.every((r, h) => r === this.previousState[h]);
    this.previousState = [...this.state], this.state = T, this.generation++;
    let e = T.every((r) => !r),
      t = T.filter((r) => r).length;
    if (R || a || this.generation >= this.maxGenerations || e || t < 2) {
      let r;
      do r = Array.from({
        length: 8
      }, () => Math.random() > 0.6);
      while (r.filter((h) => h).length < 3);
      this.state = r, this.previousState = [], this.generation = 0
    }
  }
  toBraille() {
    let T = [0, 1, 2, 6, 3, 4, 5, 7],
      R = 10240;
    for (let a = 0; a < 8; a++)
      if (this.state[a]) R |= 1 << T[a];
    return String.fromCharCode(R)
  }
}

function xy0(T) {
  try {
    return process.kill(T, 0), !0
  } catch (R) {
    return R.code === "EPERM"
  }
}

function ItT(T, R) {
  return T.code === R
}

function fy0(T) {
  return T instanceof Error ? T.message : String(T)
}

function rXT(T) {
  if (typeof T !== "string") return null;
  let R = T.trim();
  return R.length > 0 ? R : null
}

function Iy0(T, R) {
  let a = Reflect.get(T, R);
  if (typeof a !== "number") return;
  return Number.isSafeInteger(a) && a > 0 ? a : void 0
}

function gy0(T, R) {
  return rXT(Reflect.get(T, R))
}

function $y0(T) {
  let R;
  try {
    R = JSON.parse(T)
  } catch {
    return
  }
  if (!R || typeof R !== "object") return;
  let a = Iy0(R, "pid"),
    e = Reflect.get(R, "threadId"),
    t = gy0(R, "threadTitle");
  if (a === void 0 || typeof e !== "string" || !Vt(e)) return;
  return {
    pid: a,
    threadId: e,
    threadTitle: t
  }
}

function vy0(T) {
  let R = {
    pid: T.pid,
    threadId: T.threadId
  };
  if (T.threadTitle) R.threadTitle = T.threadTitle;
  return `${JSON.stringify(R)}
`
}

function jy0(T) {
  return {
    pid: T.currentPID ?? process.pid,
    threadId: T.currentThreadId,
    threadTitle: rXT(T.currentThreadTitle)
  }
}
async function hXT(T) {
  try {
    let R = await my0(T, "utf-8"),
      a = $y0(R);
    if (a === void 0) return {
      kind: "invalid",
      value: R.trim()
    };
    return {
      kind: "valid",
      contents: a
    }
  } catch (R) {
    if (ItT(R, "ENOENT")) return {
      kind: "missing"
    };
    throw R
  }
}
async function iXT(T, R) {
  let a = await hXT(T);
  if (a.kind !== "valid" || a.contents.pid !== R) return;
  await mY(T, {
    force: !0
  })
}
async function Sy0(T) {
  try {
    process.kill(T, "SIGTERM")
  } catch (R) {
    if (ItT(R, "ESRCH")) return;
    throw R
  }
}
async function Oy0(T, R) {
  let a = Date.now() + Py0;
  while (Date.now() < a) {
    if (!R(T)) return !0;
    await Ey0(ky0)
  }
  return !R(T)
}

function dy0(T) {
  return ["Another amp live-sync is already running for this checkout.", "", ...[T.running.threadTitle, T.running.threadId, `PID ${T.running.pid}`].filter((R) => Boolean(R)), "", "Kill the running live-sync process and continue? [y/N]: "].join(`
`)
}

function DxT(T, R) {
  return {
    status: "claimed",
    pidFilePath: T,
    release: async () => iXT(T, R)
  }
}

function Ey0(T) {
  return new Promise((R) => {
    setTimeout(R, T)
  })
}
async function Cy0(T) {
  let R = T.currentPID ?? process.pid,
    a = jy0(T),
    e = T.isProcessRunning ?? xy0,
    t = T.killProcess ?? Sy0,
    r = T.waitForProcessExit ?? ((h) => Oy0(h, e));
  await by0(yy0.dirname(T.pidFilePath), {
    recursive: !0
  });
  while (!0) {
    let h = await hXT(T.pidFilePath);
    if (h.kind === "valid") {
      if (h.contents.pid === R) return DxT(T.pidFilePath, R);
      if (e(h.contents.pid)) {
        if (!T.promptForYesNo) return {
          status: "already-running",
          pidFilePath: T.pidFilePath,
          runningPID: h.contents.pid,
          runningThreadId: h.contents.threadId,
          runningThreadTitle: h.contents.threadTitle
        };
        let i = T.formatRunningPrompt?.({
          runningPID: h.contents.pid,
          runningThreadId: h.contents.threadId,
          runningThreadTitle: h.contents.threadTitle
        }) ?? dy0({
          running: h.contents
        });
        if (!await T.promptForYesNo(i)) return {
          status: "already-running",
          pidFilePath: T.pidFilePath,
          runningPID: h.contents.pid,
          runningThreadId: h.contents.threadId,
          runningThreadTitle: h.contents.threadTitle
        };
        try {
          await t(h.contents.pid)
        } catch (c) {
          throw new GR(`Couldn't stop live-sync PID ${h.contents.pid}: ${fy0(c)}`, 1)
        }
        if (!await r(h.contents.pid)) throw new GR(`Timed out waiting for live-sync PID ${h.contents.pid} to stop.`, 1);
        await iXT(T.pidFilePath, h.contents.pid);
        continue
      }
      await mY(T.pidFilePath, {
        force: !0
      });
      continue
    }
    if (h.kind === "invalid") {
      await mY(T.pidFilePath, {
        force: !0
      });
      continue
    }
    try {
      return await uy0(T.pidFilePath, vy0(a), {
        encoding: "utf-8",
        flag: "wx",
        mode: 384
      }), DxT(T.pidFilePath, R)
    } catch (i) {
      if (ItT(i, "EEXIST")) continue;
      throw i
    }
  }
}

function Ly0(T, R) {
  uY = T, yY = R
}

function cXT() {
  return typeof process < "u" && (process.env.BUN_TEST === "1" || globalThis.Bun?.jest !== void 0 || typeof globalThis.test === "function")
}

function My0() {
  if (!uY) {
    if (cXT()) return {
      scheduleBuildFor: () => {}
    };
    throw Error("Build scheduler not initialized. Make sure WidgetsBinding is created.")
  }
  return uY
}

function uF() {
  if (!yY) {
    if (cXT()) return {
      requestLayout: () => {},
      requestPaint: () => {},
      removeFromQueues: () => {}
    };
    throw Error("Paint scheduler not initialized. Make sure WidgetsBinding is created.")
  }
  return yY
}
class vH {
  _parent;
  _children = [];
  _needsLayout = !1;
  _needsPaint = !1;
  _cachedDepth;
  _attached = !1;
  _debugData = {};
  allowHitTestOutsideBounds = !1;
  parentData;
  setupParentData(T) {}
  sendDebugData(T) {
    this._debugData = {
      ...this._debugData,
      ...T
    }
  }
  get debugData() {
    return this._debugData
  }
  get parent() {
    return this._parent
  }
  get children() {
    return this._children
  }
  get depth() {
    if (this._cachedDepth !== void 0) return this._cachedDepth;
    let T = 0,
      R = this._parent;
    while (R) T++, R = R._parent;
    return this._cachedDepth = T, T
  }
  _invalidateDepth() {
    this._cachedDepth = void 0;
    for (let T of this._children) T._invalidateDepth()
  }
  get needsLayout() {
    return this._needsLayout
  }
  get needsPaint() {
    return this._needsPaint
  }
  get attached() {
    return this._attached
  }
  adoptChild(T) {
    if (T._parent = this, T._invalidateDepth(), this._children.push(T), this.setupParentData(T), this._attached) T.attach();
    this.markNeedsLayout()
  }
  dropChild(T) {
    let R = this._children.indexOf(T);
    if (R !== -1) {
      if (T._attached) T.detach();
      this._children.splice(R, 1), T._parent = void 0, T._invalidateDepth(), this.markNeedsLayout()
    }
  }
  removeAllChildren() {
    for (let T of this._children) {
      if (T._attached) T.detach();
      T._parent = void 0, T._invalidateDepth()
    }
    this._children.length = 0, this.markNeedsLayout()
  }
  replaceChildren(T) {
    for (let R of T) R._parent = this, R._invalidateDepth(), this.setupParentData(R);
    this._children = T, this.markNeedsLayout()
  }
  attach() {
    if (this._attached) return;
    this._attached = !0;
    for (let T of this._children) T.attach()
  }
  detach() {
    if (!this._attached) return;
    this._attached = !1;
    for (let T of this._children) T.detach()
  }
  markNeedsLayout() {
    if (this._needsLayout) return;
    if (!this._attached) return;
    if (this._needsLayout = !0, this.parent) this.parent.markNeedsLayout();
    else uF().requestLayout(this)
  }
  markNeedsPaint() {
    if (this._needsPaint) return;
    if (!this._attached) return;
    this._needsPaint = !0, uF().requestPaint(this)
  }
  performLayout() {}
  paint(T, R = 0, a = 0) {
    this._needsPaint = !1;
    for (let e of this.children)
      if ("offset" in e) {
        let t = e,
          r = R + t.offset.x,
          h = a + t.offset.y;
        e.paint(T, r, h)
      }
    else e.paint(T, R, a)
  }
  visitChildren(T) {
    for (let R of this._children) T(R)
  }
  dispose() {
    uF().removeFromQueues(this), this._cachedDepth = void 0, this._parent = void 0, this._children.length = 0
  }
}

function N4(T, R = 0) {
  return Number.isFinite(T) ? T : R
}
class o0 {
  minWidth;
  maxWidth;
  minHeight;
  maxHeight;
  constructor(T, R, a, e) {
    if (typeof T === "object") this.minWidth = T.minWidth ?? 0, this.maxWidth = T.maxWidth ?? 1 / 0, this.minHeight = T.minHeight ?? 0, this.maxHeight = T.maxHeight ?? 1 / 0;
    else this.minWidth = T ?? 0, this.maxWidth = R ?? 1 / 0, this.minHeight = a ?? 0, this.maxHeight = e ?? 1 / 0
  }
  static tight(T, R) {
    return new o0(T, T, R, R)
  }
  static loose(T, R) {
    return new o0(0, T, 0, R)
  }
  get hasBoundedWidth() {
    return this.maxWidth !== 1 / 0
  }
  get hasBoundedHeight() {
    return this.maxHeight !== 1 / 0
  }
  get hasTightWidth() {
    return this.minWidth >= this.maxWidth
  }
  get hasTightHeight() {
    return this.minHeight >= this.maxHeight
  }
  constrain(T, R) {
    return e8(isFinite(T), `BoxConstraints.constrain received infinite width: ${T}. This indicates a layout bug where a widget is not properly calculating its desired size.`), e8(isFinite(R), `BoxConstraints.constrain received infinite height: ${R}. This indicates a layout bug where a widget is not properly calculating its desired size.`), {
      width: Math.max(this.minWidth, Math.min(this.maxWidth, T)),
      height: Math.max(this.minHeight, Math.min(this.maxHeight, R))
    }
  }
  enforce(T) {
    let R = (a, e, t) => Math.max(e, Math.min(t, a));
    return new o0(R(T.minWidth, this.minWidth, this.maxWidth), R(T.maxWidth, this.minWidth, this.maxWidth), R(T.minHeight, this.minHeight, this.maxHeight), R(T.maxHeight, this.minHeight, this.maxHeight))
  }
  get biggest() {
    return {
      width: this.maxWidth,
      height: this.maxHeight
    }
  }
  get smallest() {
    return {
      width: this.minWidth,
      height: this.minHeight
    }
  }
  loosen() {
    return new o0(0, this.maxWidth, 0, this.maxHeight)
  }
  tighten({
    width: T,
    height: R
  } = {}) {
    return new o0(T === void 0 ? this.minWidth : Math.max(this.minWidth, Math.min(this.maxWidth, T)), T === void 0 ? this.maxWidth : Math.max(this.minWidth, Math.min(this.maxWidth, T)), R === void 0 ? this.minHeight : Math.max(this.minHeight, Math.min(this.maxHeight, R)), R === void 0 ? this.maxHeight : Math.max(this.minHeight, Math.min(this.maxHeight, R)))
  }
  static tightFor({
    width: T,
    height: R
  } = {}) {
    return new o0(T ?? 0, T ?? 1 / 0, R ?? 0, R ?? 1 / 0)
  }
  equals(T) {
    return this.minWidth === T.minWidth && this.maxWidth === T.maxWidth && this.minHeight === T.minHeight && this.maxHeight === T.maxHeight
  }
}
class jH {
  constructor() {}
}
class Mn {
  key;
  _debugData = {};
  constructor({
    key: T
  } = {}) {
    if (this.constructor === Mn) throw Error("Widget is abstract and cannot be instantiated directly");
    this.key = T
  }
  sendDebugData(T) {
    this._debugData = {
      ...this._debugData,
      ...T
    }
  }
  get debugData() {
    return this._debugData
  }
  canUpdate(T) {
    if (this.constructor !== T.constructor) return !1;
    if (this.key === void 0 && T.key === void 0) return !0;
    if (this.key === void 0 || T.key === void 0) return !1;
    return this.key.equals(T.key)
  }
}
class qm {
  widget;
  parent;
  _children = [];
  _inheritedDependencies = new Set;
  _dirty = !1;
  _cachedDepth;
  _mounted = !1;
  constructor(T) {
    this.widget = T
  }
  get children() {
    return this._children
  }
  get depth() {
    if (this._cachedDepth !== void 0) return this._cachedDepth;
    let T = 0,
      R = this.parent;
    while (R) T++, R = R.parent;
    return this._cachedDepth = T, T
  }
  _invalidateDepth() {
    this._cachedDepth = void 0;
    for (let T of this._children) T._invalidateDepth()
  }
  get dirty() {
    return this._dirty
  }
  get mounted() {
    return this._mounted
  }
  get renderObject() {
    return
  }
  update(T) {
    this.widget = T
  }
  addChild(T) {
    T.parent = this, T._invalidateDepth(), this._children.push(T)
  }
  removeChild(T) {
    let R = this._children.indexOf(T);
    if (R !== -1) this._children.splice(R, 1), T.parent = void 0, T._invalidateDepth()
  }
  removeAllChildren() {
    for (let T of this._children) T.parent = void 0, T._invalidateDepth();
    this._children.length = 0
  }
  markMounted() {
    if (this._mounted = !0, this.widget.key instanceof ph) this.widget.key._setElement(this)
  }
  unmount() {
    if (this.widget.key instanceof ph) this.widget.key._clearElement();
    this._mounted = !1, this._dirty = !1, this._cachedDepth = void 0;
    for (let T of this._inheritedDependencies)
      if ("removeDependent" in T) T.removeDependent(this);
    this._inheritedDependencies.clear()
  }
  markNeedsRebuild() {
    if (!this._mounted) return;
    this._dirty = !0, My0().scheduleBuildFor(this)
  }
  dependOnInheritedWidgetOfExactType(T) {
    let R = this.parent;
    while (R) {
      if (R.widget.constructor === T) {
        if ("addDependent" in R && "removeDependent" in R) {
          let a = R;
          a.addDependent(this), this._inheritedDependencies.add(a)
        }
        return R
      }
      R = R.parent
    }
    return null
  }
  findAncestorElementOfType(T) {
    let R = this.parent;
    while (R) {
      if (R instanceof T) return R;
      R = R.parent
    }
    return null
  }
  findAncestorWidgetOfType(T) {
    let R = this.parent;
    while (R) {
      if (R.widget instanceof T) return R.widget;
      R = R.parent
    }
    return null
  }
}
class wR {
  widget;
  context;
  _mounted = !1;
  get mounted() {
    return this._mounted
  }
  initState() {}
  didUpdateWidget(T) {}
  dispose() {}
  setState(T) {
    if (!this._mounted) throw Error("setState() called after dispose()");
    if (T) T();
    this._markNeedsBuild()
  }
  _mount(T, R) {
    this.widget = T, this.context = R, this._mounted = !0, this.initState()
  }
  _update(T) {
    let R = this.widget;
    this.widget = T, this.didUpdateWidget(R)
  }
  _unmount() {
    this._mounted = !1, this.dispose()
  }
  _markNeedsBuild() {
    let T = this.context.element;
    if ("markNeedsBuild" in T && typeof T.markNeedsBuild === "function") T.markNeedsBuild()
  }
}
class Ib {
  element;
  widget;
  mediaQuery;
  parent;
  constructor(T, R, a = void 0, e = null) {
    this.element = T, this.widget = R, this.mediaQuery = a, this.parent = e
  }
  findAncestorElementOfType(T) {
    let R = this.element.parent;
    while (R) {
      if (R instanceof T) return R;
      R = R.parent
    }
    return null
  }
  findAncestorWidgetOfType(T) {
    return this.element.findAncestorWidgetOfType(T)
  }
  dependOnInheritedWidgetOfExactType(T) {
    return this.element.dependOnInheritedWidgetOfExactType(T)
  }
  findAncestorStateOfType(T) {
    let R = this.element.parent;
    while (R) {
      if ("state" in R && R.state instanceof T) return R.state;
      R = R.parent
    }
    return null
  }
  findRenderObject() {
    if ("renderObject" in this.element) {
      let T = this.element.renderObject;
      return T instanceof vH ? T : void 0
    }
    return
  }
}
class oXT {
  static hitTest(T, R) {
    let a = new nXT;
    return T.hitTest(a, R), a
  }
}
class nXT {
  _hits = [];
  get hits() {
    return this._hits
  }
  add(T) {
    this._hits.push(T)
  }
  addWithPaintOffset(T, R, a) {
    let e = {
      x: a.x - R.x,
      y: a.y - R.y
    };
    this.add({
      target: T,
      localPosition: e
    })
  }
  addMouseTarget(T, R) {}
}

function Dy0() {
  let T = vH.prototype;
  if (!T.hitTest) T.hitTest = function(R, a, e = 0, t = 0) {
    if ("size" in this && "offset" in this) {
      let h = this,
        i = h.size,
        c = h.offset;
      if (i && c) {
        let s = e + c.x,
          A = t + c.y,
          l = a.x >= s && a.x < s + i.width,
          o = a.y >= A && a.y < A + i.height;
        if (l && o) {
          let n = {
            x: a.x - s,
            y: a.y - A
          };
          R.add({
            target: this,
            localPosition: n
          });
          let p = this.children,
            _ = !0;
          for (let m = p.length - 1; m >= 0; m--)
            if (p[m].hitTest(R, a, s, A)) _ = !0;
          return _
        }
        if (this.allowHitTestOutsideBounds) {
          let n = !1,
            p = this.children;
          for (let _ = p.length - 1; _ >= 0; _--)
            if (p[_].hitTest(R, a, s, A)) n = !0;
          return n
        }
        return !1
      }
    }
    let r = !1;
    for (let h of this.children)
      if (h.hitTest(R, a, e, t)) r = !0;
    return r
  }
}

function Ol(T, R, a) {
  return {
    position: R,
    localPosition: a,
    modifiers: {
      shift: T.modifiers.shift,
      ctrl: T.modifiers.ctrl,
      alt: T.modifiers.alt,
      meta: T.modifiers.meta
    },
    timestamp: Date.now()
  }
}

function wy0(T, R, a, e = 1) {
  return {
    type: "click",
    button: T.button === "left" ? "left" : T.button === "middle" ? "middle" : T.button === "right" ? "right" : "left",
    clickCount: e,
    ...Ol(T, R, a)
  }
}

function yF(T, R, a) {
  let e;
  switch (T.button) {
    case "wheel_up":
      e = "up";
      break;
    case "wheel_down":
      e = "down";
      break;
    case "wheel_left":
      e = "left";
      break;
    case "wheel_right":
      e = "right";
      break;
    default:
      e = "down"
  }
  return {
    type: "scroll",
    direction: e,
    ...Ol(T, R, a)
  }
}
class Vk {
  foreground;
  mutedForeground;
  background;
  cursor;
  primary;
  secondary;
  accent;
  border;
  success;
  warning;
  info;
  destructive;
  selection;
  copyHighlight;
  tableBorder;
  constructor({
    foreground: T,
    mutedForeground: R,
    background: a,
    cursor: e,
    primary: t,
    secondary: r,
    accent: h,
    border: i,
    success: c,
    warning: s,
    info: A,
    destructive: l,
    selection: o,
    copyHighlight: n,
    tableBorder: p
  }) {
    this.foreground = T, this.mutedForeground = R, this.background = a, this.cursor = e, this.primary = t, this.secondary = r, this.accent = h, this.border = i, this.success = c, this.warning = s, this.info = A, this.destructive = l, this.selection = o, this.copyHighlight = n, this.tableBorder = p
  }
  static
  default () {
    return new Vk({
      foreground: LT.default(),
      mutedForeground: LT.default(),
      background: LT.none(),
      cursor: LT.default(),
      primary: LT.blue,
      secondary: LT.cyan,
      accent: LT.magenta,
      border: LT.default(),
      success: LT.green,
      warning: LT.yellow,
      info: LT.index(12),
      destructive: LT.red,
      selection: LT.index(8),
      copyHighlight: LT.yellow,
      tableBorder: LT.default()
    })
  }
  static fromRgb(T) {
    return new Vk({
      foreground: LT.rgb(T.fg.r, T.fg.g, T.fg.b),
      mutedForeground: LT.rgb(T.indices[7].r, T.indices[7].g, T.indices[7].b),
      background: LT.none(),
      cursor: LT.rgb(T.cursor.r, T.cursor.g, T.cursor.b),
      primary: LT.rgb(T.indices[4].r, T.indices[4].g, T.indices[4].b),
      secondary: LT.rgb(T.indices[6].r, T.indices[6].g, T.indices[6].b),
      accent: LT.rgb(T.indices[5].r, T.indices[5].g, T.indices[5].b),
      border: LT.rgb(T.fg.r, T.fg.g, T.fg.b),
      success: LT.rgb(T.indices[2].r, T.indices[2].g, T.indices[2].b),
      warning: LT.rgb(T.indices[3].r, T.indices[3].g, T.indices[3].b),
      info: LT.rgb(T.indices[6].r, T.indices[6].g, T.indices[6].b),
      destructive: LT.rgb(T.indices[1].r, T.indices[1].g, T.indices[1].b),
      selection: LT.index(8),
      copyHighlight: LT.rgb(T.indices[3].r, T.indices[3].g, T.indices[3].b),
      tableBorder: LT.rgb(T.fg.r, T.fg.g, T.fg.b)
    })
  }
}
class Gt {
  colorScheme;
  constructor({
    colorScheme: T
  }) {
    this.colorScheme = T
  }
  static
  default () {
    return new Gt({
      colorScheme: Vk.default()
    })
  }
  static withRgb(T) {
    return new Gt({
      colorScheme: Vk.fromRgb(T)
    })
  }
}

function PF(T, R, a) {
  return T + (R - T) * a
}

function pXT(T, R, a) {
  let e = Math.max(0, Math.min(1, a));
  return {
    r: Math.round(PF(T.r, R.r, e)),
    g: Math.round(PF(T.g, R.g, e)),
    b: Math.round(PF(T.b, R.b, e))
  }
}

function _XT(T) {
  let R = xi(T ?? "smart") ?? xi("smart");
  if (R?.uiHints?.primaryColor && R.uiHints.secondaryColor) return {
    primary: R.uiHints.primaryColor,
    secondary: R.uiHints.secondaryColor
  };
  return {
    primary: tCT,
    secondary: rCT
  }
}

function bXT(T, R, a) {
  let e = Math.max(0, Math.min(1, T)),
    {
      primary: t,
      secondary: r
    } = a ?? _XT(R),
    h = pXT(t, r, e);
  return {
    type: "rgb",
    value: {
      r: h.r,
      g: h.g,
      b: h.b
    }
  }
}
class Xk {
  _noise2D;
  _seed;
  constructor(T) {
    this._seed = T ?? Date.now(), this._noise2D = By0.makeNoise2D(this._seed)
  }
  get seed() {
    return this._seed
  }
  sample(T, R, a, e = 1) {
    return (this._noise2D(T / wxT, R / wxT + a * e) + 1) * 0.5
  }
  sampleEdge(T, R, a, e, t = 1) {
    let r = T - 1,
      h = R / 2 + a * (R / 2);
    return this.sample(r, h, e, t)
  }
  getColor(T, R, a) {
    return bXT(T, R, a)
  }
}

function RP0(T, R) {
  let a = new Map;
  for (let h of T?.available ? T.files : []) a.set(h.path, HxT(h));
  let e = new Set(R.files.map((h) => h.path)),
    t = R.files.filter((h) => a.get(h.path) !== HxT(h)),
    r = fXT([...T?.available ? T.files.filter((h) => !e.has(h.path)).map((h) => h.path) : [], ...R.files.flatMap((h) => h.changeType === "renamed" && h.previousPath && !e.has(h.previousPath) ? [h.previousPath] : [])]);
  return {
    syncFiles: t,
    restorePaths: r
  }
}

function xF(T) {
  let R = T.filter((t) => t.changeType === "untracked").length,
    a = T.length - R,
    e = [];
  if (a > 0) e.push(`${a} changed ${o9(a,"file")}`);
  if (R > 0) e.push(`${R} untracked ${o9(R,"file")}`);
  return e.length > 0 ? e.join(" and ") : "0 files"
}

function aP0(T) {
  let R = T.changeType.replaceAll("_", " ");
  if ((T.changeType === "renamed" || T.changeType === "copied") && T.previousPath) return `${R}: ${T.previousPath} -> ${T.path}`;
  return `${R}: ${T.path}`
}

function eP0(T, R = Fy0) {
  let a = T.slice(0, R).map((t) => `  ${aP0(t)}`),
    e = T.length - a.length;
  if (e > 0) a.push(`  ...and ${e} more ${o9(e,"file")}`);
  return a.join(`
`)
}
async function Bw(T) {
  let R = await EA(T, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
  return tVT(R.stdout).filter((a) => a.path !== xXT).map((a) => ({
    path: a.path,
    changeType: a.changeType,
    previousPath: a.previousPath
  }))
}
async function tP0(T) {
  await EA(T, ["reset", "--hard", "HEAD"]), await EA(T, ["clean", "-fd", "-e", xXT])
}
async function rP0(T) {
  let R = await Bw(T.repoRoot);
  if (R.length === 0) return;
  if (!await T.promptForYesNo([`Local checkout has ${xF(R)}:`, eP0(R), "Clean them up before live sync starts?", "This will discard tracked changes and delete untracked files.", $tT].join(`
`))) return;
  Hy(T.stdout, `Clearing local changes (${xF(R)})...`), await tP0(T.repoRoot);
  let a = await Bw(T.repoRoot);
  if (a.length > 0) throw new GR(["Couldn't fully clean the local checkout before live sync starts.", `Still found ${xF(a)}.`].join(" "), 1)
}
async function hP0(T) {
  let R = RP0(T.previousStatus, T.nextStatus),
    a = T.progressReporter,
    e = {
      writtenFiles: 0,
      restoredFiles: 0,
      deletedFiles: 0,
      unchangedFiles: 0,
      syncedPaths: [],
      removedPaths: []
    };
  for (let t of R.restorePaths) {
    await a?.onPathStart({
      action: "syncing",
      path: t
    });
    let r = await xP0({
      repoRoot: T.repoRoot,
      relativePath: t,
      readRemoteFile: T.readRemoteFile
    });
    if (r.outcome === "written") {
      e.restoredFiles += 1, e.syncedPaths.push(t), await a?.onPathComplete({
        outcome: "updated",
        path: t
      });
      continue
    }
    if (r.outcome === "deleted") {
      e.deletedFiles += 1, e.removedPaths.push(t), await a?.onPathComplete({
        outcome: "removed",
        path: t
      });
      continue
    }
    e.unchangedFiles += 1, await a?.onPathComplete({
      outcome: "unchanged",
      path: t
    })
  }
  for (let t of R.syncFiles.filter((r) => r.changeType === "deleted")) {
    if (await a?.onPathStart({
        action: "removing",
        path: t.path
      }), await $XT(vtT(T.repoRoot, t.path))) {
      e.deletedFiles += 1, e.removedPaths.push(t.path), await a?.onPathComplete({
        outcome: "removed",
        path: t.path
      });
      continue
    }
    e.unchangedFiles += 1, await a?.onPathComplete({
      outcome: "unchanged",
      path: t.path
    })
  }
  for (let t of R.syncFiles.filter((r) => r.changeType !== "deleted")) {
    await a?.onPathStart({
      action: "updating",
      path: t.path
    });
    let r = await T.readRemoteFile(t.path);
    if (await gXT({
        repoRoot: T.repoRoot,
        relativePath: t.path,
        content: r
      }) === "written") {
      e.writtenFiles += 1, e.syncedPaths.push(t.path), await a?.onPathComplete({
        outcome: "updated",
        path: t.path
      });
      continue
    }
    e.unchangedFiles += 1, await a?.onPathComplete({
      outcome: "unchanged",
      path: t.path
    })
  }
  return e
}

function iP0(T) {
  let R = !1,
    a = [],
    e = (h, i) => {
      if (T.onWriteLine) {
        T.onWriteLine(h, i);
        return
      }
      if (h === "stdout") {
        GP(T.stdout, i);
        return
      }
      GP(T.stderr, i)
    },
    t = (h, i) => {
      if (R) {
        a.push({
          stream: h,
          message: i
        });
        return
      }
      e(h, i)
    },
    r = () => {
      for (let h of a) e(h.stream, h.message);
      a.length = 0
    };
  return {
    writeStdoutLine: (h) => {
      t("stdout", h)
    },
    writeStderrLine: (h) => {
      t("stderr", h)
    },
    runWithPromptBuffer: async (h) => {
      R = !0, T.onPromptStart?.();
      try {
        return await h()
      } finally {
        R = !1, T.onPromptEnd?.(), r()
      }
    }
  }
}

function cP0(T) {
  let R = !1,
    a = null,
    e = T.initialArchived,
    t, r = () => {
      if (a !== null) clearTimeout(a), a = null
    },
    h = new Promise((s) => {
      t = s
    }),
    i = () => {
      if (R) return;
      a = setTimeout(() => {
        c()
      }, T.pollIntervalMs ?? qy0)
    },
    c = async () => {
      if (R) return;
      try {
        let s = await T.loadArchived();
        if (R) return;
        if (e === !1 && s) {
          R = !0, r(), t();
          return
        }
        e = s
      } catch (s) {
        if (R) return;
        T.onCheckError?.(s)
      }
      i()
    };
  return i(), {
    archivedTransition: h,
    dispose: () => {
      R = !0, r()
    }
  }
}

function sP0(T) {
  let R = null;
  return {
    promise: new Promise((a) => {
      R = setTimeout(a, T)
    }),
    dispose: () => {
      if (R !== null) clearTimeout(R), R = null
    }
  }
}

function PY(T) {
  return T === Z3T || T === k7R
}

function oP0(T) {
  let R = null;
  for (let a of T) {
    if (!PY(a.key)) continue;
    if (!R) {
      R = a;
      continue
    }
    let e = Date.parse(R.updatedAt),
      t = Date.parse(a.updatedAt);
    if (Number.isFinite(e) && Number.isFinite(t)) {
      if (t >= e) R = a;
      continue
    }
    R = a
  }
  return R
}

function UxT(T, R) {
  try {
    let a = Buffer.from(T.contentBase64, "base64").toString("utf8"),
      e = $s0.safeParse(JSON.parse(a));
    if (e.success) return {
      status: e.data,
      error: null
    };
    return {
      status: null,
      error: `${R}: invalid git status artifact payload`
    }
  } catch {
    return {
      status: null,
      error: `${R}: failed to decode git status artifact payload`
    }
  }
}

function nP0(T) {
  if (T.type === "artifacts_snapshot") {
    let R = oP0(T.artifacts);
    if (!R) return {
      status: null,
      error: null
    };
    return UxT(R, "snapshot")
  }
  if (T.type === "artifact_upserted") {
    if (!PY(T.artifact.key)) return {
      status: null,
      error: null
    };
    return UxT(T.artifact, "upsert")
  }
  if (!PY(T.key)) return {
    status: null,
    error: null
  };
  return {
    status: null,
    error: null
  }
}
async function lP0(T) {
  let R = T.stdout ?? Ne.stdout,
    a = T.stderr ?? Ne.stderr,
    e = T.applyOnce === !0,
    t = T.promptForEnter ?? JP0,
    r = T.promptForYesNo ?? null,
    h = r ?? Rk0,
    i = T.checkoutMode ?? "prompt",
    c = T.workerURL ?? Pi(T.ampURL),
    s = await mP0(T.cwd ?? Ne.cwd()),
    A = await QP0({
      threadId: T.threadId,
      threadService: T.threadService
    }),
    l = await Cy0({
      pidFilePath: await uP0(s),
      currentThreadId: T.threadId,
      currentThreadTitle: A.title,
      promptForYesNo: r ? (o) => r(Uw(o, R)) : void 0,
      formatRunningPrompt: ({
        runningPID: o,
        runningThreadId: n,
        runningThreadTitle: p
      }) => EP0({
        output: R,
        runningPID: o,
        runningThreadId: n,
        runningThreadTitle: p
      })
    });
  if (l.status !== "claimed") throw new GR(yP0(l), 1);
  try {
    await AP0({
      threadId: T.threadId,
      threadInfo: A,
      configService: T.configService,
      threadService: T.threadService,
      apiKey: T.apiKey,
      applyOnce: e,
      workerURL: c,
      checkoutMode: i,
      checkoutPrompt: h,
      promptForEnter: t,
      promptForYesNo: r,
      stdout: R,
      stderr: a,
      repoRoot: s,
      initialGitStatusTimeoutMs: T.initialGitStatusTimeoutMs
    })
  } finally {
    await l.release()
  }
}
async function AP0(T) {
    let {
      applyOnce: R,
      checkoutMode: a,
      checkoutPrompt: e,
      promptForEnter: t,
      promptForYesNo: r,
      repoRoot: h,
      stderr: i,
      stdout: c,
      workerURL: s
    } = T, A = await IXT(h), l = KP0(), o = await uA(T.threadId, T.configService, T.apiKey);
    if (!o.usesDtw) throw new GR("live-sync only supports v2/DTW threads", 1);
    let n = OP0({
        threadId: T.threadId,
        threadTitle: T.threadInfo.title,
        repoRoot: h,
        stdout: c,
        stderr: i
      }),
      p = iP0({
        stdout: c,
        stderr: i,
        onWriteLine: (j, d) => n.writeLine(j, d),
        onPromptStart: () => n.onPromptStart(),
        onPromptEnd: () => n.onPromptEnd()
      }),
      _ = RA(c) ? jP0({
        outputSurface: n,
        lineWriter: p
      }) : null,
      m = cP0({
        initialArchived: T.threadInfo.archived,
        loadArchived: () => ZP0({
          threadId: T.threadId,
          threadService: T.threadService
        }),
        onCheckError: (j) => {
          if (l) p.writeStderrLine(`live-sync: debug: failed to refresh archived state: ${CM(j)}`)
        }
      }),
      b = null,
      y = null,
      u = !1,
      P = !1,
      k = ak0(),
      x = k.promise.then(() => {
        P = !0
      }),
      f = m.archivedTransition.then(() => {
        u = !0
      }),
      v = !0,
      g = !1,
      I = () => new uH({
        baseURL: s,
        threadId: o.threadId,
        wsToken: o.wsToken,
        wsTokenProvider: async () => {
          let j = await uA(o.threadId, T.configService, T.apiKey);
          return {
            threadId: j.threadId,
            wsToken: j.wsToken
          }
        },
        WebSocketClass: WebSocket,
        maxReconnectAttempts: Number.POSITIVE_INFINITY,
        pingIntervalMs: 5000
      }),
      S = (j) => {
        n.clearTransientStatus(), p.writeStdoutLine(j)
      },
      O = async () => {
          let j = I(),
            d = null,
            C = null,
            L = !1,
            w = !1,
            D = null,
            B = null,
            M = null,
            V = 0,
            Q = !1,
            W = null,
            eT = null,
            iT = null,
            aT = new Promise((Z) => {
              iT = Z
            }),
            oT = null,
            TT = new Promise((Z, X) => {
              oT = X
            });
          TT.catch(() => {});
          let tT = sP0(zy0),
            lT = [x.then(() => ny), f.then(() => oy), tT.promise.then(() => yg)],
            N = (Z) => {
              if (!oT) return;
              if (l) p.writeStderrLine(`live-sync: debug: fatal error: ${CM(Z)}`);
              let X = oT;
              oT = null, X(Z)
            },
            q = () => {
              n.clearTransientStatus()
            },
            F = () => {
              if (!L || C) return;
              C = E().catch((Z) => {
                N(Z)
              }).finally(() => {
                if (C = null, L && d) F()
              })
            },
            E = async () => {
                while (L && d) {
                  let Z = d;
                  if (d = null, !Z.available) {
                    if (Z.unavailableReason && Z.unavailableReason !== W) p.writeStderrLine(`live-sy