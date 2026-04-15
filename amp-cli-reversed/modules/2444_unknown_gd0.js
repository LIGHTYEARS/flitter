function gd0(T, R, a) {
  let e = new cT({
      color: R.colorScheme.foreground
    }),
    t = new cT({
      color: a.app.command,
      bold: !0
    }),
    r = new cT({
      color: a.app.keybind,
      bold: !0
    }),
    h = [],
    i = /\[\[([^\]]+)\]\]/g,
    c = T.split("`");
  for (let [s, A] of c.entries()) {
    if (A.length === 0) continue;
    if (s % 2 === 1) h.push(new G(A, t));else {
      let l = 0,
        o;
      while ((o = i.exec(A)) !== null) {
        let n = o[1];
        if (o.index > l) h.push(new G(A.slice(l, o.index), e));
        if (n) h.push(new G(n, r));
        l = o.index + o[0].length;
      }
      if (l < A.length) h.push(new G(A.slice(l), e));
    }
  }
  return h;
}