function GE0(T, R) {
  if (T === "") return {
    matches: !0,
    score: 1
  };
  let a = FE0(R, T);
  return {
    matches: a > 0.15,
    score: a
  };
}
function KE0(T) {
  return T.reduce((R, a) => a.noun ? Math.max(R, a.noun.length) : R, 0);
}
function VE0(T, R, a) {
  let {
      colors: e,
      app: t
    } = R,
    r = new cT({
      color: e.mutedForeground,
      dim: a
    }),
    h = [];
  for (let i of T.modifiers()) {
    if (h.length > 0) h.push(new G(" ", r));
    h.push(new G(i, new cT({
      color: t.keybind,
      bold: !0,
      dim: a
    })));
  }
  if (h.length > 0) h.push(new G(" ", r));
  return h.push(new G(T.key, new cT({
    ...r,
    bold: !0
  }))), xT.spans(h);
}