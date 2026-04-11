// Module: data-type
// Original: YD
// Type: CJS (RT wrapper)
// Exports: DataType, checkDataType, checkDataTypes, coerceAndCheckDataType, getJSONTypes, getSchemaTypes, reportTypeError
// Category: util

// Module: YD (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.reportTypeError =
      T.checkDataTypes =
      T.checkDataType =
      T.coerceAndCheckDataType =
      T.getJSONTypes =
      T.getSchemaTypes =
      T.DataType =
        void 0));
  var R = kMT(),
    a = xMT(),
    e = vN(),
    t = M9(),
    r = a8(),
    h;
  (function (u) {
    ((u[(u.Correct = 0)] = "Correct"), (u[(u.Wrong = 1)] = "Wrong"));
  })(h || (T.DataType = h = {}));
  function i(u) {
    let P = c(u.type);
    if (P.includes("null")) {
      if (u.nullable === !1)
        throw Error("type: null contradicts nullable: false");
    } else {
      if (!P.length && u.nullable !== void 0)
        throw Error('"nullable" cannot be used without "type"');
      if (u.nullable === !0) P.push("null");
    }
    return P;
  }
  T.getSchemaTypes = i;
  function c(u) {
    let P = Array.isArray(u) ? u : u ? [u] : [];
    if (P.every(R.isJSONType)) return P;
    throw Error("type must be JSONType or JSONType[]: " + P.join(","));
  }
  T.getJSONTypes = c;
  function s(u, P) {
    let { gen: k, data: x, opts: f } = u,
      v = l(P, f.coerceTypes),
      g =
        P.length > 0 &&
        !(
          v.length === 0 &&
          P.length === 1 &&
          (0, a.schemaHasRulesForType)(u, P[0])
        );
    if (g) {
      let I = _(P, x, f.strictNumbers, h.Wrong);
      k.if(I, () => {
        if (v.length) o(u, P, v);
        else b(u);
      });
    }
    return g;
  }
  T.coerceAndCheckDataType = s;
  var A = new Set(["string", "number", "integer", "boolean", "null"]);
  function l(u, P) {
    return P
      ? u.filter((k) => A.has(k) || (P === "array" && k === "array"))
      : [];
  }
  function o(u, P, k) {
    let { gen: x, data: f, opts: v } = u,
      g = x.let("dataType", t._`typeof ${f}`),
      I = x.let("coerced", t._`undefined`);
    if (v.coerceTypes === "array")
      x.if(
        t._`${g} == 'object' && Array.isArray(${f}) && ${f}.length == 1`,
        () =>
          x
            .assign(f, t._`${f}[0]`)
            .assign(g, t._`typeof ${f}`)
            .if(_(P, f, v.strictNumbers), () => x.assign(I, f)),
      );
    x.if(t._`${I} !== undefined`);
    for (let O of k)
      if (A.has(O) || (O === "array" && v.coerceTypes === "array")) S(O);
    (x.else(),
      b(u),
      x.endIf(),
      x.if(t._`${I} !== undefined`, () => {
        (x.assign(f, I), n(u, I));
      }));
    function S(O) {
      switch (O) {
        case "string":
          x.elseIf(t._`${g} == "number" || ${g} == "boolean"`)
            .assign(I, t._`"" + ${f}`)
            .elseIf(t._`${f} === null`)
            .assign(I, t._`""`);
          return;
        case "number":
          x.elseIf(
            t._`${g} == "boolean" || ${f} === null
              || (${g} == "string" && ${f} && ${f} == +${f})`,
          ).assign(I, t._`+${f}`);
          return;
        case "integer":
          x.elseIf(
            t._`${g} === "boolean" || ${f} === null
              || (${g} === "string" && ${f} && ${f} == +${f} && !(${f} % 1))`,
          ).assign(I, t._`+${f}`);
          return;
        case "boolean":
          x.elseIf(t._`${f} === "false" || ${f} === 0 || ${f} === null`)
            .assign(I, !1)
            .elseIf(t._`${f} === "true" || ${f} === 1`)
            .assign(I, !0);
          return;
        case "null":
          (x.elseIf(t._`${f} === "" || ${f} === 0 || ${f} === false`),
            x.assign(I, null));
          return;
        case "array":
          x.elseIf(
            t._`${g} === "string" || ${g} === "number"
              || ${g} === "boolean" || ${f} === null`,
          ).assign(I, t._`[${f}]`);
      }
    }
  }
  function n({ gen: u, parentData: P, parentDataProperty: k }, x) {
    u.if(t._`${P} !== undefined`, () => u.assign(t._`${P}[${k}]`, x));
  }
  function p(u, P, k, x = h.Correct) {
    let f = x === h.Correct ? t.operators.EQ : t.operators.NEQ,
      v;
    switch (u) {
      case "null":
        return t._`${P} ${f} null`;
      case "array":
        v = t._`Array.isArray(${P})`;
        break;
      case "object":
        v = t._`${P} && typeof ${P} == "object" && !Array.isArray(${P})`;
        break;
      case "integer":
        v = g(t._`!(${P} % 1) && !isNaN(${P})`);
        break;
      case "number":
        v = g();
        break;
      default:
        return t._`typeof ${P} ${f} ${u}`;
    }
    return x === h.Correct ? v : (0, t.not)(v);
    function g(I = t.nil) {
      return (0, t.and)(
        t._`typeof ${P} == "number"`,
        I,
        k ? t._`isFinite(${P})` : t.nil,
      );
    }
  }
  T.checkDataType = p;
  function _(u, P, k, x) {
    if (u.length === 1) return p(u[0], P, k, x);
    let f,
      v = (0, r.toHash)(u);
    if (v.array && v.object) {
      let g = t._`typeof ${P} != "object"`;
      ((f = v.null ? g : t._`!${P} || ${g}`),
        delete v.null,
        delete v.array,
        delete v.object);
    } else f = t.nil;
    if (v.number) delete v.integer;
    for (let g in v) f = (0, t.and)(f, p(g, P, k, x));
    return f;
  }
  T.checkDataTypes = _;
  var m = {
    message: ({ schema: u }) => `must be ${u}`,
    params: ({ schema: u, schemaValue: P }) =>
      typeof u == "string" ? t._`{type: ${u}}` : t._`{type: ${P}}`,
  };
  function b(u) {
    let P = y(u);
    (0, e.reportError)(P, m);
  }
  T.reportTypeError = b;
  function y(u) {
    let { gen: P, data: k, schema: x } = u,
      f = (0, r.schemaRefOrVal)(u, x, "type");
    return {
      gen: P,
      keyword: "type",
      data: k,
      schema: x.type,
      schemaCode: f,
      schemaValue: f,
      parentSchema: x,
      params: {},
      it: u,
    };
  }
};
