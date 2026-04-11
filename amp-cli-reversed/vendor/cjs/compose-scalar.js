// Module: compose-scalar
// Original: YPR
// Type: CJS (RT wrapper)
// Exports: composeScalar
// Category: util

// Module: ypR (CJS)
(T, R) => {
  var a = qT("events"),
    e = qT("http"),
    { Duplex: t } = qT("stream"),
    { createHash: r } = qT("crypto"),
    h = V0T(),
    i = eO(),
    c = qCT(),
    s = X0T(),
    { CLOSE_TIMEOUT: A, GUID: l, kWebSocket: o } = GA(),
    n = /^[+/0-9A-Za-z]{22}==$/;
  class p extends a {
    constructor(P, k) {
      super();
      if (
        ((P = {
          allowSynchronousEvents: !0,
          autoPong: !0,
          maxPayload: 104857600,
          skipUTF8Validation: !1,
          perMessageDeflate: !1,
          handleProtocols: null,
          clientTracking: !0,
          closeTimeout: A,
          verifyClient: null,
          noServer: !1,
          backlog: null,
          server: null,
          host: null,
          path: null,
          port: null,
          WebSocket: s,
          ...P,
        }),
        (P.port == null && !P.server && !P.noServer) ||
          (P.port != null && (P.server || P.noServer)) ||
          (P.server && P.noServer))
      )
        throw TypeError(
          'One and only one of the "port", "server", or "noServer" options must be specified',
        );
      if (P.port != null)
        ((this._server = e.createServer((x, f) => {
          let v = e.STATUS_CODES[426];
          (f.writeHead(426, {
            "Content-Length": v.length,
            "Content-Type": "text/plain",
          }),
            f.end(v));
        })),
          this._server.listen(P.port, P.host, P.backlog, k));
      else if (P.server) this._server = P.server;
      if (this._server) {
        let x = this.emit.bind(this, "connection");
        this._removeListeners = _(this._server, {
          listening: this.emit.bind(this, "listening"),
          error: this.emit.bind(this, "error"),
          upgrade: (f, v, g) => {
            this.handleUpgrade(f, v, g, x);
          },
        });
      }
      if (P.perMessageDeflate === !0) P.perMessageDeflate = {};
      if (P.clientTracking)
        ((this.clients = new Set()), (this._shouldEmitClose = !1));
      ((this.options = P), (this._state = 0));
    }
    address() {
      if (this.options.noServer)
        throw Error('The server is operating in "noServer" mode');
      if (!this._server) return null;
      return this._server.address();
    }
    close(P) {
      if (this._state === 2) {
        if (P)
          this.once("close", () => {
            P(Error("The server is not running"));
          });
        process.nextTick(m, this);
        return;
      }
      if (P) this.once("close", P);
      if (this._state === 1) return;
      if (((this._state = 1), this.options.noServer || this.options.server)) {
        if (this._server)
          (this._removeListeners(),
            (this._removeListeners = this._server = null));
        if (this.clients)
          if (!this.clients.size) process.nextTick(m, this);
          else this._shouldEmitClose = !0;
        else process.nextTick(m, this);
      } else {
        let k = this._server;
        (this._removeListeners(),
          (this._removeListeners = this._server = null),
          k.close(() => {
            m(this);
          }));
      }
    }
    shouldHandle(P) {
      if (this.options.path) {
        let k = P.url.indexOf("?");
        if ((k !== -1 ? P.url.slice(0, k) : P.url) !== this.options.path)
          return !1;
      }
      return !0;
    }
    handleUpgrade(P, k, x, f) {
      k.on("error", b);
      let v = P.headers["sec-websocket-key"],
        g = P.headers.upgrade,
        I = +P.headers["sec-websocket-version"];
      if (P.method !== "GET") {
        u(this, P, k, 405, "Invalid HTTP method");
        return;
      }
      if (g === void 0 || g.toLowerCase() !== "websocket") {
        u(this, P, k, 400, "Invalid Upgrade header");
        return;
      }
      if (v === void 0 || !n.test(v)) {
        u(this, P, k, 400, "Missing or invalid Sec-WebSocket-Key header");
        return;
      }
      if (I !== 13 && I !== 8) {
        u(this, P, k, 400, "Missing or invalid Sec-WebSocket-Version header", {
          "Sec-WebSocket-Version": "13, 8",
        });
        return;
      }
      if (!this.shouldHandle(P)) {
        y(k, 400);
        return;
      }
      let S = P.headers["sec-websocket-protocol"],
        O = new Set();
      if (S !== void 0)
        try {
          O = c.parse(S);
        } catch (C) {
          u(this, P, k, 400, "Invalid Sec-WebSocket-Protocol header");
          return;
        }
      let j = P.headers["sec-websocket-extensions"],
        d = {};
      if (this.options.perMessageDeflate && j !== void 0) {
        let C = new i({
          ...this.options.perMessageDeflate,
          isServer: !0,
          maxPayload: this.options.maxPayload,
        });
        try {
          let L = h.parse(j);
          if (L[i.extensionName])
            (C.accept(L[i.extensionName]), (d[i.extensionName] = C));
        } catch (L) {
          u(
            this,
            P,
            k,
            400,
            "Invalid or unacceptable Sec-WebSocket-Extensions header",
          );
          return;
        }
      }
      if (this.options.verifyClient) {
        let C = {
          origin: P.headers[`${I === 8 ? "sec-websocket-origin" : "origin"}`],
          secure: !!(P.socket.authorized || P.socket.encrypted),
          req: P,
        };
        if (this.options.verifyClient.length === 2) {
          this.options.verifyClient(C, (L, w, D, B) => {
            if (!L) return y(k, w || 401, D, B);
            this.completeUpgrade(d, v, O, P, k, x, f);
          });
          return;
        }
        if (!this.options.verifyClient(C)) return y(k, 401);
      }
      this.completeUpgrade(d, v, O, P, k, x, f);
    }
    completeUpgrade(P, k, x, f, v, g, I) {
      if (!v.readable || !v.writable) return v.destroy();
      if (v[o])
        throw Error(
          "server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration",
        );
      if (this._state > 0) return y(v, 503);
      let S = [
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Accept: ${r("sha1")
            .update(k + l)
            .digest("base64")}`,
        ],
        O = new this.options.WebSocket(null, void 0, this.options);
      if (x.size) {
        let j = this.options.handleProtocols
          ? this.options.handleProtocols(x, f)
          : x.values().next().value;
        if (j) (S.push(`Sec-WebSocket-Protocol: ${j}`), (O._protocol = j));
      }
      if (P[i.extensionName]) {
        let j = P[i.extensionName].params,
          d = h.format({ [i.extensionName]: [j] });
        (S.push(`Sec-WebSocket-Extensions: ${d}`), (O._extensions = P));
      }
      if (
        (this.emit("headers", S, f),
        v.write(
          S.concat(`\r
`).join(`\r
`),
        ),
        v.removeListener("error", b),
        O.setSocket(v, g, {
          allowSynchronousEvents: this.options.allowSynchronousEvents,
          maxPayload: this.options.maxPayload,
          skipUTF8Validation: this.options.skipUTF8Validation,
        }),
        this.clients)
      )
        (this.clients.add(O),
          O.on("close", () => {
            if (
              (this.clients.delete(O),
              this._shouldEmitClose && !this.clients.size)
            )
              process.nextTick(m, this);
          }));
      I(O, f);
    }
  }
  R.exports = p;
  function _(P, k) {
    for (let x of Object.keys(k)) P.on(x, k[x]);
    return function () {
      for (let x of Object.keys(k)) P.removeListener(x, k[x]);
    };
  }
  function m(P) {
    ((P._state = 2), P.emit("close"));
  }
  function b() {
    this.destroy();
  }
  function y(P, k, x, f) {
    ((x = x || e.STATUS_CODES[k]),
      (f = {
        Connection: "close",
        "Content-Type": "text/html",
        "Content-Length": Buffer.byteLength(x),
        ...f,
      }),
      P.once("finish", P.destroy),
      P.end(
        `HTTP/1.1 ${k} ${e.STATUS_CODES[k]}\r
` +
          Object.keys(f).map((v) => `${v}: ${f[v]}`).join(`\r
`) +
          `\r
\r
` +
          x,
      ));
  }
  function u(P, k, x, f, v, g) {
    if (P.listenerCount("wsClientError")) {
      let I = Error(v);
      (Error.captureStackTrace(I, u), P.emit("wsClientError", I, x, k));
    } else y(x, f, v, g);
  }
};
