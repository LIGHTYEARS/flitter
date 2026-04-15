function _U0(T, R, a, e, t, r) {
  let h = {
      fg: LT.index(7),
      dim: !0
    },
    i = 0;
  for (let c = 0; c < t.length; c++) {
    let s = t[c],
      A = PA(t, c, r, 0),
      l = `\u25CF ${s.name}`;
    if (i + l.length > e) break;
    T.setCell(R + i, a, a9("\u25CF", {
      fg: A
    })), i += 2;
    for (let o = 0; o < s.name.length; o++) {
      if (i >= e) break;
      T.setCell(R + i, a, a9(s.name[o], h)), i++;
    }
    i += 2;
  }
}