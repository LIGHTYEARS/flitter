function jv0(T) {
  let R = this,
    a = T.attempt(JO, e, T.attempt(this.parser.constructs.flowInitial, t, _8(T, T.attempt(this.parser.constructs.flow, t, T.attempt(C$0, t)), "linePrefix")));
  return a;
  function e(r) {
    if (r === null) {
      T.consume(r);
      return;
    }
    return T.enter("lineEndingBlank"), T.consume(r), T.exit("lineEndingBlank"), R.currentConstruct = void 0, a;
  }
  function t(r) {
    if (r === null) {
      T.consume(r);
      return;
    }
    return T.enter("lineEnding"), T.consume(r), T.exit("lineEnding"), R.currentConstruct = void 0, a;
  }
}