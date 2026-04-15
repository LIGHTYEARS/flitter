class i6T {
  constructor(T, R, a, e = {}, t = []) {
    this.apiClient = T, this.modelsModule = R, this.model = a, this.config = e, this.history = t, this.sendPromise = Promise.resolve(), FvR(t);
  }
  async sendMessage(T) {
    var R;
    await this.sendPromise;
    let a = it(T.message),
      e = this.modelsModule.generateContent({
        model: this.model,
        contents: this.getHistory(!0).concat(a),
        config: (R = T.config) !== null && R !== void 0 ? R : this.config
      });
    return this.sendPromise = (async () => {
      var t, r, h;
      let i = await e,
        c = (r = (t = i.candidates) === null || t === void 0 ? void 0 : t[0]) === null || r === void 0 ? void 0 : r.content,
        s = i.automaticFunctionCallingHistory,
        A = this.getHistory(!0).length,
        l = [];
      if (s != null) l = (h = s.slice(A)) !== null && h !== void 0 ? h : [];
      let o = c ? [c] : [];
      this.recordHistory(a, o, l);
      return;
    })(), await this.sendPromise.catch(() => {
      this.sendPromise = Promise.resolve();
    }), e;
  }
  async sendMessageStream(T) {
    var R;
    await this.sendPromise;
    let a = it(T.message),
      e = this.modelsModule.generateContentStream({
        model: this.model,
        contents: this.getHistory(!0).concat(a),
        config: (R = T.config) !== null && R !== void 0 ? R : this.config
      });
    this.sendPromise = e.then(() => {
      return;
    }).catch(() => {
      return;
    });
    let t = await e;
    return this.processStreamResponse(t, a);
  }
  getHistory(T = !1) {
    let R = T ? GAT(this.history) : this.history;
    return structuredClone(R);
  }
  processStreamResponse(T, R) {
    return ac(this, arguments, function* () {
      var a, e, t, r, h, i;
      let c = [];
      try {
        for (var s = !0, A = ec(T), l; l = yield S9(A.next()), a = l.done, !a; s = !0) {
          r = l.value, s = !1;
          let o = r;
          if (zvR(o)) {
            let n = (i = (h = o.candidates) === null || h === void 0 ? void 0 : h[0]) === null || i === void 0 ? void 0 : i.content;
            if (n !== void 0) c.push(n);
          }
          yield yield S9(o);
        }
      } catch (o) {
        e = {
          error: o
        };
      } finally {
        try {
          if (!s && !a && (t = A.return)) yield S9(t.call(A));
        } finally {
          if (e) throw e.error;
        }
      }
      this.recordHistory(R, c);
    });
  }
  recordHistory(T, R, a) {
    let e = [];
    if (R.length > 0 && R.every(t => t.role !== void 0)) e = R;else e.push({
      role: "model",
      parts: []
    });
    if (a && a.length > 0) this.history.push(...GAT(a));else this.history.push(T);
    this.history.push(...e);
  }
}