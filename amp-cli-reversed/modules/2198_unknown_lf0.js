function UM(T, R, a) {
  if ("sourceCodeLocation" in R && R.sourceCodeLocation && T.file) {
    let e = lf0(T, a, R.sourceCodeLocation);
    if (e) T.location = !0, a.position = e;
  }
}
function lf0(T, R, a) {
  let e = oP(a);
  if (R.type === "element") {
    let t = R.children[R.children.length - 1];
    if (e && !a.endTag && t && t.position && t.position.end) e.end = Object.assign({}, t.position.end);
    if (T.verbose) {
      let r = {},
        h;
      if (a.attrs) {
        for (h in a.attrs) if (hYT.call(a.attrs, h)) r[tYT(T.schema, h).property] = oP(a.attrs[h]);
      }
      Ue(a.startTag, "a start tag should exist");
      let i = oP(a.startTag),
        c = a.endTag ? oP(a.endTag) : void 0,
        s = {
          opening: i
        };
      if (c) s.closing = c;
      s.properties = r, R.data = {
        position: s
      };
    }
  }
  return e;
}