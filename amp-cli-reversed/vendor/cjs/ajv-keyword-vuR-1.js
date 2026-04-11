// Module: ajv-keyword-vuR-1
// Original: vuR
// Type: CJS (RT wrapper)
// Exports: default
// Category: util

// Module: vuR (CJS)
(T) => {
  Object.defineProperty(T, "__esModule", { value: !0 });
  var R = YD(),
    a = M9(),
    e = a8(),
    t = C9T(),
    r = {
      message: ({ params: { i, j: c } }) =>
        a.str`must NOT have duplicate items (items ## ${c} and ${i} are identical)`,
      params: ({ params: { i, j: c } }) => a._`{i: ${i}, j: ${c}}`,
    },
    h = {
      keyword: "uniqueItems",
      type: "array",
      schemaType: "boolean",
      $data: !0,
      error: r,
      code(i) {
        let {
          gen: c,
          data: s,
          $data: A,
          schema: l,
          parentSchema: o,
          schemaCode: n,
          it: p,
        } = i;
        if (!A && !l) return;
        let _ = c.let("valid"),
          m = o.items ? (0, R.getSchemaTypes)(o.items) : [];
        (i.block$data(_, b, a._`${n} === false`), i.ok(_));
        function b() {
          let k = c.let("i", a._`${s}.length`),
            x = c.let("j");
          (i.setParams({ i: k, j: x }),
            c.assign(_, !0),
            c.if(a._`${k} > 1`, () => (y() ? u : P)(k, x)));
        }
        function y() {
          return (
            m.length > 0 && !m.some((k) => k === "object" || k === "array")
          );
        }
        function u(k, x) {
          let f = c.name("item"),
            v = (0, R.checkDataTypes)(
              m,
              f,
              p.opts.strictNumbers,
              R.DataType.Wrong,
            ),
            g = c.const("indices", a._`{}`);
          c.for(
            a._`;
${k}--;
`,
            () => {
              if (
                (c.let(f, a._`${s}[${k}]`),
                c.if(v, a._`continue`),
                m.length > 1)
              )
                c.if(a._`typeof ${f} == "string"`, a._`${f} += "_"`);
              c.if(a._`typeof ${g}[${f}] == "number"`, () => {
                (c.assign(x, a._`${g}[${f}]`),
                  i.error(),
                  c.assign(_, !1).break());
              }).code(a._`${g}[${f}] = ${k}`);
            },
          );
        }
        function P(k, x) {
          let f = (0, e.useFunc)(c, t.default),
            v = c.name("outer");
          c.label(v).for(
            a._`;
${k}--;
`,
            () =>
              c.for(
                a._`${x} = ${k};
 ${x}--;
`,
                () =>
                  c.if(a._`${f}(${s}[${k}], ${s}[${x}])`, () => {
                    (i.error(), c.assign(_, !1).break(v));
                  }),
              ),
          );
        }
      },
    };
  T.default = h;
};
