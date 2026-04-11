// Module: otlp-metric-exporter-6
// Original: NhR
// Type: CJS (RT wrapper)
// Exports: OTLPMetricExporter
// Category: util

// Module: nhR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.CompressionFilterFactory = T.CompressionFilter = void 0));
  var R = qT("zlib"),
    a = SvT(),
    e = c8(),
    t = OvT(),
    r = j3(),
    h = (_) => {
      return (
        typeof _ === "number" && typeof a.CompressionAlgorithms[_] === "string"
      );
    };
  class i {
    async writeMessage(_, m) {
      let b = _;
      if (m) b = await this.compressMessage(b);
      let y = Buffer.allocUnsafe(b.length + 5);
      return (
        y.writeUInt8(m ? 1 : 0, 0),
        y.writeUInt32BE(b.length, 1),
        b.copy(y, 5),
        y
      );
    }
    async readMessage(_) {
      let m = _.readUInt8(0) === 1,
        b = _.slice(5);
      if (m) b = await this.decompressMessage(b);
      return b;
    }
  }
  class c extends i {
    async compressMessage(_) {
      return _;
    }
    async writeMessage(_, m) {
      let b = Buffer.allocUnsafe(_.length + 5);
      return (
        b.writeUInt8(0, 0),
        b.writeUInt32BE(_.length, 1),
        _.copy(b, 5),
        b
      );
    }
    decompressMessage(_) {
      return Promise.reject(
        Error(
          'Received compressed message but "grpc-encoding" header was identity',
        ),
      );
    }
  }
  class s extends i {
    constructor(_) {
      super();
      this.maxRecvMessageLength = _;
    }
    compressMessage(_) {
      return new Promise((m, b) => {
        R.deflate(_, (y, u) => {
          if (y) b(y);
          else m(u);
        });
      });
    }
    decompressMessage(_) {
      return new Promise((m, b) => {
        let y = 0,
          u = [],
          P = R.createInflate();
        (P.on("data", (k) => {
          if (
            (u.push(k),
            (y += k.byteLength),
            this.maxRecvMessageLength !== -1 && y > this.maxRecvMessageLength)
          )
            (P.destroy(),
              b({
                code: e.Status.RESOURCE_EXHAUSTED,
                details: `Received message that decompresses to a size larger than ${this.maxRecvMessageLength}`,
              }));
        }),
          P.on("end", () => {
            m(Buffer.concat(u));
          }),
          P.write(_),
          P.end());
      });
    }
  }
  class A extends i {
    constructor(_) {
      super();
      this.maxRecvMessageLength = _;
    }
    compressMessage(_) {
      return new Promise((m, b) => {
        R.gzip(_, (y, u) => {
          if (y) b(y);
          else m(u);
        });
      });
    }
    decompressMessage(_) {
      return new Promise((m, b) => {
        let y = 0,
          u = [],
          P = R.createGunzip();
        (P.on("data", (k) => {
          if (
            (u.push(k),
            (y += k.byteLength),
            this.maxRecvMessageLength !== -1 && y > this.maxRecvMessageLength)
          )
            (P.destroy(),
              b({
                code: e.Status.RESOURCE_EXHAUSTED,
                details: `Received message that decompresses to a size larger than ${this.maxRecvMessageLength}`,
              }));
        }),
          P.on("end", () => {
            m(Buffer.concat(u));
          }),
          P.write(_),
          P.end());
      });
    }
  }
  class l extends i {
    constructor(_) {
      super();
      this.compressionName = _;
    }
    compressMessage(_) {
      return Promise.reject(
        Error(
          `Received message compressed with unsupported compression method ${this.compressionName}`,
        ),
      );
    }
    decompressMessage(_) {
      return Promise.reject(
        Error(`Compression method not supported: ${this.compressionName}`),
      );
    }
  }
  function o(_, m) {
    switch (_) {
      case "identity":
        return new c();
      case "deflate":
        return new s(m);
      case "gzip":
        return new A(m);
      default:
        return new l(_);
    }
  }
  class n extends t.BaseFilter {
    constructor(_, m) {
      var b, y, u;
      super();
      ((this.sharedFilterConfig = m),
        (this.sendCompression = new c()),
        (this.receiveCompression = new c()),
        (this.currentCompressionAlgorithm = "identity"));
      let P = _["grpc.default_compression_algorithm"];
      if (
        ((this.maxReceiveMessageLength =
          (b = _["grpc.max_receive_message_length"]) !== null && b !== void 0
            ? b
            : e.DEFAULT_MAX_RECEIVE_MESSAGE_LENGTH),
        (this.maxSendMessageLength =
          (y = _["grpc.max_send_message_length"]) !== null && y !== void 0
            ? y
            : e.DEFAULT_MAX_SEND_MESSAGE_LENGTH),
        P !== void 0)
      )
        if (h(P)) {
          let k = a.CompressionAlgorithms[P],
            x =
              (u = m.serverSupportedEncodingHeader) === null || u === void 0
                ? void 0
                : u.split(",");
          if (!x || x.includes(k))
            ((this.currentCompressionAlgorithm = k),
              (this.sendCompression = o(this.currentCompressionAlgorithm, -1)));
        } else
          r.log(
            e.LogVerbosity.ERROR,
            `Invalid value provided for grpc.default_compression_algorithm option: ${P}`,
          );
    }
    async sendMetadata(_) {
      let m = await _;
      if (
        (m.set("grpc-accept-encoding", "identity,deflate,gzip"),
        m.set("accept-encoding", "identity"),
        this.currentCompressionAlgorithm === "identity")
      )
        m.remove("grpc-encoding");
      else m.set("grpc-encoding", this.currentCompressionAlgorithm);
      return m;
    }
    receiveMetadata(_) {
      let m = _.get("grpc-encoding");
      if (m.length > 0) {
        let y = m[0];
        if (typeof y === "string")
          this.receiveCompression = o(y, this.maxReceiveMessageLength);
      }
      _.remove("grpc-encoding");
      let b = _.get("grpc-accept-encoding")[0];
      if (b) {
        if (
          ((this.sharedFilterConfig.serverSupportedEncodingHeader = b),
          !b.split(",").includes(this.currentCompressionAlgorithm))
        )
          ((this.sendCompression = new c()),
            (this.currentCompressionAlgorithm = "identity"));
      }
      return (_.remove("grpc-accept-encoding"), _);
    }
    async sendMessage(_) {
      var m;
      let b = await _;
      if (
        this.maxSendMessageLength !== -1 &&
        b.message.length > this.maxSendMessageLength
      )
        throw {
          code: e.Status.RESOURCE_EXHAUSTED,
          details: `Attempted to send message with a size larger than ${this.maxSendMessageLength}`,
        };
      let y;
      if (this.sendCompression instanceof c) y = !1;
      else y = (((m = b.flags) !== null && m !== void 0 ? m : 0) & 2) === 0;
      return {
        message: await this.sendCompression.writeMessage(b.message, y),
        flags: b.flags,
      };
    }
    async receiveMessage(_) {
      return this.receiveCompression.readMessage(await _);
    }
  }
  T.CompressionFilter = n;
  class p {
    constructor(_, m) {
      ((this.options = m), (this.sharedFilterConfig = {}));
    }
    createFilter() {
      return new n(this.options, this.sharedFilterConfig);
    }
  }
  T.CompressionFilterFactory = p;
};
