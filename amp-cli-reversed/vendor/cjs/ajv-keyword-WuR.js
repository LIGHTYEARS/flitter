// Module: ajv-keyword-WuR
// Original: WuR
// Type: CJS (RT wrapper)
// Exports: default
// Category: util

// Module: wuR (CJS)
(T) => {
  Object.defineProperty(T, "__esModule", { value: !0 });
  var R = dc(),
    a = {
      keyword: "anyOf",
      schemaType: "array",
      trackErrors: !0,
      code: R.validateUnion,
      error: { message: "must match a schema in anyOf" },
    };
  T.default = a;
};
