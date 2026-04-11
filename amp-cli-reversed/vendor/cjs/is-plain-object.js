// Module: is-plain-object
// Original: keR
// Type: CJS (RT wrapper)
// Exports: isPlainObject
// Category: util

// Module: keR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.isPlainObject = void 0));
  var R = "[object Object]",
    a = "[object Null]",
    e = "[object Undefined]",
    t = Function.prototype,
    r = t.toString,
    h = r.call(Object),
    i = Object.getPrototypeOf,
    c = Object.prototype,
    s = c.hasOwnProperty,
    A = Symbol ? Symbol.toStringTag : void 0,
    l = c.toString;
  function o(b) {
    if (!n(b) || p(b) !== R) return !1;
    let y = i(b);
    if (y === null) return !0;
    let u = s.call(y, "constructor") && y.constructor;
    return typeof u == "function" && u instanceof u && r.call(u) === h;
  }
  T.isPlainObject = o;
  function n(b) {
    return b != null && typeof b == "object";
  }
  function p(b) {
    if (b == null) return b === void 0 ? e : a;
    return A && A in Object(b) ? _(b) : m(b);
  }
  function _(b) {
    let y = s.call(b, A),
      u = b[A],
      P = !1;
    try {
      ((b[A] = void 0), (P = !0));
    } catch {}
    let k = l.call(b);
    if (P)
      if (y) b[A] = u;
      else delete b[A];
    return k;
  }
  function m(b) {
    return l.call(b);
  }
};
