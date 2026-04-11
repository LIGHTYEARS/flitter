// Module: all-schema-properties
// Original: dc
// Type: CJS (RT wrapper)
// Exports: allSchemaProperties, callValidateCode, checkMissingProp, checkReportMissingProp, hasPropFunc, isOwnProperty, noPropertyInData, propertyInData, reportMissingProp, schemaProperties, usePattern, validateArray, validateUnion
// Category: util

// Module: dc (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.validateUnion =
      T.validateArray =
      T.usePattern =
      T.callValidateCode =
      T.schemaProperties =
      T.allSchemaProperties =
      T.noPropertyInData =
      T.propertyInData =
      T.isOwnProperty =
      T.hasPropFunc =
      T.reportMissingProp =
      T.checkMissingProp =
      T.checkReportMissingProp =
        void 0));
  var R = M9(),
    a = a8(),
    e = Oc(),
    t = a8();
  function r(u, P) {
    let { gen: k, data: x, it: f } = u;
    k.if(l(k, x, P, f.opts.ownProperties), () => {
      (u.setParams({ missingProperty: R._`${P}` }, !0), u.error());
    });
  }
  T.checkReportMissingProp = r;
  function h({ gen: u, data: P, it: { opts: k } }, x, f) {
    return (0, R.or)(
      ...x.map((v) =>
        (0, R.and)(l(u, P, v, k.ownProperties), R._`${f} = ${v}`),
      ),
    );
  }
  T.checkMissingProp = h;
  function i(u, P) {
    (u.setParams({ missingProperty: P }, !0), u.error());
  }
  T.reportMissingProp = i;
  function c(u) {
    return u.scopeValue("func", {
      ref: Object.prototype.hasOwnProperty,
      code: R._`Object.prototype.hasOwnProperty`,
    });
  }
  T.hasPropFunc = c;
  function s(u, P, k) {
    return R._`${c(u)}.call(${P}, ${k})`;
  }
  T.isOwnProperty = s;
  function A(u, P, k, x) {
    let f = R._`${P}${(0, R.getProperty)(k)} !== undefined`;
    return x ? R._`${f} && ${s(u, P, k)}` : f;
  }
  T.propertyInData = A;
  function l(u, P, k, x) {
    let f = R._`${P}${(0, R.getProperty)(k)} === undefined`;
    return x ? (0, R.or)(f, (0, R.not)(s(u, P, k))) : f;
  }
  T.noPropertyInData = l;
  function o(u) {
    return u ? Object.keys(u).filter((P) => P !== "__proto__") : [];
  }
  T.allSchemaProperties = o;
  function n(u, P) {
    return o(P).filter((k) => !(0, a.alwaysValidSchema)(u, P[k]));
  }
  T.schemaProperties = n;
  function p(
    {
      schemaCode: u,
      data: P,
      it: { gen: k, topSchemaRef: x, schemaPath: f, errorPath: v },
      it: g,
    },
    I,
    S,
    O,
  ) {
    let j = O ? R._`${u}, ${P}, ${x}${f}` : P,
      d = [
        [e.default.instancePath, (0, R.strConcat)(e.default.instancePath, v)],
        [e.default.parentData, g.parentData],
        [e.default.parentDataProperty, g.parentDataProperty],
        [e.default.rootData, e.default.rootData],
      ];
    if (g.opts.dynamicRef)
      d.push([e.default.dynamicAnchors, e.default.dynamicAnchors]);
    let C = R._`${j}, ${k.object(...d)}`;
    return S !== R.nil ? R._`${I}.call(${S}, ${C})` : R._`${I}(${C})`;
  }
  T.callValidateCode = p;
  var _ = R._`new RegExp`;
  function m({ gen: u, it: { opts: P } }, k) {
    let x = P.unicodeRegExp ? "u" : "",
      { regExp: f } = P.code,
      v = f(k, x);
    return u.scopeValue("pattern", {
      key: v.toString(),
      ref: v,
      code: R._`${f.code === "new RegExp" ? _ : (0, t.useFunc)(u, f)}(${k}, ${x})`,
    });
  }
  T.usePattern = m;
  function b(u) {
    let { gen: P, data: k, keyword: x, it: f } = u,
      v = P.name("valid");
    if (f.allErrors) {
      let I = P.let("valid", !0);
      return (g(() => P.assign(I, !1)), I);
    }
    return (P.var(v, !0), g(() => P.break()), v);
    function g(I) {
      let S = P.const("len", R._`${k}.length`);
      P.forRange("i", 0, S, (O) => {
        (u.subschema({ keyword: x, dataProp: O, dataPropType: a.Type.Num }, v),
          P.if((0, R.not)(v), I));
      });
    }
  }
  T.validateArray = b;
  function y(u) {
    let { gen: P, schema: k, keyword: x, it: f } = u;
    if (!Array.isArray(k)) throw Error("ajv implementation error");
    if (k.some((I) => (0, a.alwaysValidSchema)(f, I)) && !f.opts.unevaluated)
      return;
    let v = P.let("valid", !1),
      g = P.name("_valid");
    (P.block(() =>
      k.forEach((I, S) => {
        let O = u.subschema(
          { keyword: x, schemaProp: S, compositeRule: !0 },
          g,
        );
        if ((P.assign(v, R._`${v} || ${g}`), !u.mergeValidEvaluated(O, g)))
          P.if((0, R.not)(v));
      }),
    ),
      u.result(
        v,
        () => u.reset(),
        () => u.error(!0),
      ));
  }
  T.validateUnion = y;
};
