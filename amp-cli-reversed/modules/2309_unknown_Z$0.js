function Z$0(T, R, a) {
  let e = this,
    t,
    r,
    h,
    i,
    c;
  return s;
  function s(W) {
    return A(W);
  }
  function A(W) {
    return T.enter("htmlFlow"), T.enter("htmlFlowData"), T.consume(W), l;
  }
  function l(W) {
    if (W === 33) return T.consume(W), o;
    if (W === 47) return T.consume(W), r = !0, _;
    if (W === 63) return T.consume(W), t = 3, e.interrupt ? R : M;
    if (Mt(W)) return T.consume(W), h = String.fromCharCode(W), m;
    return a(W);
  }
  function o(W) {
    if (W === 45) return T.consume(W), t = 2, n;
    if (W === 91) return T.consume(W), t = 5, i = 0, p;
    if (Mt(W)) return T.consume(W), t = 4, e.interrupt ? R : M;
    return a(W);
  }
  function n(W) {
    if (W === 45) return T.consume(W), e.interrupt ? R : M;
    return a(W);
  }
  function p(W) {
    if (W === "CDATA[".charCodeAt(i++)) {
      if (T.consume(W), i === 6) return e.interrupt ? R : O;
      return p;
    }
    return a(W);
  }
  function _(W) {
    if (Mt(W)) return T.consume(W), h = String.fromCharCode(W), m;
    return a(W);
  }
  function m(W) {
    if (W === null || W === 47 || W === 62 || o3(W)) {
      let eT = W === 47,
        iT = h.toLowerCase();
      if (!eT && !r && UfT.includes(iT)) return t = 1, e.interrupt ? R(W) : O(W);
      if (K$0.includes(h.toLowerCase())) {
        if (t = 6, eT) return T.consume(W), b;
        return e.interrupt ? R(W) : O(W);
      }
      return t = 7, e.interrupt && !e.parser.lazy[e.now().line] ? a(W) : r ? y(W) : u(W);
    }
    if (W === 45 || Sr(W)) return T.consume(W), h += String.fromCharCode(W), m;
    return a(W);
  }
  function b(W) {
    if (W === 62) return T.consume(W), e.interrupt ? R : O;
    return a(W);
  }
  function y(W) {
    if (Y9(W)) return T.consume(W), y;
    return I(W);
  }
  function u(W) {
    if (W === 47) return T.consume(W), I;
    if (W === 58 || W === 95 || Mt(W)) return T.consume(W), P;
    if (Y9(W)) return T.consume(W), u;
    return I(W);
  }
  function P(W) {
    if (W === 45 || W === 46 || W === 58 || W === 95 || Sr(W)) return T.consume(W), P;
    return k(W);
  }
  function k(W) {
    if (W === 61) return T.consume(W), x;
    if (Y9(W)) return T.consume(W), k;
    return u(W);
  }
  function x(W) {
    if (W === null || W === 60 || W === 61 || W === 62 || W === 96) return a(W);
    if (W === 34 || W === 39) return T.consume(W), c = W, f;
    if (Y9(W)) return T.consume(W), x;
    return v(W);
  }
  function f(W) {
    if (W === c) return T.consume(W), c = null, g;
    if (W === null || r9(W)) return a(W);
    return T.consume(W), f;
  }
  function v(W) {
    if (W === null || W === 34 || W === 39 || W === 47 || W === 60 || W === 61 || W === 62 || W === 96 || o3(W)) return k(W);
    return T.consume(W), v;
  }
  function g(W) {
    if (W === 47 || W === 62 || Y9(W)) return u(W);
    return a(W);
  }
  function I(W) {
    if (W === 62) return T.consume(W), S;
    return a(W);
  }
  function S(W) {
    if (W === null || r9(W)) return O(W);
    if (Y9(W)) return T.consume(W), S;
    return a(W);
  }
  function O(W) {
    if (W === 45 && t === 2) return T.consume(W), L;
    if (W === 60 && t === 1) return T.consume(W), w;
    if (W === 62 && t === 4) return T.consume(W), V;
    if (W === 63 && t === 3) return T.consume(W), M;
    if (W === 93 && t === 5) return T.consume(W), B;
    if (r9(W) && (t === 6 || t === 7)) return T.exit("htmlFlowData"), T.check(X$0, Q, j)(W);
    if (W === null || r9(W)) return T.exit("htmlFlowData"), j(W);
    return T.consume(W), O;
  }
  function j(W) {
    return T.check(Y$0, d, Q)(W);
  }
  function d(W) {
    return T.enter("lineEnding"), T.consume(W), T.exit("lineEnding"), C;
  }
  function C(W) {
    if (W === null || r9(W)) return j(W);
    return T.enter("htmlFlowData"), O(W);
  }
  function L(W) {
    if (W === 45) return T.consume(W), M;
    return O(W);
  }
  function w(W) {
    if (W === 47) return T.consume(W), h = "", D;
    return O(W);
  }
  function D(W) {
    if (W === 62) {
      let eT = h.toLowerCase();
      if (UfT.includes(eT)) return T.consume(W), V;
      return O(W);
    }
    if (Mt(W) && h.length < 8) return T.consume(W), h += String.fromCharCode(W), D;
    return O(W);
  }
  function B(W) {
    if (W === 93) return T.consume(W), M;
    return O(W);
  }
  function M(W) {
    if (W === 62) return T.consume(W), V;
    if (W === 45 && t === 2) return T.consume(W), M;
    return O(W);
  }
  function V(W) {
    if (W === null || r9(W)) return T.exit("htmlFlowData"), Q(W);
    return T.consume(W), V;
  }
  function Q(W) {
    return T.exit("htmlFlow"), R(W);
  }
}