function OO0(T, R, a) {
  let e = this,
    t = e.parser.gfmFootnotes || (e.parser.gfmFootnotes = []),
    r = 0,
    h;
  return i;
  function i(l) {
    return T.enter("gfmFootnoteCall"), T.enter("gfmFootnoteCallLabelMarker"), T.consume(l), T.exit("gfmFootnoteCallLabelMarker"), c;
  }
  function c(l) {
    if (l !== 94) return a(l);
    return T.enter("gfmFootnoteCallMarker"), T.consume(l), T.exit("gfmFootnoteCallMarker"), T.enter("gfmFootnoteCallString"), T.enter("chunkString").contentType = "string", s;
  }
  function s(l) {
    if (r > 999 || l === 93 && !h || l === null || l === 91 || o3(l)) return a(l);
    if (l === 93) {
      T.exit("chunkString");
      let o = T.exit("gfmFootnoteCallString");
      if (!t.includes(_c(e.sliceSerialize(o)))) return a(l);
      return T.enter("gfmFootnoteCallLabelMarker"), T.consume(l), T.exit("gfmFootnoteCallLabelMarker"), T.exit("gfmFootnoteCall"), R;
    }
    if (!o3(l)) h = !0;
    return r++, T.consume(l), l === 92 ? A : s;
  }
  function A(l) {
    if (l === 91 || l === 92 || l === 93) return T.consume(l), r++, s;
    return s(l);
  }
}