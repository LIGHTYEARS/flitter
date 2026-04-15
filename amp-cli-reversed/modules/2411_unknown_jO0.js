function jO0(T, R, a) {
  let e = this,
    t = e.events.length,
    r = e.parser.gfmFootnotes || (e.parser.gfmFootnotes = []),
    h;
  while (t--) {
    let c = e.events[t][1];
    if (c.type === "labelImage") {
      h = c;
      break;
    }
    if (c.type === "gfmFootnoteCall" || c.type === "labelLink" || c.type === "label" || c.type === "image" || c.type === "link") break;
  }
  return i;
  function i(c) {
    if (!h || !h._balanced) return a(c);
    let s = _c(e.sliceSerialize({
      start: h.end,
      end: e.now()
    }));
    if (s.codePointAt(0) !== 94 || !r.includes(s.slice(1))) return a(c);
    return T.enter("gfmFootnoteCallLabelMarker"), T.consume(c), T.exit("gfmFootnoteCallLabelMarker"), R(c);
  }
}