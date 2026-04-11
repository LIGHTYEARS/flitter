// Module: default-max-receive-message-length
// Original: c8
// Type: CJS (RT wrapper)
// Exports: DEFAULT_MAX_RECEIVE_MESSAGE_LENGTH, DEFAULT_MAX_SEND_MESSAGE_LENGTH, LogVerbosity, Propagate, Status
// Category: util

// Module: c8 (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.DEFAULT_MAX_RECEIVE_MESSAGE_LENGTH =
      T.DEFAULT_MAX_SEND_MESSAGE_LENGTH =
      T.Propagate =
      T.LogVerbosity =
      T.Status =
        void 0));
  var R;
  (function (t) {
    ((t[(t.OK = 0)] = "OK"),
      (t[(t.CANCELLED = 1)] = "CANCELLED"),
      (t[(t.UNKNOWN = 2)] = "UNKNOWN"),
      (t[(t.INVALID_ARGUMENT = 3)] = "INVALID_ARGUMENT"),
      (t[(t.DEADLINE_EXCEEDED = 4)] = "DEADLINE_EXCEEDED"),
      (t[(t.NOT_FOUND = 5)] = "NOT_FOUND"),
      (t[(t.ALREADY_EXISTS = 6)] = "ALREADY_EXISTS"),
      (t[(t.PERMISSION_DENIED = 7)] = "PERMISSION_DENIED"),
      (t[(t.RESOURCE_EXHAUSTED = 8)] = "RESOURCE_EXHAUSTED"),
      (t[(t.FAILED_PRECONDITION = 9)] = "FAILED_PRECONDITION"),
      (t[(t.ABORTED = 10)] = "ABORTED"),
      (t[(t.OUT_OF_RANGE = 11)] = "OUT_OF_RANGE"),
      (t[(t.UNIMPLEMENTED = 12)] = "UNIMPLEMENTED"),
      (t[(t.INTERNAL = 13)] = "INTERNAL"),
      (t[(t.UNAVAILABLE = 14)] = "UNAVAILABLE"),
      (t[(t.DATA_LOSS = 15)] = "DATA_LOSS"),
      (t[(t.UNAUTHENTICATED = 16)] = "UNAUTHENTICATED"));
  })(R || (T.Status = R = {}));
  var a;
  (function (t) {
    ((t[(t.DEBUG = 0)] = "DEBUG"),
      (t[(t.INFO = 1)] = "INFO"),
      (t[(t.ERROR = 2)] = "ERROR"),
      (t[(t.NONE = 3)] = "NONE"));
  })(a || (T.LogVerbosity = a = {}));
  var e;
  ((function (t) {
    ((t[(t.DEADLINE = 1)] = "DEADLINE"),
      (t[(t.CENSUS_STATS_CONTEXT = 2)] = "CENSUS_STATS_CONTEXT"),
      (t[(t.CENSUS_TRACING_CONTEXT = 4)] = "CENSUS_TRACING_CONTEXT"),
      (t[(t.CANCELLATION = 8)] = "CANCELLATION"),
      (t[(t.DEFAULTS = 65535)] = "DEFAULTS"));
  })(e || (T.Propagate = e = {})),
    (T.DEFAULT_MAX_SEND_MESSAGE_LENGTH = -1),
    (T.DEFAULT_MAX_RECEIVE_MESSAGE_LENGTH = 4194304));
};
