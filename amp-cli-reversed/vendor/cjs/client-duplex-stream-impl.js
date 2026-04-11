// Module: client-duplex-stream-impl
// Original: zrR
// Type: CJS (RT wrapper)
// Exports: ClientDuplexStreamImpl, ClientReadableStreamImpl, ClientUnaryCallImpl, ClientWritableStreamImpl, callErrorFromStatus
// Category: util

// Module: zrR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.ClientDuplexStreamImpl =
      T.ClientWritableStreamImpl =
      T.ClientReadableStreamImpl =
      T.ClientUnaryCallImpl =
        void 0),
    (T.callErrorFromStatus = t));
  var R = qT("events"),
    a = qT("stream"),
    e = c8();
  function t(s, A) {
    let l = `${s.code} ${e.Status[s.code]}: ${s.details}`,
      o = `${Error(l).stack}
for call at
${A}`;
    return Object.assign(Error(l), s, { stack: o });
  }
  class r extends R.EventEmitter {
    constructor() {
      super();
    }
    cancel() {
      var s;
      (s = this.call) === null ||
        s === void 0 ||
        s.cancelWithStatus(e.Status.CANCELLED, "Cancelled on client");
    }
    getPeer() {
      var s, A;
      return (A =
        (s = this.call) === null || s === void 0 ? void 0 : s.getPeer()) !==
        null && A !== void 0
        ? A
        : "unknown";
    }
  }
  T.ClientUnaryCallImpl = r;
  class h extends a.Readable {
    constructor(s) {
      super({ objectMode: !0 });
      this.deserialize = s;
    }
    cancel() {
      var s;
      (s = this.call) === null ||
        s === void 0 ||
        s.cancelWithStatus(e.Status.CANCELLED, "Cancelled on client");
    }
    getPeer() {
      var s, A;
      return (A =
        (s = this.call) === null || s === void 0 ? void 0 : s.getPeer()) !==
        null && A !== void 0
        ? A
        : "unknown";
    }
    _read(s) {
      var A;
      (A = this.call) === null || A === void 0 || A.startRead();
    }
  }
  T.ClientReadableStreamImpl = h;
  class i extends a.Writable {
    constructor(s) {
      super({ objectMode: !0 });
      this.serialize = s;
    }
    cancel() {
      var s;
      (s = this.call) === null ||
        s === void 0 ||
        s.cancelWithStatus(e.Status.CANCELLED, "Cancelled on client");
    }
    getPeer() {
      var s, A;
      return (A =
        (s = this.call) === null || s === void 0 ? void 0 : s.getPeer()) !==
        null && A !== void 0
        ? A
        : "unknown";
    }
    _write(s, A, l) {
      var o;
      let n = { callback: l },
        p = Number(A);
      if (!Number.isNaN(p)) n.flags = p;
      (o = this.call) === null ||
        o === void 0 ||
        o.sendMessageWithContext(n, s);
    }
    _final(s) {
      var A;
      ((A = this.call) === null || A === void 0 || A.halfClose(), s());
    }
  }
  T.ClientWritableStreamImpl = i;
  class c extends a.Duplex {
    constructor(s, A) {
      super({ objectMode: !0 });
      ((this.serialize = s), (this.deserialize = A));
    }
    cancel() {
      var s;
      (s = this.call) === null ||
        s === void 0 ||
        s.cancelWithStatus(e.Status.CANCELLED, "Cancelled on client");
    }
    getPeer() {
      var s, A;
      return (A =
        (s = this.call) === null || s === void 0 ? void 0 : s.getPeer()) !==
        null && A !== void 0
        ? A
        : "unknown";
    }
    _read(s) {
      var A;
      (A = this.call) === null || A === void 0 || A.startRead();
    }
    _write(s, A, l) {
      var o;
      let n = { callback: l },
        p = Number(A);
      if (!Number.isNaN(p)) n.flags = p;
      (o = this.call) === null ||
        o === void 0 ||
        o.sendMessageWithContext(n, s);
    }
    _final(s) {
      var A;
      ((A = this.call) === null || A === void 0 || A.halfClose(), s());
    }
  }
  T.ClientDuplexStreamImpl = c;
};
