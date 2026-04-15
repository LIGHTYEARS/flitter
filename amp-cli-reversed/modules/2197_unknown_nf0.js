function iYT(T, R) {
  let a = -1,
    e = [];
  while (++a < R.length) {
    let t = VtT(T, R[a]);
    e.push(t);
  }
  return e;
}
function nf0(T, R) {
  let a = T.schema;
  T.schema = R.namespaceURI === cf0.svg ? KtT : GtT;
  let e = -1,
    t = {};
  while (++e < R.attrs.length) {
    let h = R.attrs[e],
      i = (h.prefix ? h.prefix + ":" : "") + h.name;
    if (!hYT.call(sf0, i)) t[i] = h.value;
  }
  let r = (T.schema.space === "svg" ? hf0 : rf0)(R.tagName, t, iYT(T, R.childNodes));
  if (UM(T, R, r), r.tagName === "template") {
    let h = R,
      i = h.sourceCodeLocation,
      c = i && i.startTag && oP(i.startTag),
      s = i && i.endTag && oP(i.endTag),
      A = VtT(T, h.content);
    if (c && s && T.file) A.position = {
      start: c.end,
      end: s.start
    };
    r.content = A;
  }
  return T.schema = a, r;
}