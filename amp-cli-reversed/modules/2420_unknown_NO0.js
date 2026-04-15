function BO0() {
  return {
    flow: {
      null: {
        name: "table",
        tokenize: NO0,
        resolveAll: UO0
      }
    }
  };
}
function NO0(T, R, a) {
  let e = this,
    t = 0,
    r = 0,
    h;
  return i;
  function i(I) {
    let S = e.events.length - 1;
    while (S > -1) {
      let d = e.events[S][1].type;
      if (d === "lineEnding" || d === "linePrefix") S--;else break;
    }
    let O = S > -1 ? e.events[S][1].type : null,
      j = O === "tableHead" || O === "tableRow" ? x : c;
    if (j === x && e.parser.lazy[e.now().line]) return a(I);
    return j(I);
  }
  function c(I) {
    return T.enter("tableHead"), T.enter("tableRow"), s(I);
  }
  function s(I) {
    if (I === 124) return A(I);
    return h = !0, r += 1, A(I);
  }
  function A(I) {
    if (I === null) return a(I);
    if (r9(I)) {
      if (r > 1) return r = 0, e.interrupt = !0, T.exit("tableRow"), T.enter("lineEnding"), T.consume(I), T.exit("lineEnding"), n;
      return a(I);
    }
    if (Y9(I)) return _8(T, A, "whitespace")(I);
    if (r += 1, h) h = !1, t += 1;
    if (I === 124) return T.enter("tableCellDivider"), T.consume(I), T.exit("tableCellDivider"), h = !0, A;
    return T.enter("data"), l(I);
  }
  function l(I) {
    if (I === null || I === 124 || o3(I)) return T.exit("data"), A(I);
    return T.consume(I), I === 92 ? o : l;
  }
  function o(I) {
    if (I === 92 || I === 124) return T.consume(I), l;
    return l(I);
  }
  function n(I) {
    if (e.interrupt = !1, e.parser.lazy[e.now().line]) return a(I);
    if (T.enter("tableDelimiterRow"), h = !1, Y9(I)) return _8(T, p, "linePrefix", e.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(I);
    return p(I);
  }
  function p(I) {
    if (I === 45 || I === 58) return m(I);
    if (I === 124) return h = !0, T.enter("tableCellDivider"), T.consume(I), T.exit("tableCellDivider"), _;
    return k(I);
  }
  function _(I) {
    if (Y9(I)) return _8(T, m, "whitespace")(I);
    return m(I);
  }
  function m(I) {
    if (I === 58) return r += 1, h = !0, T.enter("tableDelimiterMarker"), T.consume(I), T.exit("tableDelimiterMarker"), b;
    if (I === 45) return r += 1, b(I);
    if (I === null || r9(I)) return P(I);
    return k(I);
  }
  function b(I) {
    if (I === 45) return T.enter("tableDelimiterFiller"), y(I);
    return k(I);
  }
  function y(I) {
    if (I === 45) return T.consume(I), y;
    if (I === 58) return h = !0, T.exit("tableDelimiterFiller"), T.enter("tableDelimiterMarker"), T.consume(I), T.exit("tableDelimiterMarker"), u;
    return T.exit("tableDelimiterFiller"), u(I);
  }
  function u(I) {
    if (Y9(I)) return _8(T, P, "whitespace")(I);
    return P(I);
  }
  function P(I) {
    if (I === 124) return p(I);
    if (I === null || r9(I)) {
      if (!h || t !== r) return k(I);
      return T.exit("tableDelimiterRow"), T.exit("tableHead"), R(I);
    }
    return k(I);
  }
  function k(I) {
    return a(I);
  }
  function x(I) {
    return T.enter("tableRow"), f(I);
  }
  function f(I) {
    if (I === 124) return T.enter("tableCellDivider"), T.consume(I), T.exit("tableCellDivider"), f;
    if (I === null || r9(I)) return T.exit("tableRow"), R(I);
    if (Y9(I)) return _8(T, f, "whitespace")(I);
    return T.enter("data"), v(I);
  }
  function v(I) {
    if (I === null || I === 124 || o3(I)) return T.exit("data"), f(I);
    return T.consume(I), I === 92 ? g : v;
  }
  function g(I) {
    if (I === 92 || I === 124) return T.consume(I), v;
    return v(I);
  }
}