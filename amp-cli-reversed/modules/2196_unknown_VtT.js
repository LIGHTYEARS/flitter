function bfT(T, R) {
  let a = T.indexOf("\r", R),
    e = T.indexOf(`
`, R);
  if (e === -1) return a;
  if (a === -1 || a + 1 === e) return e;
  return a < e ? a : e;
}
function of0(T, R) {
  let a = R || {};
  return VtT({
    file: a.file || void 0,
    location: !1,
    schema: a.space === "svg" ? KtT : GtT,
    verbose: a.verbose || !1
  }, T);
}
function VtT(T, R) {
  let a;
  switch (R.nodeName) {
    case "#comment":
      {
        let e = R;
        return a = {
          type: "comment",
          value: e.data
        }, UM(T, e, a), a;
      }
    case "#document":
    case "#document-fragment":
      {
        let e = R,
          t = "mode" in e ? e.mode === "quirks" || e.mode === "limited-quirks" : !1;
        if (a = {
          type: "root",
          children: iYT(T, R.childNodes),
          data: {
            quirksMode: t
          }
        }, T.file && T.location) {
          let r = String(T.file),
            h = if0(r),
            i = h.toPoint(0),
            c = h.toPoint(r.length);
          Ue(i, "expected `start`"), Ue(c, "expected `end`"), a.position = {
            start: i,
            end: c
          };
        }
        return a;
      }
    case "#documentType":
      {
        let e = R;
        return a = {
          type: "doctype"
        }, UM(T, e, a), a;
      }
    case "#text":
      {
        let e = R;
        return a = {
          type: "text",
          value: e.value
        }, UM(T, e, a), a;
      }
    default:
      return a = nf0(T, R), a;
  }
}