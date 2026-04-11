// Module: validate-additional-items
// Original: vMT
// Type: CJS (RT wrapper)
// Exports: default, validateAdditionalItems
// Category: util

// Module: vMT (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.validateAdditionalItems = void 0));
  var R = M9(),
    a = a8(),
    e = {
      message: ({ params: { len: h } }) =>
        R.str`must NOT have more than ${h} items`,
      params: ({ params: { len: h } }) => R._`{limit: ${h}}`,
    },
    t = {
      keyword: "additionalItems",
      type: "array",
      schemaType: ["boolean", "object"],
      before: "uniqueItems",
      error: e,
      code(h) {
        let { parentSchema: i, it: c } = h,
          { items: s } = i;
        if (!Array.isArray(s)) {
          (0, a.checkStrictMode)(
            c,
            '"additionalItems" is ignored when "items" is not an array of schemas',
          );
          return;
        }
        r(h, s);
      },
    };
  function r(h, i) {
    let { gen: c, schema: s, data: A, keyword: l, it: o } = h;
    o.items = !0;
    let n = c.const("len", R._`${A}.length`);
    if (s === !1)
      (h.setParams({ len: i.length }), h.pass(R._`${n} <= ${i.length}`));
    else if (typeof s == "object" && !(0, a.alwaysValidSchema)(o, s)) {
      let _ = c.var("valid", R._`${n} <= ${i.length}`);
      (c.if((0, R.not)(_), () => p(_)), h.ok(_));
    }
    function p(_) {
      c.forRange("i", i.length, n, (m) => {
        if (
          (h.subschema(
            { keyword: l, dataProp: m, dataPropType: a.Type.Num },
            _,
          ),
          !o.allErrors)
        )
          c.if((0, R.not)(_), () => c.break());
      });
    }
  }
  ((T.validateAdditionalItems = r), (T.default = t));
};
