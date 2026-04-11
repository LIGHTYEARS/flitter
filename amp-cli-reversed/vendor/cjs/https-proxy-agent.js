// Module: https-proxy-agent
// Original: dIR
// Type: CJS (RT wrapper)
// Exports: HttpsProxyAgent
// Category: util

// Module: dIR (CJS)
(T) => {
  var R =
      (T && T.__createBinding) ||
      (Object.create
        ? function (b, y, u, P) {
            if (P === void 0) P = u;
            var k = Object.getOwnPropertyDescriptor(y, u);
            if (
              !k ||
              ("get" in k ? !y.__esModule : k.writable || k.configurable)
            )
              k = {
                enumerable: !0,
                get: function () {
                  return y[u];
                },
              };
            Object.defineProperty(b, P, k);
          }
        : function (b, y, u, P) {
            if (P === void 0) P = u;
            b[P] = y[u];
          }),
    a =
      (T && T.__setModuleDefault) ||
      (Object.create
        ? function (b, y) {
            Object.defineProperty(b, "default", { enumerable: !0, value: y });
          }
        : function (b, y) {
            b.default = y;
          }),
    e =
      (T && T.__importStar) ||
      function (b) {
        if (b && b.__esModule) return b;
        var y = {};
        if (b != null) {
          for (var u in b)
            if (u !== "default" && Object.prototype.hasOwnProperty.call(b, u))
              R(y, b, u);
        }
        return (a(y, b), y);
      },
    t =
      (T && T.__importDefault) ||
      function (b) {
        return b && b.__esModule ? b : { default: b };
      };
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.HttpsProxyAgent = void 0));
  var r = e(qT("net")),
    h = e(qT("tls")),
    i = t(qT("assert")),
    c = t(CB()),
    s = SIR(),
    A = qT("url"),
    l = OIR(),
    o = (0, c.default)("https-proxy-agent"),
    n = (b) => {
      if (b.servername === void 0 && b.host && !r.isIP(b.host))
        return { ...b, servername: b.host };
      return b;
    };
  class p extends s.Agent {
    constructor(b, y) {
      super(y);
      ((this.options = { path: void 0 }),
        (this.proxy = typeof b === "string" ? new A.URL(b) : b),
        (this.proxyHeaders = y?.headers ?? {}),
        o("Creating new HttpsProxyAgent instance: %o", this.proxy.href));
      let u = (this.proxy.hostname || this.proxy.host).replace(/^\[|\]$/g, ""),
        P = this.proxy.port
          ? parseInt(this.proxy.port, 10)
          : this.proxy.protocol === "https:"
            ? 443
            : 80;
      this.connectOpts = {
        ALPNProtocols: ["http/1.1"],
        ...(y ? m(y, "headers") : null),
        host: u,
        port: P,
      };
    }
    async connect(b, y) {
      let { proxy: u } = this;
      if (!y.host) throw TypeError('No "host" provided');
      let P;
      if (u.protocol === "https:")
        (o("Creating `tls.Socket`: %o", this.connectOpts),
          (P = h.connect(n(this.connectOpts))));
      else
        (o("Creating `net.Socket`: %o", this.connectOpts),
          (P = r.connect(this.connectOpts)));
      let k =
          typeof this.proxyHeaders === "function"
            ? this.proxyHeaders()
            : { ...this.proxyHeaders },
        x = r.isIPv6(y.host) ? `[${y.host}]` : y.host,
        f = `CONNECT ${x}:${y.port} HTTP/1.1\r
`;
      if (u.username || u.password) {
        let O = `${decodeURIComponent(u.username)}:${decodeURIComponent(u.password)}`;
        k["Proxy-Authorization"] = `Basic ${Buffer.from(O).toString("base64")}`;
      }
      if (((k.Host = `${x}:${y.port}`), !k["Proxy-Connection"]))
        k["Proxy-Connection"] = this.keepAlive ? "Keep-Alive" : "close";
      for (let O of Object.keys(k))
        f += `${O}: ${k[O]}\r
`;
      let v = (0, l.parseProxyResponse)(P);
      P.write(`${f}\r
`);
      let { connect: g, buffered: I } = await v;
      if (
        (b.emit("proxyConnect", g),
        this.emit("proxyConnect", g, b),
        g.statusCode === 200)
      ) {
        if ((b.once("socket", _), y.secureEndpoint))
          return (
            o("Upgrading socket connection to TLS"),
            h.connect({ ...m(n(y), "host", "path", "port"), socket: P })
          );
        return P;
      }
      P.destroy();
      let S = new r.Socket({ writable: !1 });
      return (
        (S.readable = !0),
        b.once("socket", (O) => {
          (o("Replaying proxy buffer for failed request"),
            (0, i.default)(O.listenerCount("data") > 0),
            O.push(I),
            O.push(null));
        }),
        S
      );
    }
  }
  ((p.protocols = ["http", "https"]), (T.HttpsProxyAgent = p));
  function _(b) {
    b.resume();
  }
  function m(b, ...y) {
    let u = {},
      P;
    for (P in b) if (!y.includes(P)) u[P] = b[P];
    return u;
  }
};
