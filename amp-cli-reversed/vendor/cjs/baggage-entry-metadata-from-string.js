// Module: baggage-entry-metadata-from-string
// Original: p$T
// Type: CJS (RT wrapper)
// Exports: baggageEntryMetadataFromString, createBaggage
// Category: util

// Module: p$T (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.baggageEntryMetadataFromString = T.createBaggage = void 0));
  var R = cx(),
    a = aaR(),
    e = eaR(),
    t = R.DiagAPI.instance();
  function r(i = {}) {
    return new a.BaggageImpl(new Map(Object.entries(i)));
  }
  T.createBaggage = r;
  function h(i) {
    if (typeof i !== "string")
      (t.error(`Cannot create baggage metadata from unknown type: ${typeof i}`),
        (i = ""));
    return {
      __TYPE__: e.baggageEntryMetadataSymbol,
      toString() {
        return i;
      },
    };
  }
  T.baggageEntryMetadataFromString = h;
};
