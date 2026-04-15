function G$0(T, R, a) {
  let e = 0;
  return t;
  function t(A) {
    return T.enter("atxHeading"), r(A);
  }
  function r(A) {
    return T.enter("atxHeadingSequence"), h(A);
  }
  function h(A) {
    if (A === 35 && e++ < 6) return T.consume(A), h;
    if (A === null || o3(A)) return T.exit("atxHeadingSequence"), i(A);
    return a(A);
  }
  function i(A) {
    if (A === 35) return T.enter("atxHeadingSequence"), c(A);
    if (A === null || r9(A)) return T.exit("atxHeading"), R(A);
    if (Y9(A)) return _8(T, i, "whitespace")(A);
    return T.enter("atxHeadingText"), s(A);
  }
  function c(A) {
    if (A === 35) return T.consume(A), c;
    return T.exit("atxHeadingSequence"), i(A);
  }
  function s(A) {
    if (A === null || A === 35 || o3(A)) return T.exit("atxHeadingText"), i(A);
    return T.consume(A), s;
  }
}