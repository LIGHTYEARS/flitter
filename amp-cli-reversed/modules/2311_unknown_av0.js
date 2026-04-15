function Tv0(T, R, a) {
  return e;
  function e(t) {
    return T.enter("lineEnding"), T.consume(t), T.exit("lineEnding"), T.attempt(JO, R, a);
  }
}
function av0(T, R, a) {
  let e = this,
    t,
    r,
    h;
  return i;
  function i(M) {
    return T.enter("htmlText"), T.enter("htmlTextData"), T.consume(M), c;
  }
  function c(M) {
    if (M === 33) return T.consume(M), s;
    if (M === 47) return T.consume(M), k;
    if (M === 63) return T.consume(M), u;
    if (Mt(M)) return T.consume(M), v;
    return a(M);
  }
  function s(M) {
    if (M === 45) return T.consume(M), A;
    if (M === 91) return T.consume(M), r = 0, p;
    if (Mt(M)) return T.consume(M), y;
    return a(M);
  }
  function A(M) {
    if (M === 45) return T.consume(M), n;
    return a(M);
  }
  function l(M) {
    if (M === null) return a(M);
    if (M === 45) return T.consume(M), o;
    if (r9(M)) return h = l, w(M);
    return T.consume(M), l;
  }
  function o(M) {
    if (M === 45) return T.consume(M), n;
    return l(M);
  }
  function n(M) {
    return M === 62 ? L(M) : M === 45 ? o(M) : l(M);
  }
  function p(M) {
    if (M === "CDATA[".charCodeAt(r++)) return T.consume(M), r === 6 ? _ : p;
    return a(M);
  }
  function _(M) {
    if (M === null) return a(M);
    if (M === 93) return T.consume(M), m;
    if (r9(M)) return h = _, w(M);
    return T.consume(M), _;
  }
  function m(M) {
    if (M === 93) return T.consume(M), b;
    return _(M);
  }
  function b(M) {
    if (M === 62) return L(M);
    if (M === 93) return T.consume(M), b;
    return _(M);
  }
  function y(M) {
    if (M === null || M === 62) return L(M);
    if (r9(M)) return h = y, w(M);
    return T.consume(M), y;
  }
  function u(M) {
    if (M === null) return a(M);
    if (M === 63) return T.consume(M), P;
    if (r9(M)) return h = u, w(M);
    return T.consume(M), u;
  }
  function P(M) {
    return M === 62 ? L(M) : u(M);
  }
  function k(M) {
    if (Mt(M)) return T.consume(M), x;
    return a(M);
  }
  function x(M) {
    if (M === 45 || Sr(M)) return T.consume(M), x;
    return f(M);
  }
  function f(M) {
    if (r9(M)) return h = f, w(M);
    if (Y9(M)) return T.consume(M), f;
    return L(M);
  }
  function v(M) {
    if (M === 45 || Sr(M)) return T.consume(M), v;
    if (M === 47 || M === 62 || o3(M)) return g(M);
    return a(M);
  }
  function g(M) {
    if (M === 47) return T.consume(M), L;
    if (M === 58 || M === 95 || Mt(M)) return T.consume(M), I;
    if (r9(M)) return h = g, w(M);
    if (Y9(M)) return T.consume(M), g;
    return L(M);
  }
  function I(M) {
    if (M === 45 || M === 46 || M === 58 || M === 95 || Sr(M)) return T.consume(M), I;
    return S(M);
  }
  function S(M) {
    if (M === 61) return T.consume(M), O;
    if (r9(M)) return h = S, w(M);
    if (Y9(M)) return T.consume(M), S;
    return g(M);
  }
  function O(M) {
    if (M === null || M === 60 || M === 61 || M === 62 || M === 96) return a(M);
    if (M === 34 || M === 39) return T.consume(M), t = M, j;
    if (r9(M)) return h = O, w(M);
    if (Y9(M)) return T.consume(M), O;
    return T.consume(M), d;
  }
  function j(M) {
    if (M === t) return T.consume(M), t = void 0, C;
    if (M === null) return a(M);
    if (r9(M)) return h = j, w(M);
    return T.consume(M), j;
  }
  function d(M) {
    if (M === null || M === 34 || M === 39 || M === 60 || M === 61 || M === 96) return a(M);
    if (M === 47 || M === 62 || o3(M)) return g(M);
    return T.consume(M), d;
  }
  function C(M) {
    if (M === 47 || M === 62 || o3(M)) return g(M);
    return a(M);
  }
  function L(M) {
    if (M === 62) return T.consume(M), T.exit("htmlTextData"), T.exit("htmlText"), R;
    return a(M);
  }
  function w(M) {
    return T.exit("htmlTextData"), T.enter("lineEnding"), T.consume(M), T.exit("lineEnding"), D;
  }
  function D(M) {
    return Y9(M) ? _8(T, B, "linePrefix", e.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(M) : B(M);
  }
  function B(M) {
    return T.enter("htmlTextData"), h(M);
  }
}