function s$0(T) {
  let R = T.attempt(this.parser.constructs.contentInitial, e, t),
    a;
  return R;
  function e(i) {
    if (i === null) {
      T.consume(i);
      return;
    }
    return T.enter("lineEnding"), T.consume(i), T.exit("lineEnding"), _8(T, R, "linePrefix");
  }
  function t(i) {
    return T.enter("paragraph"), r(i);
  }
  function r(i) {
    let c = T.enter("chunkText", {
      contentType: "text",
      previous: a
    });
    if (a) a.next = c;
    return a = c, h(i);
  }
  function h(i) {
    if (i === null) {
      T.exit("chunkText"), T.exit("paragraph"), T.consume(i);
      return;
    }
    if (r9(i)) return T.consume(i), T.exit("chunkText"), r;
    return T.consume(i), h;
  }
}