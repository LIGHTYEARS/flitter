function FS0(T) {
  let R = !1;
  if (T && T.firstLineBlank) R = !0;
  return {
    handlers: {
      footnoteDefinition: a,
      footnoteReference: PQT
    },
    unsafe: [{
      character: "[",
      inConstruct: ["label", "phrasing", "reference"]
    }]
  };
  function a(e, t, r, h) {
    let i = r.createTracker(h),
      c = i.move("[^"),
      s = r.enter("footnoteDefinition"),
      A = r.enter("label");
    if (c += i.move(r.safe(r.associationId(e), {
      before: c,
      after: "]"
    })), A(), c += i.move("]:"), e.children && e.children.length > 0) i.shift(4), c += i.move((R ? `
` : " ") + r.indentLines(r.containerFlow(e, i.current()), R ? kQT : GS0));
    return s(), c;
  }
}