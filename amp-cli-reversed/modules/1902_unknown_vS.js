function vS(T, R, a) {
  let e = R,
    t = 0;
  for (let c = 0; c < e.x; c++) t += T.columnWidth.get(c) ?? 0;
  let r = 0;
  for (let c = 0; c < e.y; c++) r += T.rowHeight.get(c) ?? 0;
  let h = T.columnWidth.get(e.x) ?? 0,
    i = T.rowHeight.get(e.y) ?? 0;
  return {
    x: t + Math.floor(h / 2) + T.offsetX,
    y: r + Math.floor(i / 2) + T.offsetY
  };
}