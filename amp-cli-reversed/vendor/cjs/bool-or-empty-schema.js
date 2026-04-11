// Module: bool-or-empty-schema
// Original: iuR
// Type: CJS (RT wrapper)
// Exports: boolOrEmptySchema, topBoolOrEmptySchema
// Category: util

// Module: iuR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.boolOrEmptySchema = T.topBoolOrEmptySchema = void 0));
  var R = vN(),
    a = M9(),
    e = Oc(),
    t = { message: "boolean schema is false" };
  function r(c) {
    let { gen: s, schema: A, validateName: l } = c;
    if (A === !1) i(c, !1);
    else if (typeof A == "object" && A.$async === !0) s.return(e.default.data);
    else (s.assign(a._`${l}.errors`, null), s.return(!0));
  }
  T.topBoolOrEmptySchema = r;
  function h(c, s) {
    let { gen: A, schema: l } = c;
    if (l === !1) (A.var(s, !1), i(c));
    else A.var(s, !0);
  }
  T.boolOrEmptySchema = h;
  function i(c, s) {
    let { gen: A, data: l } = c,
      o = {
        gen: A,
        keyword: "false schema",
        data: l,
        schema: !1,
        schemaCode: !1,
        schemaValue: !1,
        params: {},
        it: c,
      };
    (0, R.reportError)(o, t, void 0, s);
  }
};
