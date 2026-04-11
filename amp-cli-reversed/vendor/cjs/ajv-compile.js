// Module: ajv-compile
// Original: sO
// Type: CJS (RT wrapper)
// Exports: KeywordCxt, SchemaEnv, compileSchema, default, getCompilingSchema, getData, resolveRef, resolveSchema, validateFunctionCode
// Category: npm-pkg

(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.getData = T.KeywordCxt = T.validateFunctionCode = void 0));
  var R = iuR(),
    a = YD(),
    e = xMT(),
    t = YD(),
    r = cuR(),
    h = suR(),
    i = ouR(),
    c = M9(),
    s = Oc(),
    A = jN(),
    l = a8(),
    o = vN();
  function n(q) {
    if (x(q)) {
      if ((v(q), k(q))) {
        b(q);
        return;
      }
    }
    p(q, () => (0, R.topBoolOrEmptySchema)(q));
  }
  T.validateFunctionCode = n;
  function p({ gen: q, validateName: F, schema: E, schemaEnv: U, opts: Z }, X) {
    if (Z.code.es5)
      q.func(F, c._`${s.default.data}, ${s.default.valCxt}`, U.$async, () => {
        (q.code(c._`"use strict"; ${u(E, Z)}`), m(q, Z), q.code(X));
      });
    else
      q.func(F, c._`${s.default.data}, ${_(Z)}`, U.$async, () =>
        q.code(u(E, Z)).code(X),
      );
  }
  function _(q) {
    return c._`{${s.default.instancePath}="", ${s.default.parentData}, ${s.default.parentDataProperty}, ${s.default.rootData}=${s.default.data}${q.dynamicRef ? c._`, ${s.default.dynamicAnchors}={}` : c.nil}}={}`;
  }
  function m(q, F) {
    q.if(
      s.default.valCxt,
      () => {
        if (
          (q.var(
            s.default.instancePath,
            c._`${s.default.valCxt}.${s.default.instancePath}`,
          ),
          q.var(
            s.default.parentData,
            c._`${s.default.valCxt}.${s.default.parentData}`,
          ),
          q.var(
            s.default.parentDataProperty,
            c._`${s.default.valCxt}.${s.default.parentDataProperty}`,
          ),
          q.var(
            s.default.rootData,
            c._`${s.default.valCxt}.${s.default.rootData}`,
          ),
          F.dynamicRef)
        )
          q.var(
            s.default.dynamicAnchors,
            c._`${s.default.valCxt}.${s.default.dynamicAnchors}`,
          );
      },
      () => {
        if (
          (q.var(s.default.instancePath, c._`""`),
          q.var(s.default.parentData, c._`undefined`),
          q.var(s.default.parentDataProperty, c._`undefined`),
          q.var(s.default.rootData, s.default.data),
          F.dynamicRef)
        )
          q.var(s.default.dynamicAnchors, c._`{}`);
      },
    );
  }
  function b(q) {
    let { schema: F, opts: E, gen: U } = q;
    p(q, () => {
      if (E.$comment && F.$comment) d(q);
      if (
        (S(q),
        U.let(s.default.vErrors, null),
        U.let(s.default.errors, 0),
        E.unevaluated)
      )
        y(q);
      (g(q), C(q));
    });
    return;
  }
  function y(q) {
    let { gen: F, validateName: E } = q;
    ((q.evaluated = F.const("evaluated", c._`${E}.evaluated`)),
      F.if(c._`${q.evaluated}.dynamicProps`, () =>
        F.assign(c._`${q.evaluated}.props`, c._`undefined`),
      ),
      F.if(c._`${q.evaluated}.dynamicItems`, () =>
        F.assign(c._`${q.evaluated}.items`, c._`undefined`),
      ));
  }
  function u(q, F) {
    let E = typeof q == "object" && q[F.schemaId];
    return E && (F.code.source || F.code.process)
      ? c._`/*# sourceURL=${E} */`
      : c.nil;
  }
  function P(q, F) {
    if (x(q)) {
      if ((v(q), k(q))) {
        f(q, F);
        return;
      }
    }
    (0, R.boolOrEmptySchema)(q, F);
  }
  function k({ schema: q, self: F }) {
    if (typeof q == "boolean") return !q;
    for (let E in q) if (F.RULES.all[E]) return !0;
    return !1;
  }
  function x(q) {
    return typeof q.schema != "boolean";
  }
  function f(q, F) {
    let { schema: E, gen: U, opts: Z } = q;
    if (Z.$comment && E.$comment) d(q);
    (O(q), j(q));
    let X = U.const("_errs", s.default.errors);
    (g(q, X), U.var(F, c._`${X} === ${s.default.errors}`));
  }
  function v(q) {
    ((0, l.checkUnknownRules)(q), I(q));
  }
  function g(q, F) {
    if (q.opts.jtd) return w(q, [], !1, F);
    let E = (0, a.getSchemaTypes)(q.schema),
      U = (0, a.coerceAndCheckDataType)(q, E);
    w(q, E, !U, F);
  }
  function I(q) {
    let { schema: F, errSchemaPath: E, opts: U, self: Z } = q;
    if (
      F.$ref &&
      U.ignoreKeywordsWithRef &&
      (0, l.schemaHasRulesButRef)(F, Z.RULES)
    )
      Z.logger.warn(`$ref: keywords ignored in schema at path "${E}"`);
  }
  function S(q) {
    let { schema: F, opts: E } = q;
    if (F.default !== void 0 && E.useDefaults && E.strictSchema)
      (0, l.checkStrictMode)(q, "default is ignored in the schema root");
  }
  function O(q) {
    let F = q.schema[q.opts.schemaId];
    if (F) q.baseId = (0, A.resolveUrl)(q.opts.uriResolver, q.baseId, F);
  }
  function j(q) {
    if (q.schema.$async && !q.schemaEnv.$async)
      throw Error("async schema in sync schema");
  }
  function d({ gen: q, schemaEnv: F, schema: E, errSchemaPath: U, opts: Z }) {
    let X = E.$comment;
    if (Z.$comment === !0) q.code(c._`${s.default.self}.logger.log(${X})`);
    else if (typeof Z.$comment == "function") {
      let rT = c.str`${U}/$comment`,
        hT = q.scopeValue("root", { ref: F.root });
      q.code(c._`${s.default.self}.opts.$comment(${X}, ${rT}, ${hT}.schema)`);
    }
  }
  function C(q) {
    let {
      gen: F,
      schemaEnv: E,
      validateName: U,
      ValidationError: Z,
      opts: X,
    } = q;
    if (E.$async)
      F.if(
        c._`${s.default.errors} === 0`,
        () => F.return(s.default.data),
        () => F.throw(c._`new ${Z}(${s.default.vErrors})`),
      );
    else {
      if ((F.assign(c._`${U}.errors`, s.default.vErrors), X.unevaluated)) L(q);
      F.return(c._`${s.default.errors} === 0`);
    }
  }
  function L({ gen: q, evaluated: F, props: E, items: U }) {
    if (E instanceof c.Name) q.assign(c._`${F}.props`, E);
    if (U instanceof c.Name) q.assign(c._`${F}.items`, U);
  }
  function w(q, F, E, U) {
    let { gen: Z, schema: X, data: rT, allErrors: hT, opts: pT, self: mT } = q,
      { RULES: yT } = mT;
    if (
      X.$ref &&
      (pT.ignoreKeywordsWithRef || !(0, l.schemaHasRulesButRef)(X, yT))
    ) {
      Z.block(() => TT(q, "$ref", yT.all.$ref.definition));
      return;
    }
    if (!pT.jtd) B(q, F);
    Z.block(() => {
      for (let bT of yT.rules) uT(bT);
      uT(yT.post);
    });
    function uT(bT) {
      if (!(0, e.shouldUseGroup)(X, bT)) return;
      if (bT.type) {
        if (
          (Z.if((0, t.checkDataType)(bT.type, rT, pT.strictNumbers)),
          D(q, bT),
          F.length === 1 && F[0] === bT.type && E)
        )
          (Z.else(), (0, t.reportTypeError)(q));
        Z.endIf();
      } else D(q, bT);
      if (!hT) Z.if(c._`${s.default.errors} === ${U || 0}`);
    }
  }
  function D(q, F) {
    let {
      gen: E,
      schema: U,
      opts: { useDefaults: Z },
    } = q;
    if (Z) (0, r.assignDefaults)(q, F.type);
    E.block(() => {
      for (let X of F.rules)
        if ((0, e.shouldUseRule)(U, X)) TT(q, X.keyword, X.definition, F.type);
    });
  }
  function B(q, F) {
    if (q.schemaEnv.meta || !q.opts.strictTypes) return;
    if ((M(q, F), !q.opts.allowUnionTypes)) V(q, F);
    Q(q, q.dataTypes);
  }
  function M(q, F) {
    if (!F.length) return;
    if (!q.dataTypes.length) {
      q.dataTypes = F;
      return;
    }
    (F.forEach((E) => {
      if (!eT(q.dataTypes, E))
        aT(q, `type "${E}" not allowed by context "${q.dataTypes.join(",")}"`);
    }),
      iT(q, F));
  }
  function V(q, F) {
    if (F.length > 1 && !(F.length === 2 && F.includes("null")))
      aT(q, "use allowUnionTypes to allow union type keyword");
  }
  function Q(q, F) {
    let E = q.self.RULES.all;
    for (let U in E) {
      let Z = E[U];
      if (typeof Z == "object" && (0, e.shouldUseRule)(q.schema, Z)) {
        let { type: X } = Z.definition;
        if (X.length && !X.some((rT) => W(F, rT)))
          aT(q, `missing type "${X.join(",")}" for keyword "${U}"`);
      }
    }
  }
  function W(q, F) {
    return q.includes(F) || (F === "number" && q.includes("integer"));
  }
  function eT(q, F) {
    return q.includes(F) || (F === "integer" && q.includes("number"));
  }
  function iT(q, F) {
    let E = [];
    for (let U of q.dataTypes)
      if (eT(F, U)) E.push(U);
      else if (F.includes("integer") && U === "number") E.push("integer");
    q.dataTypes = E;
  }
  function aT(q, F) {
    let E = q.schemaEnv.baseId + q.errSchemaPath;
    ((F += ` at "${E}" (strictTypes)`),
      (0, l.checkStrictMode)(q, F, q.opts.strictTypes));
  }
  class oT {
    constructor(q, F, E) {
      if (
        ((0, h.validateKeywordUsage)(q, F, E),
        (this.gen = q.gen),
        (this.allErrors = q.allErrors),
        (this.keyword = E),
        (this.data = q.data),
        (this.schema = q.schema[E]),
        (this.$data =
          F.$data && q.opts.$data && this.schema && this.schema.$data),
        (this.schemaValue = (0, l.schemaRefOrVal)(
          q,
          this.schema,
          E,
          this.$data,
        )),
        (this.schemaType = F.schemaType),
        (this.parentSchema = q.schema),
        (this.params = {}),
        (this.it = q),
        (this.def = F),
        this.$data)
      )
        this.schemaCode = q.gen.const("vSchema", N(this.$data, q));
      else if (
        ((this.schemaCode = this.schemaValue),
        !(0, h.validSchemaType)(this.schema, F.schemaType, F.allowUndefined))
      )
        throw Error(`${E} value must be ${JSON.stringify(F.schemaType)}`);
      if ("code" in F ? F.trackErrors : F.errors !== !1)
        this.errsCount = q.gen.const("_errs", s.default.errors);
    }
    result(q, F, E) {
      this.failResult((0, c.not)(q), F, E);
    }
    failResult(q, F, E) {
      if ((this.gen.if(q), E)) E();
      else this.error();
      if (F) {
        if ((this.gen.else(), F(), this.allErrors)) this.gen.endIf();
      } else if (this.allErrors) this.gen.endIf();
      else this.gen.else();
    }
    pass(q, F) {
      this.failResult((0, c.not)(q), void 0, F);
    }
    fail(q) {
      if (q === void 0) {
        if ((this.error(), !this.allErrors)) this.gen.if(!1);
        return;
      }
      if ((this.gen.if(q), this.error(), this.allErrors)) this.gen.endIf();
      else this.gen.else();
    }
    fail$data(q) {
      if (!this.$data) return this.fail(q);
      let { schemaCode: F } = this;
      this.fail(
        c._`${F} !== undefined && (${(0, c.or)(this.invalid$data(), q)})`,
      );
    }
    error(q, F, E) {
      if (F) {
        (this.setParams(F), this._error(q, E), this.setParams({}));
        return;
      }
      this._error(q, E);
    }
    _error(q, F) {
      (q ? o.reportExtraError : o.reportError)(this, this.def.error, F);
    }
    $dataError() {
      (0, o.reportError)(this, this.def.$dataError || o.keyword$DataError);
    }
    reset() {
      if (this.errsCount === void 0)
        throw Error('add "trackErrors" to keyword definition');
      (0, o.resetErrorsCount)(this.gen, this.errsCount);
    }
    ok(q) {
      if (!this.allErrors) this.gen.if(q);
    }
    setParams(q, F) {
      if (F) Object.assign(this.params, q);
      else this.params = q;
    }
    block$data(q, F, E = c.nil) {
      this.gen.block(() => {
        (this.check$data(q, E), F());
      });
    }
    check$data(q = c.nil, F = c.nil) {
      if (!this.$data) return;
      let { gen: E, schemaCode: U, schemaType: Z, def: X } = this;
      if ((E.if((0, c.or)(c._`${U} === undefined`, F)), q !== c.nil))
        E.assign(q, !0);
      if (Z.length || X.validateSchema) {
        if ((E.elseIf(this.invalid$data()), this.$dataError(), q !== c.nil))
          E.assign(q, !1);
      }
      E.else();
    }
    invalid$data() {
      let { gen: q, schemaCode: F, schemaType: E, def: U, it: Z } = this;
      return (0, c.or)(X(), rT());
      function X() {
        if (E.length) {
          if (!(F instanceof c.Name)) throw Error("ajv implementation error");
          let hT = Array.isArray(E) ? E : [E];
          return c._`${(0, t.checkDataTypes)(hT, F, Z.opts.strictNumbers, t.DataType.Wrong)}`;
        }
        return c.nil;
      }
      function rT() {
        if (U.validateSchema) {
          let hT = q.scopeValue("validate$data", { ref: U.validateSchema });
          return c._`!${hT}(${F})`;
        }
        return c.nil;
      }
    }
    subschema(q, F) {
      let E = (0, i.getSubschema)(this.it, q);
      ((0, i.extendSubschemaData)(E, this.it, q),
        (0, i.extendSubschemaMode)(E, q));
      let U = { ...this.it, ...E, items: void 0, props: void 0 };
      return (P(U, F), U);
    }
    mergeEvaluated(q, F) {
      let { it: E, gen: U } = this;
      if (!E.opts.unevaluated) return;
      if (E.props !== !0 && q.props !== void 0)
        E.props = l.mergeEvaluated.props(U, q.props, E.props, F);
      if (E.items !== !0 && q.items !== void 0)
        E.items = l.mergeEvaluated.items(U, q.items, E.items, F);
    }
    mergeValidEvaluated(q, F) {
      let { it: E, gen: U } = this;
      if (E.opts.unevaluated && (E.props !== !0 || E.items !== !0))
        return (U.if(F, () => this.mergeEvaluated(q, c.Name)), !0);
    }
  }
  T.KeywordCxt = oT;
  function TT(q, F, E, U) {
    let Z = new oT(q, E, F);
    if ("code" in E) E.code(Z, U);
    else if (Z.$data && E.validate) (0, h.funcKeywordCode)(Z, E);
    else if ("macro" in E) (0, h.macroKeywordCode)(Z, E);
    else if (E.compile || E.validate) (0, h.funcKeywordCode)(Z, E);
  }
  var tT = /^\/(?:[^~]|~0|~1)*$/,
    lT = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
  function N(q, { dataLevel: F, dataNames: E, dataPathArr: U }) {
    let Z, X;
    if (q === "") return s.default.rootData;
    if (q[0] === "/") {
      if (!tT.test(q)) throw Error(`Invalid JSON-pointer: ${q}`);
      ((Z = q), (X = s.default.rootData));
    } else {
      let mT = lT.exec(q);
      if (!mT) throw Error(`Invalid JSON-pointer: ${q}`);
      let yT = +mT[1];
      if (((Z = mT[2]), Z === "#")) {
        if (yT >= F) throw Error(pT("property/index", yT));
        return U[F - yT];
      }
      if (yT > F) throw Error(pT("data", yT));
      if (((X = E[F - yT]), !Z)) return X;
    }
    let rT = X,
      hT = Z.split("/");
    for (let mT of hT)
      if (mT)
        ((X = c._`${X}${(0, c.getProperty)((0, l.unescapeJsonPointer)(mT))}`),
          (rT = c._`${rT} && ${X}`));
    return rT;
    function pT(mT, yT) {
      return `Cannot access ${mT} ${yT} levels up, current level is ${F}`;
    }
  }
  T.getData = N;
};
