function u8R(T, R) {
  if (R.length === 0) return null;
  let a = $R.of(T).colors,
    e = rf(T),
    t = [];
  for (let r = 0; r < R.length; r++) {
    let h = R[r];
    if (r > 0) t.push(new G(`
`));
    let i = h.startsWith("file://") ? zR.parse(h) : zR.file(h),
      c = Mr(i, e ?? void 0);
    t.push(new G(`  \u2022 ${c}`, new cT({
      color: a.foreground,
      dim: !0
    })));
  }
  return new xT({
    text: new G("", void 0, t)
  });
}