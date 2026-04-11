// Module: websocket-2
// Original: HCT
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: util

// Module: HCT (CJS)
(T, R) => {
  var { Writable: a } = qT("stream"),
    e = eO(),
    { BINARY_TYPES: t, EMPTY_BUFFER: r, kStatusCode: h, kWebSocket: i } = GA(),
    { concat: c, toArrayBuffer: s, unmask: A } = pN(),
    { isValidStatusCode: l, isValidUTF8: o } = tO(),
    n = Buffer[Symbol.species];
  class p extends a {
    constructor(_ = {}) {
      super();
      ((this._allowSynchronousEvents =
        _.allowSynchronousEvents !== void 0 ? _.allowSynchronousEvents : !0),
        (this._binaryType = _.binaryType || t[0]),
        (this._extensions = _.extensions || {}),
        (this._isServer = !!_.isServer),
        (this._maxPayload = _.maxPayload | 0),
        (this._skipUTF8Validation = !!_.skipUTF8Validation),
        (this[i] = void 0),
        (this._bufferedBytes = 0),
        (this._buffers = []),
        (this._compressed = !1),
        (this._payloadLength = 0),
        (this._mask = void 0),
        (this._fragmented = 0),
        (this._masked = !1),
        (this._fin = !1),
        (this._opcode = 0),
        (this._totalPayloadLength = 0),
        (this._messageLength = 0),
        (this._fragments = []),
        (this._errored = !1),
        (this._loop = !1),
        (this._state = 0));
    }
    _write(_, m, b) {
      if (this._opcode === 8 && this._state == 0) return b();
      ((this._bufferedBytes += _.length),
        this._buffers.push(_),
        this.startLoop(b));
    }
    consume(_) {
      if (((this._bufferedBytes -= _), _ === this._buffers[0].length))
        return this._buffers.shift();
      if (_ < this._buffers[0].length) {
        let b = this._buffers[0];
        return (
          (this._buffers[0] = new n(b.buffer, b.byteOffset + _, b.length - _)),
          new n(b.buffer, b.byteOffset, _)
        );
      }
      let m = Buffer.allocUnsafe(_);
      do {
        let b = this._buffers[0],
          y = m.length - _;
        if (_ >= b.length) m.set(this._buffers.shift(), y);
        else
          (m.set(new Uint8Array(b.buffer, b.byteOffset, _), y),
            (this._buffers[0] = new n(
              b.buffer,
              b.byteOffset + _,
              b.length - _,
            )));
        _ -= b.length;
      } while (_ > 0);
      return m;
    }
    startLoop(_) {
      this._loop = !0;
      do
        switch (this._state) {
          case 0:
            this.getInfo(_);
            break;
          case 1:
            this.getPayloadLength16(_);
            break;
          case 2:
            this.getPayloadLength64(_);
            break;
          case 3:
            this.getMask();
            break;
          case 4:
            this.getData(_);
            break;
          case 5:
          case 6:
            this._loop = !1;
            return;
        }
      while (this._loop);
      if (!this._errored) _();
    }
    getInfo(_) {
      if (this._bufferedBytes < 2) {
        this._loop = !1;
        return;
      }
      let m = this.consume(2);
      if ((m[0] & 48) !== 0) {
        let y = this.createError(
          RangeError,
          "RSV2 and RSV3 must be clear",
          !0,
          1002,
          "WS_ERR_UNEXPECTED_RSV_2_3",
        );
        _(y);
        return;
      }
      let b = (m[0] & 64) === 64;
      if (b && !this._extensions[e.extensionName]) {
        let y = this.createError(
          RangeError,
          "RSV1 must be clear",
          !0,
          1002,
          "WS_ERR_UNEXPECTED_RSV_1",
        );
        _(y);
        return;
      }
      if (
        ((this._fin = (m[0] & 128) === 128),
        (this._opcode = m[0] & 15),
        (this._payloadLength = m[1] & 127),
        this._opcode === 0)
      ) {
        if (b) {
          let y = this.createError(
            RangeError,
            "RSV1 must be clear",
            !0,
            1002,
            "WS_ERR_UNEXPECTED_RSV_1",
          );
          _(y);
          return;
        }
        if (!this._fragmented) {
          let y = this.createError(
            RangeError,
            "invalid opcode 0",
            !0,
            1002,
            "WS_ERR_INVALID_OPCODE",
          );
          _(y);
          return;
        }
        this._opcode = this._fragmented;
      } else if (this._opcode === 1 || this._opcode === 2) {
        if (this._fragmented) {
          let y = this.createError(
            RangeError,
            `invalid opcode ${this._opcode}`,
            !0,
            1002,
            "WS_ERR_INVALID_OPCODE",
          );
          _(y);
          return;
        }
        this._compressed = b;
      } else if (this._opcode > 7 && this._opcode < 11) {
        if (!this._fin) {
          let y = this.createError(
            RangeError,
            "FIN must be set",
            !0,
            1002,
            "WS_ERR_EXPECTED_FIN",
          );
          _(y);
          return;
        }
        if (b) {
          let y = this.createError(
            RangeError,
            "RSV1 must be clear",
            !0,
            1002,
            "WS_ERR_UNEXPECTED_RSV_1",
          );
          _(y);
          return;
        }
        if (
          this._payloadLength > 125 ||
          (this._opcode === 8 && this._payloadLength === 1)
        ) {
          let y = this.createError(
            RangeError,
            `invalid payload length ${this._payloadLength}`,
            !0,
            1002,
            "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH",
          );
          _(y);
          return;
        }
      } else {
        let y = this.createError(
          RangeError,
          `invalid opcode ${this._opcode}`,
          !0,
          1002,
          "WS_ERR_INVALID_OPCODE",
        );
        _(y);
        return;
      }
      if (!this._fin && !this._fragmented) this._fragmented = this._opcode;
      if (((this._masked = (m[1] & 128) === 128), this._isServer)) {
        if (!this._masked) {
          let y = this.createError(
            RangeError,
            "MASK must be set",
            !0,
            1002,
            "WS_ERR_EXPECTED_MASK",
          );
          _(y);
          return;
        }
      } else if (this._masked) {
        let y = this.createError(
          RangeError,
          "MASK must be clear",
          !0,
          1002,
          "WS_ERR_UNEXPECTED_MASK",
        );
        _(y);
        return;
      }
      if (this._payloadLength === 126) this._state = 1;
      else if (this._payloadLength === 127) this._state = 2;
      else this.haveLength(_);
    }
    getPayloadLength16(_) {
      if (this._bufferedBytes < 2) {
        this._loop = !1;
        return;
      }
      ((this._payloadLength = this.consume(2).readUInt16BE(0)),
        this.haveLength(_));
    }
    getPayloadLength64(_) {
      if (this._bufferedBytes < 8) {
        this._loop = !1;
        return;
      }
      let m = this.consume(8),
        b = m.readUInt32BE(0);
      if (b > Math.pow(2, 21) - 1) {
        let y = this.createError(
          RangeError,
          "Unsupported WebSocket frame: payload length > 2^53 - 1",
          !1,
          1009,
          "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH",
        );
        _(y);
        return;
      }
      ((this._payloadLength = b * Math.pow(2, 32) + m.readUInt32BE(4)),
        this.haveLength(_));
    }
    haveLength(_) {
      if (this._payloadLength && this._opcode < 8) {
        if (
          ((this._totalPayloadLength += this._payloadLength),
          this._totalPayloadLength > this._maxPayload && this._maxPayload > 0)
        ) {
          let m = this.createError(
            RangeError,
            "Max payload size exceeded",
            !1,
            1009,
            "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH",
          );
          _(m);
          return;
        }
      }
      if (this._masked) this._state = 3;
      else this._state = 4;
    }
    getMask() {
      if (this._bufferedBytes < 4) {
        this._loop = !1;
        return;
      }
      ((this._mask = this.consume(4)), (this._state = 4));
    }
    getData(_) {
      let m = r;
      if (this._payloadLength) {
        if (this._bufferedBytes < this._payloadLength) {
          this._loop = !1;
          return;
        }
        if (
          ((m = this.consume(this._payloadLength)),
          this._masked &&
            (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !==
              0)
        )
          A(m, this._mask);
      }
      if (this._opcode > 7) {
        this.controlMessage(m, _);
        return;
      }
      if (this._compressed) {
        ((this._state = 5), this.decompress(m, _));
        return;
      }
      if (m.length)
        ((this._messageLength = this._totalPayloadLength),
          this._fragments.push(m));
      this.dataMessage(_);
    }
    decompress(_, m) {
      this._extensions[e.extensionName].decompress(_, this._fin, (b, y) => {
        if (b) return m(b);
        if (y.length) {
          if (
            ((this._messageLength += y.length),
            this._messageLength > this._maxPayload && this._maxPayload > 0)
          ) {
            let u = this.createError(
              RangeError,
              "Max payload size exceeded",
              !1,
              1009,
              "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH",
            );
            m(u);
            return;
          }
          this._fragments.push(y);
        }
        if ((this.dataMessage(m), this._state === 0)) this.startLoop(m);
      });
    }
    dataMessage(_) {
      if (!this._fin) {
        this._state = 0;
        return;
      }
      let m = this._messageLength,
        b = this._fragments;
      if (
        ((this._totalPayloadLength = 0),
        (this._messageLength = 0),
        (this._fragmented = 0),
        (this._fragments = []),
        this._opcode === 2)
      ) {
        let y;
        if (this._binaryType === "nodebuffer") y = c(b, m);
        else if (this._binaryType === "arraybuffer") y = s(c(b, m));
        else if (this._binaryType === "blob") y = new Blob(b);
        else y = b;
        if (this._allowSynchronousEvents)
          (this.emit("message", y, !0), (this._state = 0));
        else
          ((this._state = 6),
            setImmediate(() => {
              (this.emit("message", y, !0),
                (this._state = 0),
                this.startLoop(_));
            }));
      } else {
        let y = c(b, m);
        if (!this._skipUTF8Validation && !o(y)) {
          let u = this.createError(
            Error,
            "invalid UTF-8 sequence",
            !0,
            1007,
            "WS_ERR_INVALID_UTF8",
          );
          _(u);
          return;
        }
        if (this._state === 5 || this._allowSynchronousEvents)
          (this.emit("message", y, !1), (this._state = 0));
        else
          ((this._state = 6),
            setImmediate(() => {
              (this.emit("message", y, !1),
                (this._state = 0),
                this.startLoop(_));
            }));
      }
    }
    controlMessage(_, m) {
      if (this._opcode === 8) {
        if (_.length === 0)
          ((this._loop = !1), this.emit("conclude", 1005, r), this.end());
        else {
          let b = _.readUInt16BE(0);
          if (!l(b)) {
            let u = this.createError(
              RangeError,
              `invalid status code ${b}`,
              !0,
              1002,
              "WS_ERR_INVALID_CLOSE_CODE",
            );
            m(u);
            return;
          }
          let y = new n(_.buffer, _.byteOffset + 2, _.length - 2);
          if (!this._skipUTF8Validation && !o(y)) {
            let u = this.createError(
              Error,
              "invalid UTF-8 sequence",
              !0,
              1007,
              "WS_ERR_INVALID_UTF8",
            );
            m(u);
            return;
          }
          ((this._loop = !1), this.emit("conclude", b, y), this.end());
        }
        this._state = 0;
        return;
      }
      if (this._allowSynchronousEvents)
        (this.emit(this._opcode === 9 ? "ping" : "pong", _), (this._state = 0));
      else
        ((this._state = 6),
          setImmediate(() => {
            (this.emit(this._opcode === 9 ? "ping" : "pong", _),
              (this._state = 0),
              this.startLoop(m));
          }));
    }
    createError(_, m, b, y, u) {
      ((this._loop = !1), (this._errored = !0));
      let P = new _(b ? `Invalid WebSocket frame: ${m}` : m);
      return (
        Error.captureStackTrace(P, this.createError),
        (P.code = u),
        (P[h] = y),
        P
      );
    }
  }
  R.exports = p;
};
