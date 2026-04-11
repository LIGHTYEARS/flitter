// Module: zipkin-exporter
// Original: hiR
// Type: CJS (RT wrapper)
// Exports: ZipkinExporter
// Category: util

// Module: hiR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.ZipkinExporter = void 0));
  var R = n0(),
    a = $9(),
    e = NvT(),
    t = tiR(),
    r = em(),
    h = riR();
  class i {
    DEFAULT_SERVICE_NAME = "OpenTelemetry Service";
    _statusCodeTagName;
    _statusDescriptionTagName;
    _urlStr;
    _send;
    _getHeaders;
    _serviceName;
    _isShutdown;
    _sendingPromises = [];
    constructor(c = {}) {
      if (
        ((this._urlStr =
          c.url ||
          ((0, a.getStringFromEnv)("OTEL_EXPORTER_ZIPKIN_ENDPOINT") ??
            "http://localhost:9411/api/v2/spans")),
        (this._send = (0, e.prepareSend)(this._urlStr, c.headers)),
        (this._serviceName = c.serviceName),
        (this._statusCodeTagName =
          c.statusCodeTagName || t.defaultStatusCodeTagName),
        (this._statusDescriptionTagName =
          c.statusDescriptionTagName || t.defaultStatusErrorTagName),
        (this._isShutdown = !1),
        typeof c.getExportRequestHeaders === "function")
      )
        this._getHeaders = (0, h.prepareGetHeaders)(c.getExportRequestHeaders);
      else this._beforeSend = function () {};
    }
    export(c, s) {
      let A = String(
        this._serviceName ||
          c[0].resource.attributes[r.ATTR_SERVICE_NAME] ||
          this.DEFAULT_SERVICE_NAME,
      );
      if ((R.diag.debug("Zipkin exporter export"), this._isShutdown)) {
        setTimeout(() =>
          s({
            code: a.ExportResultCode.FAILED,
            error: Error("Exporter has been shutdown"),
          }),
        );
        return;
      }
      let l = new Promise((n) => {
        this._sendSpans(c, A, (p) => {
          (n(), s(p));
        });
      });
      this._sendingPromises.push(l);
      let o = () => {
        let n = this._sendingPromises.indexOf(l);
        this._sendingPromises.splice(n, 1);
      };
      l.then(o, o);
    }
    shutdown() {
      return (
        R.diag.debug("Zipkin exporter shutdown"),
        (this._isShutdown = !0),
        this.forceFlush()
      );
    }
    forceFlush() {
      return new Promise((c, s) => {
        Promise.all(this._sendingPromises).then(() => {
          c();
        }, s);
      });
    }
    _beforeSend() {
      if (this._getHeaders)
        this._send = (0, e.prepareSend)(this._urlStr, this._getHeaders());
    }
    _sendSpans(c, s, A) {
      let l = c.map((o) =>
        (0, t.toZipkinSpan)(
          o,
          String(
            o.attributes[r.ATTR_SERVICE_NAME] ||
              o.resource.attributes[r.ATTR_SERVICE_NAME] ||
              s,
          ),
          this._statusCodeTagName,
          this._statusDescriptionTagName,
        ),
      );
      return (
        this._beforeSend(),
        this._send(l, (o) => {
          if (A) return A(o);
        })
      );
    }
  }
  T.ZipkinExporter = i;
};
