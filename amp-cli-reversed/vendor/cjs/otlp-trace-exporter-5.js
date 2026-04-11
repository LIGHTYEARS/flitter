// Module: otlp-trace-exporter-5
// Original: QhR
// Type: CJS (RT wrapper)
// Exports: OTLPTraceExporter
// Category: util

// Module: qhR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.PrometheusExporter = void 0));
  var R = n0(),
    a = $9(),
    e = ox(),
    t = qT("http"),
    r = BvT(),
    h = qT("url");
  class i extends e.MetricReader {
    static DEFAULT_OPTIONS = {
      host: void 0,
      port: 9464,
      endpoint: "/metrics",
      prefix: "",
      appendTimestamp: !1,
      withResourceConstantLabels: void 0,
      withoutTargetInfo: !1,
    };
    _host;
    _port;
    _baseUrl;
    _endpoint;
    _server;
    _prefix;
    _appendTimestamp;
    _serializer;
    _startServerPromise;
    constructor(c = {}, s = () => {}) {
      super({
        aggregationSelector: (o) => {
          return { type: e.AggregationType.DEFAULT };
        },
        aggregationTemporalitySelector: (o) =>
          e.AggregationTemporality.CUMULATIVE,
        metricProducers: c.metricProducers,
      });
      ((this._host =
        c.host ||
        process.env.OTEL_EXPORTER_PROMETHEUS_HOST ||
        i.DEFAULT_OPTIONS.host),
        (this._port =
          c.port ||
          Number(process.env.OTEL_EXPORTER_PROMETHEUS_PORT) ||
          i.DEFAULT_OPTIONS.port),
        (this._prefix = c.prefix || i.DEFAULT_OPTIONS.prefix),
        (this._appendTimestamp =
          typeof c.appendTimestamp === "boolean"
            ? c.appendTimestamp
            : i.DEFAULT_OPTIONS.appendTimestamp));
      let A =
          c.withResourceConstantLabels ||
          i.DEFAULT_OPTIONS.withResourceConstantLabels,
        l = c.withoutTargetInfo || i.DEFAULT_OPTIONS.withoutTargetInfo;
      if (
        ((this._server = (0, t.createServer)(this._requestHandler).unref()),
        (this._serializer = new r.PrometheusSerializer(
          this._prefix,
          this._appendTimestamp,
          A,
          l,
        )),
        (this._baseUrl = `http://${this._host}:${this._port}/`),
        (this._endpoint = (c.endpoint || i.DEFAULT_OPTIONS.endpoint).replace(
          /^([^/])/,
          "/$1",
        )),
        c.preventServerStart !== !0)
      )
        this.startServer().then(s, (o) => {
          (R.diag.error(o), s(o));
        });
      else if (s) queueMicrotask(s);
    }
    async onForceFlush() {}
    onShutdown() {
      return this.stopServer();
    }
    stopServer() {
      if (!this._server)
        return (
          R.diag.debug(
            "Prometheus stopServer() was called but server was never started.",
          ),
          Promise.resolve()
        );
      else
        return new Promise((c) => {
          this._server.close((s) => {
            if (!s) R.diag.debug("Prometheus exporter was stopped");
            else if (s.code !== "ERR_SERVER_NOT_RUNNING")
              (0, a.globalErrorHandler)(s);
            c();
          });
        });
    }
    startServer() {
      return (
        (this._startServerPromise ??= new Promise((c, s) => {
          (this._server.once("error", s),
            this._server.listen({ port: this._port, host: this._host }, () => {
              (R.diag.debug(
                `Prometheus exporter server started: ${this._host}:${this._port}/${this._endpoint}`,
              ),
                c());
            }));
        })),
        this._startServerPromise
      );
    }
    getMetricsRequestHandler(c, s) {
      this._exportMetrics(s);
    }
    _requestHandler = (c, s) => {
      if (
        c.url != null &&
        new h.URL(c.url, this._baseUrl).pathname === this._endpoint
      )
        this._exportMetrics(s);
      else this._notFound(s);
    };
    _exportMetrics = (c) => {
      ((c.statusCode = 200),
        c.setHeader("content-type", "text/plain"),
        this.collect().then(
          (s) => {
            let { resourceMetrics: A, errors: l } = s;
            if (l.length)
              R.diag.error(
                "PrometheusExporter: metrics collection errors",
                ...l,
              );
            c.end(this._serializer.serialize(A));
          },
          (s) => {
            c.end(`# failed to export metrics: ${s}`);
          },
        ));
    };
    _notFound = (c) => {
      ((c.statusCode = 404), c.end());
    };
  }
  T.PrometheusExporter = i;
};
