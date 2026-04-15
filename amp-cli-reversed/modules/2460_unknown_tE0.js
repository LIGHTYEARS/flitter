function tE0(T, R, a, e, t) {
  let r = zP.default.languages[R] || zP.default.languages.clike,
    h = t?.copyWith({
      color: e
    }) ?? new cT({
      color: e
    });
  if (!r) return [new G(T, h)];
  try {
    let i = Sv(T, a, `file.${R}`),
      c = [];
    for (let s of i) {
      let A = s.color ?? e,
        l = t?.copyWith({
          color: A
        }) ?? new cT({
          color: A
        });
      c.push(new G(s.content, l));
    }
    return c.length > 0 ? c : [new G(T, h)];
  } catch {
    return [new G(T, h)];
  }
}