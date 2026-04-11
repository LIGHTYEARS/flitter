// Module: multi-log-record-processor
// Original: ZeR
// Type: CJS (RT wrapper)
// Exports: MultiLogRecordProcessor
// Category: util

// Module: zeR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.serviceInstanceIdDetector =
      T.processDetector =
      T.osDetector =
      T.hostDetector =
        void 0));
  var R = UeR();
  Object.defineProperty(T, "hostDetector", {
    enumerable: !0,
    get: function () {
      return R.hostDetector;
    },
  });
  var a = HeR();
  Object.defineProperty(T, "osDetector", {
    enumerable: !0,
    get: function () {
      return a.osDetector;
    },
  });
  var e = WeR();
  Object.defineProperty(T, "processDetector", {
    enumerable: !0,
    get: function () {
      return e.processDetector;
    },
  });
  var t = qeR();
  Object.defineProperty(T, "serviceInstanceIdDetector", {
    enumerable: !0,
    get: function () {
      return t.serviceInstanceIdDetector;
    },
  });
};
