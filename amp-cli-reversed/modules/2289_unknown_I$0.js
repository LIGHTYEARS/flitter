function I$0(T, R, a) {
  let e = this;
  return t;
  function t(h) {
    if (h === null) return a(h);
    return T.enter("lineEnding"), T.consume(h), T.exit("lineEnding"), r;
  }
  function r(h) {
    return e.parser.lazy[e.now().line] ? a(h) : R(h);
  }
}