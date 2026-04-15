function hE0(T, R, a, e, t, r) {
  let h = [];
  if (e) h.push(new G(`${t.toBraille()} `, new cT({
    color: r.app.toolRunning
  })));else {
    let i = sE0(a),
      c = oE0(a, r);
    h.push(new G(`${i} `, new cT({
      color: c
    })));
  }
  if (h.push(new G(T, new cT({
    color: r.app.toolName,
    bold: !0
  }))), R) h.push(new G(` ${R}`, new cT({
    color: r.colors.foreground,
    dim: !0
  })));
  return new xT({
    text: new G("", void 0, h),
    selectable: !0,
    maxLines: 1
  });
}