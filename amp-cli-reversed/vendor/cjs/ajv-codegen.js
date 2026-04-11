// Module: ajv-codegen
// Original: M9
// Type: CJS (RT wrapper)
// Exports: CodeGen, DataType, KeywordCxt, Name, SchemaEnv, Scope, Type, ValueScope, ValueScopeName, _, _getFullPath, allSchemaProperties, alwaysValidSchema, and, assignDefaults, boolOrEmptySchema, callValidateCode, checkDataType, checkDataTypes, checkMissingProp, checkReportMissingProp, checkStrictMode, checkUnknownRules, coerceAndCheckDataType, compileSchema, default, eachItem, escapeFragment, escapeJsonPointer, evaluatedPropsToName, extendErrors, extendSubschemaData, extendSubschemaMode, funcKeywordCode, getCompilingSchema, getData, getErrorPath, getFullPath, getJSONTypes, getProperty, getRules, getSchemaRefs, getSchemaTypes, getSubschema, hasPropFunc, inlineRef, isJSONType, isOwnProperty, keywordError, macroKeywordCode, mergeEvaluated, nil, noPropertyInData, normalizeId, not, operators, or, propertyInData, regexpCode, reportError, reportExtraError, reportMissingProp, reportTypeError, resetErrorsCount, resolveRef, resolveSchema, resolveUrl, schemaHasRules, schemaHasRulesButRef, schemaHasRulesForType, schemaProperties, schemaRefOrVal, setEvaluated, shouldUseGroup, shouldUseRule, str, strConcat, stringify, toHash, topBoolOrEmptySchema, unescapeFragment, unescapeJsonPointer, useFunc, usePattern, validSchemaType, validateArray, validateFunctionCode, validateKeywordUsage, validateUnion, varKinds
// Category: npm-pkg

