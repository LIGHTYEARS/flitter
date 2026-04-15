function h2(T, R) {
  if (!T) return [];
  let a = [],
    e = T.replace(/\r/g, "").trimEnd().split(`
`),
    t = 10,
    r = new cT({
      color: R.foreground,
      dim: !0
    });
  if (e.length > t) {
    let h = e.length - t;
    a.push(new G(`  [... ${h} lines truncated ...]
`, r));
    let i = e.slice(-t).map(c => `  ${c}`).join(`
`) + `
`;
    a.push(new G(i, r));
  } else {
    let h = e.map(i => `  ${i}`).join(`
`) + `
`;
    a.push(new G(h, r));
  }
  return a;
}