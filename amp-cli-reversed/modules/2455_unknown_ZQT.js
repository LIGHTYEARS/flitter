function ZQT(T) {
  if (T.startsWith("file://")) {
    let h = zR.parse(T);
    if (h.scheme !== "file") return null;
    let i = bIT(h.fragment),
      c = d0(h.with({
        fragment: ""
      }));
    return {
      filePath: h.fsPath,
      fileURI: c,
      openURI: T,
      line: i?.line,
      column: i?.column
    };
  }
  if (!T.startsWith("/")) return null;
  let R = T.lastIndexOf("#"),
    a = R >= 0 ? T.slice(R + 1) : "",
    e = a ? bIT(a) : null,
    t = e && R >= 0 ? T.slice(0, R) : T,
    r = zR.file(t);
  return {
    filePath: t,
    fileURI: d0(r),
    openURI: e && a ? d0(r.with({
      fragment: a
    })) : d0(r),
    line: e?.line,
    column: e?.column
  };
}