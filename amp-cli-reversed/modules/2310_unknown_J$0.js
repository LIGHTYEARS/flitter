function J$0(T, R, a) {
  let e = this;
  return t;
  function t(h) {
    if (r9(h)) return T.enter("lineEnding"), T.consume(h), T.exit("lineEnding"), r;
    return a(h);
  }
  function r(h) {
    return e.parser.lazy[e.now().line] ? a(h) : R(h);
  }
}