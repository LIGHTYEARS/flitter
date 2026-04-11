// Module: get-machine-id-3
// Original: LeR
// Type: CJS (RT wrapper)
// Exports: getMachineId
// Category: util

// Module: leR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.SDK_INFO = void 0));
  var R = eeR(),
    a = em(),
    e = neR();
  T.SDK_INFO = {
    [a.ATTR_TELEMETRY_SDK_NAME]: "opentelemetry",
    [e.ATTR_PROCESS_RUNTIME_NAME]: "node",
    [a.ATTR_TELEMETRY_SDK_LANGUAGE]: a.TELEMETRY_SDK_LANGUAGE_VALUE_NODEJS,
    [a.ATTR_TELEMETRY_SDK_VERSION]: R.VERSION,
  };
};
