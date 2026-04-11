// Module: identifier
// Original: XD
// Type: CJS (RT wrapper)
// Exports: IDENTIFIER, Name, _, _Code, _CodeOrName, addCodeArg, getEsmExportName, getProperty, nil, regexpCode, safeStringify, str, strConcat, stringify
// Category: util

// Module: XD (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.regexpCode =
      T.getEsmExportName =
      T.getProperty =
      T.safeStringify =
      T.stringify =
      T.strConcat =
      T.addCodeArg =
      T.str =
      T._ =
      T.nil =
      T._Code =
      T.Name =
      T.IDENTIFIER =
      T._CodeOrName =
        void 0));
  class R {}
  ((T._CodeOrName = R), (T.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i));
  class a extends R {
    constructor(b) {
      super();
      if (!T.IDENTIFIER.test(b))
        throw Error("CodeGen: name must be a valid identifier");
      this.str = b;
    }
    toString() {
      return this.str;
    }
    emptyStr() {
      return !1;
    }
    get names() {
      return { [this.str]: 1 };
    }
  }
  T.Name = a;
  class e extends R {
    constructor(b) {
      super();
      this._items = typeof b === "string" ? [b] : b;
    }
    toString() {
      return this.str;
    }
    emptyStr() {
      if (this._items.length > 1) return !1;
      let b = this._items[0];
      return b === "" || b === '""';
    }
    get str() {
      var b;
      return (b = this._str) !== null && b !== void 0
        ? b
        : (this._str = this._items.reduce((y, u) => `${y}${u}`, ""));
    }
    get names() {
      var b;
      return (b = this._names) !== null && b !== void 0
        ? b
        : (this._names = this._items.reduce((y, u) => {
            if (u instanceof a) y[u.str] = (y[u.str] || 0) + 1;
            return y;
          }, {}));
    }
  }
  ((T._Code = e), (T.nil = new e("")));
  function t(b, ...y) {
    let u = [b[0]],
      P = 0;
    while (P < y.length) (i(u, y[P]), u.push(b[++P]));
    return new e(u);
  }
  T._ = t;
  var r = new e("+");
  function h(b, ...y) {
    let u = [n(b[0])],
      P = 0;
    while (P < y.length) (u.push(r), i(u, y[P]), u.push(r, n(b[++P])));
    return (c(u), new e(u));
  }
  T.str = h;
  function i(b, y) {
    if (y instanceof e) b.push(...y._items);
    else if (y instanceof a) b.push(y);
    else b.push(l(y));
  }
  T.addCodeArg = i;
  function c(b) {
    let y = 1;
    while (y < b.length - 1) {
      if (b[y] === r) {
        let u = s(b[y - 1], b[y + 1]);
        if (u !== void 0) {
          b.splice(y - 1, 3, u);
          continue;
        }
        b[y++] = "+";
      }
      y++;
    }
  }
  function s(b, y) {
    if (y === '""') return b;
    if (b === '""') return y;
    if (typeof b == "string") {
      if (y instanceof a || b[b.length - 1] !== '"') return;
      if (typeof y != "string") return `${b.slice(0, -1)}${y}"`;
      if (y[0] === '"') return b.slice(0, -1) + y.slice(1);
      return;
    }
    if (typeof y == "string" && y[0] === '"' && !(b instanceof a))
      return `"${b}${y.slice(1)}`;
    return;
  }
  function A(b, y) {
    return y.emptyStr() ? b : b.emptyStr() ? y : h`${b}${y}`;
  }
  T.strConcat = A;
  function l(b) {
    return typeof b == "number" || typeof b == "boolean" || b === null
      ? b
      : n(Array.isArray(b) ? b.join(",") : b);
  }
  function o(b) {
    return new e(n(b));
  }
  T.stringify = o;
  function n(b) {
    return JSON.stringify(b)
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029");
  }
  T.safeStringify = n;
  function p(b) {
    return typeof b == "string" && T.IDENTIFIER.test(b)
      ? new e(`.${b}`)
      : t`[${b}]`;
  }
  T.getProperty = p;
  function _(b) {
    if (typeof b == "string" && T.IDENTIFIER.test(b)) return new e(`${b}`);
    throw Error(
      `CodeGen: invalid export name: ${b}, use explicit $id name mapping`,
    );
  }
  T.getEsmExportName = _;
  function m(b) {
    return new e(b.toString());
  }
  T.regexpCode = m;
};
