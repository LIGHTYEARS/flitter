function U$0(T, R, a) {
  let e = this,
    t;
  return r;
  function r(n) {
    return T.enter("definition"), h(n);
  }
  function h(n) {
    return YYT.call(e, T, i, a, "definitionLabel", "definitionLabelMarker", "definitionLabelString")(n);
  }
  function i(n) {
    if (t = _c(e.sliceSerialize(e.events[e.events.length - 1][1]).slice(1, -1)), n === 58) return T.enter("definitionMarker"), T.consume(n), T.exit("definitionMarker"), c;
    return a(n);
  }
  function c(n) {
    return o3(n) ? Bv(T, s)(n) : s(n);
  }
  function s(n) {
    return XYT(T, A, a, "definitionDestination", "definitionDestinationLiteral", "definitionDestinationLiteralMarker", "definitionDestinationRaw", "definitionDestinationString")(n);
  }
  function A(n) {
    return T.attempt(N$0, l, l)(n);
  }
  function l(n) {
    return Y9(n) ? _8(T, o, "whitespace")(n) : o(n);
  }
  function o(n) {
    if (n === null || r9(n)) return T.exit("definition"), e.parser.defined.push(t), R(n);
    return a(n);
  }
}