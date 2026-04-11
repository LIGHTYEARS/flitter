// Module: stringify-document
// Original: FPR
// Type: CJS (RT wrapper)
// Exports: stringifyDocument
// Category: util

// Module: FPR (CJS)
(T) => {
  var R = x8(),
    a = wN(),
    e = MN();
  function t(r, h) {
    let i = [],
      c = h.directives === !0;
    if (h.directives !== !1 && r.directives) {
      let n = r.directives.toString(r);
      if (n) (i.push(n), (c = !0));
      else if (r.directives.docStart) c = !0;
    }
    if (c) i.push("---");
    let s = a.createStringifyContext(r, h),
      { commentString: A } = s.options;
    if (r.commentBefore) {
      if (i.length !== 1) i.unshift("");
      let n = A(r.commentBefore);
      i.unshift(e.indentComment(n, ""));
    }
    let l = !1,
      o = null;
    if (r.contents) {
      if (R.isNode(r.contents)) {
        if (r.contents.spaceBefore && c) i.push("");
        if (r.contents.commentBefore) {
          let _ = A(r.contents.commentBefore);
          i.push(e.indentComment(_, ""));
        }
        ((s.forceBlockIndent = !!r.comment), (o = r.contents.comment));
      }
      let n = o ? void 0 : () => (l = !0),
        p = a.stringify(r.contents, s, () => (o = null), n);
      if (o) p += e.lineComment(p, "", A(o));
      if ((p[0] === "|" || p[0] === ">") && i[i.length - 1] === "---")
        i[i.length - 1] = `--- ${p}`;
      else i.push(p);
    } else i.push(a.stringify(r.contents, s));
    if (r.directives?.docEnd)
      if (r.comment) {
        let n = A(r.comment);
        if (
          n.includes(`
`)
        )
          (i.push("..."), i.push(e.indentComment(n, "")));
        else i.push(`... ${n}`);
      } else i.push("...");
    else {
      let n = r.comment;
      if (n && l) n = n.replace(/^\n+/, "");
      if (n) {
        if ((!l || o) && i[i.length - 1] !== "") i.push("");
        i.push(e.indentComment(A(n), ""));
      }
    }
    return (
      i.join(`
`) +
      `
`
    );
  }
  T.stringifyDocument = t;
};
