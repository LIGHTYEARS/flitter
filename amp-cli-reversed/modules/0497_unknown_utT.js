class utT {
  context;
  eventHandlers = [];
  constructor() {
    this.context = {
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
    };
  }
  onEvent(T) {
    this.eventHandlers.push(T);
  }
  offEvent(T) {
    let R = this.eventHandlers.indexOf(T);
    if (R !== -1) this.eventHandlers.splice(R, 1);
  }
  parse(T) {
    let R = typeof T === "string" ? this.stringToBytes(T) : T;
    for (let a of R) this.processByte(a);
  }
  flush() {
    this.flushPrintBuffer(), this.flushTextBuffer();
  }
  stringToBytes(T) {
    return new TextEncoder().encode(T);
  }
  processByte(T) {
    if (this.context.state === "osc_string" && T === 27) {
      this.context.oscEscSeen = !0;
      return;
    }
    if (this.context.oscEscSeen && T === 92) {
      this.context.oscEscSeen = !1, this.performAction("osc_end", T), this.context.state = "ground";
      return;
    }
    if (this.context.oscEscSeen) this.context.oscEscSeen = !1;
    if (this.context.state === "sos_pm_apc_string" && T === 27) {
      this.context.apcEscSeen = !0;
      return;
    }
    if (this.context.apcEscSeen && T === 92) {
      this.context.apcEscSeen = !1, this.performAction("apc_end", T), this.context.state = "ground";
      return;
    }
    if (this.context.apcEscSeen) {
      this.context.apcEscSeen = !1, this.performAction("clear", 27), this.context.state = "escape";
      let e = Ov.escape[T];
      if (e) this.performAction(e.action, T), this.context.state = e.nextState;
      return;
    }
    let R = Ov[this.context.state][T];
    if (!R) return;
    let a = this.context.state;
    if (this.performAction(R.action, T), this.context.state === "ground" && R.nextState !== "ground") this.flushTextBuffer();
    if (this.context.state === a) this.context.state = R.nextState;
  }
  performAction(T, R) {
    if (this.context.dcsEscSeen && R === 92) {
      this.context.dcsEscSeen = !1;
      return;
    }
    if (this.context.dcsEscSeen) this.context.dcsEscSeen = !1;
    switch (T) {
      case "ignore":
        break;
      case "print":
        this.addToPrintBuffer(R);
        break;
      case "execute":
        this.flushTextBuffer(), this.emitEvent({
          type: "execute",
          code: R
        });
        break;
      case "clear":
        this.flushTextBuffer(), this.context.private.length = 0, this.context.intermediates.length = 0, this.context.final = "", this.context.params = [], this.context.oscEscSeen = !1, this.context.paramBuffer.length = 0, this.context.subparamBuffer.length = 0, this.context.currentSubparams = [], this.context.oscData.length = 0, this.context.dcsData.length = 0;
        break;
      case "collect":
        if (R >= 60 && R <= 63) this.context.private.push(String.fromCharCode(R));else this.context.intermediates.push(String.fromCharCode(R));
        break;
      case "param":
        if (R >= 48 && R <= 57) {
          if (this.context.currentSubparams.length > 0) this.context.subparamBuffer.push(String.fromCharCode(R));else this.context.paramBuffer.push(String.fromCharCode(R));
        } else if (R === 59) this.finishParameter();else if (R === 58) this.finishSubparameter();
        break;
      case "esc_dispatch":
        this.emitEvent({
          type: "escape",
          intermediates: this.context.intermediates.join(""),
          final: String.fromCharCode(R)
        });
        break;
      case "csi_dispatch":
        this.finishParameter(), this.emitEvent({
          type: "csi",
          private: this.context.private.join(""),
          intermediates: this.context.intermediates.join(""),
          final: String.fromCharCode(R),
          params: [...this.context.params]
        });
        break;
      case "hook":
        this.finishParameter(), this.context.dcsData.length = 0, this.context.final = String.fromCharCode(R);
        break;
      case "put":
        this.context.dcsData.push(String.fromCharCode(R));
        break;
      case "unhook":
        this.emitEvent({
          type: "dcs",
          private: this.context.private.join(""),
          intermediates: this.context.intermediates.join(""),
          final: this.context.final,
          params: [...this.context.params],
          data: this.context.dcsData.join("")
        }), this.context.dcsEscSeen = R === 27;
        break;
      case "osc_start":
        this.context.oscData.length = 0, this.context.oscEscSeen = !1;
        break;
      case "osc_put":
        this.context.oscData.push(String.fromCharCode(R));
        break;
      case "osc_end":
        this.emitEvent({
          type: "osc",
          data: this.context.oscData.join("")
        });
        break;
      case "apc_start":
        this.context.apcData.length = 0;
        break;
      case "apc_put":
        this.context.apcData.push(String.fromCharCode(R));
        break;
      case "apc_end":
        this.emitEvent({
          type: "apc",
          data: this.context.apcData.join("")
        });
        break;
    }
  }
  finishSubparameter() {
    if (this.context.currentSubparams.length === 0) {
      if (this.context.paramBuffer.length > 0) {
        let T = parseInt(this.context.paramBuffer.join(""), 10);
        this.context.currentSubparams.push(isNaN(T) ? 0 : T), this.context.paramBuffer.length = 0;
      } else this.context.currentSubparams.push(0);
    } else if (this.context.subparamBuffer.length > 0) {
      let T = parseInt(this.context.subparamBuffer.join(""), 10);
      this.context.currentSubparams.push(isNaN(T) ? 0 : T), this.context.subparamBuffer.length = 0;
    } else this.context.currentSubparams.push(0);
  }
  finishParameter() {
    if (this.context.currentSubparams.length > 0) {
      this.finishSubparameter();
      let [T, ...R] = this.context.currentSubparams,
        a = {
          value: T ?? 0
        };
      if (R.length > 0) a.subparams = R;
      this.context.params.push(a), this.context.currentSubparams = [];
    } else if (this.context.paramBuffer.length > 0) {
      let T = parseInt(this.context.paramBuffer.join(""), 10);
      this.context.params.push({
        value: isNaN(T) ? 0 : T
      }), this.context.paramBuffer.length = 0;
    } else this.context.params.push({
      value: 0
    });
  }
  addToPrintBuffer(T) {
    this.context.printBuffer.push(T), this.tryEmitGraphemes();
  }
  tryEmitAccumulatedGraphemes() {
    if (this.context.textBuffer.length > 1000) {
      this.flushTextBuffer();
      return;
    }
    if (this.context.flushTimeout) clearTimeout(this.context.flushTimeout);
    this.context.flushTimeout = setTimeout(() => {
      if (this.context.textBuffer.length > 0) this.flushTextBuffer();
    }, 1);
  }
  tryEmitGraphemes() {
    if (this.context.printBuffer.length === 0) return;
    let T = 0,
      R = this.context.printBuffer;
    for (let a = 0; a < R.length; a++) {
      let e = R[a];
      if (e === void 0) continue;
      if (e < 128) T = a + 1;else if ((e & 224) === 192) {
        let t = R[a + 1];
        if (a + 1 < R.length && t !== void 0 && (t & 192) === 128) T = a + 2, a++;else break;
      } else if ((e & 240) === 224) {
        let t = R[a + 1],
          r = R[a + 2];
        if (a + 2 < R.length && t !== void 0 && (t & 192) === 128 && r !== void 0 && (r & 192) === 128) T = a + 3, a += 2;else break;
      } else if ((e & 248) === 240) {
        let t = R[a + 1],
          r = R[a + 2],
          h = R[a + 3];
        if (a + 3 < R.length && t !== void 0 && (t & 192) === 128 && r !== void 0 && (r & 192) === 128 && h !== void 0 && (h & 192) === 128) T = a + 4, a += 3;else break;
      } else if ((e & 192) === 128) {
        this.emitEvent({
          type: "print",
          grapheme: "\uFFFD"
        }), this.context.printBuffer.splice(0, a + 1), this.tryEmitGraphemes();
        return;
      } else {
        this.emitEvent({
          type: "print",
          grapheme: "\uFFFD"
        }), this.context.printBuffer.splice(0, a + 1), this.tryEmitGraphemes();
        return;
      }
    }
    if (T > 0) {
      let a = new Uint8Array(R.slice(0, T)),
        e = new TextDecoder("utf-8", {
          fatal: !1
        }).decode(a);
      if (this.context.textBuffer += e, this.tryEmitAccumulatedGraphemes(), this.context.printBuffer.splice(0, T), this.context.printBuffer.length > 0) this.tryEmitGraphemes();
    }
  }
  flushPrintBuffer() {
    if (this.context.printBuffer.length > 0) {
      let T = new Uint8Array(this.context.printBuffer),
        R = new TextDecoder("utf-8", {
          fatal: !1
        }).decode(T);
      if (R.length > 0) this.context.textBuffer += R;
    }
    this.context.printBuffer = [];
  }
  flushTextBuffer() {
    if (this.context.flushTimeout) clearTimeout(this.context.flushTimeout), delete this.context.flushTimeout;
    if (this.context.textBuffer.length > 0) {
      let T = B9(this.context.textBuffer);
      for (let R of T) this.emitEvent({
        type: "print",
        grapheme: R
      });
      this.context.textBuffer = "";
    }
  }
  emitEvent(T) {
    for (let R of this.eventHandlers) R(T);
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
    };
  }
  getState() {
    return this.context.state;
  }
}