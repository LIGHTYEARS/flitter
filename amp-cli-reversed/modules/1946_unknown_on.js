function rx(T) {
  return T?.content || void 0;
}
function on(T, R, a) {
  if (!T) return [];
  let e = [],
    t = T.replace(/\r/g, "").trimEnd(),
    r = t.split(`
`),
    h = 15,
    i = new cT({
      color: a.foreground,
      dim: !0
    });
  if (r.length > h) {
    let c = r.length - h;
    if (e.push(new G(`[... ${c} lines truncated ...] `, i)), R) e.push(new G("View all", new cT({
      color: a.accent,
      underline: !0
    }), void 0, void 0, () => yd0(t)));
    e.push(new G(`
`, i));
    let s = r.slice(-h).join(`
`) + `
`;
    e.push(new G(s, i));
  } else {
    let c = r.join(`
`) + `
`;
    e.push(new G(c, i));
  }
  return e;
}