function cE0(T, R) {
  let a = T.split(`
`),
    e = [];
  for (let t of a) {
    if (e.length > 0) e.push(new G(`
`));
    if (t.startsWith("+")) e.push(new G(t, new cT({
      color: R.app.diffAdded
    })));else if (t.startsWith("-")) e.push(new G(t, new cT({
      color: R.app.diffRemoved
    })));else e.push(new G(t, new cT({
      color: R.colors.foreground,
      dim: !0
    })));
  }
  return new xT({
    text: new G("", void 0, e),
    selectable: !0
  });
}