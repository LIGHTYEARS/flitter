function f$0(T, R, a) {
  let e = this,
    t = {
      partial: !0,
      tokenize: k
    },
    r = 0,
    h = 0,
    i;
  return c;
  function c(x) {
    return s(x);
  }
  function s(x) {
    let f = e.events[e.events.length - 1];
    return r = f && f[1].type === "linePrefix" ? f[2].sliceSerialize(f[1], !0).length : 0, i = x, T.enter("codeFenced"), T.enter("codeFencedFence"), T.enter("codeFencedFenceSequence"), A(x);
  }
  function A(x) {
    if (x === i) return h++, T.consume(x), A;
    if (h < 3) return a(x);
    return T.exit("codeFencedFenceSequence"), Y9(x) ? _8(T, l, "whitespace")(x) : l(x);
  }
  function l(x) {
    if (x === null || r9(x)) return T.exit("codeFencedFence"), e.interrupt ? R(x) : T.check(BfT, _, P)(x);
    return T.enter("codeFencedFenceInfo"), T.enter("chunkString", {
      contentType: "string"
    }), o(x);
  }
  function o(x) {
    if (x === null || r9(x)) return T.exit("chunkString"), T.exit("codeFencedFenceInfo"), l(x);
    if (Y9(x)) return T.exit("chunkString"), T.exit("codeFencedFenceInfo"), _8(T, n, "whitespace")(x);
    if (x === 96 && x === i) return a(x);
    return T.consume(x), o;
  }
  function n(x) {
    if (x === null || r9(x)) return l(x);
    return T.enter("codeFencedFenceMeta"), T.enter("chunkString", {
      contentType: "string"
    }), p(x);
  }
  function p(x) {
    if (x === null || r9(x)) return T.exit("chunkString"), T.exit("codeFencedFenceMeta"), l(x);
    if (x === 96 && x === i) return a(x);
    return T.consume(x), p;
  }
  function _(x) {
    return T.attempt(t, P, m)(x);
  }
  function m(x) {
    return T.enter("lineEnding"), T.consume(x), T.exit("lineEnding"), b;
  }
  function b(x) {
    return r > 0 && Y9(x) ? _8(T, y, "linePrefix", r + 1)(x) : y(x);
  }
  function y(x) {
    if (x === null || r9(x)) return T.check(BfT, _, P)(x);
    return T.enter("codeFlowValue"), u(x);
  }
  function u(x) {
    if (x === null || r9(x)) return T.exit("codeFlowValue"), y(x);
    return T.consume(x), u;
  }
  function P(x) {
    return T.exit("codeFenced"), R(x);
  }
  function k(x, f, v) {
    let g = 0;
    return I;
    function I(C) {
      return x.enter("lineEnding"), x.consume(C), x.exit("lineEnding"), S;
    }
    function S(C) {
      return x.enter("codeFencedFence"), Y9(C) ? _8(x, O, "linePrefix", e.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(C) : O(C);
    }
    function O(C) {
      if (C === i) return x.enter("codeFencedFenceSequence"), j(C);
      return v(C);
    }
    function j(C) {
      if (C === i) return g++, x.consume(C), j;
      if (g >= h) return x.exit("codeFencedFenceSequence"), Y9(C) ? _8(x, d, "whitespace")(C) : d(C);
      return v(C);
    }
    function d(C) {
      if (C === null || r9(C)) return x.exit("codeFencedFence"), f(C);
      return v(C);
    }
  }
}