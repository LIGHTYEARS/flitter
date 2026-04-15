function Av0(T, R, a) {
  let e = this;
  return t;
  function t(i) {
    return T.enter("labelImage"), T.enter("labelImageMarker"), T.consume(i), T.exit("labelImageMarker"), r;
  }
  function r(i) {
    if (i === 91) return T.enter("labelMarker"), T.consume(i), T.exit("labelMarker"), T.exit("labelImage"), h;
    return a(i);
  }
  function h(i) {
    return i === 94 && "_hiddenFootnoteSupport" in e.parser.constructs ? a(i) : R(i);
  }
}