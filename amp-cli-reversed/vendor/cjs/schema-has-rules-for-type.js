// Module: schema-has-rules-for-type
// Original: xMT
// Type: CJS (RT wrapper)
// Exports: schemaHasRulesForType, shouldUseGroup, shouldUseRule
// Category: util

// Module: xMT (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.shouldUseRule = T.shouldUseGroup = T.schemaHasRulesForType = void 0));
  function R({ schema: t, self: r }, h) {
    let i = r.RULES.types[h];
    return i && i !== !0 && a(t, i);
  }
  T.schemaHasRulesForType = R;
  function a(t, r) {
    return r.rules.some((h) => e(t, h));
  }
  T.shouldUseGroup = a;
  function e(t, r) {
    var h;
    return (
      t[r.keyword] !== void 0 ||
      ((h = r.definition.implements) === null || h === void 0
        ? void 0
        : h.some((i) => t[i] !== void 0))
    );
  }
  T.shouldUseRule = e;
};
