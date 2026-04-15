function YYT(T, R, a, e, t, r) {
  let h = this,
    i = 0,
    c;
  return s;
  function s(n) {
    return T.enter(e), T.enter(t), T.consume(n), T.exit(t), T.enter(r), A;
  }
  function A(n) {
    if (i > 999 || n === null || n === 91 || n === 93 && !c || n === 94 && !i && "_hiddenFootnoteSupport" in h.parser.constructs) return a(n);
    if (n === 93) return T.exit(r), T.enter(t), T.consume(n), T.exit(t), T.exit(e), R;
    if (r9(n)) return T.enter("lineEnding"), T.consume(n), T.exit("lineEnding"), A;
    return T.enter("chunkString", {
      contentType: "string"
    }), l(n);
  }
  function l(n) {
    if (n === null || n === 91 || n === 93 || r9(n) || i++ > 999) return T.exit("chunkString"), A(n);
    if (T.consume(n), !c) c = !Y9(n);
    return n === 92 ? o : l;
  }
  function o(n) {
    if (n === 91 || n === 92 || n === 93) return T.consume(n), i++, l;
    return l(n);
  }
}