function g9R(T, R) {
  if (R.nodes.length === 0) return;
  let a = 1e6,
    e = 1e6,
    t = -1e6,
    r = -1e6;
  for (let c of R.children) if (g9R(T, c), c.nodes.length > 0) a = Math.min(a, c.minX), e = Math.min(e, c.minY), t = Math.max(t, c.maxX), r = Math.max(r, c.maxY);
  for (let c of R.nodes) {
    if (!c.drawingCoord || !c.drawing) continue;
    let s = c.drawingCoord.x,
      A = c.drawingCoord.y,
      l = s + c.drawing.length - 1,
      o = A + c.drawing[0].length - 1;
    a = Math.min(a, s), e = Math.min(e, A), t = Math.max(t, l), r = Math.max(r, o);
  }
  let h = 2,
    i = 2;
  R.minX = a - h, R.minY = e - h - i, R.maxX = t + h, R.maxY = r + h;
}