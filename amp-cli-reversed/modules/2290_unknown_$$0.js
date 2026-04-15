function $$0(T, R, a) {
  let e = this;
  return t;
  function t(s) {
    return T.enter("codeIndented"), _8(T, r, "linePrefix", 5)(s);
  }
  function r(s) {
    let A = e.events[e.events.length - 1];
    return A && A[1].type === "linePrefix" && A[2].sliceSerialize(A[1], !0).length >= 4 ? h(s) : a(s);
  }
  function h(s) {
    if (s === null) return c(s);
    if (r9(s)) return T.attempt(g$0, h, c)(s);
    return T.enter("codeFlowValue"), i(s);
  }
  function i(s) {
    if (s === null || r9(s)) return T.exit("codeFlowValue"), h(s);
    return T.consume(s), i;
  }
  function c(s) {
    return T.exit("codeIndented"), R(s);
  }
}