// Module: intercepting-call
// Original: pvT
// Type: CJS (RT wrapper)
// Exports: InterceptingCall, InterceptorConfigurationError, ListenerBuilder, RequesterBuilder, getInterceptingCall
// Category: util

// Module: pvT (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.InterceptingCall =
      T.RequesterBuilder =
      T.ListenerBuilder =
      T.InterceptorConfigurationError =
        void 0),
    (T.getInterceptingCall = m));
  var R = Yt(),
    a = FrR(),
    e = c8(),
    t = jZ();
  class r extends Error {
    constructor(b) {
      super(b);
      ((this.name = "InterceptorConfigurationError"),
        Error.captureStackTrace(this, r));
    }
  }
  T.InterceptorConfigurationError = r;
  class h {
    constructor() {
      ((this.metadata = void 0),
        (this.message = void 0),
        (this.status = void 0));
    }
    withOnReceiveMetadata(b) {
      return ((this.metadata = b), this);
    }
    withOnReceiveMessage(b) {
      return ((this.message = b), this);
    }
    withOnReceiveStatus(b) {
      return ((this.status = b), this);
    }
    build() {
      return {
        onReceiveMetadata: this.metadata,
        onReceiveMessage: this.message,
        onReceiveStatus: this.status,
      };
    }
  }
  T.ListenerBuilder = h;
  class i {
    constructor() {
      ((this.start = void 0),
        (this.message = void 0),
        (this.halfClose = void 0),
        (this.cancel = void 0));
    }
    withStart(b) {
      return ((this.start = b), this);
    }
    withSendMessage(b) {
      return ((this.message = b), this);
    }
    withHalfClose(b) {
      return ((this.halfClose = b), this);
    }
    withCancel(b) {
      return ((this.cancel = b), this);
    }
    build() {
      return {
        start: this.start,
        sendMessage: this.message,
        halfClose: this.halfClose,
        cancel: this.cancel,
      };
    }
  }
  T.RequesterBuilder = i;
  var c = {
      onReceiveMetadata: (b, y) => {
        y(b);
      },
      onReceiveMessage: (b, y) => {
        y(b);
      },
      onReceiveStatus: (b, y) => {
        y(b);
      },
    },
    s = {
      start: (b, y, u) => {
        u(b, y);
      },
      sendMessage: (b, y) => {
        y(b);
      },
      halfClose: (b) => {
        b();
      },
      cancel: (b) => {
        b();
      },
    };
  class A {
    constructor(b, y) {
      var u, P, k, x;
      if (
        ((this.nextCall = b),
        (this.processingMetadata = !1),
        (this.pendingMessageContext = null),
        (this.processingMessage = !1),
        (this.pendingHalfClose = !1),
        y)
      )
        this.requester = {
          start: (u = y.start) !== null && u !== void 0 ? u : s.start,
          sendMessage:
            (P = y.sendMessage) !== null && P !== void 0 ? P : s.sendMessage,
          halfClose:
            (k = y.halfClose) !== null && k !== void 0 ? k : s.halfClose,
          cancel: (x = y.cancel) !== null && x !== void 0 ? x : s.cancel,
        };
      else this.requester = s;
    }
    cancelWithStatus(b, y) {
      this.requester.cancel(() => {
        this.nextCall.cancelWithStatus(b, y);
      });
    }
    getPeer() {
      return this.nextCall.getPeer();
    }
    processPendingMessage() {
      if (this.pendingMessageContext)
        (this.nextCall.sendMessageWithContext(
          this.pendingMessageContext,
          this.pendingMessage,
        ),
          (this.pendingMessageContext = null),
          (this.pendingMessage = null));
    }
    processPendingHalfClose() {
      if (this.pendingHalfClose) this.nextCall.halfClose();
    }
    start(b, y) {
      var u, P, k, x, f, v;
      let g = {
        onReceiveMetadata:
          (P =
            (u = y === null || y === void 0 ? void 0 : y.onReceiveMetadata) ===
              null || u === void 0
              ? void 0
              : u.bind(y)) !== null && P !== void 0
            ? P
            : (I) => {},
        onReceiveMessage:
          (x =
            (k = y === null || y === void 0 ? void 0 : y.onReceiveMessage) ===
              null || k === void 0
              ? void 0
              : k.bind(y)) !== null && x !== void 0
            ? x
            : (I) => {},
        onReceiveStatus:
          (v =
            (f = y === null || y === void 0 ? void 0 : y.onReceiveStatus) ===
              null || f === void 0
              ? void 0
              : f.bind(y)) !== null && v !== void 0
            ? v
            : (I) => {},
      };
      ((this.processingMetadata = !0),
        this.requester.start(b, g, (I, S) => {
          var O, j, d;
          this.processingMetadata = !1;
          let C;
          if ((0, a.isInterceptingListener)(S)) C = S;
          else {
            let L = {
              onReceiveMetadata:
                (O = S.onReceiveMetadata) !== null && O !== void 0
                  ? O
                  : c.onReceiveMetadata,
              onReceiveMessage:
                (j = S.onReceiveMessage) !== null && j !== void 0
                  ? j
                  : c.onReceiveMessage,
              onReceiveStatus:
                (d = S.onReceiveStatus) !== null && d !== void 0
                  ? d
                  : c.onReceiveStatus,
            };
            C = new a.InterceptingListenerImpl(L, g);
          }
          (this.nextCall.start(I, C),
            this.processPendingMessage(),
            this.processPendingHalfClose());
        }));
    }
    sendMessageWithContext(b, y) {
      ((this.processingMessage = !0),
        this.requester.sendMessage(y, (u) => {
          if (((this.processingMessage = !1), this.processingMetadata))
            ((this.pendingMessageContext = b), (this.pendingMessage = y));
          else
            (this.nextCall.sendMessageWithContext(b, u),
              this.processPendingHalfClose());
        }));
    }
    sendMessage(b) {
      this.sendMessageWithContext({}, b);
    }
    startRead() {
      this.nextCall.startRead();
    }
    halfClose() {
      this.requester.halfClose(() => {
        if (this.processingMetadata || this.processingMessage)
          this.pendingHalfClose = !0;
        else this.nextCall.halfClose();
      });
    }
  }
  T.InterceptingCall = A;
  function l(b, y, u) {
    var P, k;
    let x = (P = u.deadline) !== null && P !== void 0 ? P : 1 / 0,
      f = u.host,
      v = (k = u.parent) !== null && k !== void 0 ? k : null,
      g = u.propagate_flags,
      I = u.credentials,
      S = b.createCall(y, x, f, v, g);
    if (I) S.setCredentials(I);
    return S;
  }
  class o {
    constructor(b, y) {
      ((this.call = b), (this.methodDefinition = y));
    }
    cancelWithStatus(b, y) {
      this.call.cancelWithStatus(b, y);
    }
    getPeer() {
      return this.call.getPeer();
    }
    sendMessageWithContext(b, y) {
      let u;
      try {
        u = this.methodDefinition.requestSerialize(y);
      } catch (P) {
        this.call.cancelWithStatus(
          e.Status.INTERNAL,
          `Request message serialization failure: ${(0, t.getErrorMessage)(P)}`,
        );
        return;
      }
      this.call.sendMessageWithContext(b, u);
    }
    sendMessage(b) {
      this.sendMessageWithContext({}, b);
    }
    start(b, y) {
      let u = null;
      this.call.start(b, {
        onReceiveMetadata: (P) => {
          var k;
          (k = y === null || y === void 0 ? void 0 : y.onReceiveMetadata) ===
            null ||
            k === void 0 ||
            k.call(y, P);
        },
        onReceiveMessage: (P) => {
          var k;
          let x;
          try {
            x = this.methodDefinition.responseDeserialize(P);
          } catch (f) {
            ((u = {
              code: e.Status.INTERNAL,
              details: `Response message parsing error: ${(0, t.getErrorMessage)(f)}`,
              metadata: new R.Metadata(),
            }),
              this.call.cancelWithStatus(u.code, u.details));
            return;
          }
          (k = y === null || y === void 0 ? void 0 : y.onReceiveMessage) ===
            null ||
            k === void 0 ||
            k.call(y, x);
        },
        onReceiveStatus: (P) => {
          var k, x;
          if (u)
            (k = y === null || y === void 0 ? void 0 : y.onReceiveStatus) ===
              null ||
              k === void 0 ||
              k.call(y, u);
          else
            (x = y === null || y === void 0 ? void 0 : y.onReceiveStatus) ===
              null ||
              x === void 0 ||
              x.call(y, P);
        },
      });
    }
    startRead() {
      this.call.startRead();
    }
    halfClose() {
      this.call.halfClose();
    }
  }
  class n extends o {
    constructor(b, y) {
      super(b, y);
    }
    start(b, y) {
      var u, P;
      let k = !1,
        x = {
          onReceiveMetadata:
            (P =
              (u =
                y === null || y === void 0 ? void 0 : y.onReceiveMetadata) ===
                null || u === void 0
                ? void 0
                : u.bind(y)) !== null && P !== void 0
              ? P
              : (f) => {},
          onReceiveMessage: (f) => {
            var v;
            ((k = !0),
              (v = y === null || y === void 0 ? void 0 : y.onReceiveMessage) ===
                null ||
                v === void 0 ||
                v.call(y, f));
          },
          onReceiveStatus: (f) => {
            var v, g;
            if (!k)
              (v = y === null || y === void 0 ? void 0 : y.onReceiveMessage) ===
                null ||
                v === void 0 ||
                v.call(y, null);
            (g = y === null || y === void 0 ? void 0 : y.onReceiveStatus) ===
              null ||
              g === void 0 ||
              g.call(y, f);
          },
        };
      (super.start(b, x), this.call.startRead());
    }
  }
  class p extends o {}
  function _(b, y, u) {
    let P = l(b, u.path, y);
    if (u.responseStream) return new p(P, u);
    else return new n(P, u);
  }
  function m(b, y, u, P) {
    if (
      b.clientInterceptors.length > 0 &&
      b.clientInterceptorProviders.length > 0
    )
      throw new r(
        "Both interceptors and interceptor_providers were passed as options to the client constructor. Only one of these is allowed.",
      );
    if (b.callInterceptors.length > 0 && b.callInterceptorProviders.length > 0)
      throw new r(
        "Both interceptors and interceptor_providers were passed as call options. Only one of these is allowed.",
      );
    let k = [];
    if (b.callInterceptors.length > 0 || b.callInterceptorProviders.length > 0)
      k = []
        .concat(
          b.callInterceptors,
          b.callInterceptorProviders.map((f) => f(y)),
        )
        .filter((f) => f);
    else
      k = []
        .concat(
          b.clientInterceptors,
          b.clientInterceptorProviders.map((f) => f(y)),
        )
        .filter((f) => f);
    let x = Object.assign({}, u, { method_definition: y });
    return k.reduceRight(
      (f, v) => {
        return (g) => v(g, f);
      },
      (f) => _(P, f, y),
    )(x);
  }
};
