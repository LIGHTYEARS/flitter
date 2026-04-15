function sfT(T, R) {
  let a = new cT({
      color: R.colors.mutedForeground,
      dim: !0
    }),
    e = new cT({
      color: R.colors.mutedForeground,
      dim: !0
    });
  return new xT({
    text: new G("", void 0, [new G("\xB7", e), new G(" ", e), new G(T.title, a)]),
    maxLines: 1,
    selectable: !0
  });
}