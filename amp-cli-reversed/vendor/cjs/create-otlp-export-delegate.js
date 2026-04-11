// Module: create-otlp-export-delegate
// Original: RvT
// Type: CJS (RT wrapper)
// Exports: createOtlpExportDelegate
// Category: util

// Module: RvT (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.createOtlpExportDelegate = void 0));
  var R = $9(),
    a = kZ(),
    e = TrR(),
    t = n0();
  class r {
    _transport;
    _serializer;
    _responseHandler;
    _promiseQueue;
    _timeout;
    _diagLogger;
    constructor(i, c, s, A, l) {
      ((this._transport = i),
        (this._serializer = c),
        (this._responseHandler = s),
        (this._promiseQueue = A),
        (this._timeout = l),
        (this._diagLogger = t.diag.createComponentLogger({
          namespace: "OTLPExportDelegate",
        })));
    }
    export(i, c) {
      if (
        (this._diagLogger.debug("items to be sent", i),
        this._promiseQueue.hasReachedLimit())
      ) {
        c({
          code: R.ExportResultCode.FAILED,
          error: Error("Concurrent export limit reached"),
        });
        return;
      }
      let s = this._serializer.serializeRequest(i);
      if (s == null) {
        c({ code: R.ExportResultCode.FAILED, error: Error("Nothing to send") });
        return;
      }
      this._promiseQueue.pushPromise(
        this._transport.send(s, this._timeout).then(
          (A) => {
            if (A.status === "success") {
              if (A.data != null)
                try {
                  this._responseHandler.handleResponse(
                    this._serializer.deserializeResponse(A.data),
                  );
                } catch (l) {
                  this._diagLogger.warn(
                    "Export succeeded but could not deserialize response - is the response specification compliant?",
                    l,
                    A.data,
                  );
                }
              c({ code: R.ExportResultCode.SUCCESS });
              return;
            } else if (A.status === "failure" && A.error) {
              c({ code: R.ExportResultCode.FAILED, error: A.error });
              return;
            } else if (A.status === "retryable")
              c({
                code: R.ExportResultCode.FAILED,
                error: new a.OTLPExporterError(
                  "Export failed with retryable status",
                ),
              });
            else
              c({
                code: R.ExportResultCode.FAILED,
                error: new a.OTLPExporterError(
                  "Export failed with unknown error",
                ),
              });
          },
          (A) => c({ code: R.ExportResultCode.FAILED, error: A }),
        ),
      );
    }
    forceFlush() {
      return this._promiseQueue.awaitAll();
    }
    async shutdown() {
      (this._diagLogger.debug("shutdown started"),
        await this.forceFlush(),
        this._transport.shutdown());
    }
  }
  function h(i, c) {
    return new r(
      i.transport,
      i.serializer,
      (0, e.createLoggingPartialSuccessResponseHandler)(),
      i.promiseHandler,
      c.timeout,
    );
  }
  T.createOtlpExportDelegate = h;
};
