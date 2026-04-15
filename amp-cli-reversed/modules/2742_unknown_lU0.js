function lU0(T, R, a, e, t, r, h) {
  let i = a[0]?.points ?? [];
  if (i.length === 0 || R.width <= 0 || R.height <= 0) return;
  let c = 0;
  for (let l of i) c = Math.max(c, l.label.length);
  c = Math.min(c, bRR);
  let s = c + 2,
    A = Math.max(0, R.width - s - 1);
  for (let l = 0; l < i.length && l < R.height; l++) {
    let o = i[l];
    if (!o) continue;
    let n = R.y + l,
      p = PA(a, 0, t, l),
      _ = e === l,
      m = _ ? $s(p) : p,
      b = o.label.length > c ? o.label.slice(0, c - 1) + "\u2026" : o.label,
      y = c - b.length,
      u = {
        fg: _ ? $s(LT.index(7)) : LT.index(7)
      };
    for (let j = 0; j < y; j++) T.setCell(R.x + j, n, a9(" ", {}));
    for (let j = 0; j < b.length; j++) T.setCell(R.x + y + j, n, a9(b[j], u));
    let P = {
      fg: LT.index(7),
      dim: !0
    };
    T.setCell(R.x + c, n, a9(" ", {})), T.setCell(R.x + c + 1, n, a9("\u2502", P));
    let k = (r > 0 ? o.value / r : 0) * A,
      x = Math.floor(k),
      f = k - x,
      v = {
        fg: m,
        bold: _
      };
    for (let j = 0; j < x && j < A; j++) T.setCell(R.x + s + j, n, a9("\u2588", v));
    if (f > 0 && x < A) {
      let j = Math.min(JF.length - 1, Math.floor(f * JF.length)),
        d = JF[j] ?? "\u258F";
      T.setCell(R.x + s + x, n, a9(d, v));
    }
    let g = " " + h(o.value),
      I = x + (f > 0 ? 1 : 0),
      S = s + I,
      O = {
        fg: LT.index(7),
        dim: !0
      };
    for (let j = 0; j < g.length; j++) {
      let d = R.x + S + j;
      if (d >= R.x + R.width) break;
      T.setCell(d, n, a9(g[j], O));
    }
  }
}