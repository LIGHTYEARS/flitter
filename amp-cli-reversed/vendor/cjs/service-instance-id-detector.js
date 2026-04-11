// Module: service-instance-id-detector
// Original: qeR
// Type: CJS (RT wrapper)
// Exports: serviceInstanceIdDetector
// Category: util

// Module: qeR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.serviceInstanceIdDetector = void 0));
  var R = MB(),
    a = qT("crypto");
  class e {
    detect(t) {
      return {
        attributes: { [R.ATTR_SERVICE_INSTANCE_ID]: (0, a.randomUUID)() },
      };
    }
  }
  T.serviceInstanceIdDetector = new e();
};
