function O$0(T) {
  return T !== 96 || this.events[this.events.length - 1][1].type === "characterEscape";
}
function d$0(T, R, a) {
  let e = this,
    t = 0,
    r,
    h;
  return i;
  function i(o) {
    return T.enter("codeText"), T.enter("codeTextSequence"), c(o);
  }
  function c(o) {
    if (o === 96) return T.consume(o), t++, c;
    return T.exit("codeTextSequence"), s(o);
  }
  function s(o) {
    if (o === null) return a(o);
    if (o === 32) return T.enter("space"), T.consume(o), T.exit("space"), s;
    if (o === 96) return h = T.enter("codeTextSequence"), r = 0, l(o);
    if (r9(o)) return T.enter("lineEnding"), T.consume(o), T.exit("lineEnding"), s;
    return T.enter("codeTextData"), A(o);
  }
  function A(o) {
    if (o === null || o === 32 || o === 96 || r9(o)) return T.exit("codeTextData"), s(o);
    return T.consume(o), A;
  }
  function l(o) {
    if (o === 96) return T.consume(o), r++, l;
    if (r === t) return T.exit("codeTextSequence"), T.exit("codeText"), R(o);
    return h.type = "codeTextData", A(o);
  }
}