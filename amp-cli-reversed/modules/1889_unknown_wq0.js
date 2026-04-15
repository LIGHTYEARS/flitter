function wq0(T, R) {
  if (R.text.length === 0) return;
  let a = R.text.length,
    e = R.path[0],
    t = [e, R.path[1]],
    r = 0;
  for (let A = 1; A < R.path.length; A++) {
    let l = R.path[A],
      o = [e, l],
      n = Bq0(T, o);
    if (n >= a) {
      t = o;
      break;
    } else if (n > r) r = n, t = o;
    e = l;
  }
  let h = Math.min(t[0].x, t[1].x),
    i = Math.max(t[0].x, t[1].x),
    c = h + Math.floor((i - h) / 2),
    s = T.columnWidth.get(c) ?? 0;
  T.columnWidth.set(c, Math.max(s, a + 2)), R.labelLine = [t[0], t[1]];
}