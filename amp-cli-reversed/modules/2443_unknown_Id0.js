function Id0(T, R, a, e, t) {
  let {
      color: r,
      icon: h
    } = $d0(R, t.app),
    i = gd0(T, e, t);
  return new SR({
    constraints: new o0(0, a, 0, 1 / 0),
    padding: TR.horizontal(1),
    decoration: new p8(e.colorScheme.background, h9.all(new e9(r, 1, "rounded"))),
    child: new xT({
      text: new G(void 0, void 0, h ? [new G(` ${h} `, new cT({
        color: r
      })), ...i] : i),
      textAlign: "center"
    })
  });
}