function T50(T, R) {
  for (let a of R) {
    if (!T.columnWidth.has(a.x)) T.columnWidth.set(a.x, Math.floor(T.config.paddingX / 2));
    if (!T.rowHeight.has(a.y)) T.rowHeight.set(a.y, Math.floor(T.config.paddingY / 2));
  }
}