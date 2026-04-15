function e50(T) {
  for (let R of T.subgraphs) g9R(T, R);
  a50(T);
}
function t50(T) {
  if (T.subgraphs.length === 0) return;
  let R = 0,
    a = 0;
  for (let r of T.subgraphs) R = Math.min(R, r.minX), a = Math.min(a, r.minY);
  let e = -R,
    t = -a;
  if (e === 0 && t === 0) return;
  T.offsetX = e, T.offsetY = t;
  for (let r of T.subgraphs) r.minX += e, r.minY += t, r.maxX += e, r.maxY += t;
  for (let r of T.nodes) if (r.drawingCoord) r.drawingCoord.x += e, r.drawingCoord.y += t;
}