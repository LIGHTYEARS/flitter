function Wv0(T, R, a) {
  let e = {
      _bufferIndex: -1,
      _index: 0,
      line: a && a.line || 1,
      column: a && a.column || 1,
      offset: a && a.offset || 0
    },
    t = {},
    r = [],
    h = [],
    i = [],
    c = !0,
    s = {
      attempt: g(f),
      check: g(v),
      consume: P,
      enter: k,
      exit: x,
      interrupt: g(v, {
        interrupt: !0
      })
    },
    A = {
      code: null,
      containerState: {},
      defineSkip: b,
      events: [],
      now: m,
      parser: T,
      previous: null,
      sliceSerialize: p,
      sliceStream: _,
      write: n
    },
    l = R.tokenize.call(A, s),
    o;
  if (R.resolveAll) r.push(R);
  return A;
  function n(j) {
    if (h = ni(h, j), y(), h[h.length - 1] !== null) return [];
    return I(R, 0), A.events = WH(r, A.events, A), A.events;
  }
  function p(j, d) {
    return zv0(_(j), d);
  }
  function _(j) {
    return qv0(h, j);
  }
  function m() {
    let {
      _bufferIndex: j,
      _index: d,
      line: C,
      column: L,
      offset: w
    } = e;
    return {
      _bufferIndex: j,
      _index: d,
      line: C,
      column: L,
      offset: w
    };
  }
  function b(j) {
    t[j.line] = j.column, O();
  }
  function y() {
    let j;
    while (e._index < h.length) {
      let d = h[e._index];
      if (typeof d === "string") {
        if (j = e._index, e._bufferIndex < 0) e._bufferIndex = 0;
        while (e._index === j && e._bufferIndex < d.length) u(d.charCodeAt(e._bufferIndex));
      } else u(d);
    }
  }
  function u(j) {
    c = void 0, o = j, l = l(j);
  }
  function P(j) {
    if (r9(j)) e.line++, e.column = 1, e.offset += j === -3 ? 2 : 1, O();else if (j !== -1) e.column++, e.offset++;
    if (e._bufferIndex < 0) e._index++;else if (e._bufferIndex++, e._bufferIndex === h[e._index].length) e._bufferIndex = -1, e._index++;
    A.previous = j, c = !0;
  }
  function k(j, d) {
    let C = d || {};
    return C.type = j, C.start = m(), A.events.push(["enter", C, A]), i.push(C), C;
  }
  function x(j) {
    let d = i.pop();
    return d.end = m(), A.events.push(["exit", d, A]), d;
  }
  function f(j, d) {
    I(j, d.from);
  }
  function v(j, d) {
    d.restore();
  }
  function g(j, d) {
    return C;
    function C(L, w, D) {
      let B, M, V, Q;
      return Array.isArray(L) ? eT(L) : "tokenize" in L ? eT([L]) : W(L);
      function W(TT) {
        return tT;
        function tT(lT) {
          let N = lT !== null && TT[lT],
            q = lT !== null && TT.null,
            F = [...(Array.isArray(N) ? N : N ? [N] : []), ...(Array.isArray(q) ? q : q ? [q] : [])];
          return eT(F)(lT);
        }
      }
      function eT(TT) {
        if (B = TT, M = 0, TT.length === 0) return D;
        return iT(TT[M]);
      }
      function iT(TT) {
        return tT;
        function tT(lT) {
          if (Q = S(), V = TT, !TT.partial) A.currentConstruct = TT;
          if (TT.name && A.parser.constructs.disable.null.includes(TT.name)) return oT(lT);
          return TT.tokenize.call(d ? Object.assign(Object.create(A), d) : A, s, aT, oT)(lT);
        }
      }
      function aT(TT) {
        return c = !0, j(V, Q), w;
      }
      function oT(TT) {
        if (c = !0, Q.restore(), ++M < B.length) return iT(B[M]);
        return D;
      }
    }
  }
  function I(j, d) {
    if (j.resolveAll && !r.includes(j)) r.push(j);
    if (j.resolve) vh(A.events, d, A.events.length - d, j.resolve(A.events.slice(d), A));
    if (j.resolveTo) A.events = j.resolveTo(A.events, A);
  }
  function S() {
    let j = m(),
      d = A.previous,
      C = A.currentConstruct,
      L = A.events.length,
      w = Array.from(i);
    return {
      from: L,
      restore: D
    };
    function D() {
      e = j, A.previous = d, A.currentConstruct = C, A.events.length = L, i = w, O();
    }
  }
  function O() {
    if (e.line in t && e.column < 2) e.column = t[e.line], e.offset += t[e.line] - 1;
  }
}