function QYT(T, R, a, e, t, r) {
  let h;
  return i;
  function i(o) {
    if (o === 34 || o === 39 || o === 40) return T.enter(e), T.enter(t), T.consume(o), T.exit(t), h = o === 40 ? 41 : o, c;
    return a(o);
  }
  function c(o) {
    if (o === h) return T.enter(t), T.consume(o), T.exit(t), T.exit(e), R;
    return T.enter(r), s(o);
  }
  function s(o) {
    if (o === h) return T.exit(r), c(h);
    if (o === null) return a(o);
    if (r9(o)) return T.enter("lineEnding"), T.consume(o), T.exit("lineEnding"), _8(T, s, "linePrefix");
    return T.enter("chunkString", {
      contentType: "string"
    }), A(o);
  }
  function A(o) {
    if (o === h || o === null || r9(o)) return T.exit("chunkString"), s(o);
    return T.consume(o), o === 92 ? l : A;
  }
  function l(o) {
    if (o === h || o === 92) return T.consume(o), A;
    return A(o);
  }
}