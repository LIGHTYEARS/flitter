// Module: create-instrumentation-scope
// Original: $Z
// Type: CJS (RT wrapper)
// Exports: createInstrumentationScope, createResource, toAnyValue, toAttributes, toKeyValue
// Category: util

// Module: $Z (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.toAnyValue =
      T.toKeyValue =
      T.toAttributes =
      T.createInstrumentationScope =
      T.createResource =
        void 0));
  function R(h) {
    let i = { attributes: e(h.attributes), droppedAttributesCount: 0 },
      c = h.schemaUrl;
    if (c && c !== "") i.schemaUrl = c;
    return i;
  }
  T.createResource = R;
  function a(h) {
    return { name: h.name, version: h.version };
  }
  T.createInstrumentationScope = a;
  function e(h) {
    return Object.keys(h).map((i) => t(i, h[i]));
  }
  T.toAttributes = e;
  function t(h, i) {
    return { key: h, value: r(i) };
  }
  T.toKeyValue = t;
  function r(h) {
    let i = typeof h;
    if (i === "string") return { stringValue: h };
    if (i === "number") {
      if (!Number.isInteger(h)) return { doubleValue: h };
      return { intValue: h };
    }
    if (i === "boolean") return { boolValue: h };
    if (h instanceof Uint8Array) return { bytesValue: h };
    if (Array.isArray(h)) return { arrayValue: { values: h.map(r) } };
    if (i === "object" && h != null)
      return {
        kvlistValue: { values: Object.entries(h).map(([c, s]) => t(c, s)) },
      };
    return {};
  }
  T.toAnyValue = r;
};
