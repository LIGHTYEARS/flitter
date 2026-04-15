function Hq0(T, R) {
  if (R.path.length === 0) {
    let s = lf(T.canvas);
    return [s, s, s, s, s];
  }
  let a = Gq0(T, R),
    [e, t, r] = Wq0(T, R.path),
    h = qq0(T, R.path, t[0]),
    i = zq0(T, t[t.length - 1], r[r.length - 1]),
    c = Fq0(T, R.path);
  return [e, h, i, c, a];
}