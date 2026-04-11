// Module: ajv-keyword-juR
// Original: juR
// Type: CJS (RT wrapper)
// Exports: default
// Category: util

// Module: juR (CJS)
(T) => {
  Object.defineProperty(T, "__esModule", { value: !0 });
  var R = M9(),
    a = a8(),
    e = C9T(),
    t = {
      message: "must be equal to constant",
      params: ({ schemaCode: h }) => R._`{allowedValue: ${h}}`,
    },
    r = {
      keyword: "const",
      $data: !0,
      error: t,
      code(h) {
        let { gen: i, data: c, $data: s, schemaCode: A, schema: l } = h;
        if (s || (l && typeof l == "object"))
          h.fail$data(R._`!${(0, a.useFunc)(i, e.default)}(${c}, ${A})`);
        else h.fail(R._`${l} !== ${c}`);
      },
    };
  T.default = r;
};
