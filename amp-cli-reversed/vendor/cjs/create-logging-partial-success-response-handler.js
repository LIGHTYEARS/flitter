// Module: create-logging-partial-success-response-handler
// Original: TrR
// Type: CJS (RT wrapper)
// Exports: createLoggingPartialSuccessResponseHandler
// Category: util

// Module: TrR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.createLoggingPartialSuccessResponseHandler = void 0));
  var R = n0();
  function a(t) {
    return Object.prototype.hasOwnProperty.call(t, "partialSuccess");
  }
  function e() {
    return {
      handleResponse(t) {
        if (
          t == null ||
          !a(t) ||
          t.partialSuccess == null ||
          Object.keys(t.partialSuccess).length === 0
        )
          return;
        R.diag.warn(
          "Received Partial Success response:",
          JSON.stringify(t.partialSuccess),
        );
      },
    };
  }
  T.createLoggingPartialSuccessResponseHandler = e;
};
