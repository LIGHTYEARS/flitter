// Module: grpc-channel-credentials
// Original: HB
// Type: CJS (RT wrapper)
// Exports: ChannelCredentials, createCertificateProviderChannelCredentials
// Category: npm-pkg

// Module: HB (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.ChannelCredentials = void 0),
    (T.createCertificateProviderChannelCredentials = _));
  var R = qT("tls"),
    a = SZ(),
    e = lvT(),
    t = dh(),
    r = jn(),
    h = j3(),
    i = c8();
  function c(b, y) {
    if (b && !(b instanceof Buffer))
      throw TypeError(`${y}, if provided, must be a Buffer.`);
  }
  class s {
    compose(b) {
      return new m(this, b);
    }
    static createSsl(b, y, u, P) {
      var k;
      if (
        (c(b, "Root certificate"),
        c(y, "Private key"),
        c(u, "Certificate chain"),
        y && !u)
      )
        throw Error(
          "Private key must be given with accompanying certificate chain",
        );
      if (!y && u)
        throw Error(
          "Certificate chain must be given with accompanying private key",
        );
      let x = (0, R.createSecureContext)({
        ca:
          (k =
            b !== null && b !== void 0 ? b : (0, e.getDefaultRootsData)()) !==
            null && k !== void 0
            ? k
            : void 0,
        key: y !== null && y !== void 0 ? y : void 0,
        cert: u !== null && u !== void 0 ? u : void 0,
        ciphers: e.CIPHER_SUITES,
      });
      return new n(x, P !== null && P !== void 0 ? P : {});
    }
    static createFromSecureContext(b, y) {
      return new n(b, y !== null && y !== void 0 ? y : {});
    }
    static createInsecure() {
      return new A();
    }
  }
  T.ChannelCredentials = s;
  class A extends s {
    constructor() {
      super();
    }
    compose(b) {
      throw Error("Cannot compose insecure credentials");
    }
    _isSecure() {
      return !1;
    }
    _equals(b) {
      return b instanceof A;
    }
    _createSecureConnector(b, y, u) {
      return {
        connect(P) {
          return Promise.resolve({ socket: P, secure: !1 });
        },
        waitForReady: () => {
          return Promise.resolve();
        },
        getCallCredentials: () => {
          return u !== null && u !== void 0
            ? u
            : a.CallCredentials.createEmpty();
        },
        destroy() {},
      };
    }
  }
  function l(b, y, u, P) {
    var k, x;
    let f = { secureContext: b },
      v = u;
    if ("grpc.http_connect_target" in P) {
      let O = (0, t.parseUri)(P["grpc.http_connect_target"]);
      if (O) v = O;
    }
    let g = (0, r.getDefaultAuthority)(v),
      I = (0, t.splitHostPort)(g),
      S =
        (k = I === null || I === void 0 ? void 0 : I.host) !== null &&
        k !== void 0
          ? k
          : g;
    if (((f.host = S), y.checkServerIdentity))
      f.checkServerIdentity = y.checkServerIdentity;
    if (y.rejectUnauthorized !== void 0)
      f.rejectUnauthorized = y.rejectUnauthorized;
    if (((f.ALPNProtocols = ["h2"]), P["grpc.ssl_target_name_override"])) {
      let O = P["grpc.ssl_target_name_override"],
        j =
          (x = f.checkServerIdentity) !== null && x !== void 0
            ? x
            : R.checkServerIdentity;
      ((f.checkServerIdentity = (d, C) => {
        return j(O, C);
      }),
        (f.servername = O));
    } else f.servername = S;
    if (P["grpc-node.tls_enable_trace"]) f.enableTrace = !0;
    return f;
  }
  class o {
    constructor(b, y) {
      ((this.connectionOptions = b), (this.callCredentials = y));
    }
    connect(b) {
      let y = Object.assign({ socket: b }, this.connectionOptions);
      return new Promise((u, P) => {
        let k = (0, R.connect)(y, () => {
          var x;
          if (
            ((x = this.connectionOptions.rejectUnauthorized) !== null &&
            x !== void 0
              ? x
              : !0) &&
            !k.authorized
          ) {
            P(k.authorizationError);
            return;
          }
          u({ socket: k, secure: !0 });
        });
        k.on("error", (x) => {
          P(x);
        });
      });
    }
    waitForReady() {
      return Promise.resolve();
    }
    getCallCredentials() {
      return this.callCredentials;
    }
    destroy() {}
  }
  class n extends s {
    constructor(b, y) {
      super();
      ((this.secureContext = b), (this.verifyOptions = y));
    }
    _isSecure() {
      return !0;
    }
    _equals(b) {
      if (this === b) return !0;
      if (b instanceof n)
        return (
          this.secureContext === b.secureContext &&
          this.verifyOptions.checkServerIdentity ===
            b.verifyOptions.checkServerIdentity
        );
      else return !1;
    }
    _createSecureConnector(b, y, u) {
      let P = l(this.secureContext, this.verifyOptions, b, y);
      return new o(
        P,
        u !== null && u !== void 0 ? u : a.CallCredentials.createEmpty(),
      );
    }
  }
  class p extends s {
    constructor(b, y, u) {
      super();
      ((this.caCertificateProvider = b),
        (this.identityCertificateProvider = y),
        (this.verifyOptions = u),
        (this.refcount = 0),
        (this.latestCaUpdate = void 0),
        (this.latestIdentityUpdate = void 0),
        (this.caCertificateUpdateListener =
          this.handleCaCertificateUpdate.bind(this)),
        (this.identityCertificateUpdateListener =
          this.handleIdentityCertitificateUpdate.bind(this)),
        (this.secureContextWatchers = []));
    }
    _isSecure() {
      return !0;
    }
    _equals(b) {
      var y, u;
      if (this === b) return !0;
      if (b instanceof p)
        return (
          this.caCertificateProvider === b.caCertificateProvider &&
          this.identityCertificateProvider === b.identityCertificateProvider &&
          ((y = this.verifyOptions) === null || y === void 0
            ? void 0
            : y.checkServerIdentity) ===
            ((u = b.verifyOptions) === null || u === void 0
              ? void 0
              : u.checkServerIdentity)
        );
      else return !1;
    }
    ref() {
      var b;
      if (this.refcount === 0)
        (this.caCertificateProvider.addCaCertificateListener(
          this.caCertificateUpdateListener,
        ),
          (b = this.identityCertificateProvider) === null ||
            b === void 0 ||
            b.addIdentityCertificateListener(
              this.identityCertificateUpdateListener,
            ));
      this.refcount += 1;
    }
    unref() {
      var b;
      if (((this.refcount -= 1), this.refcount === 0))
        (this.caCertificateProvider.removeCaCertificateListener(
          this.caCertificateUpdateListener,
        ),
          (b = this.identityCertificateProvider) === null ||
            b === void 0 ||
            b.removeIdentityCertificateListener(
              this.identityCertificateUpdateListener,
            ));
    }
    _createSecureConnector(b, y, u) {
      return (
        this.ref(),
        new p.SecureConnectorImpl(
          this,
          b,
          y,
          u !== null && u !== void 0 ? u : a.CallCredentials.createEmpty(),
        )
      );
    }
    maybeUpdateWatchers() {
      if (this.hasReceivedUpdates()) {
        for (let b of this.secureContextWatchers)
          b(this.getLatestSecureContext());
        this.secureContextWatchers = [];
      }
    }
    handleCaCertificateUpdate(b) {
      ((this.latestCaUpdate = b), this.maybeUpdateWatchers());
    }
    handleIdentityCertitificateUpdate(b) {
      ((this.latestIdentityUpdate = b), this.maybeUpdateWatchers());
    }
    hasReceivedUpdates() {
      if (this.latestCaUpdate === void 0) return !1;
      if (
        this.identityCertificateProvider &&
        this.latestIdentityUpdate === void 0
      )
        return !1;
      return !0;
    }
    getSecureContext() {
      if (this.hasReceivedUpdates())
        return Promise.resolve(this.getLatestSecureContext());
      else
        return new Promise((b) => {
          this.secureContextWatchers.push(b);
        });
    }
    getLatestSecureContext() {
      var b, y;
      if (!this.latestCaUpdate) return null;
      if (
        this.identityCertificateProvider !== null &&
        !this.latestIdentityUpdate
      )
        return null;
      try {
        return (0, R.createSecureContext)({
          ca: this.latestCaUpdate.caCertificate,
          key:
            (b = this.latestIdentityUpdate) === null || b === void 0
              ? void 0
              : b.privateKey,
          cert:
            (y = this.latestIdentityUpdate) === null || y === void 0
              ? void 0
              : y.certificate,
          ciphers: e.CIPHER_SUITES,
        });
      } catch (u) {
        return (
          (0, h.log)(
            i.LogVerbosity.ERROR,
            "Failed to createSecureContext with error " + u.message,
          ),
          null
        );
      }
    }
  }
  p.SecureConnectorImpl = class {
    constructor(b, y, u, P) {
      ((this.parent = b),
        (this.channelTarget = y),
        (this.options = u),
        (this.callCredentials = P));
    }
    connect(b) {
      return new Promise((y, u) => {
        let P = this.parent.getLatestSecureContext();
        if (!P) {
          u(Error("Failed to load credentials"));
          return;
        }
        if (b.closed) u(Error("Socket closed while loading credentials"));
        let k = l(
            P,
            this.parent.verifyOptions,
            this.channelTarget,
            this.options,
          ),
          x = Object.assign({ socket: b }, k),
          f = () => {
            u(Error("Socket closed"));
          },
          v = (I) => {
            u(I);
          },
          g = (0, R.connect)(x, () => {
            var I;
            if (
              (g.removeListener("close", f),
              g.removeListener("error", v),
              ((I = this.parent.verifyOptions.rejectUnauthorized) !== null &&
              I !== void 0
                ? I
                : !0) && !g.authorized)
            ) {
              u(g.authorizationError);
              return;
            }
            y({ socket: g, secure: !0 });
          });
        (g.once("close", f), g.once("error", v));
      });
    }
    async waitForReady() {
      await this.parent.getSecureContext();
    }
    getCallCredentials() {
      return this.callCredentials;
    }
    destroy() {
      this.parent.unref();
    }
  };
  function _(b, y, u) {
    return new p(b, y, u !== null && u !== void 0 ? u : {});
  }
  class m extends s {
    constructor(b, y) {
      super();
      if (
        ((this.channelCredentials = b),
        (this.callCredentials = y),
        !b._isSecure())
      )
        throw Error("Cannot compose insecure credentials");
    }
    compose(b) {
      let y = this.callCredentials.compose(b);
      return new m(this.channelCredentials, y);
    }
    _isSecure() {
      return !0;
    }
    _equals(b) {
      if (this === b) return !0;
      if (b instanceof m)
        return (
          this.channelCredentials._equals(b.channelCredentials) &&
          this.callCredentials._equals(b.callCredentials)
        );
      else return !1;
    }
    _createSecureConnector(b, y, u) {
      let P = this.callCredentials.compose(
        u !== null && u !== void 0 ? u : a.CallCredentials.createEmpty(),
      );
      return this.channelCredentials._createSecureConnector(b, y, P);
    }
  }
};
