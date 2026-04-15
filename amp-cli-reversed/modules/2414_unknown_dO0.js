function dO0(T, R, a) {
  let e = this,
    t = e.parser.gfmFootnotes || (e.parser.gfmFootnotes = []),
    r,
    h = 0,
    i;
  return c;
  function c(p) {
    return T.enter("gfmFootnoteDefinition")._container = !0, T.enter("gfmFootnoteDefinitionLabel"), T.enter("gfmFootnoteDefinitionLabelMarker"), T.consume(p), T.exit("gfmFootnoteDefinitionLabelMarker"), s;
  }
  function s(p) {
    if (p === 94) return T.enter("gfmFootnoteDefinitionMarker"), T.consume(p), T.exit("gfmFootnoteDefinitionMarker"), T.enter("gfmFootnoteDefinitionLabelString"), T.enter("chunkString").contentType = "string", A;
    return a(p);
  }
  function A(p) {
    if (h > 999 || p === 93 && !i || p === null || p === 91 || o3(p)) return a(p);
    if (p === 93) {
      T.exit("chunkString");
      let _ = T.exit("gfmFootnoteDefinitionLabelString");
      return r = _c(e.sliceSerialize(_)), T.enter("gfmFootnoteDefinitionLabelMarker"), T.consume(p), T.exit("gfmFootnoteDefinitionLabelMarker"), T.exit("gfmFootnoteDefinitionLabel"), o;
    }
    if (!o3(p)) i = !0;
    return h++, T.consume(p), p === 92 ? l : A;
  }
  function l(p) {
    if (p === 91 || p === 92 || p === 93) return T.consume(p), h++, A;
    return A(p);
  }
  function o(p) {
    if (p === 58) {
      if (T.enter("definitionMarker"), T.consume(p), T.exit("definitionMarker"), !t.includes(r)) t.push(r);
      return _8(T, n, "gfmFootnoteDefinitionWhitespace");
    }
    return a(p);
  }
  function n(p) {
    return R(p);
  }
}