// Module: ajv-keyword-EuR
// Original: EuR
// Type: CJS (RT wrapper)
// Exports: default
// Category: util

// Module: EuR (CJS)
(T) => {
  Object.defineProperty(T, "__esModule", { value: !0 });
  var R = M9(),
    a = a8(),
    e = {
      message: ({ params: { min: r, max: h } }) =>
        h === void 0
          ? R.str`must contain at least ${r} valid item(s)`
          : R.str`must contain at least ${r} and no more than ${h} valid item(s)`,
      params: ({ params: { min: r, max: h } }) =>
        h === void 0
          ? R._`{minContains: ${r}}`
          : R._`{minContains: ${r}, maxContains: ${h}}`,
    },
    t = {
      keyword: "contains",
      type: "array",
      schemaType: ["object", "boolean"],
      before: "uniqueItems",
      trackErrors: !0,
      error: e,
      code(r) {
        let { gen: h, schema: i, parentSchema: c, data: s, it: A } = r,
          l,
          o,
          { minContains: n, maxContains: p } = c;
        if (A.opts.next) ((l = n === void 0 ? 1 : n), (o = p));
        else l = 1;
        let _ = h.const("len", R._`${s}.length`);
        if ((r.setParams({ min: l, max: o }), o === void 0 && l === 0)) {
          (0, a.checkStrictMode)(
            A,
            '"minContains" == 0 without "maxContains": "contains" keyword ignored',
          );
          return;
        }
        if (o !== void 0 && l > o) {
          ((0, a.checkStrictMode)(
            A,
            '"minContains" > "maxContains" is always invalid',
          ),
            r.fail());
          return;
        }
        if ((0, a.alwaysValidSchema)(A, i)) {
          let P = R._`${_} >= ${l}`;
          if (o !== void 0) P = R._`${P} && ${_} <= ${o}`;
          r.pass(P);
          return;
        }
        A.items = !0;
        let m = h.name("valid");
        if (o === void 0 && l === 1) y(m, () => h.if(m, () => h.break()));
        else if (l === 0) {
          if ((h.let(m, !0), o !== void 0)) h.if(R._`${s}.length > 0`, b);
        } else (h.let(m, !1), b());
        r.result(m, () => r.reset());
        function b() {
          let P = h.name("_valid"),
            k = h.let("count", 0);
          y(P, () => h.if(P, () => u(k)));
        }
        function y(P, k) {
          h.forRange("i", 0, _, (x) => {
            (r.subschema(
              {
                keyword: "contains",
                dataProp: x,
                dataPropType: a.Type.Num,
                compositeRule: !0,
              },
              P,
            ),
              k());
          });
        }
        function u(P) {
          if ((h.code(R._`${P}++`), o === void 0))
            h.if(R._`${P} >= ${l}`, () => h.assign(m, !0).break());
          else if (
            (h.if(R._`${P} > ${o}`, () => h.assign(m, !1).break()), l === 1)
          )
            h.assign(m, !0);
          else h.if(R._`${P} >= ${l}`, () => h.assign(m, !0));
        }
      },
    };
  T.default = t;
};
