function bv0(T, R) {
  return a;
  function a(e) {
    return T.enter("lineEnding"), T.consume(e), T.exit("lineEnding"), _8(T, R, "linePrefix");
  }
}
function mv0(T, R, a) {
  let e = 0,
    t;
  return r;
  function r(s) {
    return T.enter("thematicBreak"), h(s);
  }
  function h(s) {
    return t = s, i(s);
  }
  function i(s) {
    if (s === t) return T.enter("thematicBreakSequence"), c(s);
    if (e >= 3 && (s === null || r9(s))) return T.exit("thematicBreak"), R(s);
    return a(s);
  }
  function c(s) {
    if (s === t) return T.consume(s), e++, c;
    return T.exit("thematicBreakSequence"), Y9(s) ? _8(T, i, "whitespace")(s) : i(s);
  }
}