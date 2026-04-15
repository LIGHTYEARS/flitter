function Vq0(T, R) {
  let a = T.maxX - T.minX,
    e = T.maxY - T.minY;
  if (a <= 0 || e <= 0) return Oh(0, 0);
  let t = {
      x: 0,
      y: 0
    },
    r = {
      x: a,
      y: e
    },
    h = Oh(a, e);
  if (!R.config.useAscii) {
    for (let i = t.x + 1; i < r.x; i++) h[i][t.y] = "\u2500";
    for (let i = t.x + 1; i < r.x; i++) h[i][r.y] = "\u2500";
    for (let i = t.y + 1; i < r.y; i++) h[t.x][i] = "\u2502";
    for (let i = t.y + 1; i < r.y; i++) h[r.x][i] = "\u2502";
    h[t.x][t.y] = "\u250C", h[r.x][t.y] = "\u2510", h[t.x][r.y] = "\u2514", h[r.x][r.y] = "\u2518";
  } else {
    for (let i = t.x + 1; i < r.x; i++) h[i][t.y] = "-";
    for (let i = t.x + 1; i < r.x; i++) h[i][r.y] = "-";
    for (let i = t.y + 1; i < r.y; i++) h[t.x][i] = "|";
    for (let i = t.y + 1; i < r.y; i++) h[r.x][i] = "|";
    h[t.x][t.y] = "+", h[r.x][t.y] = "+", h[t.x][r.y] = "+", h[r.x][r.y] = "+";
  }
  return h;
}