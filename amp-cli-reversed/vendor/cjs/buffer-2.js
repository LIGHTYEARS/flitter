// Module: buffer-2
// Original: eO
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: util

// Module: eO (CJS)
(T, R) => {
  var a = qT("zlib"),
    e = pN(),
    t = ppR(),
    { kStatusCode: r } = GA(),
    h = Buffer[Symbol.species],
    i = Buffer.from([0, 0, 255, 255]),
    c = Symbol("permessage-deflate"),
    s = Symbol("total-length"),
    A = Symbol("callback"),
    l = Symbol("buffers"),
    o = Symbol("error"),
    n;
  class p {
    constructor(y) {
      if (
        ((this._options = y || {}),
        (this._threshold =
          this._options.threshold !== void 0 ? this._options.threshold : 1024),
        (this._maxPayload = this._options.maxPayload | 0),
        (this._isServer = !!this._options.isServer),
        (this._deflate = null),
        (this._inflate = null),
        (this.params = null),
        !n)
      ) {
        let u =
          this._options.concurrencyLimit !== void 0
            ? this._options.concurrencyLimit
            : 10;
        n = new t(u);
      }
    }
    static get extensionName() {
      return "permessage-deflate";
    }
    offer() {
      let y = {};
      if (this._options.serverNoContextTakeover)
        y.server_no_context_takeover = !0;
      if (this._options.clientNoContextTakeover)
        y.client_no_context_takeover = !0;
      if (this._options.serverMaxWindowBits)
        y.server_max_window_bits = this._options.serverMaxWindowBits;
      if (this._options.clientMaxWindowBits)
        y.client_max_window_bits = this._options.clientMaxWindowBits;
      else if (this._options.clientMaxWindowBits == null)
        y.client_max_window_bits = !0;
      return y;
    }
    accept(y) {
      return (
        (y = this.normalizeParams(y)),
        (this.params = this._isServer
          ? this.acceptAsServer(y)
          : this.acceptAsClient(y)),
        this.params
      );
    }
    cleanup() {
      if (this._inflate) (this._inflate.close(), (this._inflate = null));
      if (this._deflate) {
        let y = this._deflate[A];
        if ((this._deflate.close(), (this._deflate = null), y))
          y(
            Error(
              "The deflate stream was closed while data was being processed",
            ),
          );
      }
    }
    acceptAsServer(y) {
      let u = this._options,
        P = y.find((k) => {
          if (
            (u.serverNoContextTakeover === !1 &&
              k.server_no_context_takeover) ||
            (k.server_max_window_bits &&
              (u.serverMaxWindowBits === !1 ||
                (typeof u.serverMaxWindowBits === "number" &&
                  u.serverMaxWindowBits > k.server_max_window_bits))) ||
            (typeof u.clientMaxWindowBits === "number" &&
              !k.client_max_window_bits)
          )
            return !1;
          return !0;
        });
      if (!P) throw Error("None of the extension offers can be accepted");
      if (u.serverNoContextTakeover) P.server_no_context_takeover = !0;
      if (u.clientNoContextTakeover) P.client_no_context_takeover = !0;
      if (typeof u.serverMaxWindowBits === "number")
        P.server_max_window_bits = u.serverMaxWindowBits;
      if (typeof u.clientMaxWindowBits === "number")
        P.client_max_window_bits = u.clientMaxWindowBits;
      else if (P.client_max_window_bits === !0 || u.clientMaxWindowBits === !1)
        delete P.client_max_window_bits;
      return P;
    }
    acceptAsClient(y) {
      let u = y[0];
      if (
        this._options.clientNoContextTakeover === !1 &&
        u.client_no_context_takeover
      )
        throw Error('Unexpected parameter "client_no_context_takeover"');
      if (!u.client_max_window_bits) {
        if (typeof this._options.clientMaxWindowBits === "number")
          u.client_max_window_bits = this._options.clientMaxWindowBits;
      } else if (
        this._options.clientMaxWindowBits === !1 ||
        (typeof this._options.clientMaxWindowBits === "number" &&
          u.client_max_window_bits > this._options.clientMaxWindowBits)
      )
        throw Error('Unexpected or invalid parameter "client_max_window_bits"');
      return u;
    }
    normalizeParams(y) {
      return (
        y.forEach((u) => {
          Object.keys(u).forEach((P) => {
            let k = u[P];
            if (k.length > 1)
              throw Error(`Parameter "${P}" must have only a single value`);
            if (((k = k[0]), P === "client_max_window_bits")) {
              if (k !== !0) {
                let x = +k;
                if (!Number.isInteger(x) || x < 8 || x > 15)
                  throw TypeError(`Invalid value for parameter "${P}": ${k}`);
                k = x;
              } else if (!this._isServer)
                throw TypeError(`Invalid value for parameter "${P}": ${k}`);
            } else if (P === "server_max_window_bits") {
              let x = +k;
              if (!Number.isInteger(x) || x < 8 || x > 15)
                throw TypeError(`Invalid value for parameter "${P}": ${k}`);
              k = x;
            } else if (
              P === "client_no_context_takeover" ||
              P === "server_no_context_takeover"
            ) {
              if (k !== !0)
                throw TypeError(`Invalid value for parameter "${P}": ${k}`);
            } else throw Error(`Unknown parameter "${P}"`);
            u[P] = k;
          });
        }),
        y
      );
    }
    decompress(y, u, P) {
      n.add((k) => {
        this._decompress(y, u, (x, f) => {
          (k(), P(x, f));
        });
      });
    }
    compress(y, u, P) {
      n.add((k) => {
        this._compress(y, u, (x, f) => {
          (k(), P(x, f));
        });
      });
    }
    _decompress(y, u, P) {
      let k = this._isServer ? "client" : "server";
      if (!this._inflate) {
        let x = `${k}_max_window_bits`,
          f =
            typeof this.params[x] !== "number"
              ? a.Z_DEFAULT_WINDOWBITS
              : this.params[x];
        ((this._inflate = a.createInflateRaw({
          ...this._options.zlibInflateOptions,
          windowBits: f,
        })),
          (this._inflate[c] = this),
          (this._inflate[s] = 0),
          (this._inflate[l] = []),
          this._inflate.on("error", b),
          this._inflate.on("data", m));
      }
      if (((this._inflate[A] = P), this._inflate.write(y), u))
        this._inflate.write(i);
      this._inflate.flush(() => {
        let x = this._inflate[o];
        if (x) {
          (this._inflate.close(), (this._inflate = null), P(x));
          return;
        }
        let f = e.concat(this._inflate[l], this._inflate[s]);
        if (this._inflate._readableState.endEmitted)
          (this._inflate.close(), (this._inflate = null));
        else if (
          ((this._inflate[s] = 0),
          (this._inflate[l] = []),
          u && this.params[`${k}_no_context_takeover`])
        )
          this._inflate.reset();
        P(null, f);
      });
    }
    _compress(y, u, P) {
      let k = this._isServer ? "server" : "client";
      if (!this._deflate) {
        let x = `${k}_max_window_bits`,
          f =
            typeof this.params[x] !== "number"
              ? a.Z_DEFAULT_WINDOWBITS
              : this.params[x];
        ((this._deflate = a.createDeflateRaw({
          ...this._options.zlibDeflateOptions,
          windowBits: f,
        })),
          (this._deflate[s] = 0),
          (this._deflate[l] = []),
          this._deflate.on("data", _));
      }
      ((this._deflate[A] = P),
        this._deflate.write(y),
        this._deflate.flush(a.Z_SYNC_FLUSH, () => {
          if (!this._deflate) return;
          let x = e.concat(this._deflate[l], this._deflate[s]);
          if (u) x = new h(x.buffer, x.byteOffset, x.length - 4);
          if (
            ((this._deflate[A] = null),
            (this._deflate[s] = 0),
            (this._deflate[l] = []),
            u && this.params[`${k}_no_context_takeover`])
          )
            this._deflate.reset();
          P(null, x);
        }));
    }
  }
  R.exports = p;
  function _(y) {
    (this[l].push(y), (this[s] += y.length));
  }
  function m(y) {
    if (
      ((this[s] += y.length),
      this[c]._maxPayload < 1 || this[s] <= this[c]._maxPayload)
    ) {
      this[l].push(y);
      return;
    }
    ((this[o] = RangeError("Max payload size exceeded")),
      (this[o].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"),
      (this[o][r] = 1009),
      this.removeListener("data", m),
      this.reset());
  }
  function b(y) {
    if (((this[c]._inflate = null), this[o])) {
      this[A](this[o]);
      return;
    }
    ((y[r] = 1007), this[A](y));
  }
};
