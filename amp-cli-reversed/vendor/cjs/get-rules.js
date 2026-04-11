// Module: get-rules
// Original: kMT
// Type: CJS (RT wrapper)
// Exports: getRules, isJSONType
// Category: util

// Module: kMT (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.getRules = T.isJSONType = void 0));
  var R = ["string", "number", "integer", "boolean", "null", "object", "array"],
    a = new Set(R);
  function e(r) {
    return typeof r == "string" && a.has(r);
  }
  T.isJSONType = e;
  function t() {
    let r = {
      number: { type: "number", rules: [] },
      string: { type: "string", rules: [] },
      array: { type: "array", rules: [] },
      object: { type: "object", rules: [] },
    };
    return {
      types: { ...r, integer: !0, boolean: !0, null: !0 },
      rules: [{ rules: [] }, r.number, r.string, r.array, r.object],
      post: { rules: [] },
      all: {},
      keywords: {},
    };
  }
  T.getRules = t;
};
