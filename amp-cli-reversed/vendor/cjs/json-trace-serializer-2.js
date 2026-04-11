// Module: json-trace-serializer-2
// Original: frR
// Type: CJS (RT wrapper)
// Exports: JsonTraceSerializer
// Category: util

// Module: frR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.JsonTraceSerializer = void 0));
  var R = svT();
  T.JsonTraceSerializer = {
    serializeRequest: (a) => {
      let e = (0, R.createExportTraceServiceRequest)(a, {
        useHex: !0,
        useLongBits: !1,
      });
      return new TextEncoder().encode(JSON.stringify(e));
    },
    deserializeResponse: (a) => {
      if (a.length === 0) return {};
      return JSON.parse(new TextDecoder().decode(a));
    },
  };
};
