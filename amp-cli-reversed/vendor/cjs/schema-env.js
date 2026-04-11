// Module: schema-env
// Original: ON
// Type: CJS (RT wrapper)
// Exports: SchemaEnv, compileSchema, getCompilingSchema, resolveRef, resolveSchema
// Category: util

// Module: ON (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.resolveSchema =
      T.getCompilingSchema =
      T.resolveRef =
      T.compileSchema =
      T.SchemaEnv =
        void 0));
  var R = M9(),
    a = SN(),
    e = Oc(),
    t = jN(),
    r = a8(),
    h = sO();
  class i {
    constructor(b) {
      var y;
      ((this.refs = {}), (this.dynamicAnchors = {}));
      let u;
      if (typeof b.schema == "object") u = b.schema;
      ((this.schema = b.schema),
        (this.schemaId = b.schemaId),
        (this.root = b.root || this),
        (this.baseId =
          (y = b.baseId) !== null && y !== void 0
            ? y
            : (0, t.normalizeId)(
                u === null || u === void 0 ? void 0 : u[b.schemaId || "$id"],
              )),
        (this.schemaPath = b.schemaPath),
        (this.localRefs = b.localRefs),
        (this.meta = b.meta),
        (this.$async = u === null || u === void 0 ? void 0 : u.$async),
        (this.refs = {}));
    }
  }
  T.SchemaEnv = i;
  function c(b) {
    let y = l.call(this, b);
    if (y) return y;
    let u = (0, t.getFullPath)(this.opts.uriResolver, b.root.baseId),
      { es5: P, lines: k } = this.opts.code,
      { ownProperties: x } = this.opts,
      f = new R.CodeGen(this.scope, { es5: P, lines: k, ownProperties: x }),
      v;
    if (b.$async)
      v = f.scopeValue("Error", {
        ref: a.default,
        code: R._`require("ajv/dist/runtime/validation_error").default`,
      });
    let g = f.scopeName("validate");
    b.validateName = g;
    let I = {
        gen: f,
        allErrors: this.opts.allErrors,
        data: e.default.data,
        parentData: e.default.parentData,
        parentDataProperty: e.default.parentDataProperty,
        dataNames: [e.default.data],
        dataPathArr: [R.nil],
        dataLevel: 0,
        dataTypes: [],
        definedProperties: new Set(),
        topSchemaRef: f.scopeValue(
          "schema",
          this.opts.code.source === !0
            ? { ref: b.schema, code: (0, R.stringify)(b.schema) }
            : { ref: b.schema },
        ),
        validateName: g,
        ValidationError: v,
        schema: b.schema,
        schemaEnv: b,
        rootId: u,
        baseId: b.baseId || u,
        schemaPath: R.nil,
        errSchemaPath: b.schemaPath || (this.opts.jtd ? "" : "#"),
        errorPath: R._`""`,
        opts: this.opts,
        self: this,
      },
      S;
    try {
      (this._compilations.add(b),
        (0, h.validateFunctionCode)(I),
        f.optimize(this.opts.code.optimize));
      let O = f.toString();
      if (
        ((S = `${f.scopeRefs(e.default.scope)}return ${O}`),
        this.opts.code.process)
      )
        S = this.opts.code.process(S, b);
      let j = Function(
        `${e.default.self}`,
        `${e.default.scope}`,
        S,
      )(this, this.scope.get());
      if (
        (this.scope.value(g, { ref: j }),
        (j.errors = null),
        (j.schema = b.schema),
        (j.schemaEnv = b),
        b.$async)
      )
        j.$async = !0;
      if (this.opts.code.source === !0)
        j.source = { validateName: g, validateCode: O, scopeValues: f._values };
      if (this.opts.unevaluated) {
        let { props: d, items: C } = I;
        if (
          ((j.evaluated = {
            props: d instanceof R.Name ? void 0 : d,
            items: C instanceof R.Name ? void 0 : C,
            dynamicProps: d instanceof R.Name,
            dynamicItems: C instanceof R.Name,
          }),
          j.source)
        )
          j.source.evaluated = (0, R.stringify)(j.evaluated);
      }
      return ((b.validate = j), b);
    } catch (O) {
      if ((delete b.validate, delete b.validateName, S))
        this.logger.error("Error compiling schema, function code:", S);
      throw O;
    } finally {
      this._compilations.delete(b);
    }
  }
  T.compileSchema = c;
  function s(b, y, u) {
    var P;
    u = (0, t.resolveUrl)(this.opts.uriResolver, y, u);
    let k = b.refs[u];
    if (k) return k;
    let x = n.call(this, b, u);
    if (x === void 0) {
      let f = (P = b.localRefs) === null || P === void 0 ? void 0 : P[u],
        { schemaId: v } = this.opts;
      if (f) x = new i({ schema: f, schemaId: v, root: b, baseId: y });
    }
    if (x === void 0) return;
    return (b.refs[u] = A.call(this, x));
  }
  T.resolveRef = s;
  function A(b) {
    if ((0, t.inlineRef)(b.schema, this.opts.inlineRefs)) return b.schema;
    return b.validate ? b : c.call(this, b);
  }
  function l(b) {
    for (let y of this._compilations) if (o(y, b)) return y;
  }
  T.getCompilingSchema = l;
  function o(b, y) {
    return b.schema === y.schema && b.root === y.root && b.baseId === y.baseId;
  }
  function n(b, y) {
    let u;
    while (typeof (u = this.refs[y]) == "string") y = u;
    return u || this.schemas[y] || p.call(this, b, y);
  }
  function p(b, y) {
    let u = this.opts.uriResolver.parse(y),
      P = (0, t._getFullPath)(this.opts.uriResolver, u),
      k = (0, t.getFullPath)(this.opts.uriResolver, b.baseId, void 0);
    if (Object.keys(b.schema).length > 0 && P === k) return m.call(this, u, b);
    let x = (0, t.normalizeId)(P),
      f = this.refs[x] || this.schemas[x];
    if (typeof f == "string") {
      let v = p.call(this, b, f);
      if (typeof (v === null || v === void 0 ? void 0 : v.schema) !== "object")
        return;
      return m.call(this, u, v);
    }
    if (typeof (f === null || f === void 0 ? void 0 : f.schema) !== "object")
      return;
    if (!f.validate) c.call(this, f);
    if (x === (0, t.normalizeId)(y)) {
      let { schema: v } = f,
        { schemaId: g } = this.opts,
        I = v[g];
      if (I) k = (0, t.resolveUrl)(this.opts.uriResolver, k, I);
      return new i({ schema: v, schemaId: g, root: b, baseId: k });
    }
    return m.call(this, u, f);
  }
  T.resolveSchema = p;
  var _ = new Set([
    "properties",
    "patternProperties",
    "enum",
    "dependencies",
    "definitions",
  ]);
  function m(b, { baseId: y, schema: u, root: P }) {
    var k;
    if (((k = b.fragment) === null || k === void 0 ? void 0 : k[0]) !== "/")
      return;
    for (let v of b.fragment.slice(1).split("/")) {
      if (typeof u === "boolean") return;
      let g = u[(0, r.unescapeFragment)(v)];
      if (g === void 0) return;
      u = g;
      let I = typeof u === "object" && u[this.opts.schemaId];
      if (!_.has(v) && I) y = (0, t.resolveUrl)(this.opts.uriResolver, y, I);
    }
    let x;
    if (
      typeof u != "boolean" &&
      u.$ref &&
      !(0, r.schemaHasRulesButRef)(u, this.RULES)
    ) {
      let v = (0, t.resolveUrl)(this.opts.uriResolver, y, u.$ref);
      x = p.call(this, P, v);
    }
    let { schemaId: f } = this.opts;
    if (
      ((x = x || new i({ schema: u, schemaId: f, root: P, baseId: y })),
      x.schema !== x.root.schema)
    )
      return x;
    return;
  }
};
