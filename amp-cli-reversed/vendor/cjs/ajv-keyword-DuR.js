// Module: ajv-keyword-DuR
// Original: DuR
// Type: CJS (RT wrapper)
// Exports: default
// Category: util

// Module: duR (CJS)
(T) => {
  Object.defineProperty(T, "__esModule", { value: !0 });
  var R = M9(),
    a = a8(),
    e = dc(),
    t = vMT(),
    r = {
      message: ({ params: { len: i } }) =>
        R.str`must NOT have more than ${i} items`,
      params: ({ params: { len: i } }) => R._`{limit: ${i}}`,
    },
    h = {
      keyword: "items",
      type: "array",
      schemaType: ["object", "boolean"],
      before: "uniqueItems",
      error: r,
      code(i) {
        let { schema: c, parentSchema: s, it: A } = i,
          { prefixItems: l } = s;
        if (((A.items = !0), (0, a.alwaysValidSchema)(A, c))) return;
        if (l) (0, t.validateAdditionalItems)(i, l);
        else i.ok((0, e.validateArray)(i));
      },
    };
  T.default = h;
};
