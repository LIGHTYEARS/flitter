// Module: ajv-keyword-SMT
// Original: SMT
// Type: CJS (RT wrapper)
// Exports: default
// Category: util

// Module: SMT (CJS)
(T) => {
  Object.defineProperty(T, "__esModule", { value: !0 });
  var R = dc(),
    a = M9(),
    e = Oc(),
    t = a8(),
    r = {
      message: "must NOT have additional properties",
      params: ({ params: i }) =>
        a._`{additionalProperty: ${i.additionalProperty}}`,
    },
    h = {
      keyword: "additionalProperties",
      type: ["object"],
      schemaType: ["boolean", "object"],
      allowUndefined: !0,
      trackErrors: !0,
      error: r,
      code(i) {
        let {
          gen: c,
          schema: s,
          parentSchema: A,
          data: l,
          errsCount: o,
          it: n,
        } = i;
        if (!o) throw Error("ajv implementation error");
        let { allErrors: p, opts: _ } = n;
        if (
          ((n.props = !0),
          _.removeAdditional !== "all" && (0, t.alwaysValidSchema)(n, s))
        )
          return;
        let m = (0, R.allSchemaProperties)(A.properties),
          b = (0, R.allSchemaProperties)(A.patternProperties);
        (y(), i.ok(a._`${o} === ${e.default.errors}`));
        function y() {
          c.forIn("key", l, (f) => {
            if (!m.length && !b.length) k(f);
            else c.if(u(f), () => k(f));
          });
        }
        function u(f) {
          let v;
          if (m.length > 8) {
            let g = (0, t.schemaRefOrVal)(n, A.properties, "properties");
            v = (0, R.isOwnProperty)(c, g, f);
          } else if (m.length)
            v = (0, a.or)(...m.map((g) => a._`${f} === ${g}`));
          else v = a.nil;
          if (b.length)
            v = (0, a.or)(
              v,
              ...b.map((g) => a._`${(0, R.usePattern)(i, g)}.test(${f})`),
            );
          return (0, a.not)(v);
        }
        function P(f) {
          c.code(a._`delete ${l}[${f}]`);
        }
        function k(f) {
          if (
            _.removeAdditional === "all" ||
            (_.removeAdditional && s === !1)
          ) {
            P(f);
            return;
          }
          if (s === !1) {
            if ((i.setParams({ additionalProperty: f }), i.error(), !p))
              c.break();
            return;
          }
          if (typeof s == "object" && !(0, t.alwaysValidSchema)(n, s)) {
            let v = c.name("valid");
            if (_.removeAdditional === "failing")
              (x(f, v, !1),
                c.if((0, a.not)(v), () => {
                  (i.reset(), P(f));
                }));
            else if ((x(f, v), !p)) c.if((0, a.not)(v), () => c.break());
          }
        }
        function x(f, v, g) {
          let I = {
            keyword: "additionalProperties",
            dataProp: f,
            dataPropType: t.Type.Str,
          };
          if (g === !1)
            Object.assign(I, {
              compositeRule: !0,
              createErrors: !1,
              allErrors: !1,
            });
          i.subschema(I, v);
        }
      },
    };
  T.default = h;
};