(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.or =
      T.and =
      T.not =
      T.CodeGen =
      T.operators =
      T.varKinds =
      T.ValueScopeName =
      T.ValueScope =
      T.Scope =
      T.Name =
      T.regexpCode =
      T.stringify =
      T.getProperty =
      T.nil =
      T.strConcat =
      T.str =
      T._ =
        void 0));
  var R = XD(),
    a = hlT(),
    e = XD();
  (Object.defineProperty(T, "_", {
    enumerable: !0,
    get: function () {
      return e._;
    },
  }),
    Object.defineProperty(T, "str", {
      enumerable: !0,
      get: function () {
        return e.str;
      },
    }),
    Object.defineProperty(T, "strConcat", {
      enumerable: !0,
      get: function () {
        return e.strConcat;
      },
    }),
    Object.defineProperty(T, "nil", {
      enumerable: !0,
      get: function () {
        return e.nil;
      },
    }),
    Object.defineProperty(T, "getProperty", {
      enumerable: !0,
      get: function () {
        return e.getProperty;
      },
    }),
    Object.defineProperty(T, "stringify", {
      enumerable: !0,
      get: function () {
        return e.stringify;
      },
    }),
    Object.defineProperty(T, "regexpCode", {
      enumerable: !0,
      get: function () {
        return e.regexpCode;
      },
    }),
    Object.defineProperty(T, "Name", {
      enumerable: !0,
      get: function () {
        return e.Name;
      },
    }));
  var t = hlT();
  (Object.defineProperty(T, "Scope", {
    enumerable: !0,
    get: function () {
      return t.Scope;
    },
  }),
    Object.defineProperty(T, "ValueScope", {
      enumerable: !0,
      get: function () {
        return t.ValueScope;
      },
    }),
    Object.defineProperty(T, "ValueScopeName", {
      enumerable: !0,
      get: function () {
        return t.ValueScopeName;
      },
    }),
    Object.defineProperty(T, "varKinds", {
      enumerable: !0,
      get: function () {
        return t.varKinds;
      },
    }),
    (T.operators = {
      GT: new R._Code(">"),
      GTE: new R._Code(">="),
      LT: new R._Code("<"),
      LTE: new R._Code("<="),
      EQ: new R._Code("==="),
      NEQ: new R._Code("!=="),
      NOT: new R._Code("!"),
      OR: new R._Code("||"),
      AND: new R._Code("&&"),
      ADD: new R._Code("+"),
    }));
  class r {
    optimizeNodes() {
      return this;
    }
    optimizeNames(W, eT) {
      return this;
    }
  }
  class h extends r {
    constructor(W, eT, iT) {
      super();
      ((this.varKind = W), (this.name = eT), (this.rhs = iT));
    }
    render({ es5: W, _n: eT }) {
      let iT = W ? a.varKinds.var : this.varKind,
        aT = this.rhs === void 0 ? "" : ` = ${this.rhs}`;
      return (
        `${iT} ${this.name}${aT};
` + eT
      );
    }
    optimizeNames(W, eT) {
      if (!W[this.name.str]) return;
      if (this.rhs) this.rhs = d(this.rhs, W, eT);
      return this;
    }
    get names() {
      return this.rhs instanceof R._CodeOrName ? this.rhs.names : {};
    }
  }
  class i extends r {
    constructor(W, eT, iT) {
      super();
      ((this.lhs = W), (this.rhs = eT), (this.sideEffects = iT));
    }
    render({ _n: W }) {
      return (
        `${this.lhs} = ${this.rhs};
` + W
      );
    }
    optimizeNames(W, eT) {
      if (this.lhs instanceof R.Name && !W[this.lhs.str] && !this.sideEffects)
        return;
      return ((this.rhs = d(this.rhs, W, eT)), this);
    }
    get names() {
      let W = this.lhs instanceof R.Name ? {} : { ...this.lhs.names };
      return j(W, this.rhs);
    }
  }
  class c extends i {
    constructor(W, eT, iT, aT) {
      super(W, iT, aT);
      this.op = eT;
    }
    render({ _n: W }) {
      return (
        `${this.lhs} ${this.op}= ${this.rhs};
` + W
      );
    }
  }
  class s extends r {
    constructor(W) {
      super();
      ((this.label = W), (this.names = {}));
    }
    render({ _n: W }) {
      return `${this.label}:` + W;
    }
  }
  class A extends r {
    constructor(W) {
      super();
      ((this.label = W), (this.names = {}));
    }
    render({ _n: W }) {
      return `break${this.label ? ` ${this.label}` : ""};` + W;
    }
  }
  class l extends r {
    constructor(W) {
      super();
      this.error = W;
    }
    render({ _n: W }) {
      return `throw ${this.error};` + W;
    }
    get names() {
      return this.error.names;
    }
  }
  class o extends r {
    constructor(W) {
      super();
      this.code = W;
    }
    render({ _n: W }) {
      return (
        `${this.code};
` + W
      );
    }
    optimizeNodes() {
      return `${this.code}` ? this : void 0;
    }
    optimizeNames(W, eT) {
      return ((this.code = d(this.code, W, eT)), this);
    }
    get names() {
      return this.code instanceof R._CodeOrName ? this.code.names : {};
    }
  }
  class n extends r {
    constructor(W = []) {
      super();
      this.nodes = W;
    }
    render(W) {
      return this.nodes.reduce((eT, iT) => eT + iT.render(W), "");
    }
    optimizeNodes() {
      let { nodes: W } = this,
        eT = W.length;
      while (eT--) {
        let iT = W[eT].optimizeNodes();
        if (Array.isArray(iT)) W.splice(eT, 1, ...iT);
        else if (iT) W[eT] = iT;
        else W.splice(eT, 1);
      }
      return W.length > 0 ? this : void 0;
    }
    optimizeNames(W, eT) {
      let { nodes: iT } = this,
        aT = iT.length;
      while (aT--) {
        let oT = iT[aT];
        if (oT.optimizeNames(W, eT)) continue;
        (C(W, oT.names), iT.splice(aT, 1));
      }
      return iT.length > 0 ? this : void 0;
    }
    get names() {
      return this.nodes.reduce((W, eT) => O(W, eT.names), {});
    }
  }
  class p extends n {
    render(W) {
      return "{" + W._n + super.render(W) + "}" + W._n;
    }
  }
  class _ extends n {}
  class m extends p {}
  m.kind = "else";
  class b extends p {
    constructor(W, eT) {
      super(eT);
      this.condition = W;
    }
    render(W) {
      let eT = `if(${this.condition})` + super.render(W);
      if (this.else) eT += "else " + this.else.render(W);
      return eT;
    }
    optimizeNodes() {
      super.optimizeNodes();
      let W = this.condition;
      if (W === !0) return this.nodes;
      let eT = this.else;
      if (eT) {
        let iT = eT.optimizeNodes();
        eT = this.else = Array.isArray(iT) ? new m(iT) : iT;
      }
      if (eT) {
        if (W === !1) return eT instanceof b ? eT : eT.nodes;
        if (this.nodes.length) return this;
        return new b(L(W), eT instanceof b ? [eT] : eT.nodes);
      }
      if (W === !1 || !this.nodes.length) return;
      return this;
    }
    optimizeNames(W, eT) {
      var iT;
      if (
        ((this.else =
          (iT = this.else) === null || iT === void 0
            ? void 0
            : iT.optimizeNames(W, eT)),
        !(super.optimizeNames(W, eT) || this.else))
      )
        return;
      return ((this.condition = d(this.condition, W, eT)), this);
    }
    get names() {
      let W = super.names;
      if ((j(W, this.condition), this.else)) O(W, this.else.names);
      return W;
    }
  }
  b.kind = "if";
  class y extends p {}
  y.kind = "for";
  class u extends y {
    constructor(W) {
      super();
      this.iteration = W;
    }
    render(W) {
      return `for(${this.iteration})` + super.render(W);
    }
    optimizeNames(W, eT) {
      if (!super.optimizeNames(W, eT)) return;
      return ((this.iteration = d(this.iteration, W, eT)), this);
    }
    get names() {
      return O(super.names, this.iteration.names);
    }
  }
  class P extends y {
    constructor(W, eT, iT, aT) {
      super();
      ((this.varKind = W), (this.name = eT), (this.from = iT), (this.to = aT));
    }
    render(W) {
      let eT = W.es5 ? a.varKinds.var : this.varKind,
        { name: iT, from: aT, to: oT } = this;
      return (
        `for(${eT} ${iT}=${aT};
 ${iT}<${oT};
 ${iT}++)` + super.render(W)
      );
    }
    get names() {
      let W = j(super.names, this.from);
      return j(W, this.to);
    }
  }
  class k extends y {
    constructor(W, eT, iT, aT) {
      super();
      ((this.loop = W),
        (this.varKind = eT),
        (this.name = iT),
        (this.iterable = aT));
    }
    render(W) {
      return (
        `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` +
        super.render(W)
      );
    }
    optimizeNames(W, eT) {
      if (!super.optimizeNames(W, eT)) return;
      return ((this.iterable = d(this.iterable, W, eT)), this);
    }
    get names() {
      return O(super.names, this.iterable.names);
    }
  }
  class x extends p {
    constructor(W, eT, iT) {
      super();
      ((this.name = W), (this.args = eT), (this.async = iT));
    }
    render(W) {
      return (
        `${this.async ? "async " : ""}function ${this.name}(${this.args})` +
        super.render(W)
      );
    }
  }
  x.kind = "func";
  class f extends n {
    render(W) {
      return "return " + super.render(W);
    }
  }
  f.kind = "return";
  class v extends p {
    render(W) {
      let eT = "try" + super.render(W);
      if (this.catch) eT += this.catch.render(W);
      if (this.finally) eT += this.finally.render(W);
      return eT;
    }
    optimizeNodes() {
      var W, eT;
      return (
        super.optimizeNodes(),
        (W = this.catch) === null || W === void 0 || W.optimizeNodes(),
        (eT = this.finally) === null || eT === void 0 || eT.optimizeNodes(),
        this
      );
    }
    optimizeNames(W, eT) {
      var iT, aT;
      return (
        super.optimizeNames(W, eT),
        (iT = this.catch) === null || iT === void 0 || iT.optimizeNames(W, eT),
        (aT = this.finally) === null ||
          aT === void 0 ||
          aT.optimizeNames(W, eT),
        this
      );
    }
    get names() {
      let W = super.names;
      if (this.catch) O(W, this.catch.names);
      if (this.finally) O(W, this.finally.names);
      return W;
    }
  }
  class g extends p {
    constructor(W) {
      super();
      this.error = W;
    }
    render(W) {
      return `catch(${this.error})` + super.render(W);
    }
  }
  g.kind = "catch";
  class I extends p {
    render(W) {
      return "finally" + super.render(W);
    }
  }
  I.kind = "finally";
  class S {
    constructor(W, eT = {}) {
      ((this._values = {}),
        (this._blockStarts = []),
        (this._constants = {}),
        (this.opts = {
          ...eT,
          _n: eT.lines
            ? `
`
            : "",
        }),
        (this._extScope = W),
        (this._scope = new a.Scope({ parent: W })),
        (this._nodes = [new _()]));
    }
    toString() {
      return this._root.render(this.opts);
    }
    name(W) {
      return this._scope.name(W);
    }
    scopeName(W) {
      return this._extScope.name(W);
    }
    scopeValue(W, eT) {
      let iT = this._extScope.value(W, eT);
      return (
        (this._values[iT.prefix] || (this._values[iT.prefix] = new Set())).add(
          iT,
        ),
        iT
      );
    }
    getScopeValue(W, eT) {
      return this._extScope.getValue(W, eT);
    }
    scopeRefs(W) {
      return this._extScope.scopeRefs(W, this._values);
    }
    scopeCode() {
      return this._extScope.scopeCode(this._values);
    }
    _def(W, eT, iT, aT) {
      let oT = this._scope.toName(eT);
      if (iT !== void 0 && aT) this._constants[oT.str] = iT;
      return (this._leafNode(new h(W, oT, iT)), oT);
    }
    const(W, eT, iT) {
      return this._def(a.varKinds.const, W, eT, iT);
    }
    let(W, eT, iT) {
      return this._def(a.varKinds.let, W, eT, iT);
    }
    var(W, eT, iT) {
      return this._def(a.varKinds.var, W, eT, iT);
    }
    assign(W, eT, iT) {
      return this._leafNode(new i(W, eT, iT));
    }
    add(W, eT) {
      return this._leafNode(new c(W, T.operators.ADD, eT));
    }
    code(W) {
      if (typeof W == "function") W();
      else if (W !== R.nil) this._leafNode(new o(W));
      return this;
    }
    object(...W) {
      let eT = ["{"];
      for (let [iT, aT] of W) {
        if (eT.length > 1) eT.push(",");
        if ((eT.push(iT), iT !== aT || this.opts.es5))
          (eT.push(":"), (0, R.addCodeArg)(eT, aT));
      }
      return (eT.push("}"), new R._Code(eT));
    }
    if(W, eT, iT) {
      if ((this._blockNode(new b(W)), eT && iT))
        this.code(eT).else().code(iT).endIf();
      else if (eT) this.code(eT).endIf();
      else if (iT) throw Error('CodeGen: "else" body without "then" body');
      return this;
    }
    elseIf(W) {
      return this._elseNode(new b(W));
    }
    else() {
      return this._elseNode(new m());
    }
    endIf() {
      return this._endBlockNode(b, m);
    }
    _for(W, eT) {
      if ((this._blockNode(W), eT)) this.code(eT).endFor();
      return this;
    }
    for(W, eT) {
      return this._for(new u(W), eT);
    }
    forRange(
      W,
      eT,
      iT,
      aT,
      oT = this.opts.es5 ? a.varKinds.var : a.varKinds.let,
    ) {
      let TT = this._scope.toName(W);
      return this._for(new P(oT, TT, eT, iT), () => aT(TT));
    }
    forOf(W, eT, iT, aT = a.varKinds.const) {
      let oT = this._scope.toName(W);
      if (this.opts.es5) {
        let TT = eT instanceof R.Name ? eT : this.var("_arr", eT);
        return this.forRange("_i", 0, R._`${TT}.length`, (tT) => {
          (this.var(oT, R._`${TT}[${tT}]`), iT(oT));
        });
      }
      return this._for(new k("of", aT, oT, eT), () => iT(oT));
    }
    forIn(W, eT, iT, aT = this.opts.es5 ? a.varKinds.var : a.varKinds.const) {
      if (this.opts.ownProperties)
        return this.forOf(W, R._`Object.keys(${eT})`, iT);
      let oT = this._scope.toName(W);
      return this._for(new k("in", aT, oT, eT), () => iT(oT));
    }
    endFor() {
      return this._endBlockNode(y);
    }
    label(W) {
      return this._leafNode(new s(W));
    }
    break(W) {
      return this._leafNode(new A(W));
    }
    return(W) {
      let eT = new f();
      if ((this._blockNode(eT), this.code(W), eT.nodes.length !== 1))
        throw Error('CodeGen: "return" should have one node');
      return this._endBlockNode(f);
    }
    try(W, eT, iT) {
      if (!eT && !iT)
        throw Error('CodeGen: "try" without "catch" and "finally"');
      let aT = new v();
      if ((this._blockNode(aT), this.code(W), eT)) {
        let oT = this.name("e");
        ((this._currNode = aT.catch = new g(oT)), eT(oT));
      }
      if (iT) ((this._currNode = aT.finally = new I()), this.code(iT));
      return this._endBlockNode(g, I);
    }
    throw(W) {
      return this._leafNode(new l(W));
    }
    block(W, eT) {
      if ((this._blockStarts.push(this._nodes.length), W))
        this.code(W).endBlock(eT);
      return this;
    }
    endBlock(W) {
      let eT = this._blockStarts.pop();
      if (eT === void 0) throw Error("CodeGen: not in self-balancing block");
      let iT = this._nodes.length - eT;
      if (iT < 0 || (W !== void 0 && iT !== W))
        throw Error(`CodeGen: wrong number of nodes: ${iT} vs ${W} expected`);
      return ((this._nodes.length = eT), this);
    }
    func(W, eT = R.nil, iT, aT) {
      if ((this._blockNode(new x(W, eT, iT)), aT)) this.code(aT).endFunc();
      return this;
    }
    endFunc() {
      return this._endBlockNode(x);
    }
    optimize(W = 1) {
      while (W-- > 0)
        (this._root.optimizeNodes(),
          this._root.optimizeNames(this._root.names, this._constants));
    }
    _leafNode(W) {
      return (this._currNode.nodes.push(W), this);
    }
    _blockNode(W) {
      (this._currNode.nodes.push(W), this._nodes.push(W));
    }
    _endBlockNode(W, eT) {
      let iT = this._currNode;
      if (iT instanceof W || (eT && iT instanceof eT))
        return (this._nodes.pop(), this);
      throw Error(
        `CodeGen: not in block "${eT ? `${W.kind}/${eT.kind}` : W.kind}"`,
      );
    }
    _elseNode(W) {
      let eT = this._currNode;
      if (!(eT instanceof b)) throw Error('CodeGen: "else" without "if"');
      return ((this._currNode = eT.else = W), this);
    }
    get _root() {
      return this._nodes[0];
    }
    get _currNode() {
      let W = this._nodes;
      return W[W.length - 1];
    }
    set _currNode(W) {
      let eT = this._nodes;
      eT[eT.length - 1] = W;
    }
  }
  T.CodeGen = S;
  function O(W, eT) {
    for (let iT in eT) W[iT] = (W[iT] || 0) + (eT[iT] || 0);
    return W;
  }
  function j(W, eT) {
    return eT instanceof R._CodeOrName ? O(W, eT.names) : W;
  }
  function d(W, eT, iT) {
    if (W instanceof R.Name) return aT(W);
    if (!oT(W)) return W;
    return new R._Code(
      W._items.reduce((TT, tT) => {
        if (tT instanceof R.Name) tT = aT(tT);
        if (tT instanceof R._Code) TT.push(...tT._items);
        else TT.push(tT);
        return TT;
      }, []),
    );
    function aT(TT) {
      let tT = iT[TT.str];
      if (tT === void 0 || eT[TT.str] !== 1) return TT;
      return (delete eT[TT.str], tT);
    }
    function oT(TT) {
      return (
        TT instanceof R._Code &&
        TT._items.some(
          (tT) =>
            tT instanceof R.Name && eT[tT.str] === 1 && iT[tT.str] !== void 0,
        )
      );
    }
  }
  function C(W, eT) {
    for (let iT in eT) W[iT] = (W[iT] || 0) - (eT[iT] || 0);
  }
  function L(W) {
    return typeof W == "boolean" || typeof W == "number" || W === null
      ? !W
      : R._`!${Q(W)}`;
  }
  T.not = L;
  var w = V(T.operators.AND);
  function D(...W) {
    return W.reduce(w);
  }
  T.and = D;
  var B = V(T.operators.OR);
  function M(...W) {
    return W.reduce(B);
  }
  T.or = M;
  function V(W) {
    return (eT, iT) =>
      eT === R.nil ? iT : iT === R.nil ? eT : R._`${Q(eT)} ${W} ${Q(iT)}`;
  }
  function Q(W) {
    return W instanceof R.Name ? W : R._`(${W})`;
  }
};
