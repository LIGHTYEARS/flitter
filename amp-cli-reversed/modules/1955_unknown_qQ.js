function m8R(T) {
  let R = [];
  for (let a of T.content) if (a.type === "text") R.push(a.text);
  return R.join(`
`).trim();
}
function qQ(T, R, a, e) {
  let t = [];
  if (t.push(new G(T, R)), a) t.push(new G(" (interrupted)", new cT({
    color: e,
    italic: !0
  })));
  return new xT({
    text: new G("", void 0, t),
    selectable: !0
  });
}