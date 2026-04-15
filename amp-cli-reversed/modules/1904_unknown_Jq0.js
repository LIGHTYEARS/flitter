function Jq0(T, R) {
  let a = R.gridCoord,
    e = T.config.boxBorderPadding,
    t = [1, 2 * e + R.displayLabel.length, 1],
    r = [1, 1 + 2 * e, 1];
  for (let h = 0; h < t.length; h++) {
    let i = a.x + h,
      c = T.columnWidth.get(i) ?? 0;
    T.columnWidth.set(i, Math.max(c, t[h]));
  }
  for (let h = 0; h < r.length; h++) {
    let i = a.y + h,
      c = T.rowHeight.get(i) ?? 0;
    T.rowHeight.set(i, Math.max(c, r[h]));
  }
  if (a.x > 0) {
    let h = T.columnWidth.get(a.x - 1) ?? 0;
    T.columnWidth.set(a.x - 1, Math.max(h, T.config.paddingX));
  }
  if (a.y > 0) {
    let h = T.config.paddingY;
    if (R50(T, R)) h += 4;
    let i = T.rowHeight.get(a.y - 1) ?? 0;
    T.rowHeight.set(a.y - 1, Math.max(i, h));
  }
}