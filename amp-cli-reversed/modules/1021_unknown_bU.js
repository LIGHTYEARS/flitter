class bU {
  constructor() {
    bV.add(this), this.controller = new AbortController(), KL.set(this, void 0), VL.set(this, () => {}), e$.set(this, () => {}), t$.set(this, void 0), XL.set(this, () => {}), r$.set(this, () => {}), Lo.set(this, {}), h$.set(this, !1), k7.set(this, !1), x7.set(this, !1), Sy.set(this, !1), b9(this, KL, new Promise((T, R) => {
      b9(this, VL, T, "f"), b9(this, e$, R, "f");
    }), "f"), b9(this, t$, new Promise((T, R) => {
      b9(this, XL, T, "f"), b9(this, r$, R, "f");
    }), "f"), bR(this, KL, "f").catch(() => {}), bR(this, t$, "f").catch(() => {});
  }
  _run(T) {
    setTimeout(() => {
      T().then(() => {
        this._emitFinal(), this._emit("end");
      }, bR(this, bV, "m", CNT).bind(this));
    }, 0);
  }
  _connected() {
    if (this.ended) return;
    bR(this, VL, "f").call(this), this._emit("connect");
  }
  get ended() {
    return bR(this, h$, "f");
  }
  get errored() {
    return bR(this, k7, "f");
  }
  get aborted() {
    return bR(this, x7, "f");
  }
  abort() {
    this.controller.abort();
  }
  on(T, R) {
    return (bR(this, Lo, "f")[T] || (bR(this, Lo, "f")[T] = [])).push({
      listener: R
    }), this;
  }
  off(T, R) {
    let a = bR(this, Lo, "f")[T];
    if (!a) return this;
    let e = a.findIndex(t => t.listener === R);
    if (e >= 0) a.splice(e, 1);
    return this;
  }
  once(T, R) {
    return (bR(this, Lo, "f")[T] || (bR(this, Lo, "f")[T] = [])).push({
      listener: R,
      once: !0
    }), this;
  }
  emitted(T) {
    return new Promise((R, a) => {
      if (b9(this, Sy, !0, "f"), T !== "error") this.once("error", a);
      this.once(T, R);
    });
  }
  async done() {
    b9(this, Sy, !0, "f"), await bR(this, t$, "f");
  }
  _emit(T, ...R) {
    if (bR(this, h$, "f")) return;
    if (T === "end") b9(this, h$, !0, "f"), bR(this, XL, "f").call(this);
    let a = bR(this, Lo, "f")[T];
    if (a) bR(this, Lo, "f")[T] = a.filter(e => !e.once), a.forEach(({
      listener: e
    }) => e(...R));
    if (T === "abort") {
      let e = R[0];
      if (!bR(this, Sy, "f") && !a?.length) Promise.reject(e);
      bR(this, e$, "f").call(this, e), bR(this, r$, "f").call(this, e), this._emit("end");
      return;
    }
    if (T === "error") {
      let e = R[0];
      if (!bR(this, Sy, "f") && !a?.length) Promise.reject(e);
      bR(this, e$, "f").call(this, e), bR(this, r$, "f").call(this, e), this._emit("end");
    }
  }
  _emitFinal() {}
}