function Bq0(T, R) {
  let a = 0,
    e = Math.min(R[0].x, R[1].x),
    t = Math.max(R[0].x, R[1].x);
  for (let r = e; r <= t; r++) a += T.columnWidth.get(r) ?? 0;
  return a;
}
function Nq0(T, R) {
  let a = T.gridCoord,
    e = R.config.useAscii,
    t = 0;
  for (let o = 0; o < 2; o++) t += R.columnWidth.get(a.x + o) ?? 0;
  let r = 0;
  for (let o = 0; o < 2; o++) r += R.rowHeight.get(a.y + o) ?? 0;
  let h = {
      x: 0,
      y: 0
    },
    i = {
      x: t,
      y: r
    },
    c = Oh(Math.max(h.x, i.x), Math.max(h.y, i.y));
  if (!e) {
    for (let o = h.x + 1; o < i.x; o++) c[o][h.y] = "\u2500";
    for (let o = h.x + 1; o < i.x; o++) c[o][i.y] = "\u2500";
    for (let o = h.y + 1; o < i.y; o++) c[h.x][o] = "\u2502";
    for (let o = h.y + 1; o < i.y; o++) c[i.x][o] = "\u2502";
    c[h.x][h.y] = "\u250C", c[i.x][h.y] = "\u2510", c[h.x][i.y] = "\u2514", c[i.x][i.y] = "\u2518";
  } else {
    for (let o = h.x + 1; o < i.x; o++) c[o][h.y] = "-";
    for (let o = h.x + 1; o < i.x; o++) c[o][i.y] = "-";
    for (let o = h.y + 1; o < i.y; o++) c[h.x][o] = "|";
    for (let o = h.y + 1; o < i.y; o++) c[i.x][o] = "|";
    c[h.x][h.y] = "+", c[i.x][h.y] = "+", c[h.x][i.y] = "+", c[i.x][i.y] = "+";
  }
  let s = T.displayLabel,
    A = h.y + Math.floor(r / 2),
    l = h.x + Math.floor(t / 2) - Math.ceil(s.length / 2) + 1;
  for (let o = 0; o < s.length; o++) c[l + o][A] = s[o];
  return c;
}