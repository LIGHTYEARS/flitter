function Og(T, R, a = !1) {
  let e = new cT({
      color: R.colors.mutedForeground,
      dim: !0
    }),
    t = new cT({
      color: R.colors.mutedForeground,
      dim: !0
    });
  return new xT({
    text: new G("", void 0, [new G("\xB7", t), new G(" ", t), new G(T.title, e)]),
    maxLines: 1,
    selectable: !0
  });
}