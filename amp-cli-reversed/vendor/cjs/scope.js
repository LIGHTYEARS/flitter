// Module: scope
// Original: hlT
// Type: CJS (RT wrapper)
// Exports: Scope, UsedValueState, ValueScope, ValueScopeName, varKinds
// Category: util

// Module: hlT (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.ValueScope =
      T.ValueScopeName =
      T.Scope =
      T.varKinds =
      T.UsedValueState =
        void 0));
  var R = XD();
  class a extends Error {
    constructor(c) {
      super(`CodeGen: "code" for ${c} not defined`);
      this.value = c.value;
    }
  }
  var e;
  ((function (c) {
    ((c[(c.Started = 0)] = "Started"), (c[(c.Completed = 1)] = "Completed"));
  })(e || (T.UsedValueState = e = {})),
    (T.varKinds = {
      const: new R.Name("const"),
      let: new R.Name("let"),
      var: new R.Name("var"),
    }));
  class t {
    constructor({ prefixes: c, parent: s } = {}) {
      ((this._names = {}), (this._prefixes = c), (this._parent = s));
    }
    toName(c) {
      return c instanceof R.Name ? c : this.name(c);
    }
    name(c) {
      return new R.Name(this._newName(c));
    }
    _newName(c) {
      let s = this._names[c] || this._nameGroup(c);
      return `${c}${s.index++}`;
    }
    _nameGroup(c) {
      var s, A;
      if (
        ((A =
          (s = this._parent) === null || s === void 0
            ? void 0
            : s._prefixes) === null || A === void 0
          ? void 0
          : A.has(c)) ||
        (this._prefixes && !this._prefixes.has(c))
      )
        throw Error(`CodeGen: prefix "${c}" is not allowed in this scope`);
      return (this._names[c] = { prefix: c, index: 0 });
    }
  }
  T.Scope = t;
  class r extends R.Name {
    constructor(c, s) {
      super(s);
      this.prefix = c;
    }
    setValue(c, { property: s, itemIndex: A }) {
      ((this.value = c), (this.scopePath = R._`.${new R.Name(s)}[${A}]`));
    }
  }
  T.ValueScopeName = r;
  var h = R._`\n`;
  class i extends t {
    constructor(c) {
      super(c);
      ((this._values = {}),
        (this._scope = c.scope),
        (this.opts = { ...c, _n: c.lines ? h : R.nil }));
    }
    get() {
      return this._scope;
    }
    name(c) {
      return new r(c, this._newName(c));
    }
    value(c, s) {
      var A;
      if (s.ref === void 0) throw Error("CodeGen: ref must be passed in value");
      let l = this.toName(c),
        { prefix: o } = l,
        n = (A = s.key) !== null && A !== void 0 ? A : s.ref,
        p = this._values[o];
      if (p) {
        let b = p.get(n);
        if (b) return b;
      } else p = this._values[o] = new Map();
      p.set(n, l);
      let _ = this._scope[o] || (this._scope[o] = []),
        m = _.length;
      return ((_[m] = s.ref), l.setValue(s, { property: o, itemIndex: m }), l);
    }
    getValue(c, s) {
      let A = this._values[c];
      if (!A) return;
      return A.get(s);
    }
    scopeRefs(c, s = this._values) {
      return this._reduceValues(s, (A) => {
        if (A.scopePath === void 0)
          throw Error(`CodeGen: name "${A}" has no value`);
        return R._`${c}${A.scopePath}`;
      });
    }
    scopeCode(c = this._values, s, A) {
      return this._reduceValues(
        c,
        (l) => {
          if (l.value === void 0)
            throw Error(`CodeGen: name "${l}" has no value`);
          return l.value.code;
        },
        s,
        A,
      );
    }
    _reduceValues(c, s, A = {}, l) {
      let o = R.nil;
      for (let n in c) {
        let p = c[n];
        if (!p) continue;
        let _ = (A[n] = A[n] || new Map());
        p.forEach((m) => {
          if (_.has(m)) return;
          _.set(m, e.Started);
          let b = s(m);
          if (b) {
            let y = this.opts.es5 ? T.varKinds.var : T.varKinds.const;
            o = R._`${o}${y} ${m} = ${b};
${this.opts._n}`;
          } else if ((b = l === null || l === void 0 ? void 0 : l(m)))
            o = R._`${o}${b}${this.opts._n}`;
          else throw new a(m);
          _.set(m, e.Completed);
        });
      }
      return o;
    }
  }
  T.ValueScope = i;
};
