// Module: simple-log-record-processor
// Original: atR
// Type: CJS (RT wrapper)
// Exports: SimpleLogRecordProcessor
// Category: util

// Module: atR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.SimpleLogRecordProcessor = void 0));
  var R = $9();
  class a {
    _exporter;
    _shutdownOnce;
    _unresolvedExports;
    constructor(e) {
      ((this._exporter = e),
        (this._shutdownOnce = new R.BindOnceFuture(this._shutdown, this)),
        (this._unresolvedExports = new Set()));
    }
    onEmit(e) {
      if (this._shutdownOnce.isCalled) return;
      let t = () =>
        R.internal
          ._export(this._exporter, [e])
          .then((r) => {
            if (r.code !== R.ExportResultCode.SUCCESS)
              (0, R.globalErrorHandler)(
                r.error ??
                  Error(
                    `SimpleLogRecordProcessor: log record export failed (status ${r})`,
                  ),
              );
          })
          .catch(R.globalErrorHandler);
      if (e.resource.asyncAttributesPending) {
        let r = e.resource.waitForAsyncAttributes?.().then(() => {
          return (this._unresolvedExports.delete(r), t());
        }, R.globalErrorHandler);
        if (r != null) this._unresolvedExports.add(r);
      } else t();
    }
    async forceFlush() {
      await Promise.all(Array.from(this._unresolvedExports));
    }
    shutdown() {
      return this._shutdownOnce.call();
    }
    _shutdown() {
      return this._exporter.shutdown();
    }
  }
  T.SimpleLogRecordProcessor = a;
};
